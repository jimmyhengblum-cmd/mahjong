import type { SeatIndex } from "@mjwz/engine";

interface RotationOverlayProps {
  currentSeat: SeatIndex | null;
  humanSeat: SeatIndex;
}

/**
 * Overlay SVG positionné par-dessus la table, qui dessine 4 arcs pointillés
 * reliant les 4 sièges entre eux dans le sens du jeu (anti-horaire).
 * L'arc partant du siège courant est en or et animé "marching ants" ;
 * les 3 autres restent visibles mais discrets pour montrer la trajectoire
 * complète de la rotation.
 */
export function RotationOverlay({ currentSeat, humanSeat }: RotationOverlayProps) {
  // 4 arcs (sens du jeu : 0 → 1 → 2 → 3 → 0). Coords en viewBox 100×100.
  const arcs: Array<{ from: SeatIndex; to: SeatIndex; d: string; label: string }> = [
    { from: 0, to: 1, d: "M 42 92 Q 12 92 8 52", label: "bas→gauche" },
    { from: 1, to: 2, d: "M 8 48 Q 8 12 42 8",   label: "gauche→haut" },
    { from: 2, to: 3, d: "M 58 8 Q 92 12 92 48", label: "haut→droite" },
    { from: 3, to: 0, d: "M 92 52 Q 92 92 58 92", label: "droite→bas" },
  ];

  return (
    <svg
      className="rotation-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="arrow-gold-active"
          markerWidth="4"
          markerHeight="4"
          refX="2"
          refY="2"
          orient="auto"
        >
          <polygon points="0 0, 4 2, 0 4" fill="#f1c40f" />
        </marker>
        <marker
          id="arrow-gold-dim"
          markerWidth="3"
          markerHeight="3"
          refX="1.5"
          refY="1.5"
          orient="auto"
        >
          <polygon points="0 0, 3 1.5, 0 3" fill="rgba(241,196,15,0.35)" />
        </marker>
      </defs>
      {arcs.map((arc, i) => {
        const isActive = currentSeat !== null && arc.from === currentSeat;
        const isHumanOutbound = currentSeat !== null && arc.from === humanSeat;
        return (
          <path
            key={i}
            d={arc.d}
            stroke={isActive ? "#f1c40f" : "rgba(241,196,15,0.25)"}
            strokeWidth={isActive ? 0.6 : 0.35}
            strokeDasharray={isActive ? "2 1.5" : "1.2 1.2"}
            strokeLinecap="round"
            fill="none"
            markerEnd={isActive ? "url(#arrow-gold-active)" : "url(#arrow-gold-dim)"}
            className={isActive ? "rotation-arc-active" : "rotation-arc"}
            data-human-outbound={isActive && isHumanOutbound ? "true" : undefined}
          />
        );
      })}
    </svg>
  );
}
