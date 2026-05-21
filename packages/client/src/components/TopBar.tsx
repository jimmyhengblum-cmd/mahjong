import { tileToString, type RoundState, type SeatIndex } from "@mjwz/engine";
import { Tile } from "./Tile.js";
import { Tooltip } from "./Tooltip.js";
import { ScoreBoard } from "./ScoreBoard.js";
import { HelpIcon, RefreshIcon, SoundOffIcon, SoundOnIcon } from "./Icons.js";

interface TopBarProps {
  state: RoundState;
  onNewRound: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenTutorial: () => void;
  sessionScores: readonly number[];
  sessionRoundCount: number;
  humanSeat: SeatIndex;
  onResetSession: () => void;
}

export function TopBar({
  state,
  onNewRound,
  audioEnabled,
  onToggleAudio,
  onOpenTutorial,
  sessionScores,
  sessionRoundCount,
  humanSeat,
  onResetSession,
}: TopBarProps) {
  return (
    <header className="topbar">
      <Tooltip content="Mahjong de Wenzhou — 温州麻将" placement="bottom">
        <h1>温州麻将</h1>
      </Tooltip>

      <div className="topbar-info">
        <Tooltip
          content={
            <>
              <strong>财神 (joker)</strong> · {tileToString(state.ctx.jokerValue)}
              <br />
              Toutes ses copies sont wildcards.
              <br />
              Les 白板 prennent cette valeur.
            </>
          }
          placement="bottom"
        >
          <div className="topbar-joker">
            <Tile tile={state.ctx.jokerValue} size={32} role="joker" />
          </div>
        </Tooltip>

        <ScoreBoard
          scores={sessionScores}
          roundCount={sessionRoundCount}
          humanSeat={humanSeat}
          onResetSession={onResetSession}
        />
      </div>

      <div className="topbar-actions">
        <Tooltip content={audioEnabled ? "Couper le son" : "Activer le son"} placement="bottom">
          <button className="icon-btn" onClick={onToggleAudio} aria-label="Audio">
            {audioEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
        </Tooltip>
        <Tooltip content="Revoir le tutoriel" placement="bottom">
          <button className="icon-btn" onClick={onOpenTutorial} aria-label="Aide">
            <HelpIcon />
          </button>
        </Tooltip>
        <Tooltip content="Nouvelle manche" placement="bottom">
          <button
            className="icon-btn icon-btn-accent"
            onClick={onNewRound}
            aria-label="Nouvelle manche"
          >
            <RefreshIcon />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
