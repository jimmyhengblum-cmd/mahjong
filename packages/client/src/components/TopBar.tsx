import { tileToString, type RoundState } from "@mjwz/engine";
import { Tile } from "./Tile.js";
import { Tooltip } from "./Tooltip.js";

interface TopBarProps {
  state: RoundState;
  onNewRound: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenTutorial: () => void;
}

export function TopBar({
  state,
  onNewRound,
  audioEnabled,
  onToggleAudio,
  onOpenTutorial,
}: TopBarProps) {
  return (
    <header className="topbar">
      <h1>
        温州麻将 <span className="topbar-sub">Mahjong de Wenzhou</span>
      </h1>

      <div className="topbar-info">
        <Tooltip
          content={
            <>
              <strong>财神 (joker)</strong> du jour : {tileToString(state.ctx.jokerValue)}.
              <br />
              Toutes les copies sont wildcards, et les 白板 prennent cette valeur.
            </>
          }
          placement="bottom"
        >
          <div className="topbar-joker">
            <span className="topbar-joker-label">财神</span>
            <Tile tile={state.ctx.jokerValue} size={36} role="joker" />
            <span className="topbar-joker-val">{tileToString(state.ctx.jokerValue)}</span>
          </div>
        </Tooltip>
      </div>

      <div className="topbar-actions">
        <Tooltip content={audioEnabled ? "Couper le son" : "Activer le son"} placement="bottom">
          <button className="icon-btn" onClick={onToggleAudio} aria-label="Toggle audio">
            {audioEnabled ? "🔊" : "🔇"}
          </button>
        </Tooltip>
        <Tooltip content="Revoir le tutoriel" placement="bottom">
          <button className="icon-btn" onClick={onOpenTutorial} aria-label="Aide">
            ?
          </button>
        </Tooltip>
        <button onClick={onNewRound}>↺ Nouvelle manche</button>
      </div>
    </header>
  );
}
