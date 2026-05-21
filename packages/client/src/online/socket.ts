import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@mjwz/server/types";

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

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
