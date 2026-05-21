import { describe, it, expect } from "vitest";
import {
  applyAction,
  nextSeat,
  startRound,
  type RoundState,
  type SeatIndex,
} from "../src/index.js";

function freshRound(seed = 1, dealer: SeatIndex = 0) {
  return startRound(seed, dealer);
}

describe("startRound", () => {
  it("distribue 16 tuiles à chacun, +1 au donneur", () => {
    const s = freshRound(42, 0);
    expect(s.hands[0]!.concealed.length).toBe(17);
    expect(s.hands[1]!.concealed.length).toBe(16);
    expect(s.hands[2]!.concealed.length).toBe(16);
    expect(s.hands[3]!.concealed.length).toBe(16);
  });

  it("retire 65 tuiles du mur (16×4 + 1 donneur)", () => {
    const s = freshRound(42);
    expect(s.wall.tiles.length).toBe(136 - 65);
  });

  it("commence en phase discard pour le donneur", () => {
    const s = freshRound(42, 1);
    expect(s.phase).toMatchObject({ kind: "discard", current: 1 });
    expect(s.firstTurn).toBe(true);
  });

  it("dérive le 财神 depuis le mur", () => {
    const s = freshRound(42);
    expect(s.ctx.jokerValue).toBeDefined();
  });
});

describe("Cycle draw / discard", () => {
  it("le donneur défausse, on entre en phase reaction", () => {
    let s = freshRound(42, 0);
    const tileToDiscard = s.hands[0]!.concealed[0]!;
    const { state } = applyAction(s, { type: "discard", seat: 0, tile: tileToDiscard });
    expect(state.phase.kind).toBe("reaction");
    expect(state.hands[0]!.concealed.length).toBe(16);
    expect(state.hands[0]!.discards).toEqual([tileToDiscard]);
    expect(state.firstTurn).toBe(false);
  });

  it("après pass de tous, le siège suivant passe en phase draw", () => {
    let s = freshRound(42, 0);
    const t = s.hands[0]!.concealed[0]!;
    s = applyAction(s, { type: "discard", seat: 0, tile: t }).state;
    s = applyAction(s, { type: "pass", seat: 1 }).state;
    s = applyAction(s, { type: "pass", seat: 2 }).state;
    s = applyAction(s, { type: "pass", seat: 3 }).state;
    s = applyAction(s, { type: "resolve-reactions" }).state;
    expect(s.phase).toMatchObject({ kind: "draw", current: 1 });
  });

  it("après pioche, le joueur courant entre en phase discard", () => {
    let s = freshRound(42, 0);
    const t = s.hands[0]!.concealed[0]!;
    s = applyAction(s, { type: "discard", seat: 0, tile: t }).state;
    s = applyAction(s, { type: "pass", seat: 1 }).state;
    s = applyAction(s, { type: "pass", seat: 2 }).state;
    s = applyAction(s, { type: "pass", seat: 3 }).state;
    s = applyAction(s, { type: "resolve-reactions" }).state;
    const before = s.wall.tiles.length;
    s = applyAction(s, { type: "draw", seat: 1 }).state;
    expect(s.phase).toMatchObject({ kind: "discard", current: 1 });
    expect(s.hands[1]!.concealed.length).toBe(17);
    expect(s.wall.tiles.length).toBe(before - 1);
  });
});

describe("Claims — pong sur défausse", () => {
  it("un joueur avec 2 copies de la tuile peut pong", () => {
    // On force une main connue : remplace concealed du siège 2 par 2× "m5"
    let s = freshRound(42, 0);
    const discarder: SeatIndex = 0;
    // Trouve quelle tuile sera défaussée et plante 2 copies dans la main du siège 2
    const tileForcedDiscard = "m5";
    s = forceHand(s, discarder, [
      tileForcedDiscard,
      ...s.hands[discarder]!.concealed.filter((t) => t !== tileForcedDiscard).slice(0, 16),
    ]);
    s = forceHand(s, 2, [
      "m5", "m5",
      ...s.hands[2]!.concealed.filter((t) => t !== "m5").slice(0, 14),
    ]);

    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    s = applyAction(s, { type: "pass", seat: 1 }).state;
    s = applyAction(s, { type: "claim", seat: 2, intent: { type: "pong" } }).state;
    s = applyAction(s, { type: "pass", seat: 3 }).state;
    s = applyAction(s, { type: "resolve-reactions" }).state;

    expect(s.phase).toMatchObject({ kind: "discard", current: 2 });
    expect(s.hands[2]!.exposed[0]).toMatchObject({ type: "pong" });
    expect(s.hands[2]!.exposed[0]!.tiles).toEqual(["m5", "m5", "m5"]);
    // Les 2 m5 utilisés ont quitté la main concealed du siège 2
    expect(s.hands[2]!.concealed.filter((t) => t === "m5").length).toBe(0);
  });
});

describe("Priorité 胡 > 杠 > 碰 > 吃", () => {
  it("Hu bat Pong qui bat Chi", () => {
    let s = freshRound(42, 0);
    s = forceHand(s, 0, ["m5", ...Array(16).fill("p1") as any]); // peu importe
    // Siège 1 : chi possible (m4+m6)
    s = forceHand(s, 1, ["m4", "m6", ...new Array(14).fill("p1") as any]);
    // Siège 2 : pong possible (2 × m5)
    s = forceHand(s, 2, ["m5", "m5", ...new Array(14).fill("p2") as any]);
    // Siège 3 : Hu possible — on construit une main valide à 16 tuiles qui Hu sur m5
    // (5 triplets + paire où m5 complète une paire avec un m5 manquant)
    s = forceHand(s, 3, [
      "m5",            // paire en attente du 2e m5 (single wait sur m5)
      "p1","p1","p1",
      "p4","p4","p4",
      "s7","s7","s7",
      "we","we","we",
      "dr","dr","dr",
    ]);

    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    s = applyAction(s, { type: "claim", seat: 1, intent: { type: "chi", uses: ["m4", "m6"] } }).state;
    s = applyAction(s, { type: "claim", seat: 2, intent: { type: "pong" } }).state;
    s = applyAction(s, { type: "claim", seat: 3, intent: { type: "hu" } }).state;
    const r = applyAction(s, { type: "resolve-reactions" });

    // Hu remporte
    expect(r.state.phase).toMatchObject({ kind: "ended" });
    expect(r.events[0]).toMatchObject({ type: "hu", seat: 3, selfPick: false });
  });

  it("en cas de Hu multiple, le premier dans le sens du jeu gagne", () => {
    let s = freshRound(42, 0);
    s = forceHand(s, 0, ["m5", ...new Array(16).fill("p2") as any]);
    // Sièges 2 ET 3 peuvent Hu sur m5 (deux mains identiques pour le test)
    const winningHand = [
      "m5",
      "p1","p1","p1",
      "p4","p4","p4",
      "s7","s7","s7",
      "we","we","we",
      "dr","dr","dr",
    ];
    s = forceHand(s, 2, winningHand);
    s = forceHand(s, 3, winningHand);

    s = applyAction(s, { type: "discard", seat: 0, tile: "m5" }).state;
    s = applyAction(s, { type: "pass", seat: 1 }).state;
    s = applyAction(s, { type: "claim", seat: 2, intent: { type: "hu" } }).state;
    s = applyAction(s, { type: "claim", seat: 3, intent: { type: "hu" } }).state;
    const r = applyAction(s, { type: "resolve-reactions" });

    // Sens du jeu : 0 défausse → 1 (next) → 2 → 3. Le siège 2 est avant 3.
    expect(r.events[0]).toMatchObject({ type: "hu", seat: 2 });
  });
});

describe("Self-Hu (auto-pioche)", () => {
  it("le donneur peut Hu directement (天胡) si sa main initiale est valide", () => {
    let s = freshRound(42, 0);
    s = forceHand(s, 0, [
      "m1","m1",
      "m4","m4","m4",
      "p7","p7","p7",
      "s2","s2","s2",
      "we","we","we",
      "dr","dr","dr",
    ]);
    const r = applyAction(s, { type: "self-hu", seat: 0 });
    expect(r.state.phase).toMatchObject({ kind: "ended" });
    expect(r.events[0]).toMatchObject({ type: "hu", seat: 0, selfPick: true });
  });

  it("self-Hu refusé si la main n'est pas valide", () => {
    let s = freshRound(42, 0);
    expect(() => applyAction(s, { type: "self-hu", seat: 0 })).toThrow();
  });
});

describe("Mur épuisé = 流局", () => {
  it("retourne `drawn-wall` quand on tente de piocher dans un mur vide", () => {
    let s = freshRound(42, 0);
    // Drain le mur jusqu'à vide
    while (s.wall.tiles.length > 0) {
      const { rest } = drainOne(s);
      s = { ...s, wall: rest } as RoundState;
    }
    s = passToDrawPhase(s);
    const r = applyAction(s, { type: "draw", seat: (s.phase as any).current });
    expect(r.state.phase).toMatchObject({ kind: "ended" });
    expect((r.state.phase as any).result.kind).toBe("drawn-wall");
  });
});

// -------------------- Test helpers --------------------

function forceHand(state: RoundState, seat: SeatIndex, tiles: any[]): RoundState {
  const newHands = state.hands.map((h, i) =>
    i === seat ? { ...h, concealed: tiles.slice(0, seat === state.dealer ? 17 : 16) } : h
  );
  return { ...state, hands: newHands as any };
}

function drainOne(state: RoundState) {
  return { rest: { ...state.wall, tiles: state.wall.tiles.slice(1) } };
}

function passToDrawPhase(state: RoundState): RoundState {
  // Force la phase pour pouvoir tester le mur vide.
  return { ...state, phase: { kind: "draw", current: nextSeat(state.dealer) } };
}
