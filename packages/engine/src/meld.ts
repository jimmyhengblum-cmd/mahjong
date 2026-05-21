/**
 * Représentation des combinaisons (melds).
 *
 * Une combinaison est :
 *   - Chow (吃)  : 3 tuiles numériques consécutives de la même famille (ABC)
 *   - Pong (碰)  : 3 tuiles identiques (AAA)
 *   - Kong (杠)  : 4 tuiles identiques (AAAA), compte structurellement pour 1 combinaison
 *
 * Les combinaisons "exposées" (déclarées via chi/pong/kong) sont stockées explicitement.
 * Les combinaisons "cachées" sont implicites dans la main et reconstruites lors de la
 * détection de Hu.
 */

import type { TileCode } from "./tiles.js";

export type MeldType = "chi" | "pong" | "kong";

export type KongOrigin = "concealed" | "exposed" | "added";

export interface ExposedMeld {
  readonly type: MeldType;
  readonly tiles: readonly TileCode[];
  /** Pour les kongs : précise s'ils sont déclarés depuis la main ou depuis une défausse. */
  readonly kongOrigin?: KongOrigin;
}

export function meldTileCount(m: ExposedMeld): number {
  return m.type === "kong" ? 4 : 3;
}
