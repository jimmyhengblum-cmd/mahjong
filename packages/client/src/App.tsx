import { useGame } from "./hooks/useGame.js";
import { Hand } from "./components/Hand.js";
import { Opponent } from "./components/Opponent.js";
import { CenterInfo } from "./components/CenterInfo.js";
import { Tile, tileRole } from "./components/Tile.js";
import { checkHu } from "@mjwz/engine";

export function App() {
  const game = useGame();
  const { state } = game;
  const human = state.hands[game.humanSeat]!;

  // Mapping siège → label affiché. Humain (siège 0 = East) est en bas.
  const SEAT_LABELS = ["东 Est (vous)", "南 Sud", "西 Ouest", "北 Nord"];

  const isCurrent = (seat: number): boolean => {
    if (state.phase.kind === "ended") return false;
    if (state.phase.kind === "reaction") {
      // Pendant la phase reaction, "current" = sièges qui doivent encore réagir
      return state.phase.pending.has(seat as 0 | 1 | 2 | 3);
    }
    return (state.phase as any).current === seat;
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>温州麻将 — Mahjong de Wenzhou</h1>
        <button onClick={game.newRound}>Nouvelle manche</button>
      </header>

      <main className="table">
        {/* Nord (siège 2) */}
        <div className="seat-north">
          <Opponent
            label={SEAT_LABELS[2]!}
            concealedCount={state.hands[2]!.concealed.length}
            exposed={state.hands[2]!.exposed}
            discards={state.hands[2]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(2)}
          />
        </div>

        {/* Ouest (siège 1) */}
        <div className="seat-west">
          <Opponent
            label={SEAT_LABELS[1]!}
            concealedCount={state.hands[1]!.concealed.length}
            exposed={state.hands[1]!.exposed}
            discards={state.hands[1]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(1)}
          />
        </div>

        {/* Est (siège 3) */}
        <div className="seat-east">
          <Opponent
            label={SEAT_LABELS[3]!}
            concealedCount={state.hands[3]!.concealed.length}
            exposed={state.hands[3]!.exposed}
            discards={state.hands[3]!.discards}
            jokerValue={state.ctx.jokerValue}
            isCurrent={isCurrent(3)}
          />
        </div>

        {/* Centre */}
        <CenterInfo state={state} events={game.events} />

        {/* Sud = humain (siège 0) */}
        <div className={`seat-south ${isCurrent(0) ? "seat-active" : ""}`}>
          <div className="seat-south-label">
            {isCurrent(0) ? "▶ " : ""}{SEAT_LABELS[0]}
          </div>
          {human.discards.length > 0 && (
            <div className="discards-row">
              {human.discards.map((t, i) => (
                <Tile key={i} tile={t} size={26} role={tileRole(t, state.ctx.jokerValue)} />
              ))}
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
    // Vérifier si Hu est possible sur la main
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
