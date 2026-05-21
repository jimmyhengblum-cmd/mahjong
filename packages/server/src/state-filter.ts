import type { RoundState, SeatIndex, TileCode } from "@mjwz/engine";

/**
 * Masque la main des autres sièges et le contenu du mur restant.
 * Retourne un RoundState au sens du moteur (Set/Map intacts) — la sérialisation
 * JSON-safe (Set/Map → arrays) est faite ensuite par serializeStateForWire.
 */
export function filterStateForSeat(state: RoundState, viewerSeat: SeatIndex): RoundState {
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
