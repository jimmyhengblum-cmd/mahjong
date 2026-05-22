interface EmoteBarProps {
  onSend: (emoji: string) => void;
}

/** Les 7 emotes que les joueurs peuvent envoyer. */
export const EMOTES = ["😂", "😭", "😡", "😎", "🤯", "🤫", "👏"] as const;

/**
 * Barre horizontale de 7 boutons emoji. Au clic, envoie l'emote au
 * serveur qui la broadcast à toute la room.
 */
export function EmoteBar({ onSend }: EmoteBarProps) {
  return (
    <div className="emote-bar" role="toolbar" aria-label="Emotes">
      {EMOTES.map((emoji) => (
        <button
          key={emoji}
          className="emote-bar-btn"
          onClick={() => onSend(emoji)}
          aria-label={`Emote ${emoji}`}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
