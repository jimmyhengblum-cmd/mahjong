import type { SeatIndex } from "@mjwz/engine";
import { Tooltip } from "./Tooltip.js";

interface ScoreBoardProps {
  scores: readonly number[];
  roundCount: number;
  humanSeat: SeatIndex;
  onResetSession: () => void;
}

const SEAT_LABELS = ["东", "南", "西", "北"];

/**
 * Chip ultra-minimal : ton delta de session, en gros, avec un breakdown
 * détaillé en tooltip au survol.
 */
export function ScoreBoard({ scores, roundCount, humanSeat, onResetSession }: ScoreBoardProps) {
  const myScore = scores[humanSeat] ?? 0;
  const sign = myScore > 0 ? "+" : "";
  return (
    <Tooltip
      placement="bottom"
      content={
        <div className="scoreboard-tooltip">
          <div className="scoreboard-tooltip-title">
            Session · {roundCount} manche{roundCount > 1 ? "s" : ""}
          </div>
          <div className="scoreboard-tooltip-grid">
            {scores.map((score, i) => (
              <div
                key={i}
                className={`scoreboard-tooltip-row ${i === humanSeat ? "scoreboard-tooltip-row-human" : ""}`}
              >
                <span>{SEAT_LABELS[i]}</span>
                <span
                  className={
                    score > 0 ? "scoreboard-tooltip-pos" : score < 0 ? "scoreboard-tooltip-neg" : ""
                  }
                >
                  {score > 0 ? "+" : ""}
                  {score}
                </span>
              </div>
            ))}
          </div>
          <div className="scoreboard-tooltip-hint">Clic pour reset</div>
        </div>
      }
    >
      <button
        className={`score-chip ${myScore > 0 ? "score-chip-positive" : myScore < 0 ? "score-chip-negative" : ""}`}
        onClick={onResetSession}
        aria-label={`Score session: ${sign}${myScore}`}
      >
        <span className="score-chip-value">
          {sign}
          {myScore}
        </span>
      </button>
    </Tooltip>
  );
}
