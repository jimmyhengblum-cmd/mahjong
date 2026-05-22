/**
 * Types partagés entre serveur et client pour la communication Socket.io.
 * Le client importe cela via @mjwz/server/types.
 */

import type {
  ClaimIntent,
  RoundAction,
  RoundEvent,
  RoundState,
  SeatIndex,
  TileCode,
} from "@mjwz/engine";

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

/**
 * Phase sérialisée pour le transport JSON.
 * Les Set/Map (présents dans la phase "reaction") sont convertis en arrays.
 */
export type WirePhase =
  | { kind: "draw"; current: SeatIndex }
  | { kind: "discard"; current: SeatIndex }
  | {
      kind: "reaction";
      discardedBy: SeatIndex;
      discardedTile: TileCode;
      pending: SeatIndex[];
      claims: Array<[SeatIndex, ClaimIntent]>;
    }
  | { kind: "ended"; result: RoundState["phase"] extends { result: infer R } ? R : never };

/** State filtré pour le réseau (Set/Map → arrays). */
export interface WireState extends Omit<RoundState, "phase"> {
  phase: WirePhase;
}

/** Conserve la rétro-compat avec l'ancien nom. */
export type FilteredRoundState = WireState;

/**
 * Convertit l'état du moteur en forme transportable (JSON-safe).
 * À appeler côté serveur avant d'émettre via Socket.io.
 */
export function serializeStateForWire(state: RoundState): WireState {
  if (state.phase.kind !== "reaction") {
    // draw / discard / ended : pas de Set/Map, on caste directement.
    return state as unknown as WireState;
  }
  const wirePhase: WirePhase = {
    kind: "reaction",
    discardedBy: state.phase.discardedBy,
    discardedTile: state.phase.discardedTile,
    pending: [...state.phase.pending],
    claims: [...state.phase.claims.entries()],
  };
  return { ...state, phase: wirePhase } as unknown as WireState;
}

/**
 * Inverse de serializeStateForWire — reconstruit les Set/Map côté client.
 */
export function deserializeStateFromWire(state: WireState): RoundState {
  if (state.phase.kind !== "reaction") {
    return state as unknown as RoundState;
  }
  const enginePhase = {
    kind: "reaction" as const,
    discardedBy: state.phase.discardedBy,
    discardedTile: state.phase.discardedTile,
    pending: new Set(state.phase.pending),
    claims: new Map(state.phase.claims),
  };
  return { ...state, phase: enginePhase } as unknown as RoundState;
}

// -------------------- Socket.io events --------------------

export interface ServerToClientEvents {
  /** État de la room (lobby) — qui est sur quel siège, statut. */
  "room:state": (room: RoomPublicState) => void;
  /** Erreur lifecycle (ex: room introuvable). */
  "room:error": (msg: string) => void;
  /** État filtré de la manche en cours (mis à jour à chaque action). */
  "game:state": (
    state: WireState,
    /** Le siège du destinataire dans cette state. */
    yourSeat: SeatIndex
  ) => void;
  /** Event ponctuel (claim, hu, etc.) pour piloter sons/anim côté client. */
  "game:event": (events: RoundEvent[]) => void;
  /**
   * Décompte avant auto-play par le bot IA. Émis dès qu'un (ou
   * plusieurs) humain(s) doit agir.
   *   - seats : les sièges humains attendus (1 en discard, 1+ en reaction)
   *   - deadlineMs : timestamp absolu (Date.now() côté serveur) auquel
   *     le serveur va auto-jouer. Le client calcule
   *     `secondsLeft = (deadlineMs - Date.now()) / 1000`.
   */
  "timer:set": (payload: { seats: SeatIndex[]; deadlineMs: number }) => void;
  /** Plus de timer actif (phase changée, manche finie, etc.). */
  "timer:clear": () => void;
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
