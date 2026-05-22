import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@mjwz/server/types";
import type { SeatIndex } from "@mjwz/engine";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: readonly ChatMessage[];
  onSend: (text: string) => void;
  /** Mon siège — pour highlight mes propres messages. */
  mySeat: SeatIndex;
}

const SEAT_WINDS = ["东", "南", "西", "北"];

export function ChatDrawer({
  open,
  onClose,
  messages,
  onSend,
  mySeat,
}: ChatDrawerProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Autofocus à l'ouverture
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Auto-scroll au dernier message
  useEffect(() => {
    if (!open) return;
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages]);

  // Esc pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  if (!open) return null;
  return (
    <>
      <div className="chat-drawer-backdrop" onClick={onClose} />
      <div className="chat-drawer" role="dialog" aria-label="Tchat">
        <div className="chat-drawer-header">
          <span>Tchat</span>
          <button
            className="chat-drawer-close"
            onClick={onClose}
            aria-label="Fermer le tchat"
          >
            ×
          </button>
        </div>
        <div className="chat-drawer-log">
          {messages.length === 0 ? (
            <div className="chat-drawer-empty">
              Aucun message pour l'instant. Lance la conversation 👋
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`chat-msg ${m.seat === mySeat ? "chat-msg-mine" : ""}`}
              >
                <div className="chat-msg-meta">
                  <span className={`chat-msg-wind chat-msg-seat-${m.seat}`}>
                    {SEAT_WINDS[m.seat]}
                  </span>
                  <span className="chat-msg-name">{m.name}</span>
                </div>
                <div className="chat-msg-text">{m.text}</div>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
        <form className="chat-drawer-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-drawer-input"
            placeholder="Ton message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
          />
          <button
            type="submit"
            className="chat-drawer-send"
            disabled={!draft.trim()}
          >
            Envoyer
          </button>
        </form>
      </div>
    </>
  );
}
