import {
  computeScore,
  DEFAULT_SCORING,
  type RoundState,
  type SeatIndex,
  type TileCode,
} from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface WinningHandRevealProps {
  state: RoundState;
  humanSeat: SeatIndex;
  onNewRound: () => void;
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function WinningHandReveal({ state, humanSeat, onNewRound }: WinningHandRevealProps) {
  if (state.phase.kind !== "ended") return null;
  const result = state.phase.result;

  if (result.kind === "drawn-wall") {
    return (
      <div className="win-overlay">
        <div className="win-card win-card-draw">
          <div className="win-title">流局</div>
          <div className="win-subtitle">Manche nulle — le mur est épuisé</div>
          <button className="win-cta" onClick={onNewRound}>Nouvelle manche</button>
        </div>
      </div>
    );
  }

  const winner = result.winner!;
  const isHumanWinner = winner === humanSeat;
  const hand = state.hands[winner]!;
  const huResult = result.huResult!;

  // Calcule le score avec defaults raisonnables
  const score = computeScore({
    huResult,
    selfPick: result.discarder === null,
    isDealer: winner === state.dealer,
    dealerConsecutiveWins: 0,
    heavenly: false,
    earthly: false,
    singleWait: false,
    robKong: false,
  });

  return (
    <div className="win-overlay">
      <div className={`win-card ${isHumanWinner ? "win-card-you" : ""}`}>
        <div className="win-title">胡 ! HU !</div>
        <div className="win-subtitle">
          {SEAT_NAMES[winner]} {isHumanWinner ? "(vous)" : ""} gagne{" "}
          {result.discarder !== null
            ? `sur défausse de ${SEAT_NAMES[result.discarder]}`
            : "(auto-pioche 自摸)"}
        </div>

        {/* La main gagnante */}
        <div className="win-hand">
          <div className="win-section-label">Main gagnante</div>
          {hand.exposed.length > 0 && (
            <div className="win-exposed">
              {hand.exposed.map((meld, i) => (
                <div className="win-meld" key={i}>
                  {meld.tiles.map((t, j) => (
                    <Tile key={j} tile={t} size={36} role={tileRole(t, state.ctx.jokerValue)} />
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="win-concealed">
            {hand.concealed.map((tile, i) => (
              <Tile
                key={i}
                tile={tile}
                size={42}
                role={tileRole(tile, state.ctx.jokerValue)}
                highlight={tile === result.winningTile}
              />
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="win-score">
          <div className="win-section-label">Score</div>
          <div className="win-kinds">
            {huResult.kinds.map((k, i) => (
              <span key={i} className="win-kind-chip">{k}</span>
            ))}
            <span className="win-kind-chip win-kind-chip-strong">
              {score.breakdown.handMultiplierLabel}
            </span>
            {huResult.jokerCount > 0 && (
              <span className="win-kind-chip">{huResult.jokerCount} 财神</span>
            )}
          </div>
          <div className="win-score-formula">
            base {score.breakdown.baseScore} × {score.multiplier} (multipl)
            {score.jokerBonusTotal > 0 ? ` + ${score.jokerBonusTotal} bonus joker` : ""}
            {" = "}
            <strong>{score.perLoser}</strong> par perdant
          </div>
          <div className="win-score-total">
            Gain total : <strong>{score.winnerNetGain}</strong>{" "}
            {result.discarder !== null ? "(payés par le défausseur ×2)" : "(payés par les 3 perdants)"}
          </div>
        </div>

        <button className="win-cta" onClick={onNewRound}>Nouvelle manche</button>
      </div>
    </div>
  );
}
