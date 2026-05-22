import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@mjwz/server/types";
import type { SeatIndex } from "@mjwz/engine";
import { getCachedChatHistory, getSocket } from "./socket.js";

/** Durée d'affichage d'une emote (ms). */
const EMOTE_DURATION_MS = 3000;

/** État local des emotes vivantes — par siège (la plus récente écrase). */
export type EmotesBySeat = Partial<Record<SeatIndex, { emoji: string; id: number } | null>>;

export interface UseRoomSocialResult {
  // Chat
  chatMessages: ChatMessage[];
  sendChat: (text: string) => void;
  /** Nombre de msgs non lus depuis la dernière fois que le drawer s'est ouvert. */
  unreadChatCount: number;
  /** À appeler quand le drawer s'ouvre pour reset le compteur. */
  markChatRead: () => void;

  // Emotes
  emotes: EmotesBySeat;
  sendEmote: (emoji: string) => void;
}

/**
 * Gère côté client le tchat texte + les emotes éphémères :
 *   - Listeners socket.io (chat:message, emote:show)
 *   - Compteur de messages non lus
 *   - Auto-expiration des emotes après 3s
 *   - Helpers sendChat / sendEmote qui émettent au serveur
 */
export function useRoomSocial(): UseRoomSocialResult {
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    getCachedChatHistory()
  );
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastReadIdRef = useRef(0);
  // Initialise lastReadId avec le dernier msg cache (sinon on partirait
  // avec un faux "non lu" sur les messages déjà vus).
  if (lastReadIdRef.current === 0 && chatMessages.length > 0) {
    lastReadIdRef.current = chatMessages[chatMessages.length - 1]!.id;
  }

  // Emotes
  const [emotes, setEmotes] = useState<EmotesBySeat>({});
  const emoteTimeoutsRef = useRef<Map<SeatIndex, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const nextEmoteIdRef = useRef(1);

  useEffect(() => {
    const socket = getSocket();

    const onChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => {
        // Idempotence : ignore si déjà présent (cache + remount)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Incrémente compteur uniquement si c'est un msg vraiment nouveau
      if (msg.id > lastReadIdRef.current) {
        setUnreadChatCount((c) => c + 1);
      }
    };

    const onEmoteShow = (payload: { seat: SeatIndex; emoji: string }) => {
      const seat = payload.seat;
      const id = nextEmoteIdRef.current++;
      setEmotes((prev) => ({ ...prev, [seat]: { emoji: payload.emoji, id } }));
      // Annule le timeout précédent pour ce siège (rapid-fire emotes)
      const prevTimeout = emoteTimeoutsRef.current.get(seat);
      if (prevTimeout) clearTimeout(prevTimeout);
      const t = setTimeout(() => {
        setEmotes((p) => {
          // Ne clear que si l'emote affichée est toujours celle qu'on a posée
          if (p[seat]?.id !== id) return p;
          return { ...p, [seat]: null };
        });
        emoteTimeoutsRef.current.delete(seat);
      }, EMOTE_DURATION_MS);
      emoteTimeoutsRef.current.set(seat, t);
    };

    socket.on("chat:message", onChatMessage);
    socket.on("emote:show", onEmoteShow);
    return () => {
      socket.off("chat:message", onChatMessage);
      socket.off("emote:show", onEmoteShow);
    };
  }, []);

  // Cleanup timeouts au unmount
  useEffect(() => {
    const timeouts = emoteTimeoutsRef.current;
    return () => {
      for (const t of timeouts.values()) clearTimeout(t);
      timeouts.clear();
    };
  }, []);

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    getSocket().emit("chat:send", trimmed);
  }, []);

  const sendEmote = useCallback((emoji: string) => {
    getSocket().emit("emote:send", emoji);
  }, []);

  const markChatRead = useCallback(() => {
    setChatMessages((prev) => {
      if (prev.length > 0) {
        lastReadIdRef.current = prev[prev.length - 1]!.id;
      }
      return prev;
    });
    setUnreadChatCount(0);
  }, []);

  return {
    chatMessages,
    sendChat,
    unreadChatCount,
    markChatRead,
    emotes,
    sendEmote,
  };
}
