/**
 * Mur (mur de tuiles) et tirage du 财神.
 *
 * Le mur est mélangé avec un PRNG seedable pour la reproductibilité des parties
 * (utile pour les tests et le rejeu / replay).
 */

import type { TileCode } from "./tiles.js";
import { buildFullSet } from "./tiles.js";
import type { CaishenContext } from "./caishen.js";

/** PRNG mulberry32 — petit, rapide, suffisant pour un jeu. */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface Wall {
  /** Tuiles encore dans le mur, ordre = ordre de pioche (front). */
  readonly tiles: TileCode[];
  /** Tuile-indicateur du 财神 — révélée mais NON retirée (cf. règles). */
  readonly jokerIndicator: TileCode;
}

/**
 * Crée et mélange un mur, puis tire la tuile-indicateur du 财神.
 * La tuile-indicateur reste dans le mur (face visible) — elle pourra être piochée.
 */
export function createWall(seed: number): { wall: Wall; ctx: CaishenContext } {
  const rng = createRng(seed);
  const tiles = shuffle(buildFullSet(), rng);
  // On choisit la tuile-indicateur au hasard parmi le mur, sans la retirer.
  const indicatorIdx = Math.floor(rng() * tiles.length);
  const jokerIndicator = tiles[indicatorIdx]!;
  return {
    wall: { tiles, jokerIndicator },
    ctx: { jokerValue: jokerIndicator },
  };
}

/** Pioche n tuiles du début du mur. Retourne les tuiles et le mur restant. */
export function draw(wall: Wall, n: number): { drawn: TileCode[]; rest: Wall } {
  const drawn = wall.tiles.slice(0, n);
  const rest: Wall = {
    tiles: wall.tiles.slice(n),
    jokerIndicator: wall.jokerIndicator,
  };
  return { drawn, rest };
}
