import type { RoundEvent, SeatIndex, TileCode } from "@mjwz/engine";
import { Tile, tileRole } from "./Tile.js";

interface CommonDiscardsProps {
  events: readonly RoundEvent[];
  jokerValue: TileCode;
  /** Tuile en cours de réaction (sera mise en évidence dans le tas). */
  pendingDiscardIndex: number | null;
}

interface DiscardEntry {
  seat: SeatIndex;
  tile: TileCode;
  claimed: boolean;
}

/**
 * Tas central commun : toutes les défausses non-revendiquées, en ordre chronologique.
 * Reconstruit l'état du tas en rejouant les events (discarded/claimed/hu).
 */
export function CommonDiscards({ events, jokerValue, pendingDiscardIndex }: CommonDiscardsProps) {
  const pile = derivePile(events);

  if (pile.length === 0) {
    return <div className="common-discards common-discards-empty" />;
  }

  const lastIndex = pile.length - 1;

  return (
    <div className="common-discards">
      <div className="common-discards-pile">
        {pile.map((entry, i) => (
          <div
            key={i}
            className={`discard-slot discard-seat-${entry.seat} ${
              i === lastIndex && pendingDiscardIndex !== null ? "discard-pending" : ""
            } ${i === pile.length - 1 ? "discard-just-arrived" : ""}`}
          >
            <Tile tile={entry.tile} size={26} role={tileRole(entry.tile, jokerValue)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reconstruit la pile d'après les events. */
function derivePile(events: readonly RoundEvent[]): DiscardEntry[] {
  const pile: DiscardEntry[] = [];
  for (const e of events) {
    if (e.type === "discarded") {
      pile.push({ seat: e.seat, tile: e.tile, claimed: false });
    } else if (e.type === "claimed") {
      // Le dernier discard non-revendiqué a été pris par e.seat
      for (let i = pile.length - 1; i >= 0; i--) {
        if (!pile[i]!.claimed) {
          pile[i] = { ...pile[i]!, claimed: true };
          break;
        }
      }
    } else if (e.type === "hu" && !e.selfPick) {
      for (let i = pile.length - 1; i >= 0; i--) {
        if (!pile[i]!.claimed) {
          pile[i] = { ...pile[i]!, claimed: true };
          break;
        }
      }
    }
  }
  return pile.filter((p) => !p.claimed);
}
