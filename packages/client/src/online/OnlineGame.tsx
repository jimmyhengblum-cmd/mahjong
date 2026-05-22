import { useState } from "react";
import { GameBoard } from "../GameBoard.js";
import { useOnlineGame } from "./useOnlineGame.js";
import { useRoomSocial } from "./useRoomSocial.js";
import { disconnectSocket, getSocket } from "./socket.js";
import type { UseGameResult } from "../hooks/useGame.js";
import { ChatDrawer } from "../components/ChatDrawer.js";
import { EmoteBar } from "../components/EmoteBar.js";
import { Tooltip } from "../components/Tooltip.js";

interface OnlineGameProps {
  onExit: () => void;
}

export function OnlineGame({ onExit }: OnlineGameProps) {
  const og = useOnlineGame();
  const social = useRoomSocial();
  const [chatOpen, setChatOpen] = useState(false);

  const handleExit = () => {
    getSocket().emit("room:leave");
    disconnectSocket();
    onExit();
  };

  const openChat = () => {
    setChatOpen(true);
    social.markChatRead();
  };

  if (!og.ready || og.seat === null) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div>En attente de l'état de la partie…</div>
        <button className="lobby-link" onClick={handleExit}>
          Quitter
        </button>
      </div>
    );
  }

  const game: UseGameResult = {
    ...og,
    humanSeat: og.seat,
    resetSession: () => {
      /* Online : pas de reset session pour l'instant. */
    },
  };

  // Extrait les pseudos depuis le state de la room
  const seatNames =
    og.room?.seats.map((s) =>
      s.kind === "human" ? s.name ?? "?" : s.kind === "bot" ? s.label ?? "Bot" : "vide"
    ) ?? ["?", "?", "?", "?"];

  // Slot topbar : cloche tchat avec badge non-lu
  const chatBell = (
    <Tooltip
      content={chatOpen ? "Fermer le tchat" : "Ouvrir le tchat"}
      placement="bottom"
    >
      <button
        className="chat-bell-btn"
        onClick={openChat}
        aria-label="Tchat"
        type="button"
      >
        💬
        {social.unreadChatCount > 0 && (
          <span className="chat-bell-badge">
            {social.unreadChatCount > 9 ? "9+" : social.unreadChatCount}
          </span>
        )}
      </button>
    </Tooltip>
  );

  // Slot action-bar : barre d'emotes
  const emoteBar = <EmoteBar onSend={social.sendEmote} />;

  return (
    <GameBoard
      game={game}
      humanSeat={og.seat}
      seatNames={seatNames}
      timer={og.timer}
      emotes={social.emotes}
      topBarExtra={chatBell}
      actionBarExtra={emoteBar}
      overlay={
        <ChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={social.chatMessages}
          onSend={social.sendChat}
          mySeat={og.seat}
        />
      }
      onResetSession={() => {}}
      onExit={handleExit}
    />
  );
}
