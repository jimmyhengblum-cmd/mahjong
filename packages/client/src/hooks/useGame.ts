import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAction,
  botStep,
  checkHu,
  startRound,
  type ClaimIntent,
  type ExposedMeld,
  type RoundAction,
  type RoundEvent,
  type RoundState,
  type SeatIndex,
  type TileCode,
} from "@mjwz/engine";

const HUMAN_SEAT: SeatIndex = 0;
const BOT_TURN_DELAY_MS = 800;

export interface UseGameResult {
  state: RoundState;
  humanSeat: SeatIndex;
  events: RoundEvent[];
  isHumanTurn: boolean;
  isHumanReacting: boolean;
  humanReactionOptions: HumanReactionOptions;
  /** Démarrer une nouvelle manche. */
  newRound: () => void;
  /** Défausser une tuile (depuis la phase discard du humain). */
  discard: (tile: TileCode) => void;
  /** Réclamer la défausse adverse. */
  claim: (intent: ClaimIntent) => void;
  /** Passer la réaction sur défausse adverse. */
  pass: () => void;
  /** Auto-Hu (depuis la phase discard du humain). */
  selfHu: () => void;
}

export interface HumanReactionOptions {
  canHu: boolean;
  canKong: boolean;
  canPong: boolean;
  /** Si non-null : les paires de tuiles utilisables pour Chi. */
  chiUses: ReadonlyArray<readonly [TileCode, TileCode]>;
}

const EMPTY_REACTION: HumanReactionOptions = {
  canHu: false,
  canKong: false,
  canPong: false,
  chiUses: [],
};

export function useGame(): UseGameResult {
  const [state, setState] = useState<RoundState>(() => startRound(Date.now()));
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const driverTimeout = useRef<number | null>(null);

  // Émet un applyAction et accumule les events (toute la manche, reset au newRound)
  const dispatch = useCallback((action: RoundAction) => {
    setState((prev) => {
      const { state: next, events: newEvents } = applyAction(prev, action);
      setEvents((evts) => [...evts, ...newEvents]);
      return next;
    });
  }, []);

  // Driver de bots : déclenché à chaque changement d'état
  useEffect(() => {
    if (driverTimeout.current !== null) {
      clearTimeout(driverTimeout.current);
      driverTimeout.current = null;
    }
    const action = nextBotAction(state, HUMAN_SEAT);
    if (action) {
      driverTimeout.current = window.setTimeout(() => {
        dispatch(action);
      }, BOT_TURN_DELAY_MS);
    } else if (state.phase.kind === "reaction" && state.phase.pending.size === 0) {
      // Toutes réactions reçues → résoudre
      driverTimeout.current = window.setTimeout(() => {
        dispatch({ type: "resolve-reactions" });
      }, BOT_TURN_DELAY_MS);
    }
    return () => {
      if (driverTimeout.current !== null) clearTimeout(driverTimeout.current);
    };
  }, [state, dispatch]);

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
    isHumanTurn,
    isHumanReacting,
    humanReactionOptions,
    newRound: () => {
      setEvents([]);
      setState(startRound(Date.now()));
    },
    discard: (tile) => dispatch({ type: "discard", seat: HUMAN_SEAT, tile }),
    claim: (intent) => dispatch({ type: "claim", seat: HUMAN_SEAT, intent }),
    pass: () => dispatch({ type: "pass", seat: HUMAN_SEAT }),
    selfHu: () => dispatch({ type: "self-hu", seat: HUMAN_SEAT }),
  };
}

/** Calcule la prochaine action automatique : pour un bot, ou un auto-pioche du humain en phase draw. */
function nextBotAction(state: RoundState, humanSeat: SeatIndex): RoundAction | null {
  if (state.phase.kind === "ended") return null;

  if (state.phase.kind === "draw") {
    if (state.phase.current === humanSeat) {
      // On auto-pioche pour le humain (simplification de l'UX).
      return { type: "draw", seat: humanSeat };
    }
    return botStep(state, state.phase.current);
  }

  if (state.phase.kind === "discard") {
    if (state.phase.current === humanSeat) return null; // attend l'input humain
    return botStep(state, state.phase.current);
  }

  if (state.phase.kind === "reaction") {
    for (const seat of state.phase.pending) {
      if (seat === humanSeat) continue; // attend l'input humain
      return botStep(state, seat);
    }
    return null;
  }

  return null;
}

// -------------------- Réactions humain --------------------

function computeReactionOptions(
  state: RoundState,
  seat: SeatIndex
): HumanReactionOptions {
  if (state.phase.kind !== "reaction") return EMPTY_REACTION;
  const { discardedTile, discardedBy } = state.phase;
  const hand = state.hands[seat]!;

  const same = countInArray(hand.concealed, discardedTile);

  // Hu check
  const huCheck = checkHu({
    concealed: [...hand.concealed, discardedTile],
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  }).valid;

  // Chi options (siège suivant uniquement + tuile numérique)
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

