/**
 * Mécanique du 财神 (joker dynamique).
 *
 * À chaque manche on tire une tuile-indicateur (jokerValue). Cela produit deux effets
 * simultanés pendant toute la manche :
 *
 *   1. Les 4 exemplaires de `jokerValue` deviennent des JOKERS (wildcards).
 *      Ils peuvent représenter n'importe quelle tuile pour compléter une suite,
 *      une paire ou un triplet.
 *
 *   2. Les 4 exemplaires de 白板 (BAI_BAN) prennent la valeur de `jokerValue`.
 *      Ils ne sont PAS jokers : ils sont des `jokerValue` normaux, et participent
 *      au scoring comme tels (en particulier, une main "硬胡 / hard" se définit
 *      comme "aucun jokerValue physique dans la main" — les 白板 ne comptent pas
 *      comme jokers).
 *
 * Cas limite : si la tuile tirée est elle-même 白板, les sources que nous avons
 * lues ne sont pas claires. On adopte la règle simple suivante : on retire et on
 * en tire une autre. (à confirmer auprès de la table — voir TODO.)
 */

import type { TileCode } from "./tiles.js";
import { BAI_BAN } from "./tiles.js";

export interface CaishenContext {
  /** Valeur "officielle" du joker pour cette manche (ex: "p5"). */
  readonly jokerValue: TileCode;
}

/**
 * `true` si la tuile physique fonctionne comme joker (wildcard) dans cette manche.
 * Seuls les 4 exemplaires de jokerValue sont jokers — pas les 白板.
 */
export function isJoker(tile: TileCode, ctx: CaishenContext): boolean {
  return tile === ctx.jokerValue;
}

/**
 * Valeur "effective" d'une tuile pour la composition de mains :
 *   - Un joker (tile === jokerValue) reste un joker, à matcher dynamiquement.
 *   - Un 白板 vaut jokerValue (tuile normale, pas wildcard).
 *   - Toutes les autres tuiles valent elles-mêmes.
 *
 * Retourne `null` pour signaler "joker, valeur libre".
 */
export function effectiveValue(tile: TileCode, ctx: CaishenContext): TileCode | null {
  if (tile === ctx.jokerValue) return null;
  if (tile === BAI_BAN) return ctx.jokerValue;
  return tile;
}

/**
 * Cas particulier : si jokerValue === 白板, alors les 白板 sont jokers ET équivalents
 * à eux-mêmes. On les traite comme jokers purs dans ce cas.
 */
export function isDegenerateJokerCase(ctx: CaishenContext): boolean {
  return ctx.jokerValue === BAI_BAN;
}
