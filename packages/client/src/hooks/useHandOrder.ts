import { useCallback, useEffect, useState } from "react";
import type { TileCode } from "@mjwz/engine";

/**
 * Permet à l'utilisateur de réorganiser sa main via drag-and-drop.
 * Synchronise avec la main du moteur : conserve l'ordre custom pour les tuiles
 * déjà présentes, ajoute les nouvelles à la fin, retire celles qui ont disparu.
 */
export function useHandOrder(engineHand: readonly TileCode[]) {
  const [order, setOrder] = useState<TileCode[]>(() => [...engineHand]);

  useEffect(() => {
    setOrder((prev) => syncOrder(prev, engineHand));
  }, [engineHand]);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setOrder((prev) => {
      if (fromIdx < 0 || fromIdx >= prev.length || toIdx < 0 || toIdx >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved!);
      return next;
    });
  }, []);

  /** Reset à l'ordre du moteur (tri par défaut). */
  const resetOrder = useCallback(() => {
    setOrder([...engineHand]);
  }, [engineHand]);

  return { order, reorder, resetOrder };
}

function syncOrder(prev: readonly TileCode[], engine: readonly TileCode[]): TileCode[] {
  const remaining = new Map<TileCode, number>();
  for (const t of engine) remaining.set(t, (remaining.get(t) ?? 0) + 1);

  const result: TileCode[] = [];
  // Garde les tuiles dans l'ordre custom si elles sont toujours dans la main engine
  for (const tile of prev) {
    const c = remaining.get(tile) ?? 0;
    if (c > 0) {
      result.push(tile);
      remaining.set(tile, c - 1);
    }
  }
  // Ajoute les nouvelles tuiles à la fin
  for (const [tile, count] of remaining) {
    for (let i = 0; i < count; i++) result.push(tile);
  }
  return result;
}
