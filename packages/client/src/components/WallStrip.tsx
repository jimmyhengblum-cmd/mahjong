interface WallStripProps {
  remaining: number;
  total?: number;
}

/**
 * Représente le mur complet en strip horizontal. Chaque tuile-back est visible.
 * Les tuiles déjà piochées sont rendues semi-transparentes / vidées.
 *
 * Disposition : 34 colonnes × 4 rangs = 136 tuiles. Compact en hauteur.
 */
export function WallStrip({ remaining, total = 136 }: WallStripProps) {
  const drawn = total - remaining;
  return (
    <div className="wall-strip">
      <div className="wall-strip-label">
        <span>Mur</span>
        <span className="wall-strip-count">
          {remaining} <span className="wall-strip-count-total">/ {total}</span>
        </span>
        {drawn > 0 && (
          <span className="wall-strip-drawn">
            {drawn} distribuée(s)
          </span>
        )}
      </div>
      <div className="wall-strip-grid">
        {Array.from({ length: total }).map((_, i) => {
          const isDrawn = i >= remaining;
          return (
            <div
              key={i}
              className={`wall-tile ${isDrawn ? "wall-tile-drawn" : ""}`}
              style={{
                animationDelay: isDrawn ? "0ms" : `${Math.min(i * 4, 800)}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
