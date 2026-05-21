import type { TileCode } from "@mjwz/engine";

interface TileProps {
  tile: TileCode;
  /** Largeur en pixels — la hauteur est de 4/3 × width. */
  size?: number;
  /** Tuile face cachée (dos uniquement). */
  hidden?: boolean;
  /** Highlight visuel (ex: la tuile gagnante). */
  highlight?: boolean;
  /**
   * Rôle visuel dans la manche en cours :
   *  - "joker" : c'est un 财神 (wildcard) — fond doré
   *  - "joker-value" : c'est un 白板 prenant la valeur du joker — fond bleu pâle
   *  - undefined : tuile normale
   */
  role?: "joker" | "joker-value";
}

export function Tile({ tile, size = 44, hidden, highlight, role }: TileProps) {
  const w = size;
  const h = Math.round(size * 1.35);

  let fill = "#fbf7e8"; // ivoire traditionnel
  let stroke = "#1a1a1a";
  let strokeWidth = 1.2;

  if (hidden) {
    fill = "#2c5f3a";
    stroke = "#143820";
  } else if (role === "joker") {
    fill = "#fff4c4";
    stroke = "#d4a017";
    strokeWidth = 2;
  } else if (role === "joker-value") {
    fill = "#e6efff";
    stroke = "#5577bb";
    strokeWidth = 1.5;
  }
  if (highlight) {
    stroke = "#f1c40f";
    strokeWidth = Math.max(strokeWidth, 2.5);
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 60 80"
      style={{ display: "block", filter: "drop-shadow(0 1.5px 2px rgba(0,0,0,0.45))" }}
    >
      {/* Bord externe (la "tranche" de la tuile) */}
      <rect
        x="0.5"
        y="0.5"
        width="59"
        height="79"
        rx="5"
        fill="#dcd4b8"
        stroke="none"
      />
      {/* Face de la tuile */}
      <rect
        x="2"
        y="1"
        width="56"
        height="76"
        rx="4"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {role === "joker" && (
        <text x="6" y="13" fontSize="9" fontWeight="700" fill="#d4a017" fontFamily="serif">
          财
        </text>
      )}
      {!hidden && <TileFace tile={tile} />}
    </svg>
  );
}

export function tileRole(
  tile: TileCode,
  jokerValue: TileCode
): "joker" | "joker-value" | undefined {
  if (tile === jokerValue) return "joker";
  if (tile === "dw" && jokerValue !== "dw") return "joker-value";
  return undefined;
}

function TileFace({ tile }: { tile: TileCode }) {
  if (tile.length === 2 && (tile[0] === "m" || tile[0] === "p" || tile[0] === "s")) {
    const suit = tile[0] as "m" | "p" | "s";
    const num = parseInt(tile[1]!, 10);
    if (suit === "m") return <CharactersFace n={num} />;
    if (suit === "p") return <DotsFace n={num} />;
    return <BambooFace n={num} />;
  }
  switch (tile) {
    case "we": return <HonorText text="東" />;
    case "ws": return <HonorText text="南" />;
    case "ww": return <HonorText text="西" />;
    case "wn": return <HonorText text="北" />;
    case "dr": return <HonorText text="中" color="#c8201f" bold />;
    case "dg": return <HonorText text="發" color="#157f3e" bold />;
    case "dw": return <BaiBanFace />;
  }
  return null;
}

// ---------- Caractères 萬 ----------

const NUM_CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function CharactersFace({ n }: { n: number }) {
  return (
    <>
      <text
        x="30"
        y="34"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="#1a1a1a"
        fontFamily="'Noto Serif SC', 'Songti SC', 'STSong', serif"
      >
        {NUM_CN[n]}
      </text>
      <text
        x="30"
        y="66"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#c8201f"
        fontFamily="'Noto Serif SC', 'Songti SC', 'STSong', serif"
      >
        萬
      </text>
    </>
  );
}

// ---------- Cercles 筒 (florales) ----------

/** Position des cercles selon le numéro — motifs classiques mahjong. */
const DOT_POSITIONS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [],
  [[30, 40]],
  [[20, 22], [40, 58]],
  [[16, 22], [30, 40], [44, 58]],
  [[20, 22], [40, 22], [20, 58], [40, 58]],
  [[20, 22], [40, 22], [30, 40], [20, 58], [40, 58]],
  [[20, 22], [40, 22], [20, 40], [40, 40], [20, 58], [40, 58]],
  [[15, 18], [30, 18], [45, 18], [30, 40], [20, 60], [30, 60], [40, 60]],
  [[20, 18], [40, 18], [20, 33], [40, 33], [20, 47], [40, 47], [20, 62], [40, 62]],
  [[15, 18], [30, 18], [45, 18], [15, 40], [30, 40], [45, 40], [15, 60], [30, 60], [45, 60]],
];

function DotsFace({ n }: { n: number }) {
  // p1 = grand médaillon orné central (bleu + rouge)
  if (n === 1) {
    return (
      <g>
        <circle cx="30" cy="40" r="20" fill="#fbf7e8" stroke="#1e3d7a" strokeWidth="1.2" />
        <circle cx="30" cy="40" r="17" fill="none" stroke="#1e3d7a" strokeWidth="0.5" strokeDasharray="1.5 0.8" />
        <circle cx="30" cy="40" r="12" fill="none" stroke="#c8201f" strokeWidth="0.5" />
        <circle cx="30" cy="40" r="7" fill="none" stroke="#1e3d7a" strokeWidth="0.4" />
        {/* 8 pétales autour */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i * Math.PI) / 4;
          const cx = 30 + Math.cos(angle) * 9.5;
          const cy = 40 + Math.sin(angle) * 9.5;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="1.4"
              fill={i % 2 === 0 ? "#c8201f" : "#1e3d7a"}
            />
          );
        })}
        {/* Centre rouge */}
        <circle cx="30" cy="40" r="2.5" fill="#c8201f" />
        <circle cx="30" cy="40" r="1" fill="#fbf7e8" />
      </g>
    );
  }
  return (
    <>
      {DOT_POSITIONS[n]!.map(([x, y], i) => (
        <FloralDot key={i} x={x} y={y} accent={pickDotAccent(n, i)} />
      ))}
    </>
  );
}

/** Choisit la couleur d'accent d'un cercle selon le numéro et la position. */
function pickDotAccent(n: number, idx: number): "red" | "blue" {
  // Traditions de coloration mahjong :
  //   - p5 : le cercle central est rouge
  //   - autres : alternance discrète pour donner du peps
  if (n === 5 && idx === 2) return "red";
  return idx % 2 === 0 ? "blue" : "red";
}

function FloralDot({ x, y, accent }: { x: number; y: number; accent: "red" | "blue" }) {
  const outer = accent === "red" ? "#c8201f" : "#1e3d7a";
  const center = "#c8201f";
  return (
    <g>
      {/* Outer ring (couleur principale du cercle) */}
      <circle cx={x} cy={y} r="5" fill="#fbf7e8" stroke={outer} strokeWidth="0.9" />
      {/* Ring intérieur décoratif */}
      <circle cx={x} cy={y} r="3.6" fill="none" stroke={outer} strokeWidth="0.35" strokeDasharray="0.6 0.4" />
      {/* 4 pétales colorés en alternance */}
      <circle cx={x} cy={y - 2.7} r="0.95" fill="#c8201f" />
      <circle cx={x + 2.7} cy={y} r="0.95" fill="#157f3e" />
      <circle cx={x} cy={y + 2.7} r="0.95" fill="#c8201f" />
      <circle cx={x - 2.7} cy={y} r="0.95" fill="#157f3e" />
      {/* Centre rouge bordé */}
      <circle cx={x} cy={y} r="1.4" fill={center} />
      <circle cx={x} cy={y} r="0.55" fill="#fbf7e8" />
    </g>
  );
}

// ---------- Bambous 條 (segmentés) ----------

function BambooFace({ n }: { n: number }) {
  if (n === 1) {
    // s1 traditionnellement = oiseau (鸟). On dessine un médaillon rouge stylisé.
    return (
      <g>
        <circle cx="30" cy="40" r="22" fill="#fbf7e8" stroke="#c8201f" strokeWidth="1.2" />
        <circle cx="30" cy="40" r="18" fill="none" stroke="#c8201f" strokeWidth="0.5" strokeDasharray="1.5 1" />
        <text
          x="30"
          y="50"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#c8201f"
          fontFamily="'Noto Serif SC', serif"
        >
          鳥
        </text>
      </g>
    );
  }
  const arrangements: Record<number, Array<[number, number]>> = {
    /* s2 : 2 bambous l'un au-dessus de l'autre (tradition) */
    2: [[30, 22], [30, 58]],
    /* s3 : 3 bambous verticaux alignés au centre */
    3: [[30, 18], [30, 40], [30, 62]],
    /* s4 : 4 coins */
    4: [[20, 22], [40, 22], [20, 58], [40, 58]],
    /* s5 : 4 coins + 1 rouge central (X) */
    5: [[20, 22], [40, 22], [30, 40], [20, 58], [40, 58]],
    /* s6 : 2 rangées de 3 */
    6: [[18, 22], [30, 22], [42, 22], [18, 58], [30, 58], [42, 58]],
    /* s7 : 3 en haut + 1 rouge centre + 3 en bas (lucky seven) */
    7: [[15, 18], [30, 18], [45, 18], [30, 40], [15, 62], [30, 62], [45, 62]],
    /* s8 : 4 colonnes de 2 (2 rangs de 4) */
    8: [[14, 28], [25, 28], [36, 28], [47, 28], [14, 52], [25, 52], [36, 52], [47, 52]],
    /* s9 : grille 3x3 */
    9: [[15, 18], [30, 18], [45, 18], [15, 40], [30, 40], [45, 40], [15, 62], [30, 62], [45, 62]],
  };
  const arr = arrangements[n] ?? [];
  // Au centre du 5, le bâton est rouge (tradition)
  const redIdx = n === 5 ? 2 : -1;
  return (
    <>
      {arr.map(([x, y], i) => (
        <BambooStick key={i} x={x} y={y} red={i === redIdx} />
      ))}
    </>
  );
}

/**
 * Bambou style traditionnel : deux montants verticaux + barreaux horizontaux.
 * Évoque les vrais brins de bambou avec leurs nœuds visibles.
 */
function BambooStick({ x, y, red }: { x: number; y: number; red?: boolean }) {
  const color = red ? "#c8201f" : "#157f3e";
  const dark = red ? "#7a0e0e" : "#0a3818";
  return (
    <g>
      {/* Deux montants verticaux */}
      <line
        x1={x - 1.8}
        y1={y - 9}
        x2={x - 1.8}
        y2={y + 9}
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1={x + 1.8}
        y1={y - 9}
        x2={x + 1.8}
        y2={y + 9}
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Barreaux horizontaux (nœuds du bambou) */}
      {[-6.5, -2, 2, 6.5].map((dy, i) => (
        <line
          key={i}
          x1={x - 2.8}
          y1={y + dy}
          x2={x + 2.8}
          y2={y + dy}
          stroke={dark}
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

// ---------- Honneurs ----------

function HonorText({
  text,
  color = "#1a1a1a",
  bold,
}: {
  text: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <text
      x="30"
      y="52"
      textAnchor="middle"
      fontSize={bold ? 34 : 32}
      fontWeight="700"
      fill={color}
      fontFamily="'Noto Serif SC', 'Songti SC', 'STSong', serif"
    >
      {text}
    </text>
  );
}

function BaiBanFace() {
  // Tuile blanche : cadre intérieur orné
  return (
    <>
      <rect x="14" y="20" width="32" height="42" fill="none" stroke="#666" strokeWidth="1.2" rx="2" />
      <rect x="16" y="22" width="28" height="38" fill="none" stroke="#999" strokeWidth="0.4" rx="1" />
    </>
  );
}
