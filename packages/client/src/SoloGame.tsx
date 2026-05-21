import { useGame } from "./hooks/useGame.js";
import { GameBoard } from "./GameBoard.js";

interface SoloGameProps {
  onExit: () => void;
}

const SOLO_SEAT_NAMES = ["Vous", "Bot 1", "Bot 2", "Bot 3"];

export function SoloGame({ onExit }: SoloGameProps) {
  const game = useGame();
  return (
    <GameBoard
      game={game}
      humanSeat={game.humanSeat}
      seatNames={SOLO_SEAT_NAMES}
      onResetSession={game.resetSession}
      onExit={onExit}
    />
  );
}
