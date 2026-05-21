import { tileToString, type RoundEvent, type RoundState } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface CenterInfoProps {
  state: RoundState;
  events: readonly RoundEvent[];
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function CenterInfo({ state, events }: CenterInfoProps) {
  return (
    <div className="center-info">
      {/* Joker en évidence */}
      <div className="joker-panel">
        <div className="joker-label">财神 (joker)</div>
        <Tile tile={state.ctx.jokerValue} size={50} role="joker" />
        <div className="joker-value">= {tileToString(state.ctx.jokerValue)}</div>
        <div className="joker-hint">白板 = {tileToString(state.ctx.jokerValue)} normal</div>
      </div>

      {/* Tuile en cours de réaction (au centre, gros) */}
      {state.phase.kind === "reaction" && (
        <div className="discarded-panel">
          <div className="discarded-label">
            {SEAT_NAMES[state.phase.discardedBy]} défausse
          </div>
          <Tile
            tile={state.phase.discardedTile}
            size={60}
            role={tileRole(state.phase.discardedTile, state.ctx.jokerValue)}
            highlight
          />
          <div className="discarded-hint">
            {state.phase.pending.size} joueur(s) à réagir…
          </div>
        </div>
      )}

      {/* Log des actions récentes */}
      <EventLog events={events} jokerValue={state.ctx.jokerValue} />

      {/* Mur restant */}
      <div className="wall-count">Mur : {state.wall.tiles.length} tuiles</div>
    </div>
  );
}

function EventLog({
  events,
  jokerValue,
}: {
  events: readonly RoundEvent[];
  jokerValue: string;
}) {
  const last = events.slice(-4).reverse();
  if (last.length === 0) return null;
  return (
    <div className="event-log">
      {last.map((e, i) => (
        <div key={i} className={i === 0 ? "event-line event-fresh" : "event-line"}>
          {formatEvent(e, jokerValue)}
        </div>
      ))}
    </div>
  );
}

function formatEvent(e: RoundEvent, jokerValue: string): string {
  switch (e.type) {
    case "drawn":
      return `${SEAT_NAMES[e.seat]} pioche`;
    case "discarded":
      return `${SEAT_NAMES[e.seat]} défausse ${tileToString(e.tile)}${
        e.tile === jokerValue ? " (财神!)" : ""
      }`;
    case "claimed":
      const t = e.intent.type;
      const labels: Record<string, string> = { chi: "吃", pong: "碰", kong: "杠", hu: "胡" };
      return `${SEAT_NAMES[e.seat]} ${labels[t] ?? t}`;
    case "passed":
      return `${SEAT_NAMES[e.seat]} passe`;
    case "hu":
      return `🎉 ${SEAT_NAMES[e.seat]} fait HU ${e.selfPick ? "(auto-pioche)" : "(sur défausse)"}`;
    case "drawn-wall":
      return "🪶 Mur épuisé — manche nulle";
  }
}
