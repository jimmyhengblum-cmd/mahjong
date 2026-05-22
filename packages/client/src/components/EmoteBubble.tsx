interface EmoteBubbleProps {
  emoji: string;
  /** Force le rerender avec nouvelle animation quand l'ID change (rapid-fire). */
  id: number;
}

/**
 * Bulle flottante qui affiche une emote pendant ~3s. Utilisée dans
 * Opponent et seat-south pour montrer l'emote la plus récente du joueur.
 */
export function EmoteBubble({ emoji, id }: EmoteBubbleProps) {
  return (
    <div className="emote-bubble" key={id} aria-live="polite">
      <span className="emote-bubble-emoji">{emoji}</span>
    </div>
  );
}
