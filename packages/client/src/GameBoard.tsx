import { useCallback, useState } from "react";
import type { SeatIndex } from "@mjwz/engine";
import type { UseGameResult } from "./hooks/useGame.js";
import { useHandOrder } from "./hooks/useHandOrder.js";
import { useGameSounds } from "./hooks/useGameSounds.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { Hand } from "./components/Hand.js";
import { Opponent } from "./components/Opponent.js";
import { CenterInfo } from "./components/CenterInfo.js";
import { TopBar } from "./components/TopBar.js";
import { ActionButtons } from "./components/ActionButtons.js";
import { WinningHandReveal } from "./components/WinningHandReveal.js";
import { ClaimAnnouncement } from "./components/ClaimAnnouncement.js";
import { ScoreOverlay } from "./components/ScoreOverlay.js";
import { Tutorial, hasSeenTutorial, markTutorialSeen } from "./components/Tutorial.js";
import { Confetti } from "./components/Confetti.js";
import { SortIcon } from "./components/Icons.js";
import { Tooltip } from "./components/Tooltip.js";
import { sound } from "./sound.js";

interface GameBoardProps {
  game: UseGameResult;
  /** Le siège de l'utilisateur (0 pour solo, dynamique pour online). */
  humanSeat: SeatIndex;
  onResetSession: () => void;
  /** Affiche un bouton "Quitter" qui appelle ce callback. */
  onExit?: () => void;
}

const SEAT_WINDS = ["东", "南", "西", "北"];
const SEAT_FULL = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function GameBoard({ game, humanSeat, onResetSession, onExit }: GameBoardProps) {
  const { state } = game;
  const human = state.hands[humanSeat]!;
  const handOrder = useHandOrder(human.concealed);

  useGameSounds(game.events, humanSeat, game.isHumanTurn, game.isHumanReacting);

  const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial());
  const closeTutorial = () => {
    setShowTutorial(false);
    markTutorialSeen();
  };

  const [audioEnabled, setAudioEnabled] = useState(sound.isEnabled());
  const toggleAudio = () => {
    const next = !audioEnabled;
    sound.setEnabled(next);
    setAudioEnabled(next);
  };

  const [showScores, setShowScores] = useState(false);

  useKeyboard({
    onTab: useCallback(() => setShowScores((s) => !s), []),
    onSpace: useCallback(() => {
      if (game.isHumanReacting) game.pass();
    }, [game.isHumanReacting, game.pass]),
    onEscape: useCallback(() => {
      setShowScores(false);
      setShowTutorial(false);
    }, []),
  });

  const currentSeat = getCurrentSeat(state);
  const turnOrderOf = (seat: SeatIndex): number => {
    if (currentSeat === null) return 0;
    return ((seat - currentSeat + 4) % 4) + 1;
  };

  const statusOf = (seat: SeatIndex): "idle" | "current" | "passed" | "claimed" => {
    if (state.phase.kind === "ended") return "idle";
    if (state.phase.kind === "reaction") {
      if (seat === state.phase.discardedBy) return "current";
      if (state.phase.claims.has(seat)) return "claimed";
      if (!state.phase.pending.has(seat)) return "passed";
      return "idle";
    }
    return seat === (state.phase as any).current ? "current" : "idle";
  };

  // Mapping siège réel → position visuelle (humain toujours en bas)
  // visualPos = (seat - humanSeat + 4) % 4 — 0=south, 1=west, 2=north, 3=east
  const visualSeat = (pos: 0 | 1 | 2 | 3): SeatIndex =>
    ((humanSeat + pos) % 4) as SeatIndex;

  const opponentSeats: { pos: 0 | 1 | 2 | 3; cssClass: string }[] = [
    { pos: 1, cssClass: "seat-west" }, // joueur suivant à gauche
    { pos: 2, cssClass: "seat-north" }, // d'en face en haut
    { pos: 3, cssClass: "seat-east" }, // précédent à droite
  ];

  return (
    <div className="app">
      <TopBar
        state={state}
        onNewRound={game.newRound}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        onOpenTutorial={() => setShowTutorial(true)}
        onToggleScores={() => setShowScores((s) => !s)}
        onExit={onExit}
      />

      <main className="table">
        {opponentSeats.map(({ pos, cssClass }) => {
          const seat = visualSeat(pos);
          return (
            <div key={pos} className={cssClass}>
              <Opponent
                wind={SEAT_WINDS[seat]!}
                fullName={SEAT_FULL[seat]!}
                concealedCount={state.hands[seat]!.concealed.length}
                exposed={state.hands[seat]!.exposed}
                jokerValue={state.ctx.jokerValue}
                status={statusOf(seat)}
                turnOrder={turnOrderOf(seat)}
              />
            </div>
          );
        })}

        <CenterInfo state={state} events={game.events} humanSeat={humanSeat} />

        <div className={`seat-south seat-south-${statusOf(humanSeat)}`}>
          <div className="seat-south-label">
            <span
              className={`turn-badge ${
                turnOrderOf(humanSeat) === 1 ? "turn-badge-current" : ""
              }`}
            >
              {turnOrderOf(humanSeat)}
            </span>
            <span className="seat-south-wind">{SEAT_WINDS[humanSeat]}</span>
            <span className="seat-south-you">你</span>
            {statusOf(humanSeat) === "passed" && (
              <span className="status-dot status-dot-passed" title="A passé" />
            )}
            {statusOf(humanSeat) === "claimed" && (
              <span className="status-dot status-dot-claimed" title="Réagit" />
            )}
            <Tooltip content="Trier la main par famille" placement="top">
              <button
                className="hand-sort-btn"
                onClick={handOrder.resetOrder}
                aria-label="Trier la main"
              >
                <SortIcon size={14} />
              </button>
            </Tooltip>
          </div>
          <Hand
            key={`deal-${game.dealCounter}`}
            concealed={handOrder.order}
            exposed={human.exposed}
            jokerValue={state.ctx.jokerValue}
            onDiscard={game.isHumanTurn ? game.discard : undefined}
            onReorder={handOrder.reorder}
            disabled={!game.isHumanTurn}
            dealing={game.isDealing}
          />
        </div>
      </main>

      <footer className="action-bar">
        <ActionButtons game={game} />
      </footer>

      <ClaimAnnouncement
        announcement={game.announcement}
        jokerValue={state.ctx.jokerValue}
      />

      <WinningHandReveal state={state} humanSeat={humanSeat} onNewRound={game.newRound} />

      <Confetti trigger={game.humanWinTrigger} />

      {showScores && (
        <ScoreOverlay
          scores={game.sessionScores}
          roundCount={game.sessionRoundCount}
          humanSeat={humanSeat}
          onClose={() => setShowScores(false)}
          onReset={() => {
            onResetSession();
            setShowScores(false);
          }}
        />
      )}

      {showTutorial && <Tutorial onClose={closeTutorial} />}
    </div>
  );
}

function getCurrentSeat(state: UseGameResult["state"]): SeatIndex | null {
  if (state.phase.kind === "ended") return null;
  if (state.phase.kind === "reaction") return state.phase.discardedBy;
  return state.phase.current;
}
