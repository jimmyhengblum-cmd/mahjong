import type { SeatIndex } from "@mjwz/engine";
import { Tooltip } from "./Tooltip.js";

interface ScoreBoardProps {
  scores: readonly number[];
  roundCount: number;
  humanSeat: SeatIndex;
  onResetSession: () => void;
}

const SEAT_LABELS = ["东", "南", "西", "北"];

export function ScoreBoard({ scores, roundCount, humanSeat, onResetSession }: ScoreBoardProps) {
  return (
    <Tooltip
      placement="bottom"
      content={
        <>
          Scores cumulés de la session ({roundCount} manche{roundCount > 1 ? "s" : ""}).
          <br />
          Clique pour remettre à zéro.
        </>
      }
    >
      <button
        className="scoreboard"
        onClick={onResetSession}
        aria-label="Réinitialiser le score de session"
      >
        <span className="scoreboard-round">M.{roundCount}</span>
        <span className="scoreboard-divider" />
        {scores.map((score, i) => (
          <span
            key={i}
            className={`scoreboard-cell ${i === humanSeat ? "scoreboard-cell-human" : ""} ${
              score > 0 ? "scoreboard-cell-positive" : score < 0 ? "scoreboard-cell-negative" : ""
            }`}
          >
            <span className="scoreboard-cell-label">{SEAT_LABELS[i]}</span>
            <span className="scoreboard-cell-score">
              {score > 0 ? "+" : ""}
              {score}
            </span>
          </span>
        ))}
      </button>
    </Tooltip>
  );
}
