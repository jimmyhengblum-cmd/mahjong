import { useEffect, useState } from "react";
import type { SeatIndex } from "@mjwz/engine";

interface TurnTimerProps {
  /** Sièges humains attendus par le watchdog (toi seul, ou plusieurs en reaction). */
  seats: readonly SeatIndex[];
  /** Timestamp absolu auquel le serveur va auto-jouer. */
  deadlineMs: number;
  /** Le siège du joueur local — pour mettre en avant son propre décompte. */
  humanSeat: SeatIndex;
}

const TOTAL_MS = 45_000;

/**
 * Décompte visuel avant que le bot IA ne joue à la place du/des humain(s)
 * en retard. Mis à jour 4x/seconde pour fluidité sans surcoût.
 */
export function TurnTimer({ seats, deadlineMs, humanSeat }: TurnTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, deadlineMs - now);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const fraction = Math.max(0, Math.min(1, remainingMs / TOTAL_MS));

  const isMine = seats.includes(humanSeat);
  // Couleur :
  //   > 50% temps restant : vert
  //   25–50% : ambre
  //   < 25% : rouge + pulse
  const stateClass =
    fraction > 0.5 ? "tt-ok" : fraction > 0.25 ? "tt-warn" : "tt-danger";

  return (
    <div
      className={`turn-timer ${isMine ? "turn-timer-mine" : "turn-timer-other"} ${stateClass}`}
      aria-label={`Temps restant : ${secondsLeft}s`}
      role="timer"
    >
      <div className="turn-timer-bar">
        <div
          className="turn-timer-bar-fill"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <div className="turn-timer-label">
        {isMine ? "À toi" : "En attente"} · {secondsLeft}s
      </div>
    </div>
  );
}
