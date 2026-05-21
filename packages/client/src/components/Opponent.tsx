import type { ExposedMeld, TileCode } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface OpponentProps {
  label: string;
  concealedCount: number;
  exposed: readonly ExposedMeld[];
  discards: readonly TileCode[];
  jokerValue: TileCode;
  isCurrent: boolean;
  /** Position dans l'ordre de jeu depuis le siège courant (1 = joue, 2 = ensuite, etc.) */
  turnOrder: number;
}

export function Opponent({
  label,
  concealedCount,
  exposed,
  discards,
  jokerValue,
  isCurrent,
  turnOrder,
}: OpponentProps) {
  return (
    <div className="opponent">
      <div className={`opponent-label ${isCurrent ? "current" : ""}`}>
        <span className={`turn-badge ${turnOrder === 1 ? "turn-badge-current" : ""}`}>
          {turnOrder}
        </span>
        {label} · {concealedCount}
      </div>
      {exposed.length > 0 && (
        <div className="exposed-melds">
          {exposed.map((meld, i) => (
            <div className="meld" key={i}>
              {meld.tiles.map((t, j) => (
                <Tile key={j} tile={t} size={26} role={tileRole(t, jokerValue)} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="opponent-tiles">
        {Array.from({ length: concealedCount }).map((_, i) => (
          <Tile key={i} tile={"we"} hidden size={22} />
        ))}
      </div>
      {discards.length > 0 && (
        <div className="discards-block">
          <div className="discards-label">Défausses ({discards.length})</div>
          <div className="discards-grid">
            {discards.map((t, i) => (
              <Tile key={i} tile={t} size={22} role={tileRole(t, jokerValue)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
