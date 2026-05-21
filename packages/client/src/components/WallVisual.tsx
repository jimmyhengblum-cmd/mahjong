interface WallVisualProps {
  remaining: number;
  total?: number;
}

/** Petite barre visuelle du mur restant avec count overlay. */
export function WallVisual({ remaining, total = 136 }: WallVisualProps) {
  const pct = Math.max(0, Math.min(1, remaining / total));
  const low = remaining < 20;

  return (
    <div className={`wall-visual ${low ? "wall-low" : ""}`}>
      <div className="wall-icons">
        <span className="wall-tile-icon" />
        <span className="wall-tile-icon" style={{ opacity: pct > 0.66 ? 1 : pct > 0.33 ? 0.5 : 0.2 }} />
        <span className="wall-tile-icon" style={{ opacity: pct > 0.33 ? 1 : 0.2 }} />
      </div>
      <div className="wall-info">
        <span className="wall-label">Mur</span>
        <span className="wall-count">{remaining}</span>
      </div>
      <div className="wall-bar">
        <div className="wall-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
