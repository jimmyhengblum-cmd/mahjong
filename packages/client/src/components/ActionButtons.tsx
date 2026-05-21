import type { useGame } from "../hooks/useGame.js";
import { checkHu } from "@mjwz/engine";

interface ActionButtonsProps {
  game: ReturnType<typeof useGame>;
}

/**
 * Boutons d'action thématiques : chaque action principale est un "tile-button"
 * façon tuile de mahjong, avec son caractère chinois et un code couleur.
 */
export function ActionButtons({ game }: ActionButtonsProps) {
  const { isHumanTurn, isHumanReacting, humanReactionOptions, state } = game;

  if (state.phase.kind === "ended") {
    return (
      <div className="action-hint">
        <span>Manche terminée · cliquez "Nouvelle manche" pour rejouer</span>
      </div>
    );
  }

  if (isHumanReacting) {
    const opts = humanReactionOptions;
    const anyAction = opts.canHu || opts.canKong || opts.canPong || opts.chiUses.length > 0;
    return (
      <div className="action-row">
        <div className="action-hint">Réagir à la défausse ?</div>
        <div className="action-buttons">
          {opts.canHu && (
            <ActionTile
              variant="hu"
              cn="胡"
              label="Hu"
              hint="Gagner !"
              onClick={() => game.claim({ type: "hu" })}
            />
          )}
          {opts.canKong && (
            <ActionTile
              variant="kong"
              cn="杠"
              label="Kong"
              hint="4 tuiles"
              onClick={() => game.claim({ type: "kong" })}
            />
          )}
          {opts.canPong && (
            <ActionTile
              variant="pong"
              cn="碰"
              label="Pong"
              hint="3 tuiles"
              onClick={() => game.claim({ type: "pong" })}
            />
          )}
          {opts.chiUses.map((uses, i) => (
            <ActionTile
              key={i}
              variant="chi"
              cn="吃"
              label={`Chi`}
              hint={`${uses[0]}+${uses[1]}`}
              onClick={() => game.claim({ type: "chi", uses })}
            />
          ))}
          <ActionTile
            variant="pass"
            cn="过"
            label="Passer"
            hint=""
            onClick={() => game.pass()}
            small
          />
        </div>
        {!anyAction && (
          <div className="action-hint-sub">Aucune action possible — clique "Passer".</div>
        )}
      </div>
    );
  }

  if (isHumanTurn) {
    const hand = game.state.hands[game.humanSeat]!;
    const huPossible = checkHu({
      concealed: hand.concealed,
      exposedMelds: hand.exposed,
      ctx: game.state.ctx,
    }).valid;
    return (
      <div className="action-row">
        <div className="action-hint">▶ À vous · cliquez une tuile pour défausser</div>
        <div className="action-buttons">
          {huPossible && (
            <ActionTile
              variant="hu"
              cn="胡"
              label="Auto-Hu"
              hint="自摸"
              onClick={() => game.selfHu()}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="action-hint">
      <span>En attente des autres joueurs…</span>
    </div>
  );
}

interface ActionTileProps {
  variant: "hu" | "kong" | "pong" | "chi" | "pass";
  cn: string;
  label: string;
  hint: string;
  onClick: () => void;
  small?: boolean;
}

function ActionTile({ variant, cn, label, hint, onClick, small }: ActionTileProps) {
  return (
    <button
      className={`action-tile action-tile-${variant} ${small ? "action-tile-small" : ""}`}
      onClick={onClick}
      title={hint}
    >
      <span className="action-tile-cn">{cn}</span>
      <span className="action-tile-label">{label}</span>
      {hint && <span className="action-tile-hint">{hint}</span>}
    </button>
  );
}
