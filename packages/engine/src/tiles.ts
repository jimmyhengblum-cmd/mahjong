/**
 * Représentation des tuiles du Mahjong de Wenzhou.
 *
 * Variante 136 tuiles :
 *   - 3 familles numériques × 9 × 4 = 108
 *   - 4 vents × 4 = 16
 *   - 3 dragons × 4 = 12
 *
 * Les tuiles sont identifiées par un code court (string) :
 *   m1..m9 (万 — caractères)
 *   p1..p9 (筒 — cercles)
 *   s1..s9 (条 — bambous)
 *   we, ws, ww, wn (vents Est/Sud/Ouest/Nord)
 *   dr, dg, dw (dragons Rouge 中, Vert 發, Blanc 白)
 */

export type Suit = "m" | "p" | "s";
export type Wind = "we" | "ws" | "ww" | "wn";
export type Dragon = "dr" | "dg" | "dw";

export type NumberedTile = `${Suit}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export type HonorTile = Wind | Dragon;
export type TileCode = NumberedTile | HonorTile;

export const SUITS: Suit[] = ["m", "p", "s"];
export const WINDS: Wind[] = ["we", "ws", "ww", "wn"];
export const DRAGONS: Dragon[] = ["dr", "dg", "dw"];

/** Tuile dragon blanc (白板). Sert de "matérialisation" pour la valeur du 财神. */
export const BAI_BAN: Dragon = "dw";

/** Liste des 34 codes de tuiles distinctes. */
export const ALL_TILE_KINDS: TileCode[] = (() => {
  const tiles: TileCode[] = [];
  for (const suit of SUITS) {
    for (let n = 1; n <= 9; n++) {
      tiles.push(`${suit}${n}` as NumberedTile);
    }
  }
  tiles.push(...WINDS, ...DRAGONS);
  return tiles;
})();

/** Génère un mur complet de 136 tuiles (4 exemplaires de chaque kind). */
export function buildFullSet(): TileCode[] {
  const set: TileCode[] = [];
  for (const kind of ALL_TILE_KINDS) {
    for (let i = 0; i < 4; i++) set.push(kind);
  }
  return set;
}

export function isNumbered(tile: TileCode): tile is NumberedTile {
  return tile.length === 2 && (tile[0] === "m" || tile[0] === "p" || tile[0] === "s");
}

export function isHonor(tile: TileCode): tile is HonorTile {
  return !isNumbered(tile);
}

export function tileSuit(tile: NumberedTile): Suit {
  return tile[0] as Suit;
}

export function tileNumber(tile: NumberedTile): number {
  return Number.parseInt(tile[1]!, 10);
}

/**
 * Représentation humaine d'une tuile (debug).
 */
export function tileToString(tile: TileCode): string {
  if (isNumbered(tile)) {
    const suit = { m: "萬", p: "筒", s: "條" }[tileSuit(tile)];
    return `${tileNumber(tile)}${suit}`;
  }
  return {
    we: "東", ws: "南", ww: "西", wn: "北",
    dr: "中", dg: "發", dw: "白",
  }[tile];
}
