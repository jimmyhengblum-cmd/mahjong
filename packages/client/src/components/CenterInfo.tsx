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

export function CenterInfo({ state, events, humanSeat }: CenterInfoProps) {
  const currentSeat = getCurrentSeat(state);

  return (
    <div className="center-info">
      <WallSquare remaining={state.wall.tiles.length}>
        <div className="center-inside">
          {/* Boussole orientée comme à l'écran */}
          <TurnCompass currentSeat={currentSeat} humanSeat={humanSeat} state={state} />

          {/* Tuile en cours de réaction (gros) */}
          {state.phase.kind === "reaction" && <DiscardedHighlight state={state} />}

          {/* Tas commun */}
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

function getCurrentSeat(state: RoundState): SeatIndex | null {
  if (state.phase.kind === "ended") return null;
  if (state.phase.kind === "reaction") return state.phase.discardedBy;
  return state.phase.current;
}

function DiscardedHighlight({ state }: { state: RoundState }) {
  if (state.phase.kind !== "reaction") return null;
  return (
    <div className="discarded-panel">
      <div className="discarded-label">{SEAT_NAMES_SHORT[state.phase.discardedBy]} défausse</div>
      <Tile
        tile={state.phase.discardedTile}
        size={52}
        role={tileRole(state.phase.discardedTile, state.ctx.jokerValue)}
        highlight
      />
      <div className="discarded-hint">
        {state.phase.pending.size} en attente · {state.phase.claims.size} ont réagi
      </div>
    </div>
  );
}

/** Boussole compacte (la grosse rotation visuelle est portée par le wall). */
function TurnCompass({
  currentSeat,
  humanSeat,
  state,
}: {
  currentSeat: SeatIndex | null;
  humanSeat: SeatIndex;
  state: RoundState;
}) {
  const positions: Record<SeatIndex, { x: number; y: number }> = {
    0: { x: 50, y: 82 },
    1: { x: 18, y: 50 },
    2: { x: 50, y: 18 },
    3: { x: 82, y: 50 },
  };

  const reactionPhase = state.phase.kind === "reaction" ? state.phase : null;
  const passedSet = new Set<SeatIndex>();
  const claimedSet = new Set<SeatIndex>();
  if (reactionPhase) {
    for (const s of [0, 1, 2, 3] as SeatIndex[]) {
      if (s === reactionPhase.discardedBy) continue;
      if (reactionPhase.claims.has(s)) claimedSet.add(s);
      else if (!reactionPhase.pending.has(s)) passedSet.add(s);
    }
  }

  return (
    <div className="turn-compass">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="rgba(0,0,0,0.4)" stroke="rgba(241,196,15,0.25)" />
        <path
          d="M 80 50 A 30 30 0 0 0 50 20"
          fill="none"
          stroke="rgba(241,196,15,0.6)"
          strokeWidth="1.5"
          strokeDasharray="2,2"
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
            <polygon points="0 0, 5 2.5, 0 5" fill="rgba(241,196,15,0.7)" />
          </marker>
        </defs>

        {([0, 1, 2, 3] as SeatIndex[]).map((seat) => {
          const pos = positions[seat];
          const isCurrent = seat === currentSeat;
          const isHuman = seat === humanSeat;
          const hasPassed = passedSet.has(seat);
          const hasClaimed = claimedSet.has(seat);
          return (
            <g key={seat} className={`compass-seat ${isCurrent ? "compass-seat-current" : ""}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="13"
                fill={
                  isCurrent
                    ? "#f1c40f"
                    : hasClaimed
                    ? "#3498db"
                    : hasPassed
                    ? "rgba(80,80,80,0.5)"
                    : "rgba(255,255,255,0.12)"
                }
                stroke={isHuman ? "#fff" : "rgba(255,255,255,0.4)"}
                strokeWidth={isHuman ? 1.8 : 1}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="700"
                fill={isCurrent ? "#1f4d2c" : "#ecebd9"}
              >
                {SEAT_NAMES_SHORT[seat]}
              </text>
              {isHuman && (
                <text
                  x={pos.x}
                  y={pos.y + 22}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#f1c40f"
                >
                  你
                </text>
              )}
              {hasPassed && <text x={pos.x + 11} y={pos.y - 9} fontSize="9" fill="#888">✗</text>}
              {hasClaimed && <text x={pos.x + 11} y={pos.y - 9} fontSize="9" fill="#3498db">!</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
