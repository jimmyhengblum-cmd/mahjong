import { useGame } from "./hooks/useGame.js";
import { Hand } from "./components/Hand.js";
import { Opponent } from "./components/Opponent.js";
import { CenterInfo } from "./components/CenterInfo.js";
import { TopBar } from "./components/TopBar.js";
import { Tile, tileRole } from "./components/Tile.js";
import { checkHu, type SeatIndex } from "@mjwz/engine";

const SEAT_LABELS = ["东 Est (vous)", "南 Sud", "西 Ouest", "北 Nord"];

export function App() {
  const game = useGame();
  const { state } = game;
  const human = state.hands[game.humanSeat]!;

  const currentSeat = getCurrentSeat(state);
  const turnOrderOf = (seat: SeatIndex): number => {
    if (currentSeat === null) return 0;
    return ((seat - currentSeat + 4) % 4) + 1;
  };
  const isCurrent = (seat: SeatIndex): boolean => seat === currentSeat;

  return (
    <div className="app">
      <TopBar state={state} onNewRound={game.newRound} />

      <main className="table">
        <div className="seat-north">
          <Opponent
            label={SEAT_LABELS[2]!}
            concealedCount={state.hands[2]!.concealed.length}
            exposed={state.hands[2]!.exposed}
            discards={state.hands[2]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(2)}
            turnOrder={turnOrderOf(2)}
          />
        </div>

        <div className="seat-west">
          <Opponent
            label={SEAT_LABELS[1]!}
            concealedCount={state.hands[1]!.concealed.length}
            exposed={state.hands[1]!.exposed}
            discards={state.hands[1]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(1)}
            turnOrder={turnOrderOf(1)}
          />
        </div>

        <div className="seat-east">
          <Opponent
            label={SEAT_LABELS[3]!}
            concealedCount={state.hands[3]!.concealed.length}
            exposed={state.hands[3]!.exposed}
            discards={state.hands[3]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(3)}
            turnOrder={turnOrderOf(3)}
          />
        </div>

        <CenterInfo state={state} events={game.events} />

        <div className={`seat-south ${isCurrent(0) ? "seat-active" : ""}`}>
          <div className="seat-south-label">
            <span className={`turn-badge ${turnOrderOf(0) === 1 ? "turn-badge-current" : ""}`}>
              {turnOrderOf(0)}
            </span>
            {SEAT_LABELS[0]}
          </div>
          {human.discards.length > 0 && (
            <div className="discards-block">
              <div className="discards-label">Vos défausses ({human.discards.length})</div>
              <div className="discards-grid">
                {human.discards.map((t, i) => (
                  <Tile key={i} tile={t} size={24} role={tileRole(t, state.ctx.jokerValue)} />
                ))}
              </div>
            </div>
          )}
          <Hand
            concealed={human.concealed}
            exposed={human.exposed}
            jokerValue={state.ctx.jokerValue}
            onDiscard={game.isHumanTurn ? game.discard : undefined}
            disabled={!game.isHumanTurn}
          />
        </div>

        {state.phase.kind === "ended" && <RoundOverToast state={state} />}
      </main>

      <footer className="action-bar">
        <ActionBar game={game} />
      </footer>
    </div>
  );
}

function getCurrentSeat(state: ReturnType<typeof useGame>["state"]): SeatIndex | null {
  if (state.phase.kind === "ended") return null;
  if (state.phase.kind === "reaction") return state.phase.discardedBy;
  return state.phase.current;
}

function ActionBar({ game }: { game: ReturnType<typeof useGame> }) {
  const { isHumanTurn, isHumanReacting, humanReactionOptions, state } = game;

  if (state.phase.kind === "ended") {
    return <span className="hint">Manche terminée — cliquez "Nouvelle manche" en haut.</span>;
  }

  if (isHumanReacting) {
    const opts = humanReactionOptions;
    return (
      <>
        <span className="hint">Une tuile a été défaussée — réagir ?</span>
        {opts.canHu && (
          <button onClick={() => game.claim({ type: "hu" })}>胡 (Hu)</button>
        )}
        {opts.canKong && (
          <button onClick={() => game.claim({ type: "kong" })}>杠 (Kong)</button>
        )}
        {opts.canPong && (
          <button onClick={() => game.claim({ type: "pong" })}>碰 (Pong)</button>
        )}
        {opts.chiUses.map((uses, i) => (
          <button key={i} onClick={() => game.claim({ type: "chi", uses })}>
            吃 ({uses[0]}+{uses[1]})
          </button>
        ))}
        <button className="secondary" onClick={() => game.pass()}>
          Passer
        </button>
      </>
    );
  }

  if (isHumanTurn) {
    return (
      <>
        <span className="hint">À vous — cliquez une tuile pour défausser</span>
        <SelfHuButton game={game} />
      </>
    );
  }

  return <span className="hint">En attente des autres joueurs…</span>;
}

function SelfHuButton({ game }: { game: ReturnType<typeof useGame> }) {
  const hand = game.state.hands[game.humanSeat]!;
  const hu = checkHu({
    concealed: hand.concealed,
    exposedMelds: hand.exposed,
    ctx: game.state.ctx,
  });
  if (!hu.valid) return null;
  return <button onClick={() => game.selfHu()}>胡 自摸 (Auto-Hu)</button>;
}

function RoundOverToast({ state }: { state: ReturnType<typeof useGame>["state"] }) {
  if (state.phase.kind !== "ended") return null;
  const result = state.phase.result;
  if (result.kind === "drawn-wall") {
    return <div className="toast">流局 — manche nulle</div>;
  }
  return (
    <div className="toast">
      胡 ! Siège {result.winner} gagne
      {result.discarder !== null ? ` sur défausse du siège ${result.discarder}` : " (auto-pioche)"}
      {result.huResult && (
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
          {result.huResult.kinds.join(", ")} · {result.huResult.jokerCount} joker(s)
        </div>
      )}
    </div>
  );
}
