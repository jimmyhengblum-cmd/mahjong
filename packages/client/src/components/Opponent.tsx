import type { ExposedMeld, TileCode } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

type Status = "idle" | "current" | "passed" | "claimed";

interface OpponentProps {
  label: string;
  concealedCount: number;
  exposed: readonly ExposedMeld[];
  jokerValue: TileCode;
  status: Status;
  /** Position dans l'ordre de jeu (1 = joue maintenant). */
  turnOrder: number;
}

export function Opponent({
  label,
  concealedCount,
  exposed,
  jokerValue,
  status,
  turnOrder,
}: OpponentProps) {
  return (
    <div className={`opponent opponent-${status}`}>
      <div className="opponent-label">
        <span className={`turn-badge ${turnOrder === 1 ? "turn-badge-current" : ""}`}>
          {turnOrder}
        </span>
        {label} · {concealedCount}
        {status === "passed" && <span className="status-pill status-passed">passe</span>}
        {status === "claimed" && <span className="status-pill status-claimed">réagit</span>}
      </div>
      {exposed.length > 0 && (
        <div className="exposed-melds">
          {exposed.map((meld, i) => (
            <div className="meld" key={i}>
              {meld.tiles.map((t, j) => (
                <Tile key={j} tile={t} size={28} role={tileRole(t, jokerValue)} />
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
    </div>
  );
}
