import { useEffect, useRef } from "react";
import type { RoundEvent, SeatIndex } from "@mjwz/engine";
import { sound } from "../sound.js";

/**
 * Joue un son chaque fois qu'un nouvel event arrive.
 * + un son "turn" quand c'est au humain de jouer (transition).
 */
export function useGameSounds(
  events: readonly RoundEvent[],
  humanSeat: SeatIndex,
  isHumanTurn: boolean,
  isHumanReacting: boolean
) {
  const lastEventCount = useRef(0);
  useEffect(() => {
    if (events.length <= lastEventCount.current) {
      lastEventCount.current = events.length;
      return;
    }
    const fresh = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;

    for (const e of fresh) {
      switch (e.type) {
        case "discarded":
          sound.play("click");
          break;
        case "drawn":
          sound.play("draw");
          break;
        case "claimed":
          if (e.intent.type === "pong") sound.play("pong");
          else if (e.intent.type === "kong") sound.play("kong");
          else if (e.intent.type === "chi") sound.play("chi");
          break;
        case "hu":
          if (e.seat === humanSeat) sound.play("hu");
          else sound.play("lose");
          break;
        case "drawn-wall":
          sound.play("lose");
          break;
      }
    }
  }, [events, humanSeat]);

  // Notification quand c'est au humain
  const wasHumanActive = useRef(false);
  useEffect(() => {
    const isActive = isHumanTurn || isHumanReacting;
    if (isActive && !wasHumanActive.current) {
      sound.play("turn");
    }
    wasHumanActive.current = isActive;
  }, [isHumanTurn, isHumanReacting]);
}
