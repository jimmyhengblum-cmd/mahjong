import { tileToString, type RoundEvent, type RoundState, type SeatIndex } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface CenterInfoProps {
  state: RoundState;
  events: readonly RoundEvent[];
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function CenterInfo({ state, events }: CenterInfoProps) {
  const currentSeat = getCurrentSeat(state);

  return (
    <div className="center-info">
      {/* Compass : ordre de jeu + sens de rotation */}
      <TurnCompass currentSeat={currentSeat} />

      {/* Tuile en cours de réaction (en gros) */}
      {state.phase.kind === "reaction" && (
        <div className="discarded-panel">
          <div className="discarded-label">
            {SEAT_NAMES[state.phase.discardedBy]} défausse
          </div>
          <Tile
            tile={state.phase.discardedTile}
            size={56}
            role={tileRole(state.phase.discardedTile, state.ctx.jokerValue)}
            highlight
          />
          <div className="discarded-hint">
            {state.phase.pending.size} joueur(s) à réagir…
          </div>
        </div>
      )}

      {/* Log des actions */}
      <EventLog events={events} jokerValue={state.ctx.jokerValue} />
    </div>
  );
}

function getCurrentSeat(state: RoundState): SeatIndex | null {
  if (state.phase.kind === "ended") return null;
  if (state.phase.kind === "reaction") return state.phase.discardedBy; // celui qui vient de jouer
  return state.phase.current;
}

/** Petite boussole montrant l'ordre de jeu et le sens (anti-horaire). */
function TurnCompass({ currentSeat }: { currentSeat: SeatIndex | null }) {
  if (currentSeat === null) return null;
  // Sens du jeu : 0 → 1 → 2 → 3 → 0. Visuellement : sud → ouest → nord → est (anti-horaire).
  // Sur la boussole, le siège actuel est en haut, puis on tourne dans le sens du jeu.
  const order: SeatIndex[] = [];
  for (let i = 0; i < 4; i++) {
    order.push(((currentSeat + i) % 4) as SeatIndex);
  }
  return (
    <div className="turn-compass">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Cercle de fond */}
        <circle cx="60" cy="60" r="50" fill="rgba(0,0,0,0.25)" stroke="rgba(241,196,15,0.3)" strokeWidth="1" />
        {/* Arc directionnel anti-horaire */}
        <path
          d="M 80 60 A 20 20 0 0 0 60 40"
          fill="none"
          stroke="#f1c40f"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#f1c40f" />
          </marker>
        </defs>
        {/* 4 positions cardinales */}
        {[
          { seat: order[0]!, x: 60, y: 22, label: "1" },  // actuel = haut
          { seat: order[1]!, x: 22, y: 60, label: "2" },  // suivant = gauche (anti-horaire)
          { seat: order[2]!, x: 60, y: 98, label: "3" },
          { seat: order[3]!, x: 98, y: 60, label: "4" },
        ].map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="14"
              fill={i === 0 ? "#f1c40f" : "rgba(255,255,255,0.1)"}
              stroke={i === 0 ? "#fff" : "rgba(255,255,255,0.3)"}
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fontWeight="700"
              fill={i === 0 ? "#1f4d2c" : "#ecebd9"}
            >
              {SEAT_NAMES[p.seat]!.split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
      <div className="turn-compass-legend">↺ Anti-horaire · 1 = joue maintenant</div>
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
  const last = events.slice(-3).reverse();
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
        e.tile === jokerValue ? " ⚡" : ""
      }`;
    case "claimed":
      const labels: Record<string, string> = { chi: "吃 chi", pong: "碰 pong", kong: "杠 kong", hu: "胡 hu" };
      return `${SEAT_NAMES[e.seat]} ${labels[e.intent.type] ?? e.intent.type}`;
    case "passed":
      return `${SEAT_NAMES[e.seat]} passe`;
    case "hu":
      return `🎉 ${SEAT_NAMES[e.seat]} HU ${e.selfPick ? "(自摸)" : "(接炮)"}`;
    case "drawn-wall":
      return "🪶 Mur épuisé — manche nulle";
  }
}
