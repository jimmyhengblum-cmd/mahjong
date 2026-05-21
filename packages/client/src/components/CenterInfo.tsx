import type { RoundEvent, RoundState, SeatIndex } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";
import { CommonDiscards } from "./CommonDiscards.js";
import { WallSquare } from "./WallSquare.js";

interface CenterInfoProps {
  state: RoundState;
  events: readonly RoundEvent[];
  humanSeat: SeatIndex;
}

const SEAT_NAMES_SHORT = ["东", "南", "西", "北"];

export function CenterInfo({ state, events }: CenterInfoProps) {
  return (
    <div className="center-info">
      <WallSquare remaining={state.wall.tiles.length}>
        <div className="center-inside-flex">
          {/* Tuile en réaction — en gros, en haut */}
          {state.phase.kind === "reaction" && <DiscardedHighlight state={state} />}

          {/* Tas commun (occupe tout l'espace restant) */}
          <CommonDiscards
            events={events}
            jokerValue={state.ctx.jokerValue}
            pendingDiscardIndex={state.phase.kind === "reaction" ? -1 : null}
          />
        </div>
      </WallSquare>
    </div>
  );
}

function DiscardedHighlight({ state }: { state: RoundState }) {
  if (state.phase.kind !== "reaction") return null;
  return (
    <div className="discarded-panel">
      <div className="discarded-label">{SEAT_NAMES_SHORT[state.phase.discardedBy]} défausse</div>
      <Tile
        tile={state.phase.discardedTile}
        size={48}
        role={tileRole(state.phase.discardedTile, state.ctx.jokerValue)}
        highlight
      />
      <div className="discarded-hint">
        {state.phase.pending.size} en attente · {state.phase.claims.size} ont réagi
      </div>
    </div>
  );
}
