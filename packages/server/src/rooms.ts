/**
 * Gestion des rooms côté serveur.
 *
 * Chaque room a un code unique (4 lettres) + 4 sièges (humain/bot/vide).
 * Le serveur fait tourner l'engine et synchronise les états aux clients.
 */

import {
  applyAction,
  botStep,
  startRound,
  type RoundAction,
  type RoundEvent,
  type RoundState,
  type SeatIndex,
} from "@mjwz/engine";
import type { Seat, RoomPublicState } from "./types.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // pas de I, O, 0, 1
const BOT_TURN_DELAY_MS = 800;

export interface Room {
  code: string;
  hostSocketId: string;
  seats: Seat[];
  state: RoundState | null;
  status: "waiting" | "playing" | "ended";
  /** Timer du driver de bots (relancé après chaque action). */
  botDriverTimeout?: NodeJS.Timeout;
  /** Tampon des events de la manche en cours. */
  events: RoundEvent[];
}

const rooms = new Map<string, Room>();

export function generateRoomCode(): string {
  // Boucle jusqu'à obtenir un code unique
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Impossible de générer un code de room unique");
}

export function createRoom(hostSocketId: string, hostName: string): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostSocketId,
    seats: [
      { kind: "human", socketId: hostSocketId, name: hostName },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ],
    state: null,
    status: "waiting",
    events: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

/** Trouve un siège libre et y assigne le joueur. Retourne le siège ou null si plein. */
export function joinRoom(
  code: string,
  socketId: string,
  name: string
): { seat: SeatIndex } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room introuvable" };
  if (room.status !== "waiting") return { error: "Partie déjà en cours" };
  for (let i = 0; i < 4; i++) {
    if (room.seats[i]!.kind === "empty") {
      room.seats[i] = { kind: "human", socketId, name };
      return { seat: i as SeatIndex };
    }
  }
  return { error: "Room pleine" };
}

/** Retire un humain de la room. Si plus personne d'humain, supprime la room. */
export function leaveRoom(code: string, socketId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  for (let i = 0; i < 4; i++) {
    const seat = room.seats[i]!;
    if (seat.kind === "human" && seat.socketId === socketId) {
      room.seats[i] = { kind: "empty" };
    }
  }
  // Plus aucun humain ? On détruit la room.
  const hasHuman = room.seats.some((s) => s.kind === "human");
  if (!hasHuman) {
    if (room.botDriverTimeout) clearTimeout(room.botDriverTimeout);
    rooms.delete(code);
    return null;
  }
  // L'hôte est parti ? On promeut un autre humain.
  if (room.hostSocketId === socketId) {
    const firstHuman = room.seats.find((s) => s.kind === "human") as
      | Extract<Seat, { kind: "human" }>
      | undefined;
    if (firstHuman) room.hostSocketId = firstHuman.socketId;
  }
  return room;
}

/** Remplit les sièges vides avec des bots et démarre la partie. */
export function startGame(
  code: string,
  requesterSocketId: string
): { ok: true } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room introuvable" };
  if (room.hostSocketId !== requesterSocketId) return { error: "Seul l'hôte peut démarrer" };
  if (room.status === "playing") return { error: "Déjà en cours" };

  // Remplit vides → bots
  for (let i = 0; i < 4; i++) {
    if (room.seats[i]!.kind === "empty") {
      room.seats[i] = { kind: "bot", label: `Bot ${i + 1}` };
    }
  }

  const newState = startRound(Date.now(), 0);
  room.state = newState;
  room.events = [];
  room.status = "playing";
  return { ok: true };
}

/** Crée une nouvelle manche en gardant les mêmes joueurs. */
export function newRound(code: string, requesterSocketId: string): { ok: true } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room introuvable" };
  if (room.hostSocketId !== requesterSocketId) return { error: "Seul l'hôte peut relancer" };
  const newState = startRound(Date.now(), 0);
  room.state = newState;
  room.events = [];
  room.status = "playing";
  if (room.botDriverTimeout) clearTimeout(room.botDriverTimeout);
  return { ok: true };
}

/** Applique une action au state. Retourne les events générés. */
export function applyRoomAction(
  code: string,
  action: RoundAction
): { events: RoundEvent[]; state: RoundState } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room introuvable" };
  if (!room.state) return { error: "Pas de manche en cours" };
  try {
    const { state, events } = applyAction(room.state, action);
    room.state = state;
    room.events.push(...events);
    if (state.phase.kind === "ended") {
      room.status = "ended";
    }
    return { events, state };
  } catch (e) {
    return { error: String((e as Error).message ?? e) };
  }
}

/**
 * Renvoie la prochaine action que le serveur peut jouer automatiquement.
 *
 *   - "draw" : on auto-pioche pour TOUT le monde (humains inclus) — il
 *     n'y a aucun choix à faire à la pioche, donc on évite d'attendre
 *     un humain pour rien.
 *   - "discard" / "reaction" : seuls les bots agissent ici.
 */
export function nextBotActionForRoom(room: Room): RoundAction | null {
  if (!room.state) return null;
  const phase = room.state.phase;
  if (phase.kind === "ended") return null;

  if (phase.kind === "reaction") {
    for (const seat of phase.pending) {
      if (isBot(room, seat)) {
        return botStep(room.state, seat);
      }
    }
    return null;
  }

  // Auto-pioche pour le siège courant (humain ou bot)
  if (phase.kind === "draw") {
    return { type: "draw", seat: phase.current };
  }

  // Décision de défausse : bots uniquement
  if (phase.kind === "discard") {
    if (isBot(room, phase.current)) {
      return botStep(room.state, phase.current);
    }
  }
  return null;
}

export function isBot(room: Room, seat: SeatIndex): boolean {
  return room.seats[seat]!.kind === "bot";
}

export function isHuman(room: Room, seat: SeatIndex): boolean {
  return room.seats[seat]!.kind === "human";
}

/** Convertit un Seat interne en représentation publique (pas de socketId leak). */
export function toPublicState(room: Room): RoomPublicState {
  return {
    code: room.code,
    hostSocketId: room.hostSocketId,
    status: room.status,
    seats: room.seats.map((s) =>
      s.kind === "empty"
        ? { kind: "empty" }
        : s.kind === "bot"
        ? { kind: "bot", label: s.label }
        : { kind: "human", name: s.name }
    ),
  };
}

export function getAllRooms(): Map<string, Room> {
  return rooms;
}

export const BOT_DELAY = BOT_TURN_DELAY_MS;
