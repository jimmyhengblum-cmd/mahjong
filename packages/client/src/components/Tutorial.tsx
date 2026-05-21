import { useState } from "react";

interface TutorialProps {
  onClose: () => void;
}

interface Step {
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Bienvenue au 温州麻将",
    body: (
      <>
        <p>
          Une variante régionale du mahjong jouée à <strong>136 tuiles</strong>,
          4 joueurs. Tu joues le siège <strong>东 (Est)</strong> en bas. Les 3 autres
          sont des bots.
        </p>
        <p>
          Le but : composer une main valide de <strong>5 combinaisons + 1 paire</strong> = 17 tuiles.
        </p>
      </>
    ),
  },
  {
    title: "Le 财神 (joker)",
    body: (
      <>
        <p>
          À chaque manche, une tuile est tirée au sort comme <strong>财神</strong>
          (joker). Affichée en haut de l'écran avec un fond doré.
        </p>
        <ul>
          <li>Toutes les copies de cette tuile deviennent <strong>jokers wildcards</strong></li>
          <li>Les <strong>白板</strong> (dragons blancs) prennent la valeur de cette tuile en normal</li>
        </ul>
      </>
    ),
  },
  {
    title: "À ton tour",
    body: (
      <>
        <p>
          Quand c'est à toi : ton bord en bas s'illumine en doré + un son discret.
        </p>
        <ul>
          <li><strong>Clique</strong> une tuile pour la défausser</li>
          <li><strong>Glisse-dépose</strong> tes tuiles pour les réorganiser</li>
          <li>Si tu peux gagner : un bouton <strong>胡 Auto-Hu</strong> apparaît</li>
        </ul>
      </>
    ),
  },
  {
    title: "Réagir aux défausses",
    body: (
      <>
        <p>
          Quand un adversaire défausse une tuile utile, tu peux <strong>réclamer</strong> :
        </p>
        <ul>
          <li><strong>胡 (Hu)</strong> — Gagner avec cette tuile</li>
          <li><strong>杠 (Kong)</strong> — 4 identiques (3 en main + défausse)</li>
          <li><strong>碰 (Pong)</strong> — 3 identiques (2 en main + défausse)</li>
          <li><strong>吃 (Chi)</strong> — Suite de 3 (seul le siège suivant)</li>
          <li><strong>过 (Passer)</strong> — Ne rien faire</li>
        </ul>
        <p>Priorité en cas de conflit : 胡 &gt; 杠 &gt; 碰 &gt; 吃.</p>
      </>
    ),
  },
  {
    title: "Multiplicateurs",
    body: (
      <>
        <ul>
          <li><strong>软胡</strong> (avec joker) — ×1</li>
          <li><strong>硬胡</strong> (sans joker) — ×2</li>
          <li><strong>双翻</strong> (3 jokers + main valide) — ×4</li>
          <li><strong>4 jokers</strong> = main spéciale ×8</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Bonus s'ajoutent pour <strong>碰碰胡</strong> (que des triplets),{" "}
          <strong>清一色</strong> (une famille), <strong>天胡/地胡</strong> (1er tour).
        </p>
        <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
          Tu peux relire ce tutoriel à tout moment via le bouton <strong>?</strong> en haut.
        </p>
      </>
    ),
  },
];

export function Tutorial({ onClose }: TutorialProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-header">
          <span className="tutorial-step">
            {step + 1} / {STEPS.length}
          </span>
          <button className="tutorial-close" onClick={onClose} title="Fermer">
            ✕
          </button>
        </div>
        <h2 className="tutorial-title">{current.title}</h2>
        <div className="tutorial-body">{current.body}</div>

        <div className="tutorial-progress">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot ${i === step ? "tutorial-dot-active" : ""}`}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          <button
            className="tutorial-btn tutorial-btn-secondary"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            ← Précédent
          </button>
          {isLast ? (
            <button className="tutorial-btn tutorial-btn-primary" onClick={onClose}>
              Commencer à jouer
            </button>
          ) : (
            <button
              className="tutorial-btn tutorial-btn-primary"
              onClick={() => setStep(step + 1)}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper : a-t-on déjà montré le tutoriel ? */
const TUTORIAL_SEEN_KEY = "mjwz-tutorial-seen-v1";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch {
    /* localStorage indisponible */
  }
}
