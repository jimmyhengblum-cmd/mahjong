import { describe, it, expect } from "vitest";
import {
  ALL_TILE_KINDS,
  BAI_BAN,
  buildFullSet,
  createWall,
  draw,
  effectiveValue,
  isJoker,
  tileToString,
} from "../src/index.js";

describe("Tuiles", () => {
  it("a 34 types distincts", () => {
    expect(ALL_TILE_KINDS.length).toBe(34);
  });

  it("a 136 tuiles dans un mur complet", () => {
    expect(buildFullSet().length).toBe(136);
  });

  it("a exactement 4 exemplaires de chaque type", () => {
    const set = buildFullSet();
    const counts = new Map<string, number>();
    for (const t of set) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const kind of ALL_TILE_KINDS) {
      expect(counts.get(kind), `manque ${kind}`).toBe(4);
    }
  });

  it("affiche les tuiles en chinois traditionnel", () => {
    expect(tileToString("p5")).toBe("5筒");
    expect(tileToString("m9")).toBe("9萬");
    expect(tileToString("dw")).toBe("白");
    expect(tileToString("we")).toBe("東");
  });
});

describe("Mur et 财神", () => {
  it("crée un mur de 136 tuiles avec un indicateur de joker", () => {
    const { wall, ctx } = createWall(42);
    expect(wall.tiles.length).toBe(136);
    expect(ctx.jokerValue).toBe(wall.jokerIndicator);
  });

  it("est déterministe avec la même seed", () => {
    const a = createWall(123);
    const b = createWall(123);
    expect(a.wall.tiles).toEqual(b.wall.tiles);
    expect(a.ctx.jokerValue).toBe(b.ctx.jokerValue);
  });

  it("la pioche retire bien les tuiles du mur", () => {
    const { wall } = createWall(7);
    const { drawn, rest } = draw(wall, 16);
    expect(drawn.length).toBe(16);
    expect(rest.tiles.length).toBe(120);
    expect(rest.tiles).toEqual(wall.tiles.slice(16));
  });
});

describe("Mécanique du joker", () => {
  it("le 5筒 est joker si jokerValue = 5筒", () => {
    const ctx = { jokerValue: "p5" as const };
    expect(isJoker("p5", ctx)).toBe(true);
    expect(isJoker("p6", ctx)).toBe(false);
    expect(isJoker(BAI_BAN, ctx)).toBe(false);
  });

  it("le 白板 prend la valeur du joker (et n'est PAS joker)", () => {
    const ctx = { jokerValue: "p5" as const };
    expect(effectiveValue(BAI_BAN, ctx)).toBe("p5");
    expect(isJoker(BAI_BAN, ctx)).toBe(false);
  });

  it("un joker physique a une valeur effective `null` (libre)", () => {
    const ctx = { jokerValue: "p5" as const };
    expect(effectiveValue("p5", ctx)).toBe(null);
  });

  it("une tuile normale vaut elle-même", () => {
    const ctx = { jokerValue: "p5" as const };
    expect(effectiveValue("m3", ctx)).toBe("m3");
    expect(effectiveValue("we", ctx)).toBe("we");
  });
});
