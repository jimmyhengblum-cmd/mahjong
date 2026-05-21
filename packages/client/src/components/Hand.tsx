import { useState } from "react";
import type { TileCode, ExposedMeld } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface HandProps {
  concealed: readonly TileCode[];
  exposed: readonly ExposedMeld[];
  jokerValue: TileCode;
  onDiscard?: (tile: TileCode) => void;
  onReorder?: (fromIdx: number, toIdx: number) => void;
  disabled?: boolean;
  /** Active la cascade d'apparition staggered (distribution). */
  dealing?: boolean;
}

export function Hand({
  concealed,
  exposed,
  jokerValue,
  onDiscard,
  onReorder,
  disabled,
  dealing,
}: HandProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /**
   * Renvoie une classe pour décaler la tuile et créer le trou
   * pendant le drag.
   *   - Drag vers la droite : tuiles entre origine+1 et hover décalées à gauche
   *   - Drag vers la gauche : tuiles entre hover et origine-1 décalées à droite
   */
  const getShiftClass = (idx: number): string => {
    if (draggedIdx === null || dragOverIdx === null) return "";
    if (idx === draggedIdx) return "tile-dragging";
    if (draggedIdx < dragOverIdx) {
      if (idx > draggedIdx && idx <= dragOverIdx) return "shift-left";
    } else if (draggedIdx > dragOverIdx) {
      if (idx >= dragOverIdx && idx < draggedIdx) return "shift-right";
    }
    return "";
  };

  return (
    <div>
      {exposed.length > 0 && (
        <div className="exposed-melds">
          {exposed.map((meld, i) => (
            <div className="meld" key={i}>
              {meld.tiles.map((t, j) => (
                <Tile key={j} tile={t} size={32} role={tileRole(t, jokerValue)} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className={`hand ${dealing ? "hand-dealing" : ""}`}>
        {concealed.map((tile, i) => {
          const shift = getShiftClass(i);
          return (
            <button
              key={i}
              className={`tile-btn ${shift}`}
              style={{ ["--idx" as any]: i }}
              draggable={!disabled && !!onReorder}
              onDragStart={(e) => {
                setDraggedIdx(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIdx !== i) setDragOverIdx(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== i && onReorder) {
                  onReorder(draggedIdx, i);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => {
                if (draggedIdx === null && onDiscard) onDiscard(tile);
              }}
              disabled={disabled && !onReorder}
              title={tile}
            >
              <Tile tile={tile} size={48} role={tileRole(tile, jokerValue)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
