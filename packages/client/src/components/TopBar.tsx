import { tileToString, type RoundState } from "@mjwz/engine";
import { Tile } from "./Tile.js";

interface TopBarProps {
  state: RoundState;
  onNewRound: () => void;
}

export function TopBar({ state, onNewRound }: TopBarProps) {
  return (
    <header className="topbar">
      <h1>温州麻将 <span className="topbar-sub">Mahjong de Wenzhou</span></h1>

      <div className="topbar-info">
        <div className="topbar-joker">
          <span className="topbar-joker-label">财神</span>
          <Tile tile={state.ctx.jokerValue} size={36} role="joker" />
          <span className="topbar-joker-val">{tileToString(state.ctx.jokerValue)}</span>
        </div>
      </div>

      <button onClick={onNewRound}>↺ Nouvelle manche</button>
    </header>
  );
}
