import type { RoundState, SeatIndex, TileCode } from "@mjwz/engine";

/**
 * Masque la main des autres sièges et le contenu du mur restant.
 * Retourne un RoundState au sens du moteur (Set/Map intacts) — la sérialisation
 * JSON-safe (Set/Map → arrays) est faite ensuite par serializeStateForWire.
 */
export function filterStateForSeat(state: RoundState, viewerSeat: SeatIndex): RoundState {
  const PLACEHOLDER: TileCode = "we";

  // Quand la manche est terminée, on révèle toutes les mains. Plus rien à cacher
  // et le client a besoin des vraies tuiles pour afficher la main gagnante.
  if (state.phase.kind === "ended") {
    return {
      ...state,
      wall: {
        ...state.wall,
        tiles: state.wall.tiles.map(() => PLACEHOLDER),
      },
      // hands non masquées
    };
  }

  return {
    ...state,
    wall: {
      ...state.wall,
      tiles: state.wall.tiles.map(() => PLACEHOLDER),
    },
    hands: state.hands.map((hand, i) =>
      i === viewerSeat
        ? hand
        : {
            ...hand,
            concealed: hand.concealed.map(() => PLACEHOLDER),
          }
    ),
  };
}
