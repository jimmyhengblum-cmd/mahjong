import { useGame } from "./hooks/useGame.js";
import { GameBoard } from "./GameBoard.js";

interface SoloGameProps {
  onExit: () => void;
}

export function SoloGame({ onExit }: SoloGameProps) {
  const game = useGame();
  return (
    <GameBoard
      game={game}
      humanSeat={game.humanSeat}
      onResetSession={game.resetSession}
      onExit={onExit}
    />
  );
}
