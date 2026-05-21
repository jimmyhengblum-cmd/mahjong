import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkHu,
  computeScore,
  type ClaimIntent,
  type ExposedMeld,
  type RoundEvent,
  type RoundState,
  type SeatIndex,
  type TileCode,
} from "@mjwz/engine";
import { deserializeStateFromWire, type RoomPublicState, type WireState } from "@mjwz/server/types";
import type {
  AnnouncementEvent,
  HumanReactionOptions,
  UseGameResult,
} from "../hooks/useGame.js";
import { getSocket } from "./socket.js";

const ANNOUNCEMENT_DURATION_MS = 1600;

export interface OnlineGameInfo {
  /** True quand on est connecté à une room et qu'on a un siège. */
  ready: boolean;
  /** Notre siège (assigné par le serveur). */
  seat: SeatIndex | null;
  /** État de la room (lobby + status). */
  room: RoomPublicState | null;
  /** True quand on est l'hôte. */
  isHost: boolean;
}

export type UseOnlineGameResult = Omit<UseGameResult, "humanSeat" | "resetSession"> &
  OnlineGameInfo;

/**
 * Pendant la même interface que useGame mais state vient du serveur.
 * Le client envoie ses actions via Socket.io et reçoit le state filtré.
 */
export function useOnlineGame(): UseOnlineGameResult {
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [seat, setSeat] = useState<SeatIndex | null>(null);
  const [state, setState] = useState<RoundState | null>(null);
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const [dealCounter, setDealCounter] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementEvent | null>(null);
  const announcementIdRef = useRef(0);

  // Session score local (le serveur ne le track pas encore)
  const [sessionScores, setSessionScores] = useState<number[]>([0, 0, 0, 0]);
  const [sessionRoundCount, setSessionRoundCount] = useState(0);
  const [humanWinTrigger, setHumanWinTrigger] = useState(0);
  const scoredRoundRef = useRef(-1);

  // Wire socket events
  useEffect(() => {
    const socket = getSocket();
    const onRoomState = (r: RoomPublicState) => setRoom(r);
    const onGameState = (wire: WireState, mySeat: SeatIndex) => {
      setSeat(mySeat);
      setState(deserializeStateFromWire(wire));
    };
    const onGameEvent = (newEvents: RoundEvent[]) => {
      setEvents((prev) => [...prev, ...newEvents]);
    };

    socket.on("room:state", onRoomState);
    socket.on("game:state", onGameState);
    socket.on("game:event", onGameEvent);
    return () => {
      socket.off("room:state", onRoomState);
      socket.off("game:state", onGameState);
      socket.off("game:event", onGameEvent);
    };
  }, []);

  // Quand le state passe en "playing" (nouvelle manche), reset events + deal animation
  const prevPhaseKindRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state) return;
    const kind = state.phase.kind;
    if (prevPhaseKindRef.current === null && kind !== "ended") {
      // 1ère réception : c'est le début d'une manche
      setEvents([]);
      setDealCounter((c) => c + 1);
      setIsDealing(true);
      const t = setTimeout(() => setIsDealing(false), 1700);
      prevPhaseKindRef.current = kind;
      return () => clearTimeout(t);
    }
    prevPhaseKindRef.current = kind;
  }, [state]);

  // Annonce de claim / hu
  const lastSeenLen = useRef(0);
  useEffect(() => {
    if (events.length <= lastSeenLen.current) {
      lastSeenLen.current = events.length;
      return;
    }
    const fresh = events.slice(lastSeenLen.current);
    lastSeenLen.current = events.length;
    for (const e of fresh) {
      if (e.type === "claimed") {
        setAnnouncement({
          id: ++announcementIdRef.current,
          type: "claimed",
          seat: e.seat,
          intent: e.intent,
          meld: e.meld,
        });
      } else if (e.type === "hu") {
        setAnnouncement({
          id: ++announcementIdRef.current,
          type: "hu",
          seat: e.seat,
          selfPick: e.selfPick,
        });
      }
    }
  }, [events]);
  useEffect(() => {
    if (!announcement) return;
    const t = setTimeout(() => setAnnouncement(null), ANNOUNCEMENT_DURATION_MS);
    return () => clearTimeout(t);
  }, [announcement]);

  // Session score on round end
  useEffect(() => {
    if (!state || state.phase.kind !== "ended") return;
    if (scoredRoundRef.current === dealCounter) return;
    scoredRoundRef.current = dealCounter;
    const result = state.phase.result;
    const delta = [0, 0, 0, 0];
    if (result.kind === "hu" && result.winner !== null && result.huResult) {
      const score = computeScore({
        huResult: result.huResult,
        selfPick: result.discarder === null,
        isDealer: result.winner === state.dealer,
        dealerConsecutiveWins: 0,
        heavenly: false,
        earthly: false,
        singleWait: false,
        robKong: false,
      });
      delta[result.winner] = score.winnerNetGain;
      if (result.discarder !== null) {
        delta[result.discarder] = -score.winnerNetGain;
      } else {
        for (let i = 0; i < 4; i++) if (i !== result.winner) delta[i] = -score.perLoser;
      }
      if (seat !== null && result.winner === seat) {
        setHumanWinTrigger((n) => n + 1);
      }
    }
    setSessionScores((prev) => prev.map((s, i) => s + delta[i]!));
    setSessionRoundCount((n) => n + 1);
  }, [state, dealCounter, seat]);

  // Actions envoyées via socket
  const emit = useCallback((action: any) => {
    getSocket().emit("game:action", action);
  }, []);

  const isHumanTurn =
    state !== null &&
    seat !== null &&
    state.phase.kind === "discard" &&
    state.phase.current === seat;

  const isHumanReacting =
    state !== null &&
    seat !== null &&
    state.phase.kind === "reaction" &&
    state.phase.pending.has(seat);

  const humanReactionOptions = useMemo<HumanReactionOptions>(() => {
    const empty: HumanReactionOptions = {
      canHu: false,
      canKong: false,
      canPong: false,
      chiUses: [],
    };
    if (!state || seat === null) return empty;
    if (state.phase.kind !== "reaction") return empty;
    if (!state.phase.pending.has(seat)) return empty;
    return computeReactionOptions(state, seat);
  }, [state, seat]);

  const isHost = !!room && room.hostSocketId === getSocket().id;

  return {
    state: state!,
    events,
    announcement,
    isDealing,
    dealCounter,
    isHumanTurn,
    isHumanReacting,
    humanReactionOptions,
    sessionScores,
    sessionRoundCount,
    humanWinTrigger,
    newRound: () => {
      getSocket().emit("game:newRound", () => {});
    },
    discard: (tile: TileCode) => {
      if (seat === null) return;
      emit({ type: "discard", seat, tile });
    },
    claim: (intent: ClaimIntent) => {
      if (seat === null) return;
      emit({ type: "claim", seat, intent });
    },
    pass: () => {
      if (seat === null) return;
      emit({ type: "pass", seat });
    },
    selfHu: () => {
      if (seat === null) return;
      emit({ type: "self-hu", seat });
    },
    // OnlineGameInfo
    ready: state !== null && seat !== null,
    seat,
    room,
    isHost,
  };
}

// -------------------- Helpers --------------------

function computeReactionOptions(
  state: RoundState,
  seat: SeatIndex
): HumanReactionOptions {
  if (state.phase.kind !== "reaction") {
    return { canHu: false, canKong: false, canPong: false, chiUses: [] };
  }
  const { discardedTile, discardedBy } = state.phase;
  const hand = state.hands[seat]!;
  const same = hand.concealed.filter((t) => t === discardedTile).length;
  const huCheck = checkHu({
    concealed: [...hand.concealed, discardedTile],
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  }).valid;
  const chiUses: Array<readonly [TileCode, TileCode]> = [];
  if (((discardedBy + 1) % 4) === seat) {
    const t0 = discardedTile;
    if (t0.length === 2 && (t0[0] === "m" || t0[0] === "p" || t0[0] === "s")) {
      const suit = t0[0];
      const n = parseInt(t0[1]!, 10);
      for (const [da, db] of [[-2, -1], [-1, 1], [1, 2]] as const) {
        const a = n + da;
        const b = n + db;
        if (a < 1 || a > 9 || b < 1 || b > 9) continue;
        const ta = `${suit}${a}` as TileCode;
        const tb = `${suit}${b}` as TileCode;
        if (hand.concealed.includes(ta) && hand.concealed.includes(tb)) {
          chiUses.push([ta, tb] as const);
        }
      }
    }
  }
  return {
    canHu: huCheck,
    canKong: same >= 3,
    canPong: same >= 2,
    chiUses,
  };
}
