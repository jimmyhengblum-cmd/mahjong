/**
 * Machine d'état d'une manche (round) — Mahjong de Wenzhou.
 *
 * Une manche se déroule en cycles :
 *   1. Distribution initiale (16 tuiles aux 3 non-donneurs, 17 au donneur).
 *   2. Le donneur joue directement (phase Discard).
 *   3. À chaque discard, les 3 autres joueurs peuvent réagir :
 *        - 胡 (Hu)   : remporte la manche.
 *        - 杠 (Kong) : ajoute la tuile à un triplet existant pour faire un kong.
 *        - 碰 (Pong) : forme un triplet avec 2 tuiles identiques de la main.
 *        - 吃 (Chi)  : seul le joueur suivant peut former une suite.
 *      Priorité : 胡 > 杠 > 碰 > 吃. En cas d'égalité Hu, le premier joueur
 *      dans le sens du jeu (à droite du défausseur) l'emporte.
 *   4. Le joueur qui a réagi (ou le suivant si tout le monde passe) pioche et
 *      doit jouer une tuile (discard ou Hu auto-pioche).
 *   5. Si le mur est épuisé sans Hu : 流局 (manche nulle).
 *
 * La machine est pure : `applyAction(state, action) → { state, events }`.
 * Le serveur orchestre le timing (timeouts pour les réactions), la machine
 * ne fait que valider et muter l'état déterministiquement.
 */

import type { TileCode } from "./tiles.js";
import type { CaishenContext } from "./caishen.js";
import type { ExposedMeld, MeldType } from "./meld.js";
import { createWall, draw, type Wall } from "./wall.js";
import { checkHu, type HuResult } from "./hu.js";
import { isNumbered, tileSuit, tileNumber } from "./tiles.js";
import type { NumberedTile, Suit } from "./tiles.js";

/** Numéro de siège — 0=East (donneur initial), 1=South, 2=West, 3=North. */
export type SeatIndex = 0 | 1 | 2 | 3;
export const SEATS: SeatIndex[] = [0, 1, 2, 3];

/** Sens de jeu : Wenzhou tourne dans le sens des aiguilles d'une montre (E→S→W→N→E). */
export function nextSeat(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}

export interface PlayerHand {
  readonly concealed: readonly TileCode[];
  readonly exposed: readonly ExposedMeld[];
  /** Défausses du joueur dans l'ordre chronologique. */
  readonly discards: readonly TileCode[];
}

export type Phase =
  /** En attente de pioche pour `current`. */
  | { kind: "draw"; current: SeatIndex }
  /** `current` vient de piocher / réagir, doit jouer (discard ou Hu auto-pioche). */
  | { kind: "discard"; current: SeatIndex }
  /** Une tuile vient d'être défaussée. Attend les réactions des 3 autres. */
  | {
      kind: "reaction";
      discardedBy: SeatIndex;
      discardedTile: TileCode;
      /** Sièges qui n'ont pas encore réagi (passé ou claim). */
      pending: ReadonlySet<SeatIndex>;
      /** Réactions reçues, indexées par siège. */
      claims: ReadonlyMap<SeatIndex, ClaimIntent>;
    }
  | { kind: "ended"; result: RoundResult };

export type ClaimIntent =
  | { type: "hu" }
  | { type: "kong" }
  | { type: "pong" }
  | { type: "chi"; uses: readonly [TileCode, TileCode] }; // 2 tuiles de la main pour compléter la suite

export interface RoundResult {
  readonly kind: "hu" | "drawn-wall";
  /** Gagnant — null si 流局. */
  readonly winner: SeatIndex | null;
  /** Défausseur — null si auto-pioche ou 流局. */
  readonly discarder: SeatIndex | null;
  readonly huResult?: HuResult;
}

export interface RoundState {
  readonly seed: number;
  readonly dealer: SeatIndex;
  readonly ctx: CaishenContext;
  readonly wall: Wall;
  readonly hands: ReadonlyArray<PlayerHand>; // index = SeatIndex
  readonly phase: Phase;
  /** True tant qu'aucun tirage/discard n'a eu lieu (utile pour 天胡/地胡). */
  readonly firstTurn: boolean;
}

export type RoundAction =
  | { type: "draw"; seat: SeatIndex }
  | { type: "discard"; seat: SeatIndex; tile: TileCode }
  | { type: "self-hu"; seat: SeatIndex }
  | { type: "claim"; seat: SeatIndex; intent: ClaimIntent }
  | { type: "pass"; seat: SeatIndex }
  | { type: "resolve-reactions" };

export type RoundEvent =
  | { type: "drawn"; seat: SeatIndex; tile: TileCode }
  | { type: "discarded"; seat: SeatIndex; tile: TileCode }
  | { type: "claimed"; seat: SeatIndex; intent: ClaimIntent; meld: ExposedMeld }
  | { type: "passed"; seat: SeatIndex }
  | { type: "hu"; seat: SeatIndex; huResult: HuResult; selfPick: boolean; discarder: SeatIndex | null }
  | { type: "drawn-wall" };

// -------------------- Démarrage manche --------------------

const STARTING_HAND_SIZE = 16;

export function startRound(seed: number, dealer: SeatIndex = 0): RoundState {
  const { wall, ctx } = createWall(seed);

  // Distribution : 16 tuiles à chacun, puis 1 supplémentaire au donneur.
  let w = wall;
  const hands: PlayerHand[] = [];
  for (let i = 0; i < 4; i++) {
    const { drawn, rest } = draw(w, STARTING_HAND_SIZE);
    w = rest;
    hands.push({
      concealed: sortTiles(drawn),
      exposed: [],
      discards: [],
    });
  }
  // Le donneur pioche 1 tuile en plus pour démarrer.
  const { drawn: dealerDraw, rest: wAfterDealer } = draw(w, 1);
  hands[dealer] = {
    ...hands[dealer]!,
    concealed: sortTiles([...hands[dealer]!.concealed, ...dealerDraw]),
  };

  return {
    seed,
    dealer,
    ctx,
    wall: wAfterDealer,
    hands,
    phase: { kind: "discard", current: dealer },
    firstTurn: true,
  };
}

// -------------------- Application d'action --------------------

export interface ApplyResult {
  state: RoundState;
  events: RoundEvent[];
}

export function applyAction(state: RoundState, action: RoundAction): ApplyResult {
  if (state.phase.kind === "ended") {
    throw new Error("La manche est terminée.");
  }
  switch (action.type) {
    case "draw":      return doDraw(state, action.seat);
    case "discard":   return doDiscard(state, action.seat, action.tile);
    case "self-hu":   return doSelfHu(state, action.seat);
    case "claim":     return doClaim(state, action.seat, action.intent);
    case "pass":      return doPass(state, action.seat);
    case "resolve-reactions": return doResolveReactions(state);
  }
}

function doDraw(state: RoundState, seat: SeatIndex): ApplyResult {
  if (state.phase.kind !== "draw" || state.phase.current !== seat) {
    throw new Error(`Pioche illégale pour le siège ${seat}.`);
  }
  if (state.wall.tiles.length === 0) {
    return endRound(state, { kind: "drawn-wall", winner: null, discarder: null });
  }
  const { drawn, rest } = draw(state.wall, 1);
  const tile = drawn[0]!;
  const hand = state.hands[seat]!;
  const newHands = replaceHand(state.hands, seat, {
    ...hand,
    concealed: sortTiles([...hand.concealed, tile]),
  });
  return {
    state: {
      ...state,
      wall: rest,
      hands: newHands,
      phase: { kind: "discard", current: seat },
    },
    events: [{ type: "drawn", seat, tile }],
  };
}

function doDiscard(state: RoundState, seat: SeatIndex, tile: TileCode): ApplyResult {
  if (state.phase.kind !== "discard" || state.phase.current !== seat) {
    throw new Error(`Défausse illégale pour le siège ${seat}.`);
  }
  const hand = state.hands[seat]!;
  if (!hand.concealed.includes(tile)) {
    throw new Error(`Le siège ${seat} n'a pas la tuile ${tile} à défausser.`);
  }
  const newConcealed = removeOne(hand.concealed, tile);
  const newHands = replaceHand(state.hands, seat, {
    ...hand,
    concealed: newConcealed,
    discards: [...hand.discards, tile],
  });
  const pending = new Set<SeatIndex>(SEATS.filter((s) => s !== seat));
  return {
    state: {
      ...state,
      hands: newHands,
      phase: {
        kind: "reaction",
        discardedBy: seat,
        discardedTile: tile,
        pending,
        claims: new Map(),
      },
      firstTurn: false,
    },
    events: [{ type: "discarded", seat, tile }],
  };
}

function doSelfHu(state: RoundState, seat: SeatIndex): ApplyResult {
  if (state.phase.kind !== "discard" || state.phase.current !== seat) {
    throw new Error(`Auto-Hu illégal pour le siège ${seat}.`);
  }
  const hand = state.hands[seat]!;
  const huResult = checkHu({
    concealed: hand.concealed,
    exposedMelds: hand.exposed,
    ctx: state.ctx,
  });
  if (!huResult.valid) {
    throw new Error(`Le siège ${seat} n'a pas une main gagnante.`);
  }
  return endRound(
    state,
    { kind: "hu", winner: seat, discarder: null, huResult },
    [{ type: "hu", seat, huResult, selfPick: true, discarder: null }]
  );
}

function doClaim(state: RoundState, seat: SeatIndex, intent: ClaimIntent): ApplyResult {
  if (state.phase.kind !== "reaction") {
    throw new Error(`Pas de défausse à réclamer.`);
  }
  if (!state.phase.pending.has(seat)) {
    throw new Error(`Le siège ${seat} ne peut plus réagir.`);
  }
  // Validation du claim
  const valid = validateClaim(state, seat, intent);
  if (!valid) throw new Error(`Claim invalide pour le siège ${seat}.`);

  const newClaims = new Map(state.phase.claims);
  newClaims.set(seat, intent);
  const newPending = new Set(state.phase.pending);
  newPending.delete(seat);

  return {
    state: {
      ...state,
      phase: { ...state.phase, claims: newClaims, pending: newPending },
    },
    events: [], // l'événement de claim sera émis à la résolution
  };
}

function doPass(state: RoundState, seat: SeatIndex): ApplyResult {
  if (state.phase.kind !== "reaction") {
    throw new Error(`Pas de défausse à passer.`);
  }
  if (!state.phase.pending.has(seat)) {
    throw new Error(`Le siège ${seat} ne peut plus réagir.`);
  }
  const newPending = new Set(state.phase.pending);
  newPending.delete(seat);
  return {
    state: { ...state, phase: { ...state.phase, pending: newPending } },
    events: [{ type: "passed", seat }],
  };
}

function doResolveReactions(state: RoundState): ApplyResult {
  if (state.phase.kind !== "reaction") {
    throw new Error("Pas en phase de réaction.");
  }
  if (state.phase.pending.size > 0) {
    throw new Error("Toutes les réactions ne sont pas reçues.");
  }
  const { discardedBy, discardedTile, claims } = state.phase;
  const winner = pickReactionWinner(claims, discardedBy);

  // Personne ne réclame : on passe au joueur suivant.
  if (winner === null) {
    return {
      state: { ...state, phase: { kind: "draw", current: nextSeat(discardedBy) } },
      events: [],
    };
  }

  const { seat, intent } = winner;
  if (intent.type === "hu") {
    const claimant = state.hands[seat]!;
    const concealedWithTile = sortTiles([...claimant.concealed, discardedTile]);
    const huResult = checkHu({
      concealed: concealedWithTile,
      exposedMelds: claimant.exposed,
      ctx: state.ctx,
    });
    if (!huResult.valid) throw new Error("Hu réclamé mais main invalide.");
    return endRound(
      state,
      { kind: "hu", winner: seat, discarder: discardedBy, huResult },
      [{ type: "hu", seat, huResult, selfPick: false, discarder: discardedBy }]
    );
  }

  // Chi / Pong / Kong : forme la combinaison et passe la main à `seat`.
  const meld = buildMeld(state, seat, intent, discardedTile);
  const hand = state.hands[seat]!;
  const tilesUsedFromHand = meldUsesFromHand(intent, discardedTile);
  let newConcealed = hand.concealed.slice();
  for (const t of tilesUsedFromHand) newConcealed = removeOne(newConcealed, t);

  const newHands = replaceHand(state.hands, seat, {
    ...hand,
    concealed: newConcealed,
    exposed: [...hand.exposed, meld],
  });

  return {
    state: {
      ...state,
      hands: newHands,
      phase:
        intent.type === "kong"
          ? { kind: "draw", current: seat } // kong donne droit à 1 pioche de remplacement
          : { kind: "discard", current: seat },
    },
    events: [{ type: "claimed", seat, intent, meld }],
  };
}

// -------------------- Validation des claims --------------------

function validateClaim(
  state: RoundState,
  seat: SeatIndex,
  intent: ClaimIntent
): boolean {
  if (state.phase.kind !== "reaction") return false;
  const { discardedBy, discardedTile } = state.phase;
  const hand = state.hands[seat]!;

  if (intent.type === "chi") {
    if (nextSeat(discardedBy) !== seat) return false;
    if (!isNumbered(discardedTile)) return false;
    const [u1, u2] = intent.uses;
    if (!hand.concealed.includes(u1) || !hand.concealed.includes(u2)) return false;
    return isValidChow([discardedTile, u1, u2]);
  }
  if (intent.type === "pong") {
    const c = countInArray(hand.concealed, discardedTile);
    return c >= 2;
  }
  if (intent.type === "kong") {
    const c = countInArray(hand.concealed, discardedTile);
    return c >= 3;
  }
  if (intent.type === "hu") {
    const huResult = checkHu({
      concealed: sortTiles([...hand.concealed, discardedTile]),
      exposedMelds: hand.exposed,
      ctx: state.ctx,
    });
    return huResult.valid;
  }
  return false;
}

function isValidChow(tiles: readonly TileCode[]): boolean {
  if (tiles.length !== 3) return false;
  if (!tiles.every(isNumbered)) return false;
  const numbered = tiles as readonly NumberedTile[];
  const suit = tileSuit(numbered[0]!);
  if (!numbered.every((t) => tileSuit(t) === suit)) return false;
  const nums = numbered.map(tileNumber).sort((a, b) => a - b);
  return nums[0]! + 1 === nums[1] && nums[1]! + 1 === nums[2]!;
}

// -------------------- Résolution priorité --------------------

const PRIORITY: Record<ClaimIntent["type"], number> = {
  hu: 4,
  kong: 3,
  pong: 2,
  chi: 1,
};

function pickReactionWinner(
  claims: ReadonlyMap<SeatIndex, ClaimIntent>,
  discardedBy: SeatIndex
): { seat: SeatIndex; intent: ClaimIntent } | null {
  if (claims.size === 0) return null;
  let best: { seat: SeatIndex; intent: ClaimIntent; order: number } | null = null;
  for (const [seat, intent] of claims) {
    const priority = PRIORITY[intent.type];
    // Distance dans le sens du jeu (depuis le défausseur).
    const distance = (seat - discardedBy + 4) % 4;
    if (
      best === null ||
      priority > PRIORITY[best.intent.type] ||
      (priority === PRIORITY[best.intent.type] && distance < best.order)
    ) {
      best = { seat, intent, order: distance };
    }
  }
  return best ? { seat: best.seat, intent: best.intent } : null;
}

// -------------------- Helpers --------------------

function buildMeld(
  state: RoundState,
  seat: SeatIndex,
  intent: ClaimIntent,
  discardedTile: TileCode
): ExposedMeld {
  if (intent.type === "chi") {
    const tiles = sortTiles([discardedTile, ...intent.uses]);
    return { type: "chi", tiles };
  }
  if (intent.type === "pong") {
    return { type: "pong", tiles: [discardedTile, discardedTile, discardedTile] };
  }
  if (intent.type === "kong") {
    return {
      type: "kong",
      tiles: [discardedTile, discardedTile, discardedTile, discardedTile],
      kongOrigin: "exposed",
    };
  }
  throw new Error("Intent non-meld pour buildMeld");
}

function meldUsesFromHand(intent: ClaimIntent, discardedTile: TileCode): TileCode[] {
  if (intent.type === "chi") return [...intent.uses];
  if (intent.type === "pong") return [discardedTile, discardedTile];
  if (intent.type === "kong") return [discardedTile, discardedTile, discardedTile];
  return [];
}

function endRound(
  state: RoundState,
  result: RoundResult,
  extraEvents: RoundEvent[] = []
): ApplyResult {
  return {
    state: { ...state, phase: { kind: "ended", result } },
    events: extraEvents,
  };
}

function replaceHand(
  hands: ReadonlyArray<PlayerHand>,
  seat: SeatIndex,
  hand: PlayerHand
): PlayerHand[] {
  const out = hands.slice();
  out[seat] = hand;
  return out;
}

function removeOne(arr: readonly TileCode[], tile: TileCode): TileCode[] {
  const idx = arr.indexOf(tile);
  if (idx === -1) throw new Error(`Tuile ${tile} absente`);
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

function countInArray(arr: readonly TileCode[], tile: TileCode): number {
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
  return [...tiles].sort(compareTiles);
}

function compareTiles(a: TileCode, b: TileCode): number {
  return tileRank(a) - tileRank(b);
}

function tileRank(t: TileCode): number {
  if (isNumbered(t)) return SUIT_ORDER[tileSuit(t)] * 10 + tileNumber(t);
  return HONOR_ORDER[t] ?? 99;
}
