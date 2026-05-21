/**
 * Calcul des gains — Mahjong de Wenzhou.
 *
 * Formule de base (généralisée d'après les sources Wenzhou) :
 *
 *   gain_par_perdant = (底分 × facteur_donneur_consécutif) × multiplicateur_main
 *                      + bonus_财神
 *
 *   où multiplicateur_main = {
 *       软胡  : 1×   (main avec au moins 1 joker physique)
 *       硬胡  : 2×   (main sans aucun joker physique)
 *       双翻  : 4×   (main avec exactement 3 jokers + structure valide)
 *       4-jokers : configurable (main spéciale "grand chelem")
 *   }
 *
 *   + bonus séparés (multiplicatifs) pour : 碰碰胡, 清一色, 天胡, 地胡, 单吊, 抢杠胡
 *
 * Répartition :
 *   - 自摸 (auto-pioche)   : chacun des 3 perdants paie `gain_par_perdant`.
 *   - 接炮 (sur défausse)  : seul le défausseur paie `2 × gain_par_perdant`
 *                            (les autres perdants ne paient rien).
 *
 * Tous les paramètres numériques sont configurables via `ScoringConfig` puisque les
 * tables Wenzhou utilisent souvent des barèmes maison.
 */

import type { HuResult } from "./hu.js";

export interface ScoringConfig {
  /** 底分 — mise de base (ex: 5). */
  readonly baseScore: number;
  /** Bonus par joker physique (财神分). */
  readonly jokerBonus: number;
  /** Facteur appliqué quand le donneur enchaîne (manches consécutives gagnées). */
  readonly dealerStreakFactor: number;
  /** Plafond du facteur consécutif (en nombre de manches d'affilée). */
  readonly dealerStreakCap: number;
  /** Multiplicateurs main */
  readonly softMultiplier: number;        // 软胡 — défaut 1
  readonly hardMultiplier: number;        // 硬胡 — défaut 2
  readonly doubleMultiplier: number;      // 双翻 — défaut 4
  readonly fourJokersMultiplier: number;  // 4 jokers — défaut 8 (grand chelem)
  /** Multiplicateurs main spéciale (s'appliquent par-dessus) */
  readonly pongPongMultiplier: number;    // 碰碰胡 — défaut 2
  readonly cleanSuitMultiplier: number;   // 清一色 — défaut 4
  readonly heavenlyMultiplier: number;    // 天胡 — défaut 4
  readonly earthlyMultiplier: number;     // 地胡 — défaut 4
  readonly singleWaitMultiplier: number;  // 单吊 — défaut 2
  readonly robKongMultiplier: number;     // 抢杠胡 — défaut 2
  /** Multiplicateur appliqué au défausseur en 接炮 (par défaut 2). */
  readonly discardPenaltyMultiplier: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  baseScore: 5,
  jokerBonus: 1,
  dealerStreakFactor: 2,
  dealerStreakCap: 4,
  softMultiplier: 1,
  hardMultiplier: 2,
  doubleMultiplier: 4,
  fourJokersMultiplier: 8,
  pongPongMultiplier: 2,
  cleanSuitMultiplier: 4,
  heavenlyMultiplier: 4,
  earthlyMultiplier: 4,
  singleWaitMultiplier: 2,
  robKongMultiplier: 2,
  discardPenaltyMultiplier: 2,
};

export interface ScoringContext {
  readonly huResult: HuResult;
  /** Auto-pioche (自摸) ou sur défausse (接炮) */
  readonly selfPick: boolean;
  readonly isDealer: boolean;
  /** Combien de manches consécutives le donneur a gagnées (0 si nouvelle manche). */
  readonly dealerConsecutiveWins: number;
  /** Premier tour : si donneur gagne au 1er tirage. */
  readonly heavenly: boolean;
  /** Premier tour : si non-donneur gagne sur 1er discard. */
  readonly earthly: boolean;
  /** 单吊 — attente d'une seule tuile pour la paire après chi/pong/kong. */
  readonly singleWait: boolean;
  /** 抢杠胡 — Hu sur kong "ajouté" d'un adversaire. */
  readonly robKong: boolean;
}

export interface ScoringResult {
  /** Multiplicateur effectif de la main (1, 2, 4, 8, etc., produit des sous-multiplicateurs). */
  readonly multiplier: number;
  /** Total des bonus 财神. */
  readonly jokerBonusTotal: number;
  /** Montant payé par chaque perdant (en 自摸) ou base avant pénalité (en 接炮). */
  readonly perLoser: number;
  /** Gain net du gagnant. */
  readonly winnerNetGain: number;
  /** Détails de la composition pour debug / UI. */
  readonly breakdown: ScoringBreakdown;
}

export interface ScoringBreakdown {
  readonly baseScore: number;
  readonly dealerStreakMultiplier: number;
  readonly handMultiplier: number;
  readonly handMultiplierLabel: string;
  readonly extraMultipliers: ReadonlyArray<{ label: string; factor: number }>;
  readonly discardPenaltyMultiplier: number; // 1 si 自摸, sinon config.discardPenaltyMultiplier
}

/** Détermine le multiplicateur principal de la main d'après le nombre de jokers. */
function handMultiplier(
  jokerCount: number,
  cfg: ScoringConfig
): { factor: number; label: string } {
  if (jokerCount >= 4) return { factor: cfg.fourJokersMultiplier, label: "4-jokers" };
  if (jokerCount === 3) return { factor: cfg.doubleMultiplier, label: "双翻" };
  if (jokerCount === 0) return { factor: cfg.hardMultiplier, label: "硬胡" };
  return { factor: cfg.softMultiplier, label: "软胡" };
}

/** Facteur de "streak" du donneur, plafonné. */
function dealerStreakMultiplier(consecutive: number, cfg: ScoringConfig): number {
  const capped = Math.min(consecutive, cfg.dealerStreakCap);
  return Math.pow(cfg.dealerStreakFactor, capped);
}

export function computeScore(
  scx: ScoringContext,
  cfg: ScoringConfig = DEFAULT_SCORING
): ScoringResult {
  const { huResult } = scx;

  if (!huResult.valid) {
    return zeroScore();
  }

  const hand = handMultiplier(huResult.jokerCount, cfg);
  const streak = scx.isDealer
    ? dealerStreakMultiplier(scx.dealerConsecutiveWins, cfg)
    : 1;

  const extras: { label: string; factor: number }[] = [];
  if (huResult.kinds.includes("all-triplets")) {
    extras.push({ label: "碰碰胡", factor: cfg.pongPongMultiplier });
  }
  if (huResult.kinds.includes("all-one-suit")) {
    extras.push({ label: "清一色", factor: cfg.cleanSuitMultiplier });
  }
  if (scx.heavenly) extras.push({ label: "天胡", factor: cfg.heavenlyMultiplier });
  if (scx.earthly) extras.push({ label: "地胡", factor: cfg.earthlyMultiplier });
  if (scx.singleWait) extras.push({ label: "单吊", factor: cfg.singleWaitMultiplier });
  if (scx.robKong) extras.push({ label: "抢杠胡", factor: cfg.robKongMultiplier });

  const totalMultiplier =
    hand.factor * extras.reduce((acc, e) => acc * e.factor, 1);

  const jokerBonusTotal = huResult.jokerCount * cfg.jokerBonus;
  const baseAmount = cfg.baseScore * streak * totalMultiplier + jokerBonusTotal;

  const discardPenalty = scx.selfPick ? 1 : cfg.discardPenaltyMultiplier;
  const perLoser = baseAmount;
  const winnerNetGain = scx.selfPick
    ? perLoser * 3
    : perLoser * discardPenalty;

  return {
    multiplier: totalMultiplier,
    jokerBonusTotal,
    perLoser,
    winnerNetGain,
    breakdown: {
      baseScore: cfg.baseScore,
      dealerStreakMultiplier: streak,
      handMultiplier: hand.factor,
      handMultiplierLabel: hand.label,
      extraMultipliers: extras,
      discardPenaltyMultiplier: discardPenalty,
    },
  };
}

function zeroScore(): ScoringResult {
  return {
    multiplier: 0,
    jokerBonusTotal: 0,
    perLoser: 0,
    winnerNetGain: 0,
    breakdown: {
      baseScore: 0,
      dealerStreakMultiplier: 1,
      handMultiplier: 0,
      handMultiplierLabel: "-",
      extraMultipliers: [],
      discardPenaltyMultiplier: 1,
    },
  };
}
