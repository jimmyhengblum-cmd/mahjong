import { tileToString, type RoundState } from "@mjwz/engine";
import { Tile } from "./Tile.js";

interface CenterInfoProps {
  state: RoundState;
}

const SEAT_NAMES = ["东 (Est)", "南 (Sud)", "西 (Ouest)", "北 (Nord)"];

export function CenterInfo({ state }: CenterInfoProps) {
  const phaseLabel =
    state.phase.kind === "ended"
      ? "Manche terminée"
      : state.phase.kind === "reaction"
      ? `Défausse de ${SEAT_NAMES[state.phase.discardedBy]}`
      : `Au tour de ${SEAT_NAMES[(state.phase as any).current]}`;

  return (
    <div className="center-info">
      <div className="joker">
        财神 :{" "}
        <span style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 6 }}>
          <Tile tile={state.ctx.jokerValue} size={36} highlight />
        </span>{" "}
        ({tileToString(state.ctx.jokerValue)})
      </div>
      <div className="wall-count">Mur : {state.wall.tiles.length} tuiles restantes</div>
      <div style={{ fontSize: 14, opacity: 0.85 }}>{phaseLabel}</div>
    </div>
  );
}
