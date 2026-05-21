import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  RoomPublicState,
  ServerToClientEvents,
  WireState,
} from "@mjwz/server/types";
import type { SeatIndex } from "@mjwz/engine";

/**
 * Résolution de l'URL serveur en ordre de priorité :
 *   1. Variable build-time VITE_SERVER_URL (déploiement)
 *   2. Override window.__SERVER_URL__ (debug)
 *   3. Auto : même host que le client, port 3001 (LAN-friendly)
 *   4. Fallback localhost
 */
const SERVER_URL = ((): string => {
  const env = (import.meta as any).env?.VITE_SERVER_URL;
  if (env) return env;
  if (typeof window !== "undefined") {
    const override = (window as any).__SERVER_URL__;
    if (override) return override;
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
})();

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Dernier état de room reçu, conservé au niveau module — survit aux
 * remount des composants (ex: Lobby → OnlineGame transition).
 * C'est ce qui empêche les nouveaux subscribers de rater le room:state
 * initial qui a déjà été émis.
 */
let _lastRoom: RoomPublicState | null = null;
/**
 * Dernier game:state reçu (wire + seat), conservé au niveau module.
 * Même justification que _lastRoom : le serveur émet game:state dans la
 * même tick que room:state quand la partie démarre — le Lobby reçoit
 * room:state(playing) et démonte, OnlineGame se monte juste après et
 * raterait game:state sans ce cache.
 */
let _lastGameState: { wire: WireState; seat: SeatIndex } | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket"],
    });
    // Listeners persistants attachés à la création — capturent toutes
    // les mises à jour même quand aucun composant n'écoute.
    socket.on("room:state", (r) => {
      _lastRoom = r;
    });
    socket.on("game:state", (wire, seat) => {
      _lastGameState = { wire, seat };
    });
  }
  return socket;
}

/** Retourne le dernier room:state reçu, ou null si rien encore. */
export function getCachedRoom(): RoomPublicState | null {
  return _lastRoom;
}

/** Retourne le dernier game:state reçu, ou null si rien encore. */
export function getCachedGameState(): { wire: WireState; seat: SeatIndex } | null {
  return _lastGameState;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    _lastRoom = null;
    _lastGameState = null;
  }
}
