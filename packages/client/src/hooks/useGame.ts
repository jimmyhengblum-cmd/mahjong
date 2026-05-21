import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  applyAction,
  botStep,
  checkHu,
  startRound,
  type ClaimIntent,
  type RoundAction,
  type RoundEvent,
  type RoundState,
  type SeatIndex,
  type TileCode,
} from "@mjwz/engine";

const HUMAN_SEAT: SeatIndex = 0;
const BOT_TURN_DELAY_MS = 800;
const ANNOUNCEMENT_DURATION_MS = 1600;
const DEAL_ANIMATION_MS = 1700;

export interface UseGameResult {
  state: RoundState;
  humanSeat: SeatIndex;
  events: readonly RoundEvent[];
  announcement: AnnouncementEvent | null;
  /** True pendant l'animation de distribution (~1.7s après newRound). */
  isDealing: boolean;
  /** Compteur incrémenté à chaque nouvelle manche — utile comme key React. */
  dealCounter: number;
  isHumanTurn: boolean;
  isHumanReacting: boolean;
  humanReactionOptions: HumanReactionOptions;
  newRound: () => void;
  discard: (tile: TileCode) => void;
  claim: (intent: ClaimIntent) => void;
  pass: () => void;
  selfHu: () => void;
}

export type AnnouncementEvent =
  | { type: "claimed"; seat: SeatIndex; intent: ClaimIntent }
  | { type: "hu"; seat: SeatIndex; selfPick: boolean };

export interface HumanReactionOptions {
  canHu: boolean;
  canKong: boolean;
  canPong: boolean;
  chiUses: ReadonlyArray<readonly [TileCode, TileCode]>;
}

const EMPTY_REACTION: HumanReactionOptions = {
  canHu: false,
  canKong: false,
  canPong: false,
  chiUses: [],
};

// -------------------- Reducer (pur, safe StrictMode) --------------------

interface GameInternalState {
  engine: RoundState;
  events: RoundEvent[];
}

type GameReducerAction =
  | { type: "apply"; action: RoundAction }
  | { type: "newRound"; seed: number };

function gameReducer(state: GameInternalState, ra: GameReducerAction): GameInternalState {
  if (ra.type === "newRound") {
    return { engine: startRound(ra.seed), events: [] };
  }
  const { state: nextEngine, events: newEvents } = applyAction(state.engine, ra.action);
  return {
    engine: nextEngine,
    events: [...state.events, ...newEvents],
  };
}

// -------------------- Hook --------------------

export function useGame(): UseGameResult {
  const [{ engine: state, events }, dispatchRaw] = useReducer(
    gameReducer,
    undefined,
    () => ({ engine: startRound(Date.now()), events: [] })
  );

  const dispatch = useCallback((action: RoundAction) => {
    dispatchRaw({ type: "apply", action });
  }, []);

  // Animation de distribution : isDealing=true pendant DEAL_ANIMATION_MS après newRound
  const [dealCounter, setDealCounter] = useState(0);
  const [isDealing, setIsDealing] = useState(true);
  useEffect(() => {
    setIsDealing(true);
    const t = setTimeout(() => setIsDealing(false), DEAL_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [dealCounter]);

  // Driver de bots (pausé pendant l'animation de distribution)
  const driverTimeout = useRef<number | null>(null);
  useEffect(() => {
    if (driverTimeout.current !== null) {
      clearTimeout(driverTimeout.current);
      driverTimeout.current = null;
    }
    if (isDealing) return;
    const action = nextBotAction(state, HUMAN_SEAT);
    if (action) {
      driverTimeout.current = window.setTimeout(() => {
        dispatch(action);
      }, BOT_TURN_DELAY_MS);
    } else if (state.phase.kind === "reaction" && state.phase.pending.size === 0) {
      driverTimeout.current = window.setTimeout(() => {
        dispatch({ type: "resolve-reactions" });
      }, BOT_TURN_DELAY_MS);
    }
    return () => {
      if (driverTimeout.current !== null) clearTimeout(driverTimeout.current);
    };
  }, [state, dispatch, isDealing]);

  // Annonce de claim / hu
  const [announcement, setAnnouncement] = useState<AnnouncementEvent | null>(null);
  const lastSeenLen = useRef(0);
  useEffect(() => {
    if (events.length <= lastSeenLen.current) {
      lastSeenLen.current = events.length; // reset après newRound
      return;
    }
    const fresh = events.slice(lastSeenLen.current);
    lastSeenLen.current = events.length;
    for (const e of fresh) {
      if (e.type === "claimed") {
        setAnnouncement({ type: "claimed", seat: e.seat, intent: e.intent });
      } else if (e.type === "hu") {
        setAnnouncement({ type: "hu", seat: e.seat, selfPick: e.selfPick });
      }
    }
  }, [events]);
  useEffect(() => {
    if (!announcement) return;
    const t = setTimeout(() => setAnnouncement(null), ANNOUNCEMENT_DURATION_MS);
    return () => clearTimeout(t);
  }, [announcement]);

  const isHumanTurn =
    state.phase.kind !== "ended" &&
    (state.phase.kind === "discard" && state.phase.current === HUMAN_SEAT);

  const isHumanReacting =
    state.phase.kind === "reaction" && state.phase.pending.has(HUMAN_SEAT);

  const humanReactionOptions = useMemo<HumanReactionOptions>(() => {
    if (state.phase.kind !== "reaction") return EMPTY_REACTION;
    if (!state.phase.pending.has(HUMAN_SEAT)) return EMPTY_REACTION;
    return computeReactionOptions(state, HUMAN_SEAT);
  }, [state]);

  return {
    state,
    humanSeat: HUMAN_SEAT,
    events,
    announcement,
    isDealing,
    dealCounter,
    isHumanTurn,
    isHumanReacting,
    humanReactionOptions,
    newRound: () => {
      dispatchRaw({ type: "newRound", seed: Date.now() });
      setDealCounter((c) => c + 1);
    },
    discard: (tile) => dispatch({ type: "discard", seat: HUMAN_SEAT, tile }),
    claim: (intent) => dispatch({ type: "claim", seat: HUMAN_SEAT, intent }),
    pass: () => dispatch({ type: "pass", seat: HUMAN_SEAT }),
    selfHu: () => dispatch({ type: "self-hu", seat: HUMAN_SEAT }),
  };
}

// -------------------- Bot driver --------------------

function nextBotAction(state: RoundState, humanSeat: SeatIndex): RoundAction | null {
  if (state.phase.kind === "ended") return null;

  if (state.phase.kind === "draw") {
    if (state.phase.current === humanSeat) {
      return { type: "draw", seat: humanSeat };
    }
    return botStep(state, state.phase.current);
  }

  if (state.phase.kind === "discard") {
    if (state.phase.current === humanSeat) return null;
    return botStep(state, state.phase.current);
  }

  if (state.phase.kind === "reaction") {
    for (const seat of state.phase.pending) {
      if (seat === humanSeat) continue;
      return botStep(state, seat);
    }
    return null;
  }

  return null;
}

// -------------------- Réactions humain --------------------

function computeReactionOptions(state: RoundState, seat: SeatIndex): HumanReactionOptions {
  if (state.phase.kind !== "reaction") return EMPTY_REACTION;
  const { discardedTile, discardedBy } = state.phase;
  const hand = state.hands[seat]!;

  const same = countInArray(hand.concealed, discardedTile);

  const huCheck = checkHu({
    concealed: [...hand.concealed, discardedTile],
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  }).valid;

  const chiUses: Array<readonly [TileCode, TileCode]> = [];
  if (nextSeatIdx(discardedBy) === seat && isNumberedTile(discardedTile)) {
    const suit = discardedTile[0];
    const n = parseInt(discardedTile[1]!, 10);
    for (const [da, db] of [
      [-2, -1],
      [-1, 1],
      [1, 2],
    ] as const) {
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

  return {
    canHu: huCheck,
    canKong: same >= 3,
    canPong: same >= 2,
    chiUses,
  };
}

function countInArray(arr: readonly TileCode[], tile: TileCode): number {
  let n = 0;
  for (const t of arr) if (t === tile) n++;
  return n;
}

function isNumberedTile(t: TileCode): boolean {
  return t.length === 2 && (t[0] === "m" || t[0] === "p" || t[0] === "s");
}

function nextSeatIdx(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}
