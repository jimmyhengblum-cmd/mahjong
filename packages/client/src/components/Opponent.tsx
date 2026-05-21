import type { ExposedMeld, TileCode } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";
import { Tooltip } from "./Tooltip.js";

type Status = "idle" | "current" | "passed" | "claimed";

interface OpponentProps {
  /** Wind seul, ex: "南". */
  wind: string;
  /** Nom long pour le tooltip, ex: "南 Sud". */
  fullName: string;
  /** Pseudo du joueur (ex: "Marie" ou "Bot 1"). */
  playerName: string;
  concealedCount: number;
  exposed: readonly ExposedMeld[];
  jokerValue: TileCode;
  status: Status;
  /** Position dans l'ordre de jeu (1 = joue maintenant). */
  turnOrder: number;
}

export function Opponent({
  wind,
  fullName,
  playerName,
  concealedCount,
  exposed,
  jokerValue,
  status,
  turnOrder,
}: OpponentProps) {
  const statusTitle =
    status === "passed" ? "A passé" : status === "claimed" ? "Réagit" : undefined;

  return (
    <div className={`opponent opponent-${status}`}>
      <Tooltip content={`${fullName} · ${playerName}`} placement="bottom">
        <div className="opponent-label">
          <span className={`turn-badge ${turnOrder === 1 ? "turn-badge-current" : ""}`}>
            {turnOrder}
          </span>
          <span className="opponent-wind">{wind}</span>
          <span className="opponent-name">{playerName}</span>
          <span className="opponent-count">{concealedCount}</span>
          {statusTitle && (
            <span className={`status-dot status-dot-${status}`} title={statusTitle} />
          )}
        </div>
      </Tooltip>
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
          <Tile key={i} tile={"we"} hidden size={20} />
        ))}
      </div>
    </div>
  );
}
