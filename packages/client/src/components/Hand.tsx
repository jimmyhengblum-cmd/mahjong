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
          const isDragged = draggedIdx === i;
          const isDragOver = dragOverIdx === i;
          return (
            <button
              key={i}
              className={`tile-btn ${isDragged ? "tile-dragging" : ""} ${
                isDragOver ? "tile-drag-over" : ""
              }`}
              style={{ ["--idx" as any]: i }}
              draggable={!disabled && !!onReorder}
              onDragStart={(e) => {
                setDraggedIdx(i);
                e.dataTransfer.effectAllowed = "move";
                // Indispensable pour que Firefox accepte le drag
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIdx !== i) setDragOverIdx(i);
              }}
              onDragLeave={() => {
                if (dragOverIdx === i) setDragOverIdx(null);
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
              title={`${tile} (clic = défausser, drag = réordonner)`}
            >
              <Tile tile={tile} size={48} role={tileRole(tile, jokerValue)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
