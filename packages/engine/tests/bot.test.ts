import { describe, it, expect } from "vitest";
import {
  applyAction,
  botStep,
  startRound,
  type RoundState,
  type SeatIndex,
  type TileCode,
} from "../src/index.js";

/**
 * Helper : 14 tuiles "safe" — toutes distinctes, sans potentiel de meld entre elles.
 * Permet de remplir une main de manière à ce qu'aucun Hu ne soit involontairement valide.
 * Le 白板 est exclu (utilisé comme jokerValue dans les tests).
 */
const SAFE_JUNK: TileCode[] = [
  "we", "ws", "ww", "wn",        // 4 vents, tous distincts
  "dr", "dg",                     // 2 dragons (pas de dw = joker)
  "m1", "m9", "p1", "p9", "s1", "s9",  // 6 extrêmes (pas de chow possible)
  "p3", "p7", "s3", "s7",         // 4 isolés (familles différentes de m4/m5/m6 utilisés en seed)
];

const JOKER_VALUE: TileCode = "dw"; // 白板 → aucune main de test ne le contient

function setup(dealer: SeatIndex = 0): RoundState {
  const s = startRound(1, dealer);
  return { ...s, ctx: { jokerValue: JOKER_VALUE } };
}

function forceHand(state: RoundState, seat: SeatIndex, tiles: TileCode[]): RoundState {
  const size = seat === state.dealer ? 17 : 16;
  const newHands = state.hands.map((h, i) =>
    i === seat ? { ...h, concealed: tiles.slice(0, size) } : h
  );
  return { ...state, hands: newHands };
}

/** Construit une main de la taille requise avec un seed + junk. Pas de Hu possible. */
function junkHand(seed: TileCode[], dealer: boolean): TileCode[] {
  const size = dealer ? 17 : 16;
  return [...seed, ...SAFE_JUNK].slice(0, size);
}

describe("botStep — phases", () => {
  it("retourne `draw` quand c'est au bot de piocher", () => {
    let s = setup(0);
    const t = s.hands[0]!.concealed[0]!;
    s = applyAction(s, { type: "discard", seat: 0, tile: t }).state;
    s = applyAction(s, { type: "pass", seat: 1 }).state;
    s = applyAction(s, { type: "pass", seat: 2 }).state;
    s = applyAction(s, { type: "pass", seat: 3 }).state;
    s = applyAction(s, { type: "resolve-reactions" }).state;
    expect(botStep(s, 1)).toEqual({ type: "draw", seat: 1 });
  });

  it("retourne `null` quand ce n'est pas son tour", () => {
    const s = setup(0);
    expect(botStep(s, 1)).toBeNull();
  });

  it("retourne `discard` après pioche si pas de self-Hu", () => {
    const s = setup(0);
    const action = botStep(s, 0);
    expect(action?.type).toBe("discard");
    expect((action as any).tile).toBeDefined();
  });

  it("retourne `self-hu` si main initiale gagnante", () => {
    let s = setup(0);
    s = forceHand(s, 0, [
      "m1","m1",
      "m4","m4","m4",
      "p7","p7","p7",
      "s2","s2","s2",
      "we","we","we",
      "dr","dr","dr",
    ]);
    expect(botStep(s, 0)).toEqual({ type: "self-hu", seat: 0 });
  });
});

describe("botStep — réactions", () => {
  it("claim Hu quand la défausse complète la main", () => {
    let s = setup(0);
    s = forceHand(s, 0, junkHand(["m5"], true));
    s = forceHand(s, 2, [
      "m5",
      "p1","p1","p1",
      "p4","p4","p4",
      "s7","s7","s7",
      "we","we","we",
      "dr","dr","dr",
    ]);
    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    expect(botStep(s, 2)).toEqual({ type: "claim", seat: 2, intent: { type: "hu" } });
  });

  it("claim Pong avec 2 copies (pas de Hu sur cette main)", () => {
    let s = setup(0);
    s = forceHand(s, 0, junkHand(["m5"], true));
    s = forceHand(s, 2, junkHand(["m5", "m5"], false));
    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    expect(botStep(s, 2)).toEqual({ type: "claim", seat: 2, intent: { type: "pong" } });
  });

  it("claim Kong avec 3 copies", () => {
    let s = setup(0);
    s = forceHand(s, 0, junkHand(["m5"], true));
    s = forceHand(s, 2, junkHand(["m5", "m5", "m5"], false));
    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    expect(botStep(s, 2)).toEqual({ type: "claim", seat: 2, intent: { type: "kong" } });
  });

  it("Chi : seul le siège suivant peut chi (pas le siège plus loin)", () => {
    let s = setup(0);
    s = forceHand(s, 0, junkHand(["m5"], true));
    s = forceHand(s, 1, junkHand(["m4", "m6"], false));
    s = forceHand(s, 2, junkHand(["m4", "m6"], false));
    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    expect(botStep(s, 1)).toEqual({
      type: "claim",
      seat: 1,
      intent: { type: "chi", uses: ["m4", "m6"] },
    });
    expect(botStep(s, 2)).toEqual({ type: "pass", seat: 2 });
  });

  it("pass si aucune action n'est possible", () => {
    let s = setup(0);
    s = forceHand(s, 0, junkHand(["m5"], true));
    s = forceHand(s, 1, junkHand([], false));
    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    expect(botStep(s, 1)).toEqual({ type: "pass", seat: 1 });
  });
});

describe("botStep — choix de défausse", () => {
  it("préfère défausser une tuile isolée plutôt qu'une qui a des connexions", () => {
    let s = setup(0);
    // Main avec : paire de p1 (utile), m1+m2+m3 (chow), et un honneur isolé (we)
    s = forceHand(s, 0, [
      "p1", "p1",       // paire — utile
      "m1", "m2", "m3", // chow — utile
      "we",             // isolé
      ...SAFE_JUNK.slice(0, 11), // padding
    ]);
    const action = botStep(s, 0);
    expect(action?.type).toBe("discard");
    // On ne sait pas exactement quelle tuile, mais ça ne doit pas être m1/m2/m3/p1
    const discarded = (action as any).tile;
    expect(["m1", "m2", "m3", "p1"]).not.toContain(discarded);
  });
});
