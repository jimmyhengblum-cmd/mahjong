import { describe, it, expect } from "vitest";
import { checkHu, type CaishenContext, type TileCode } from "../src/index.js";

// Helper : ctx où le joker = 5筒
const CTX_P5: CaishenContext = { jokerValue: "p5" };
// Helper : ctx où le joker = 3万 (familles différentes)
const CTX_M3: CaishenContext = { jokerValue: "m3" };

describe("checkHu — main standard sans joker", () => {
  it("17 tuiles, 5 triplets + paire, valide", () => {
    // 1万1万 + 2万2万2万 + 4筒4筒4筒 + 7条7条7条 + 东东东 + 中中中
    // = 2 + 3 + 3 + 3 + 3 + 3 = 17
    const concealed: TileCode[] = [
      "m1", "m1",
      "m2", "m2", "m2",
      "p4", "p4", "p4",
      "s7", "s7", "s7",
      "we", "we", "we",
      "dr", "dr", "dr",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(true);
    expect(res.kinds).toContain("standard");
    expect(res.kinds).toContain("all-triplets");
    expect(res.jokerCount).toBe(0);
  });

  it("17 tuiles, 5 chows + paire, valide", () => {
    // 1万2万3万 + 4万5万6万 + 1筒2筒3筒 + 1条2条3条 + 5条6条7条 + 9万9万
    const concealed: TileCode[] = [
      "m1", "m2", "m3",
      "m4", "m5", "m6",
      "p1", "p2", "p3",
      "s1", "s2", "s3",
      "s5", "s6", "s7",
      "m9", "m9",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_P5 });
    expect(res.valid).toBe(true);
    expect(res.kinds).toContain("standard");
    expect(res.kinds).not.toContain("all-triplets");
  });

  it("mauvaise taille de main = invalide", () => {
    const concealed: TileCode[] = ["m1", "m1", "m2", "m3"];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(false);
  });

  it("17 tuiles sans structure valide = invalide", () => {
    // 17 tuiles totalement décorrélées
    const concealed: TileCode[] = [
      "m1", "m2", "m4",
      "p1", "p3", "p5",
      "s2", "s4", "s6",
      "we", "ws", "ww",
      "wn", "dr", "dg",
      "m9", "p9",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(false);
  });
});

describe("checkHu — avec 财神 (jokers)", () => {
  it("un joker complète un triplet", () => {
    // 1万1万 + 2万2万[joker] + 4筒4筒4筒 + 7条7条7条 + 东东东 + 中中中
    // jokerValue = m3, donc on remplace par "m3" (joker physique)
    const concealed: TileCode[] = [
      "m1", "m1",
      "m2", "m2", "m3", // joker remplace le 3e 2万
      "p4", "p4", "p4",
      "s7", "s7", "s7",
      "we", "we", "we",
      "dr", "dr", "dr",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(true);
    expect(res.jokerCount).toBe(1);
  });

  it("trois jokers complètent une suite", () => {
    // 5筒5筒 (paire) + 4 triplets normaux, le 5e composé entièrement de jokers
    const concealed: TileCode[] = [
      "m1", "m1",
      "m4", "m4", "m4",
      "p1", "p2", "p3",
      "s7", "s7", "s7",
      "we", "we", "we",
      "m3", "m3", "m3", // 3 jokers physiques (jokerValue = m3)
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(true);
    expect(res.jokerCount).toBe(3);
  });

  it("白板 vaut jokerValue (5筒) comme tuile normale", () => {
    // jokerValue = p5. Les 白板 deviennent des 5筒 normaux.
    // Main : 5筒5筒(=白板白板) + 4 triplets normaux + 1 chow
    const concealed: TileCode[] = [
      "dw", "dw", // = p5 p5 (paire de 5筒)
      "m1", "m1", "m1",
      "p4", "p4", "p4",
      "s7", "s7", "s7",
      "we", "we", "we",
      "p1", "p2", "p3",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_P5 });
    expect(res.valid).toBe(true);
    expect(res.jokerCount).toBe(0); // les 白板 ne sont PAS des jokers physiques
  });

  it("mix 白板 + joker physique : 白板 = 5筒 normal, p5 = wildcard", () => {
    // jokerValue = p5. On a 1×p5 (joker physique) + 2×白板 (= 2×5筒 normaux)
    // Triplet de 5筒 réalisé : 2 白板 + 1 p5 (joker libre joue le 3e 5筒).
    const concealed: TileCode[] = [
      "m1", "m1",
      "dw", "dw", "p5", // triplet de 5筒 (2 白板 + 1 joker)
      "m4", "m4", "m4",
      "s7", "s7", "s7",
      "we", "we", "we",
      "p1", "p2", "p3",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_P5 });
    expect(res.valid).toBe(true);
    expect(res.jokerCount).toBe(1);
  });
});

describe("checkHu — combinaisons exposées (chi/pong/kong)", () => {
  it("3 pongs exposés + 2 triplets + paire concealed = valide", () => {
    const res = checkHu({
      concealed: [
        "m1", "m1",
        "m4", "m4", "m4",
        "p7", "p7", "p7",
      ],
      exposedMelds: [
        { type: "pong", tiles: ["we", "we", "we"] },
        { type: "pong", tiles: ["dr", "dr", "dr"] },
        { type: "pong", tiles: ["p2", "p2", "p2"] },
      ],
      ctx: CTX_M3,
    });
    expect(res.valid).toBe(true);
    expect(res.kinds).toContain("all-triplets");
  });

  it("1 kong exposé + 4 triplets concealed + paire = valide", () => {
    const res = checkHu({
      concealed: [
        "m1", "m1",
        "m4", "m4", "m4",
        "p7", "p7", "p7",
        "s2", "s2", "s2",
        "we", "we", "we",
      ],
      exposedMelds: [
        { type: "kong", tiles: ["dr", "dr", "dr", "dr"], kongOrigin: "exposed" },
      ],
      ctx: CTX_M3,
    });
    expect(res.valid).toBe(true);
  });

  it("chi exposé empêche 碰碰胡 même si concealed n'a que des triplets", () => {
    const res = checkHu({
      concealed: [
        "m1", "m1",
        "m4", "m4", "m4",
        "p7", "p7", "p7",
        "s2", "s2", "s2",
        "we", "we", "we",
      ],
      exposedMelds: [
        { type: "chi", tiles: ["s5", "s6", "s7"] },
      ],
      ctx: CTX_M3,
    });
    expect(res.valid).toBe(true);
    expect(res.kinds).toContain("standard");
    expect(res.kinds).not.toContain("all-triplets");
  });
});

describe("checkHu — 清一色 (all one suit)", () => {
  it("main complète en bambous = valide + all-one-suit", () => {
    const concealed: TileCode[] = [
      "s1", "s1",
      "s2", "s3", "s4",
      "s5", "s6", "s7",
      "s7", "s8", "s9",
      "s2", "s2", "s2",
      "s5", "s5", "s5",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(true);
    expect(res.kinds).toContain("all-one-suit");
  });

  it("main avec honneurs n'est pas 清一色", () => {
    const concealed: TileCode[] = [
      "s1", "s1",
      "s2", "s3", "s4",
      "s5", "s6", "s7",
      "s7", "s8", "s9",
      "s2", "s2", "s2",
      "we", "we", "we",
    ];
    const res = checkHu({ concealed, exposedMelds: [], ctx: CTX_M3 });
    expect(res.valid).toBe(true);
    expect(res.kinds).not.toContain("all-one-suit");
  });
});
