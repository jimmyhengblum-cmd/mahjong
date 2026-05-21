import type { TileCode, ExposedMeld } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface HandProps {
  concealed: readonly TileCode[];
  exposed: readonly ExposedMeld[];
  jokerValue: TileCode;
  /** Si défini, clic sur tuile la défausse. */
  onDiscard?: (tile: TileCode) => void;
  /** Indices désactivés (ex: tuiles qu'on ne peut pas défausser). */
  disabled?: boolean;
}

export function Hand({ concealed, exposed, jokerValue, onDiscard, disabled }: HandProps) {
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
      <div className="hand">
        {concealed.map((tile, i) => (
          <button
            key={i}
            className="tile-btn"
            onClick={() => onDiscard?.(tile)}
            disabled={disabled || !onDiscard}
          >
            <Tile tile={tile} size={48} role={tileRole(tile, jokerValue)} />
          </button>
        ))}
      </div>
    </div>
  );
}
