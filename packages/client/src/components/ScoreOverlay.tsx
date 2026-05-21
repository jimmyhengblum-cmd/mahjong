import type { SeatIndex } from "@mjwz/engine";
import { CloseIcon } from "./Icons.js";

interface ScoreOverlayProps {
  scores: readonly number[];
  roundCount: number;
  humanSeat: SeatIndex;
  /** Pseudo de chaque siège (4 entrées). Optionnel : si absent, on
   *  retombe sur les labels vent + cardinal (mode solo). */
  seatNames?: readonly string[];
  onClose: () => void;
  onReset: () => void;
}

const SEAT_WINDS = ["东", "南", "西", "北"];
const SEAT_LABELS_FULL = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function ScoreOverlay({
  scores,
  roundCount,
  humanSeat,
  seatNames,
  onClose,
  onReset,
}: ScoreOverlayProps) {
  // Tri par score décroissant pour un vrai "leaderboard"
  const ranked = scores
    .map((score, seat) => ({ score, seat: seat as SeatIndex }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="score-overlay" onClick={onClose}>
      <div className="score-overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="score-overlay-header">
          <div>
            <div className="score-overlay-title">Scores de session</div>
            <div className="score-overlay-sub">
              {roundCount} manche{roundCount > 1 ? "s" : ""} jouée{roundCount > 1 ? "s" : ""}
            </div>
          </div>
          <button className="score-overlay-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon />
          </button>
        </div>

        <div className="score-overlay-list">
          {ranked.map((row, rank) => {
            const pseudo = seatNames?.[row.seat];
            // Online : "南 Marie" · Solo (pas de seatNames significatifs) : "南 Sud"
            const displayName = pseudo
              ? `${SEAT_WINDS[row.seat]} ${pseudo}`
              : SEAT_LABELS_FULL[row.seat];
            return (
              <div
                key={row.seat}
                className={`score-overlay-row ${row.seat === humanSeat ? "is-human" : ""}`}
              >
                <span className="score-overlay-rank">{rank + 1}</span>
                <span className="score-overlay-name">{displayName}</span>
                <span
                  className={
                    "score-overlay-value " +
                    (row.score > 0 ? "is-pos" : row.score < 0 ? "is-neg" : "is-zero")
                  }
                >
                  {row.score > 0 ? "+" : ""}
                  {row.score}
                </span>
              </div>
            );
          })}
        </div>

        <button className="score-overlay-reset" onClick={onReset}>
          Réinitialiser la session
        </button>

        <div className="score-overlay-hint">
          <kbd>Tab</kbd> ferme · <kbd>Esc</kbd> aussi
        </div>
      </div>
    </div>
  );
}
