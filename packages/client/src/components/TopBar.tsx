import { tileToString, type RoundState } from "@mjwz/engine";
import { Tile } from "./Tile.js";
import { Tooltip } from "./Tooltip.js";
import { ChartIcon, HelpIcon, RefreshIcon, SoundOffIcon, SoundOnIcon } from "./Icons.js";

interface TopBarProps {
  state: RoundState;
  onNewRound: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenTutorial: () => void;
  onToggleScores: () => void;
  onExit?: () => void;
  /** Slot pour boutons additionnels (ex: cloche tchat en mode online). */
  extraActions?: React.ReactNode;
}

export function TopBar({
  state,
  onNewRound,
  audioEnabled,
  onToggleAudio,
  onOpenTutorial,
  onToggleScores,
  onExit,
  extraActions,
}: TopBarProps) {
  return (
    <header className="topbar">
      <h1>温州麻将</h1>

      <div className="topbar-info">
        <Tooltip content={`财神 · ${tileToString(state.ctx.jokerValue)}`} placement="bottom">
          <div className="topbar-joker">
            <span className="topbar-joker-label">财神</span>
            <Tile tile={state.ctx.jokerValue} size={28} role="joker" />
          </div>
        </Tooltip>
      </div>

      <div className="topbar-actions">
        {extraActions}
        <Tooltip content={<>Scores <kbd>Tab</kbd></>} placement="bottom">
          <button className="icon-btn" onClick={onToggleScores} aria-label="Scores de session">
            <ChartIcon />
          </button>
        </Tooltip>
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
        {onExit && (
          <Tooltip content="Quitter la partie" placement="bottom">
            <button className="icon-btn" onClick={onExit} aria-label="Quitter">
              ✕
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
