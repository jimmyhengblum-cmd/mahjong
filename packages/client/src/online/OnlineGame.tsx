import { GameBoard } from "../GameBoard.js";
import { useOnlineGame } from "./useOnlineGame.js";
import { disconnectSocket, getSocket } from "./socket.js";
import type { UseGameResult } from "../hooks/useGame.js";

interface OnlineGameProps {
  onExit: () => void;
}

export function OnlineGame({ onExit }: OnlineGameProps) {
  const og = useOnlineGame();

  const handleExit = () => {
    getSocket().emit("room:leave");
    disconnectSocket();
    onExit();
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

  return (
    <GameBoard
      game={game}
      humanSeat={og.seat}
      onResetSession={() => {}}
      onExit={handleExit}
    />
  );
}
