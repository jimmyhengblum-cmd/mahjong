import type { ExposedMeld, TileCode } from "@mjwz/engine";
import { Tile } from "./Tile.js";

interface OpponentProps {
  label: string;
  concealedCount: number;
  exposed: readonly ExposedMeld[];
  discards: readonly TileCode[];
  isCurrent: boolean;
}

export function Opponent({ label, concealedCount, exposed, discards, isCurrent }: OpponentProps) {
  return (
    <div className="opponent">
      <div className={`opponent-label ${isCurrent ? "current" : ""}`}>
        {label} · {concealedCount} tuiles
      </div>
      {exposed.length > 0 && (
        <div className="exposed-melds">
          {exposed.map((meld, i) => (
            <div className="meld" key={i}>
              {meld.tiles.map((t, j) => (
                <Tile key={j} tile={t} size={24} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="opponent-tiles">
        {Array.from({ length: concealedCount }).map((_, i) => (
          <Tile key={i} tile={"we"} hidden size={20} />
        ))}
      </div>
      {discards.length > 0 && (
        <div className="discards-row">
          {discards.map((t, i) => (
            <Tile key={i} tile={t} size={22} />
          ))}
        </div>
      )}
    </div>
  );
}
