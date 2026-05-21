import { useGame } from "./hooks/useGame.js";
import { Hand } from "./components/Hand.js";
import { Opponent } from "./components/Opponent.js";
import { CenterInfo } from "./components/CenterInfo.js";
import { Tile } from "./components/Tile.js";
import { checkHu, type TileCode } from "@mjwz/engine";

export function App() {
  const game = useGame();
  const { state } = game;
  const human = state.hands[game.humanSeat]!;
  const opponents = [1, 2, 3] as const;

  // Mapping siège → position visuelle (humain = sud)
  // humain est siège 0 (East), mais on l'affiche au sud pour confort UX.
  // Bots : siège 1 → ouest, siège 2 → nord, siège 3 → est.
  const SEAT_LABELS = ["东 (vous)", "南", "西", "北"];

  const isCurrent = (seat: number): boolean => {
    if (state.phase.kind === "ended") return false;
    if (state.phase.kind === "reaction") return state.phase.discardedBy === seat;
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
            isCurrent={isCurrent(3)}
          />
        </div>

        {/* Centre */}
        <CenterInfo state={state} />

        {/* Sud = humain (siège 0) */}
        <div className="seat-south">
          {human.discards.length > 0 && (
            <div className="discards-row">
              {human.discards.map((t, i) => (
                <span key={i}>
                  <DiscardTile tile={t} />
                </span>
              ))}
            </div>
          )}
          <Hand
            concealed={human.concealed}
            exposed={human.exposed}
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

function DiscardTile({ tile }: { tile: TileCode }) {
  return <Tile tile={tile} size={22} />;
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
