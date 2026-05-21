/**
 * Disposition authentique du mur : 4 côtés de 17×2 tuiles formant un carré.
 *
 *     N N N N N N N N N N N N N N N N N
 *     N N N N N N N N N N N N N N N N N
 *   W W                               E E
 *   W W                               E E
 *   W W       (discards inside)       E E
 *   W W                               E E
 *   W W                               E E
 *     S S S S S S S S S S S S S S S S S
 *     S S S S S S S S S S S S S S S S S
 *
 * Chaque côté appartient visuellement à un joueur :
 *   - Sud (bas)    = humain (东 Est, siège 0)
 *   - Ouest (gauche) = 南 Sud (siège 1)
 *   - Nord (haut)  = 西 Ouest (siège 2)
 *   - Est (droite) = 北 Nord (siège 3)
 *
 * Les tuiles déjà piochées s'estompent. L'ordre de pioche démarre à un coin
 * (ici : sud-est, près du donneur) et tourne en sens anti-horaire.
 */

interface WallSquareProps {
  remaining: number;
  total?: number;
  children?: React.ReactNode;
}

const SIDE_TILES = 34; // 17 × 2 par côté
const SIDES = 4;

export function WallSquare({ remaining, total = 136, children }: WallSquareProps) {
  const drawn = total - remaining;

  return (
    <div className="wall-square">
      <WallSide name="north" startIdx={SIDE_TILES * 0} drawn={drawn} />
      <WallSide name="east"  startIdx={SIDE_TILES * 1} drawn={drawn} />
      <WallSide name="south" startIdx={SIDE_TILES * 2} drawn={drawn} />
      <WallSide name="west"  startIdx={SIDE_TILES * 3} drawn={drawn} />

      <div className="wall-square-inside">{children}</div>
    </div>
  );
}

interface WallSideProps {
  name: "north" | "east" | "south" | "west";
  startIdx: number;
  drawn: number;
}

function WallSide({ name, startIdx, drawn }: WallSideProps) {
  // Couleur d'accent selon le joueur "propriétaire" du côté
  const accent = {
    north: "rgba(95, 185, 111, 0.4)",   // West seat → vert
    east:  "rgba(232, 90, 79, 0.4)",    // North seat → rouge
    south: "rgba(241, 196, 15, 0.5)",   // East seat (humain) → or
    west:  "rgba(74, 163, 223, 0.4)",   // South seat → bleu
  }[name];

  return (
    <div className={`wall-side wall-side-${name}`} style={{ borderColor: accent }}>
      {Array.from({ length: SIDE_TILES }).map((_, i) => {
        const globalIdx = startIdx + i;
        const isDrawn = globalIdx < drawn;
        return (
          <div
            key={i}
            className={`wall-tile ${isDrawn ? "wall-tile-drawn" : ""}`}
            style={{
              animationDelay: isDrawn ? "0ms" : `${Math.min(globalIdx * 3, 500)}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
