/**
 * Détection de Hu (胡牌) — Mahjong de Wenzhou.
 *
 * Structure d'une main gagnante : **5 combinaisons + 1 paire = 17 tuiles**
 * (la dernière étant la tuile qui déclenche le Hu, par 自摸 ou 接炮).
 *
 * Mécanique du 财神 :
 *   - Les tuiles physiques égales à `ctx.jokerValue` sont des **wildcards**.
 *   - Les 白板 valent `ctx.jokerValue` comme tuile normale (cf. caishen.ts).
 *
 * Algorithme :
 *   1. Convertit la main en (counts: Map<TileCode, n>, jokers: number)
 *   2. Pour chaque candidat de paire (tuile concrète ou jokers), retire-la
 *   3. Vérifie récursivement qu'on peut former (5 - exposedMelds) combinaisons
 *      avec le reste, en consommant jokers + triplets/chows.
 *
 * Reconnaît : standard, 碰碰胡 (all-triplets), 清一色 (all-one-suit).
 * Reconnaît aussi : 单吊 (single-wait), 天胡 (heavenly), 地胡 (earthly) —
 * mais ces derniers sont des contextes de tour et sont décorés par checkHu, pas détectés ici.
 */

import {
  ALL_TILE_KINDS,
  BAI_BAN,
  isNumbered,
  tileNumber,
  tileSuit,
} from "./tiles.js";
import type { TileCode, NumberedTile } from "./tiles.js";
import type { CaishenContext } from "./caishen.js";
import type { ExposedMeld } from "./meld.js";

export type HuKind = "standard" | "all-triplets" | "all-one-suit";

export interface HuInput {
  readonly concealed: readonly TileCode[];
  readonly exposedMelds: readonly ExposedMeld[];
  readonly ctx: CaishenContext;
}

export interface HuResult {
  readonly valid: boolean;
  readonly kinds: readonly HuKind[];
  /** Nombre de jokers physiques (= ctx.jokerValue) présents dans la main entière. */
  readonly jokerCount: number;
}

// ---- Internes ----

interface Counts {
  readonly map: Map<TileCode, number>;
  readonly jokers: number;
}

function effectiveCounts(
  tiles: Iterable<TileCode>,
  ctx: CaishenContext
): Counts {
  const map = new Map<TileCode, number>();
  let jokers = 0;
  const baiBanIsJoker = ctx.jokerValue === BAI_BAN;
  for (const t of tiles) {
    if (t === ctx.jokerValue) {
      jokers++;
    } else if (t === BAI_BAN && !baiBanIsJoker) {
      map.set(ctx.jokerValue, (map.get(ctx.jokerValue) ?? 0) + 1);
    } else {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return { map, jokers };
}

function totalCount(counts: Map<TileCode, number>): number {
  let n = 0;
  for (const v of counts.values()) n += v;
  return n;
}

function findPivot(counts: Map<TileCode, number>): TileCode | null {
  for (const kind of ALL_TILE_KINDS) {
    if ((counts.get(kind) ?? 0) > 0) return kind;
  }
  return null;
}

/**
 * Tente de former `meldsNeeded` combinaisons à partir des counts + jokers.
 * @param allowChow si false, n'autorise que les triplets (utile pour 碰碰胡).
 */
function tryMelds(
  counts: Map<TileCode, number>,
  jokers: number,
  meldsNeeded: number,
  allowChow: boolean
): boolean {
  if (meldsNeeded === 0) {
    return totalCount(counts) === 0 && jokers === 0;
  }

  const pivot = findPivot(counts);

  if (pivot === null) {
    // Plus de tuiles concrètes : il faut exactement 3 jokers par combinaison restante.
    return jokers === meldsNeeded * 3;
  }

  const pivotCount = counts.get(pivot)!;

  // Option A : triplet de pivot (avec 0, 1 ou 2 jokers)
  for (let j = 0; j <= 2; j++) {
    const fromPivot = 3 - j;
    if (pivotCount < fromPivot || jokers < j) continue;
    const next = new Map(counts);
    next.set(pivot, pivotCount - fromPivot);
    if (tryMelds(next, jokers - j, meldsNeeded - 1, allowChow)) return true;
  }

  // Option B : chow commençant à pivot
  if (allowChow && isNumbered(pivot)) {
    const num = tileNumber(pivot);
    if (num <= 7) {
      const suit = tileSuit(pivot);
      const t2 = `${suit}${num + 1}` as TileCode;
      const t3 = `${suit}${num + 2}` as TileCode;
      for (let j2 = 0; j2 <= 1; j2++) {
        for (let j3 = 0; j3 <= 1; j3++) {
          const jUse = j2 + j3;
          if (jokers < jUse) continue;
          if (j2 === 0 && (counts.get(t2) ?? 0) < 1) continue;
          if (j3 === 0 && (counts.get(t3) ?? 0) < 1) continue;
          const next = new Map(counts);
          next.set(pivot, pivotCount - 1);
          if (j2 === 0) next.set(t2, (next.get(t2) ?? 0) - 1);
          if (j3 === 0) next.set(t3, (next.get(t3) ?? 0) - 1);
          if (tryMelds(next, jokers - jUse, meldsNeeded - 1, allowChow)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Essaie chaque candidat de paire, puis vérifie qu'on peut former le reste.
 */
function tryStandard(
  counts: Counts,
  meldsNeeded: number,
  allowChow: boolean
): boolean {
  const { map, jokers } = counts;

  // Paire concrète (2 du même type)
  for (const [tile, c] of map) {
    if (c >= 2) {
      const next = new Map(map);
      next.set(tile, c - 2);
      if (tryMelds(next, jokers, meldsNeeded, allowChow)) return true;
    }
  }
  // Paire = 1 tuile + 1 joker
  if (jokers >= 1) {
    for (const [tile, c] of map) {
      if (c >= 1) {
        const next = new Map(map);
        next.set(tile, c - 1);
        if (tryMelds(next, jokers - 1, meldsNeeded, allowChow)) return true;
      }
    }
  }
  // Paire = 2 jokers
  if (jokers >= 2) {
    if (tryMelds(new Map(map), jokers - 2, meldsNeeded, allowChow)) return true;
  }
  return false;
}

/**
 * Vérifie le 清一色 (toutes les tuiles d'une seule famille numérotée).
 * Les jokers et 白板 sont neutres (ils prendront la couleur dominante).
 */
function isAllOneSuit(
  concealed: readonly TileCode[],
  exposed: readonly ExposedMeld[],
  ctx: CaishenContext
): boolean {
  const baiBanIsJoker = ctx.jokerValue === BAI_BAN;
  let suit: string | null = null;
  const allTiles: TileCode[] = [
    ...concealed,
    ...exposed.flatMap((m) => m.tiles as TileCode[]),
  ];
  for (const t of allTiles) {
    if (t === ctx.jokerValue) continue; // joker libre
    if (t === BAI_BAN && !baiBanIsJoker) {
      // Vaut ctx.jokerValue : si ctx.jokerValue est numbered, on prend cette suit
      if (isNumbered(ctx.jokerValue)) {
        const s = tileSuit(ctx.jokerValue as NumberedTile);
        if (suit === null) suit = s;
        else if (suit !== s) return false;
      } else {
        return false;
      }
      continue;
    }
    if (!isNumbered(t)) return false;
    const s = tileSuit(t as NumberedTile);
    if (suit === null) suit = s;
    else if (suit !== s) return false;
  }
  return suit !== null;
}

// ---- API publique ----

export function checkHu(input: HuInput): HuResult {
  const { concealed, exposedMelds, ctx } = input;
  const meldsNeeded = 5 - exposedMelds.length;

  if (meldsNeeded < 0 || meldsNeeded > 5) {
    return { valid: false, kinds: [], jokerCount: 0 };
  }

  // Validation de la taille de main attendue (sans tenir compte du nombre de tuiles
  // d'un kong puisque structurellement un kong = 1 combinaison).
  const expectedConcealed = 2 + 3 * meldsNeeded;
  if (concealed.length !== expectedConcealed) {
    return { valid: false, kinds: [], jokerCount: 0 };
  }

  const counts = effectiveCounts(concealed, ctx);
  const jokerCount = countPhysicalJokers([
    ...concealed,
    ...exposedMelds.flatMap((m) => m.tiles as TileCode[]),
  ], ctx);

  // Test main standard (chow autorisé)
  const validStandard = tryStandard(counts, meldsNeeded, true);
  if (!validStandard) {
    return { valid: false, kinds: [], jokerCount };
  }

  const kinds: HuKind[] = ["standard"];

  // 碰碰胡 : essaie sans chow
  if (tryStandard(counts, meldsNeeded, false) && allExposedAreNotChow(exposedMelds)) {
    kinds.push("all-triplets");
  }

  // 清一色
  if (isAllOneSuit(concealed, exposedMelds, ctx)) {
    kinds.push("all-one-suit");
  }

  return { valid: true, kinds, jokerCount };
}

function allExposedAreNotChow(exposed: readonly ExposedMeld[]): boolean {
  return exposed.every((m) => m.type !== "chi");
}

function countPhysicalJokers(
  tiles: readonly TileCode[],
  ctx: CaishenContext
): number {
  let n = 0;
  for (const t of tiles) if (t === ctx.jokerValue) n++;
  return n;
}
