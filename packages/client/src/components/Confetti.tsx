import { useEffect, useState } from "react";

interface ConfettiProps {
  /** Trigger : à chaque incrément, une nouvelle vague tombe. */
  trigger: number;
  pieceCount?: number;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

const COLORS = ["#f1c40f", "#c8201f", "#157f3e", "#4aa3df", "#fff", "#e85a4f"];

/**
 * Pluie de confettis CSS-only quand `trigger` change.
 * Disparaît automatiquement après ~3s.
 */
export function Confetti({ trigger, pieceCount = 60 }: ConfettiProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const newPieces: Piece[] = Array.from({ length: pieceCount }).map((_, i) => ({
      id: trigger * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2.5 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      rotation: Math.random() * 360,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => setPieces([]), 4500);
    return () => clearTimeout(t);
  }, [trigger, pieceCount]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
