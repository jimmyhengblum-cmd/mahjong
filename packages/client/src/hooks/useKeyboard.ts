import { useEffect } from "react";

interface KeyHandlers {
  /** Tab : toggle scoreboard. */
  onTab?: () => void;
  /** Space : pass (en phase de réaction). */
  onSpace?: () => void;
  /** Escape : ferme l'overlay courant. */
  onEscape?: () => void;
}

/**
 * Raccourcis clavier globaux. Ignore les events provenant d'un input/textarea.
 */
export function useKeyboard(handlers: KeyHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Tab" && handlers.onTab) {
        e.preventDefault();
        handlers.onTab();
      } else if ((e.key === " " || e.code === "Space") && handlers.onSpace) {
        e.preventDefault();
        handlers.onSpace();
      } else if (e.key === "Escape" && handlers.onEscape) {
        handlers.onEscape();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
