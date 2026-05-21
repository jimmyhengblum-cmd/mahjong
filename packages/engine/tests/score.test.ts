import { describe, it, expect } from "vitest";
import {
  computeScore,
  DEFAULT_SCORING,
  type HuResult,
  type ScoringContext,
} from "../src/index.js";

function huOf(opts: Partial<HuResult>): HuResult {
  return {
    valid: true,
    kinds: ["standard"],
    jokerCount: 0,
    ...opts,
  };
}

function ctxOf(opts: Partial<ScoringContext>): ScoringContext {
  return {
    huResult: huOf({}),
    selfPick: false,
    isDealer: false,
    dealerConsecutiveWins: 0,
    heavenly: false,
    earthly: false,
    singleWait: false,
    robKong: false,
    ...opts,
  };
}

describe("computeScore — multiplicateurs main", () => {
  it("硬胡 (0 joker) = base × 2", () => {
    const r = computeScore(ctxOf({ huResult: huOf({ jokerCount: 0 }) }));
    expect(r.breakdown.handMultiplierLabel).toBe("硬胡");
    expect(r.multiplier).toBe(2);
    // base 5 × streak 1 × hand 2 = 10, joker bonus 0 → perLoser 10
    expect(r.perLoser).toBe(10);
  });

  it("软胡 (1 joker) = base × 1 + bonus", () => {
    const r = computeScore(ctxOf({ huResult: huOf({ jokerCount: 1 }) }));
    expect(r.breakdown.handMultiplierLabel).toBe("软胡");
    expect(r.multiplier).toBe(1);
    // 5 × 1 × 1 + 1 (bonus joker) = 6
    expect(r.perLoser).toBe(6);
  });

  it("双翻 (3 jokers) = base × 4 + 3×bonus", () => {
    const r = computeScore(ctxOf({ huResult: huOf({ jokerCount: 3 }) }));
    expect(r.breakdown.handMultiplierLabel).toBe("双翻");
    expect(r.multiplier).toBe(4);
    // 5 × 1 × 4 + 3 = 23
    expect(r.perLoser).toBe(23);
  });

  it("4 jokers = main spéciale", () => {
    const r = computeScore(ctxOf({ huResult: huOf({ jokerCount: 4 }) }));
    expect(r.breakdown.handMultiplierLabel).toBe("4-jokers");
    expect(r.multiplier).toBe(8);
    // 5 × 1 × 8 + 4 = 44
    expect(r.perLoser).toBe(44);
  });
});

describe("computeScore — répartition 自摸 vs 接炮", () => {
  it("自摸 : 3 perdants paient chacun perLoser", () => {
    const r = computeScore(
      ctxOf({ huResult: huOf({ jokerCount: 0 }), selfPick: true })
    );
    expect(r.perLoser).toBe(10);
    expect(r.winnerNetGain).toBe(30); // 3 × 10
    expect(r.breakdown.discardPenaltyMultiplier).toBe(1);
  });

  it("接炮 : seul le défausseur paie 2 × perLoser", () => {
    const r = computeScore(
      ctxOf({ huResult: huOf({ jokerCount: 0 }), selfPick: false })
    );
    expect(r.perLoser).toBe(10);
    expect(r.winnerNetGain).toBe(20); // 2 × 10
    expect(r.breakdown.discardPenaltyMultiplier).toBe(2);
  });
});

describe("computeScore — combos main spéciale", () => {
  it("碰碰胡 multiplie ×2 par dessus le hand multiplier", () => {
    const r = computeScore(
      ctxOf({
        huResult: huOf({ jokerCount: 0, kinds: ["standard", "all-triplets"] }),
      })
    );
    // hand 2 × pong-pong 2 = 4, base 5 × 4 = 20
    expect(r.multiplier).toBe(4);
    expect(r.perLoser).toBe(20);
  });

  it("清一色 + 碰碰胡 + 硬胡 : cumul multiplicatif", () => {
    const r = computeScore(
      ctxOf({
        huResult: huOf({
          jokerCount: 0,
          kinds: ["standard", "all-triplets", "all-one-suit"],
        }),
      })
    );
    // hand 2 × pong-pong 2 × clean-suit 4 = 16, base 5 × 16 = 80
    expect(r.multiplier).toBe(16);
    expect(r.perLoser).toBe(80);
  });

  it("天胡 ajoute ×4", () => {
    const r = computeScore(
      ctxOf({ huResult: huOf({ jokerCount: 0 }), heavenly: true })
    );
    // hand 2 × heavenly 4 = 8, base 5 × 8 = 40
    expect(r.multiplier).toBe(8);
    expect(r.perLoser).toBe(40);
  });
});

describe("computeScore — streak du donneur", () => {
  it("donneur sans consécutif : streak ×1", () => {
    const r = computeScore(
      ctxOf({ huResult: huOf({ jokerCount: 0 }), isDealer: true })
    );
    expect(r.breakdown.dealerStreakMultiplier).toBe(1);
    expect(r.perLoser).toBe(10);
  });

  it("donneur avec 2 manches consécutives : streak ×4", () => {
    const r = computeScore(
      ctxOf({
        huResult: huOf({ jokerCount: 0 }),
        isDealer: true,
        dealerConsecutiveWins: 2,
      })
    );
    expect(r.breakdown.dealerStreakMultiplier).toBe(4);
    expect(r.perLoser).toBe(40); // 5 × 4 × 2
  });

  it("donneur au-delà du cap (4 consécutifs+) : plafonné à streak ×16", () => {
    const r = computeScore(
      ctxOf({
        huResult: huOf({ jokerCount: 0 }),
        isDealer: true,
        dealerConsecutiveWins: 10,
      })
    );
    expect(r.breakdown.dealerStreakMultiplier).toBe(16); // 2^4
  });

  it("non-donneur : streak ignoré", () => {
    const r = computeScore(
      ctxOf({
        huResult: huOf({ jokerCount: 0 }),
        isDealer: false,
        dealerConsecutiveWins: 5,
      })
    );
    expect(r.breakdown.dealerStreakMultiplier).toBe(1);
  });
});

describe("computeScore — Hu invalide", () => {
  it("retourne tout à zéro", () => {
    const r = computeScore(
      ctxOf({ huResult: { valid: false, kinds: [], jokerCount: 0 } })
    );
    expect(r.multiplier).toBe(0);
    expect(r.perLoser).toBe(0);
    expect(r.winnerNetGain).toBe(0);
  });
});
