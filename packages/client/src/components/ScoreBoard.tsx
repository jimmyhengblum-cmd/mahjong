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
          Scores cumulés sur {roundCount} manche{roundCount > 1 ? "s" : ""}.
          <br />
          Clic pour remettre à zéro.
        </>
      }
    >
      <button
        className="scoreboard"
        onClick={onResetSession}
        aria-label="Score de session"
      >
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
