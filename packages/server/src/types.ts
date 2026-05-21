/**
 * Types partagés entre serveur et client pour la communication Socket.io.
 * Le client importe cela via @mjwz/server/types.
 */

import type { RoundAction, RoundEvent, RoundState, SeatIndex } from "@mjwz/engine";

/** Une room contient 4 sièges. Chaque siège est soit humain, soit bot, soit vide. */
export type Seat =
  | { kind: "empty" }
  | { kind: "bot"; label: string }
  | { kind: "human"; socketId: string; name: string };

export interface RoomPublicState {
  code: string;
  hostSocketId: string;
  seats: Array<{ kind: Seat["kind"]; label?: string; name?: string }>;
  status: "waiting" | "playing" | "ended";
}

/** State envoyé à chaque client : la main des autres est masquée. */
export type FilteredRoundState = RoundState;

// -------------------- Socket.io events --------------------

export interface ServerToClientEvents {
  /** État de la room (lobby) — qui est sur quel siège, statut. */
  "room:state": (room: RoomPublicState) => void;
  /** Erreur lifecycle (ex: room introuvable). */
  "room:error": (msg: string) => void;
  /** État filtré de la manche en cours (mis à jour à chaque action). */
  "game:state": (
    state: FilteredRoundState,
    /** Le siège du destinataire dans cette state. */
    yourSeat: SeatIndex
  ) => void;
  /** Event ponctuel (claim, hu, etc.) pour piloter sons/anim côté client. */
  "game:event": (events: RoundEvent[]) => void;
}

export interface ClientToServerEvents {
  /** Crée une room et fait devenir l'émetteur l'hôte au siège 0. */
  "room:create": (
    name: string,
    cb: (resp: { code: string; seat: SeatIndex } | { error: string }) => void
  ) => void;
  /** Rejoint une room existante. */
  "room:join": (
    payload: { code: string; name: string },
    cb: (resp: { seat: SeatIndex } | { error: string }) => void
  ) => void;
  /** Quitte la room courante. */
  "room:leave": () => void;
  /** L'hôte remplit les sièges vides avec des bots et démarre. */
  "game:start": (cb: (resp: { ok: true } | { error: string }) => void) => void;
  /** L'hôte démarre une nouvelle manche après la précédente. */
  "game:newRound": (cb: (resp: { ok: true } | { error: string }) => void) => void;
  /** Le joueur courant envoie son action (discard, claim, pass, etc.). */
  "game:action": (action: RoundAction) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  /** Code de la room que le socket a rejoint (pour cleanup à disconnect). */
  roomCode?: string;
  /** Siège dans la room (0-3). */
  seat?: SeatIndex;
}
