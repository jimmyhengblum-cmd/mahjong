import type { RoundEvent, RoundState, SeatIndex, TileCode } from "@mjwz/engine";
import { tileToString } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";
import { CommonDiscards } from "./CommonDiscards.js";

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
      {/* Boussole interactive orientée comme à l'écran */}
      <TurnCompass currentSeat={currentSeat} humanSeat={humanSeat} state={state} />

      {/* Réaction en cours */}
      {state.phase.kind === "reaction" && (
        <DiscardedHighlight state={state} />
      )}

      {/* Tas commun des défausses */}
      <CommonDiscards
        events={events}
        jokerValue={state.ctx.jokerValue}
        pendingDiscardIndex={state.phase.kind === "reaction" ? -1 : null}
      />
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
        size={56}
        role={tileRole(state.phase.discardedTile, state.ctx.jokerValue)}
        highlight
      />
      <div className="discarded-hint">
        {state.phase.pending.size} en attente · {state.phase.claims.size} ont réagi
      </div>
    </div>
  );
}

/**
 * Boussole orientée comme à l'écran :
 *   - Bas du compass    = humain (siège 0 = Est)
 *   - Gauche du compass = siège 1 (Sud)
 *   - Haut du compass   = siège 2 (Ouest)
 *   - Droite du compass = siège 3 (Nord)
 *
 * Chaque cercle illumine quand c'est au tour du joueur correspondant.
 * Le siège humain a une petite démarcation "你" pour qu'on le retrouve.
 */
function TurnCompass({
  currentSeat,
  humanSeat,
  state,
}: {
  currentSeat: SeatIndex | null;
  humanSeat: SeatIndex;
  state: RoundState;
}) {
  // Mapping siège → position visuelle sur la boussole (top/right/bottom/left)
  // En screen : humain = bottom-screen. La rotation visuelle est anti-horaire :
  //   humain (0) bottom → seat 1 left → seat 2 top → seat 3 right
  const positions: Record<SeatIndex, { x: number; y: number }> = {
    0: { x: 60, y: 98 }, // bottom (humain)
    1: { x: 22, y: 60 }, // left
    2: { x: 60, y: 22 }, // top
    3: { x: 98, y: 60 }, // right
  };

  // Statut de chaque siège pendant la phase de réaction
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
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="rgba(0,0,0,0.25)"
          stroke="rgba(241,196,15,0.3)"
          strokeWidth="1"
        />
        {/* Arc directionnel (anti-horaire) */}
        <path
          d="M 95 60 A 35 35 0 0 0 60 25"
          fill="none"
          stroke="rgba(241,196,15,0.5)"
          strokeWidth="2"
          strokeDasharray="3,3"
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="rgba(241,196,15,0.7)" />
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
                r="16"
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
                strokeWidth={isHuman ? 2 : 1}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="15"
                fontWeight="700"
                fill={isCurrent ? "#1f4d2c" : "#ecebd9"}
              >
                {SEAT_NAMES_SHORT[seat]}
              </text>
              {/* Marque "you" sous le siège humain */}
              {isHuman && (
                <text
                  x={pos.x}
                  y={pos.y + 28}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#f1c40f"
                >
                  你 vous
                </text>
              )}
              {/* Indicateur passe / claim */}
              {hasPassed && (
                <text x={pos.x + 14} y={pos.y - 12} fontSize="11" fill="#888">✗</text>
              )}
              {hasClaimed && (
                <text x={pos.x + 14} y={pos.y - 12} fontSize="11" fill="#3498db">!</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="turn-compass-legend">
        ↺ Anti-horaire · {currentSeat !== null && currentSeat === humanSeat ? "À vous !" : "joue maintenant"}
      </div>
    </div>
  );
}
