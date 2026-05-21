import type { RoundState, SeatIndex, TileCode } from "@mjwz/engine";
import type { FilteredRoundState } from "./types.js";

/**
 * Masque la main des autres sièges et le contenu du mur restant.
 * Le client garde la même forme (RoundState) mais sans pouvoir tricher.
 */
export function filterStateForSeat(
  state: RoundState,
  viewerSeat: SeatIndex
): FilteredRoundState {
  const PLACEHOLDER: TileCode = "we";
  return {
    ...state,
    wall: {
      ...state.wall,
      // On masque le contenu mais on garde la longueur (pour l'UI mur restant).
      tiles: state.wall.tiles.map(() => PLACEHOLDER),
    },
    hands: state.hands.map((hand, i) =>
      i === viewerSeat
        ? hand
        : {
            ...hand,
            // Masque le contenu mais garde la longueur (pour le compte de tuiles).
            concealed: hand.concealed.map(() => PLACEHOLDER),
          }
    ),
  };
}
