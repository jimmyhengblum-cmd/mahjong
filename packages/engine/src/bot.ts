/**
 * Bot IA simple — heuristique mécanique pour valider le moteur en jeu réel.
 *
 * Stratégie :
 *   - Pioche dès que possible.
 *   - Si auto-Hu valide : Hu.
 *   - Sinon défausse la tuile la moins connectée (= la plus isolée par rapport
 *     au reste de la main : pas de paire, pas de potentiel de suite).
 *   - Sur défausse adverse : Hu > Kong > Pong > Chi (si siège suivant) > Pass.
 *
 * Pas de stratégie défensive ni d'optimisation de score — c'est juste un
 * adversaire mécanique pour pouvoir jouer une manche complète.
 */

import { checkHu } from "./hu.js";
import { nextSeat } from "./round.js";
import type {
  ClaimIntent,
  RoundAction,
  RoundState,
  SeatIndex,
} from "./round.js";
import {
  isNumbered,
  tileNumber,
  tileSuit,
  type NumberedTile,
  type Suit,
  type TileCode,
} from "./tiles.js";
import { BAI_BAN } from "./tiles.js";

export function botStep(state: RoundState, seat: SeatIndex): RoundAction | null {
  const phase = state.phase;

  if (phase.kind === "draw" && phase.current === seat) {
    return { type: "draw", seat };
  }

  if (phase.kind === "discard" && phase.current === seat) {
    if (canSelfHu(state, seat)) return { type: "self-hu", seat };
    const tile = pickDiscard(state, seat);
    return { type: "discard", seat, tile };
  }

  if (phase.kind === "reaction" && phase.pending.has(seat)) {
    const reaction = decideReaction(state, seat);
    if (reaction === "pass") return { type: "pass", seat };
    return { type: "claim", seat, intent: reaction };
  }

  return null;
}

// -------------------- Décision : discard --------------------

/** Score de "connection" d'une tuile dans la main (haut = utile, bas = jetable). */
function tileConnectivity(
  tile: TileCode,
  counts: Map<TileCode, number>,
  jokerValue: TileCode
): number {
  // Les jokers et 白板 (qui vaut jokerValue) sont précieux.
  if (tile === jokerValue) return 1000;
  if (tile === BAI_BAN && jokerValue !== BAI_BAN) return 500;

  const sameKind = (counts.get(tile) ?? 0) - 1;
  let score = sameKind * 5; // paire/triplet potentiel

  if (isNumbered(tile)) {
    const suit = tileSuit(tile);
    const n = tileNumber(tile);
    for (const delta of [-2, -1, 1, 2]) {
      const m = n + delta;
      if (m < 1 || m > 9) continue;
      const neighbor = `${suit}${m}` as TileCode;
      const c = counts.get(neighbor) ?? 0;
      if (c > 0) score += delta === -1 || delta === 1 ? 2 : 1;
    }
  }
  return score;
}

function pickDiscard(state: RoundState, seat: SeatIndex): TileCode {
  const hand = state.hands[seat]!.concealed;
  const counts = new Map<TileCode, number>();
  for (const t of hand) counts.set(t, (counts.get(t) ?? 0) + 1);

  let worst: TileCode = hand[0]!;
  let worstScore = Number.POSITIVE_INFINITY;
  for (const t of hand) {
    const s = tileConnectivity(t, counts, state.ctx.jokerValue);
    if (s < worstScore) {
      worstScore = s;
      worst = t;
    }
  }
  return worst;
}

// -------------------- Décision : auto-Hu --------------------

function canSelfHu(state: RoundState, seat: SeatIndex): boolean {
  const hand = state.hands[seat]!;
  return checkHu({
    concealed: hand.concealed,
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  }).valid;
}

// -------------------- Décision : réaction --------------------

type Reaction = ClaimIntent | "pass";

function decideReaction(state: RoundState, seat: SeatIndex): Reaction {
  if (state.phase.kind !== "reaction") return "pass";
  const { discardedTile, discardedBy } = state.phase;
  const hand = state.hands[seat]!;

  // 1. Hu prioritaire
  const huCheck = checkHu({
    concealed: sortTiles([...hand.concealed, discardedTile]),
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  });
  if (huCheck.valid) return { type: "hu" };

  // 2. Kong (3 exemplaires en main du même type que la défausse)
  const sameCount = countTiles(hand.concealed, discardedTile);
  if (sameCount >= 3) return { type: "kong" };

  // 3. Pong (2 exemplaires)
  if (sameCount >= 2) return { type: "pong" };

  // 4. Chi (siège suivant du défausseur uniquement, tuile numérique)
  if (nextSeat(discardedBy) === seat && isNumbered(discardedTile)) {
    const uses = findChiUses(hand.concealed, discardedTile);
    if (uses) return { type: "chi", uses };
  }

  return "pass";
}

/** Cherche 2 tuiles complétant une suite avec `discarded`. */
function findChiUses(
  concealed: readonly TileCode[],
  discarded: TileCode
): readonly [TileCode, TileCode] | null {
  if (!isNumbered(discarded)) return null;
  const suit: Suit = tileSuit(discarded);
  const n = tileNumber(discarded);
  // 3 patterns possibles : (n-2,n-1) / (n-1,n+1) / (n+1,n+2)
  const candidates: Array<[number, number]> = [
    [n - 2, n - 1],
    [n - 1, n + 1],
    [n + 1, n + 2],
  ];
  for (const [a, b] of candidates) {
    if (a < 1 || a > 9 || b < 1 || b > 9) continue;
    const ta = `${suit}${a}` as TileCode;
    const tb = `${suit}${b}` as TileCode;
    if (concealed.includes(ta) && concealed.includes(tb)) {
      return [ta, tb] as const;
    }
  }
  return null;
}

// -------------------- Helpers --------------------

function countTiles(arr: readonly TileCode[], tile: TileCode): number {
  let n = 0;
  for (const t of arr) if (t === tile) n++;
  return n;
}

const SUIT_ORDER: Record<Suit, number> = { m: 0, p: 1, s: 2 };
const HONOR_ORDER: Record<string, number> = {
  we: 30, ws: 31, ww: 32, wn: 33,
  dr: 40, dg: 41, dw: 42,
};

function sortTiles(tiles: readonly TileCode[]): TileCode[] {
  return [...tiles].sort((a, b) => {
    const ra = isNumbered(a) ? SUIT_ORDER[tileSuit(a)] * 10 + tileNumber(a) : HONOR_ORDER[a]!;
    const rb = isNumbered(b) ? SUIT_ORDER[tileSuit(b)] * 10 + tileNumber(b) : HONOR_ORDER[b]!;
    return ra - rb;
  });
}
