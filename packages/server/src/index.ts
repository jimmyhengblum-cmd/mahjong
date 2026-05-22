/**
 * Serveur Socket.io pour le Mahjong de Wenzhou.
 *
 * Architecture :
 *   - Express HTTP (health-check + serving)
 *   - Socket.io pour la communication temps réel
 *   - Le serveur fait tourner l'engine (source de vérité)
 *   - Les clients reçoivent un state filtré (main des autres masquée)
 */

import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import type { SeatIndex } from "@mjwz/engine";
import { botStep } from "@mjwz/engine";
import {
  BOT_DELAY,
  HUMAN_ACTION_TIMEOUT_MS,
  applyRoomAction,
  clearHumanWatchdog,
  createRoom,
  getRoom,
  humansAwaitingAction,
  joinRoom,
  leaveRoom,
  newRound,
  nextBotActionForRoom,
  startGame,
  toPublicState,
  type Room,
} from "./rooms.js";
import { filterStateForSeat } from "./state-filter.js";
import {
  serializeStateForWire,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "./types.js";

const PORT = Number(process.env.PORT) || 3001;

/** Compteur global pour les IDs de messages tchat (process-scoped). */
let nextChatId = 1;

/** Whitelist anti-abus des emotes acceptées. */
const ALLOWED_EMOTES = new Set([
  "😂", "😭", "😡", "😎", "🤯", "🤫", "👏",
]);

const app = express();
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const httpServer = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: "*" },
});

// -------------------- Broadcast helpers --------------------

function broadcastRoomState(room: Room) {
  io.to(room.code).emit("room:state", toPublicState(room));
}

function broadcastGameState(room: Room) {
  if (!room.state) return;
  // Envoie à chaque socket connecté à cette room son state filtré + sérialisé
  for (let seat = 0 as SeatIndex; seat < 4; seat = (seat + 1) as SeatIndex) {
    const s = room.seats[seat]!;
    if (s.kind === "human") {
      const filtered = filterStateForSeat(room.state, seat);
      const wire = serializeStateForWire(filtered);
      io.to(s.socketId).emit("game:state", wire, seat);
    }
  }
}

function broadcastEvents(room: Room, events: typeof room.events) {
  if (events.length === 0) return;
  io.to(room.code).emit("game:event", events);
}

// -------------------- Bot driver --------------------

function scheduleBotTick(room: Room) {
  if (room.botDriverTimeout) clearTimeout(room.botDriverTimeout);
  room.botDriverTimeout = setTimeout(() => {
    tickBots(room);
  }, BOT_DELAY);
}

function tickBots(room: Room) {
  if (!room.state || room.status !== "playing") return;
  const action = nextBotActionForRoom(room);
  if (action) {
    const result = applyRoomAction(room.code, action);
    if ("error" in result) {
      console.error("[bot]", room.code, result.error);
      return;
    }
    broadcastGameState(room);
    broadcastEvents(room, result.events);
    if (result.state.phase.kind === "ended") {
      broadcastRoomState(room);
      clearHumanWatchdog(room);
      io.to(room.code).emit("timer:clear");
    } else {
      scheduleBotTick(room);
      syncHumanWatchdog(room);
    }
    return;
  }
  // Pas d'action bot — peut-être qu'on est en phase reaction avec attente
  // d'un humain. Si tous les pending humains ont passé/réagi, résoudre.
  if (room.state.phase.kind === "reaction" && room.state.phase.pending.size === 0) {
    const result = applyRoomAction(room.code, { type: "resolve-reactions" });
    if ("error" in result) return;
    broadcastGameState(room);
    broadcastEvents(room, result.events);
    if (result.state.phase.kind === "ended") {
      broadcastRoomState(room);
      clearHumanWatchdog(room);
      io.to(room.code).emit("timer:clear");
    } else {
      scheduleBotTick(room);
      syncHumanWatchdog(room);
    }
    return;
  }
  // Rien à faire côté bot : on attend un humain. Démarre/refresh le watchdog.
  syncHumanWatchdog(room);
}

/**
 * Aligne le watchdog d'inactivité humaine avec l'état courant :
 *   - Si des humains doivent agir : (ré)arme le timeout + émet timer:set.
 *   - Si aucun humain attendu : nettoie + émet timer:clear.
 *
 * Idempotent : on ne ré-arme PAS si la cible (sièges + phase) n'a pas
 * bougé depuis la dernière fois (évite de "rallonger" le timer chaque
 * tick pendant une phase reaction où un humain attend encore).
 */
function syncHumanWatchdog(room: Room) {
  const seats = humansAwaitingAction(room);
  if (seats.length === 0) {
    if (room.humanActionTimeout) {
      clearHumanWatchdog(room);
      io.to(room.code).emit("timer:clear");
    }
    return;
  }
  // Idempotence : même set de sièges + timer encore actif = on ne touche pas.
  const sameSeats =
    room.humanActionSeats &&
    room.humanActionSeats.length === seats.length &&
    room.humanActionSeats.every((s, i) => s === seats[i]);
  if (sameSeats && room.humanActionTimeout) return;

  // (Re)démarre proprement
  if (room.humanActionTimeout) clearTimeout(room.humanActionTimeout);
  const deadlineMs = Date.now() + HUMAN_ACTION_TIMEOUT_MS;
  room.humanActionDeadlineMs = deadlineMs;
  room.humanActionSeats = [...seats];
  room.humanActionTimeout = setTimeout(() => {
    autoPlayForHumans(room);
  }, HUMAN_ACTION_TIMEOUT_MS);
  io.to(room.code).emit("timer:set", { seats: [...seats], deadlineMs });
}

/**
 * Le watchdog a expiré : pour chaque humain qui doit encore agir,
 * on demande à botStep une action et on l'applique. botStep prend en
 * compte hu prioritaire, claims pong/chi, ou défausse safe.
 */
function autoPlayForHumans(room: Room) {
  if (!room.state || room.status !== "playing") return;
  const seats = humansAwaitingAction(room);
  if (seats.length === 0) {
    clearHumanWatchdog(room);
    io.to(room.code).emit("timer:clear");
    return;
  }
  console.log(
    "[auto-play]",
    room.code,
    "seats=",
    seats,
    "phase=",
    room.state.phase.kind
  );
  for (const seat of seats) {
    if (!room.state || room.status !== "playing") break;
    const action = botStep(room.state, seat);
    if (!action) {
      // botStep retourne null si le siège n'est plus impliqué (race après
      // qu'un autre humain ait déjà claim/passé). Skip proprement.
      continue;
    }
    const result = applyRoomAction(room.code, action);
    if ("error" in result) {
      console.error("[auto-play]", room.code, result.error);
      continue;
    }
    broadcastGameState(room);
    broadcastEvents(room, result.events);
    if (result.state.phase.kind === "ended") {
      broadcastRoomState(room);
      clearHumanWatchdog(room);
      io.to(room.code).emit("timer:clear");
      return;
    }
  }
  // Après auto-play, relance le cycle (potentiels bots à faire jouer,
  // ou nouveau watchdog pour la phase suivante).
  scheduleBotTick(room);
}

// -------------------- Socket handlers --------------------

io.on("connection", (socket) => {
  console.log("[connect]", socket.id);

  socket.on("room:create", (name, cb) => {
    const room = createRoom(socket.id, name || "Joueur");
    socket.data.roomCode = room.code;
    socket.data.seat = 0;
    socket.join(room.code);
    cb({ code: room.code, seat: 0 });
    broadcastRoomState(room);
    console.log("[room:create]", room.code, "host", socket.id);
  });

  socket.on("room:join", ({ code, name }, cb) => {
    const result = joinRoom(code, socket.id, name || "Joueur");
    if ("error" in result) {
      cb({ error: result.error });
      return;
    }
    const room = getRoom(code)!;
    socket.data.roomCode = code;
    socket.data.seat = result.seat;
    socket.join(code);
    cb({ seat: result.seat });
    broadcastRoomState(room);
    console.log("[room:join]", code, "seat", result.seat, socket.id);
  });

  socket.on("room:leave", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = leaveRoom(code, socket.id);
    socket.leave(code);
    socket.data.roomCode = undefined;
    socket.data.seat = undefined;
    if (room) broadcastRoomState(room);
  });

  socket.on("game:start", (cb) => {
    const code = socket.data.roomCode;
    if (!code) {
      cb({ error: "Pas dans une room" });
      return;
    }
    const result = startGame(code, socket.id);
    if ("error" in result) {
      cb({ error: result.error });
      return;
    }
    const room = getRoom(code)!;
    cb({ ok: true });
    broadcastRoomState(room);
    broadcastGameState(room);
    // Si siège 0 (donneur) est un bot, on démarre le tick
    scheduleBotTick(room);
    syncHumanWatchdog(room);
  });

  socket.on("game:newRound", (cb) => {
    const code = socket.data.roomCode;
    if (!code) {
      cb({ error: "Pas dans une room" });
      return;
    }
    const result = newRound(code, socket.id);
    if ("error" in result) {
      cb({ error: result.error });
      return;
    }
    const room = getRoom(code)!;
    cb({ ok: true });
    broadcastRoomState(room);
    broadcastGameState(room);
    scheduleBotTick(room);
    syncHumanWatchdog(room);
  });

  socket.on("game:action", (action) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    // Sanity : l'action concerne bien le siège du socket
    const myseat = socket.data.seat;
    if ("seat" in action && action.seat !== myseat) {
      console.warn("[action denied]", code, "wrong seat", myseat, "vs", action.seat);
      return;
    }
    const result = applyRoomAction(code, action);
    if ("error" in result) {
      console.warn("[action error]", code, result.error);
      return;
    }
    broadcastGameState(room);
    broadcastEvents(room, result.events);
    if (result.state.phase.kind === "ended") {
      broadcastRoomState(room);
      clearHumanWatchdog(room);
      io.to(room.code).emit("timer:clear");
      return;
    }
    // L'humain a agi à temps → on arme à nouveau pour la phase suivante
    // (clear puis sync via tickBots, qui résout aussi les actions bot intermédiaires).
    scheduleBotTick(room);
    syncHumanWatchdog(room);
  });

  // -------- Chat --------
  socket.on("chat:send", (rawText) => {
    const code = socket.data.roomCode;
    const seat = socket.data.seat;
    if (!code || seat === undefined) return;
    const room = getRoom(code);
    if (!room) return;
    const text = typeof rawText === "string" ? rawText.trim().slice(0, 200) : "";
    if (!text) return;
    const me = room.seats[seat]!;
    if (me.kind !== "human") return; // bots ne tchatent pas
    const msg = {
      id: nextChatId++,
      seat,
      name: me.name,
      text,
      ts: Date.now(),
    };
    io.to(code).emit("chat:message", msg);
  });

  // -------- Emote --------
  socket.on("emote:send", (emoji) => {
    const code = socket.data.roomCode;
    const seat = socket.data.seat;
    if (!code || seat === undefined) return;
    if (typeof emoji !== "string") return;
    // Whitelist : seulement les 7 emotes connues (anti-flood/abus)
    if (!ALLOWED_EMOTES.has(emoji)) return;
    io.to(code).emit("emote:show", { seat, emoji });
  });

  socket.on("disconnect", () => {
    console.log("[disconnect]", socket.id);
    const code = socket.data.roomCode;
    if (code) {
      const room = leaveRoom(code, socket.id);
      if (room) broadcastRoomState(room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Mahjong Wenzhou online @ http://localhost:${PORT}`);
});
