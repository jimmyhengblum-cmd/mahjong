import type { useGame } from "../hooks/useGame.js";
import { checkHu } from "@mjwz/engine";
import { Tooltip } from "./Tooltip.js";

interface ActionButtonsProps {
  game: ReturnType<typeof useGame>;
}

/**
 * Boutons d'action : un seul gros caractère chinois par bouton, code couleur
 * sémantique, et tooltip qui explique au survol. Le texte verbeux a été
 * remplacé par les tooltips pour épurer l'interface.
 */
export function ActionButtons({ game }: ActionButtonsProps) {
  const { isHumanTurn, isHumanReacting, humanReactionOptions, state } = game;

  if (state.phase.kind === "ended") {
    return <span className="action-hint">Manche terminée</span>;
  }

  if (isHumanReacting) {
    const opts = humanReactionOptions;
    return (
      <div className="action-buttons">
        {opts.canHu && (
          <ActionTile variant="hu" cn="胡" onClick={() => game.claim({ type: "hu" })} />
        )}
        {opts.canKong && (
          <ActionTile variant="kong" cn="杠" onClick={() => game.claim({ type: "kong" })} />
        )}
        {opts.canPong && (
          <ActionTile variant="pong" cn="碰" onClick={() => game.claim({ type: "pong" })} />
        )}
        {opts.chiUses.map((uses, i) => (
          <ActionTile
            key={i}
            variant="chi"
            cn="吃"
            hint={`${uses[0]}+${uses[1]}`}
            onClick={() => game.claim({ type: "chi", uses })}
          />
        ))}
        <ActionTile variant="pass" cn="过" onClick={() => game.pass()} small />
      </div>
    );
  }

  if (isHumanTurn) {
    const hand = state.hands[game.humanSeat]!;
    const huPossible = checkHu({
      concealed: hand.concealed,
      exposedMelds: hand.exposed,
      ctx: state.ctx,
    }).valid;
    return (
      <div className="action-buttons">
        {huPossible && (
          <ActionTile variant="hu" cn="胡" hint="自摸" onClick={() => game.selfHu()} />
        )}
        {!huPossible && <span className="action-hint">À vous · clique une tuile</span>}
      </div>
    );
  }

  return <span className="action-hint">En attente…</span>;
}

interface ActionTileProps {
  variant: "hu" | "kong" | "pong" | "chi" | "pass";
  cn: string;
  hint?: string;
  onClick: () => void;
  small?: boolean;
}

const VARIANT_TOOLTIPS: Record<string, React.ReactNode> = {
  hu: (
    <>
      <strong>胡 Hu</strong> — Gagner la manche.
      <br />
      Forme une main valide (5 combinaisons + 1 paire).
    </>
  ),
  kong: (
    <>
      <strong>杠 Kong</strong> — 4 tuiles identiques.
      <br />3 en main + la défausse. Donne 1 pioche bonus.
    </>
  ),
  pong: (
    <>
      <strong>碰 Pong</strong> — 3 tuiles identiques.
      <br />2 en main + la défausse. Tu joues ensuite.
    </>
  ),
  chi: (
    <>
      <strong>吃 Chi</strong> — Suite de 3 consécutives.
      <br />Seul le siège suivant peut chi.
    </>
  ),
  pass: <>Ne rien faire, le jeu continue.</>,
};

const VARIANT_LABELS: Record<string, string> = {
  hu: "Hu (gagner)",
  kong: "Kong (4 tuiles)",
  pong: "Pong (3 tuiles)",
  chi: "Chi (suite)",
  pass: "Passer",
};

function ActionTile({ variant, cn, hint, onClick, small }: ActionTileProps) {
  return (
    <Tooltip content={VARIANT_TOOLTIPS[variant]}>
      <button
        className={`action-tile action-tile-${variant} ${small ? "action-tile-small" : ""}`}
        onClick={onClick}
        aria-label={VARIANT_LABELS[variant]}
      >
        <span className="action-tile-cn">{cn}</span>
        {hint && <span className="action-tile-hint">{hint}</span>}
      </button>
    </Tooltip>
  );
}
