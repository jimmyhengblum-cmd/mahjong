import { useGame } from "./hooks/useGame.js";
import { useHandOrder } from "./hooks/useHandOrder.js";
import { Hand } from "./components/Hand.js";
import { Opponent } from "./components/Opponent.js";
import { CenterInfo } from "./components/CenterInfo.js";
import { TopBar } from "./components/TopBar.js";
import { ActionButtons } from "./components/ActionButtons.js";
import { WinningHandReveal } from "./components/WinningHandReveal.js";
import { ClaimAnnouncement } from "./components/ClaimAnnouncement.js";
import type { SeatIndex } from "@mjwz/engine";

const SEAT_LABELS = ["东 Est (vous)", "南 Sud", "西 Ouest", "北 Nord"];

export function App() {
  const game = useGame();
  const { state } = game;
  const human = state.hands[game.humanSeat]!;
  const handOrder = useHandOrder(human.concealed);

  const currentSeat = getCurrentSeat(state);
  const turnOrderOf = (seat: SeatIndex): number => {
    if (currentSeat === null) return 0;
    return ((seat - currentSeat + 4) % 4) + 1;
  };

  // Statut d'un siège pendant la phase reaction (passé / a réagi / current / idle)
  const statusOf = (seat: SeatIndex): "idle" | "current" | "passed" | "claimed" => {
    if (state.phase.kind === "ended") return "idle";
    if (state.phase.kind === "reaction") {
      if (seat === state.phase.discardedBy) return "current"; // qui vient de jouer
      if (state.phase.claims.has(seat)) return "claimed";
      if (!state.phase.pending.has(seat)) return "passed";
      return "idle";
    }
    return seat === (state.phase as any).current ? "current" : "idle";
  };

  return (
    <div className="app">
      <TopBar state={state} onNewRound={game.newRound} />

      <main className="table">
        <div className="seat-north">
          <Opponent
            label={SEAT_LABELS[2]!}
            concealedCount={state.hands[2]!.concealed.length}
            exposed={state.hands[2]!.exposed}
            jokerValue={state.ctx.jokerValue}
            status={statusOf(2)}
            turnOrder={turnOrderOf(2)}
          />
        </div>

        <div className="seat-west">
          <Opponent
            label={SEAT_LABELS[1]!}
            concealedCount={state.hands[1]!.concealed.length}
            exposed={state.hands[1]!.exposed}
            jokerValue={state.ctx.jokerValue}
            status={statusOf(1)}
            turnOrder={turnOrderOf(1)}
          />
        </div>

        <div className="seat-east">
          <Opponent
            label={SEAT_LABELS[3]!}
            concealedCount={state.hands[3]!.concealed.length}
            exposed={state.hands[3]!.exposed}
            jokerValue={state.ctx.jokerValue}
            status={statusOf(3)}
            turnOrder={turnOrderOf(3)}
          />
        </div>

        <CenterInfo state={state} events={game.events} humanSeat={game.humanSeat} />

        <div className={`seat-south seat-south-${statusOf(0)}`}>
          <div className="seat-south-label">
            <span className={`turn-badge ${turnOrderOf(0) === 1 ? "turn-badge-current" : ""}`}>
              {turnOrderOf(0)}
            </span>
            {SEAT_LABELS[0]}
            {statusOf(0) === "passed" && <span className="status-pill status-passed">passe</span>}
            {statusOf(0) === "claimed" && <span className="status-pill status-claimed">réagit</span>}
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

      <ClaimAnnouncement announcement={game.announcement} />

      <WinningHandReveal state={state} humanSeat={game.humanSeat} onNewRound={game.newRound} />
    </div>
  );
}

function getCurrentSeat(state: ReturnType<typeof useGame>["state"]): SeatIndex | null {
  if (state.phase.kind === "ended") return null;
  if (state.phase.kind === "reaction") return state.phase.discardedBy;
  return state.phase.current;
}
