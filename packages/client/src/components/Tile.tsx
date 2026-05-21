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

/**
 * Rendu SVG d'une tuile de Mahjong.
 *
 * - m1..m9 : caractère numérique + suit "万"
 * - p1..p9 : N cercles arrangés selon le motif traditionnel
 * - s1..s9 : N bambous verticaux (s1 stylisé en oiseau rouge)
 * - we/ws/ww/wn : vent chinois (东/南/西/北)
 * - dr : 中 rouge
 * - dg : 發 vert
 * - dw : tuile blanche (cadre uniquement)
 */
export function Tile({ tile, size = 44, hidden, highlight, role }: TileProps) {
  const w = size;
  const h = Math.round(size * 1.35);

  let fill = "#faf5e0"; // default ivoire
  let stroke = "#4a4a4a";
  let strokeWidth = 1;

  if (hidden) {
    fill = "#2c5f3a";
  } else if (role === "joker") {
    fill = "#fff4c4"; // jaune doré
    stroke = "#d4a017";
    strokeWidth = 2;
  } else if (role === "joker-value") {
    fill = "#e0eaff"; // bleu pâle
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
      style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
    >
      <rect
        x="1"
        y="1"
        width="58"
        height="78"
        rx="6"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {role === "joker" && (
        <text x="6" y="14" fontSize="10" fontWeight="700" fill="#d4a017">
          财
        </text>
      )}
      {!hidden && <TileFace tile={tile} />}
    </svg>
  );
}

/** Helper : détermine le rôle visuel d'une tuile dans une manche. */
export function tileRole(
  tile: TileCode,
  jokerValue: TileCode
): "joker" | "joker-value" | undefined {
  if (tile === jokerValue) return "joker";
  if (tile === "dw" && jokerValue !== "dw") return "joker-value";
  return undefined;
}

function TileFace({ tile }: { tile: TileCode }) {
  // Numéroté
  if (tile.length === 2 && (tile[0] === "m" || tile[0] === "p" || tile[0] === "s")) {
    const suit = tile[0] as "m" | "p" | "s";
    const num = parseInt(tile[1]!, 10);
    if (suit === "m") return <CharactersFace n={num} />;
    if (suit === "p") return <DotsFace n={num} />;
    return <BambooFace n={num} />;
  }
  // Honneurs
  switch (tile) {
    case "we": return <HonorText text="东" />;
    case "ws": return <HonorText text="南" />;
    case "ww": return <HonorText text="西" />;
    case "wn": return <HonorText text="北" />;
    case "dr": return <HonorText text="中" color="var(--dragon-red)" />;
    case "dg": return <HonorText text="發" color="var(--dragon-green)" />;
    case "dw": return <BaiBanFace />;
  }
  return null;
}

// ---------- Caractères (万) ----------

const NUM_CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function CharactersFace({ n }: { n: number }) {
  return (
    <>
      <text x="30" y="32" textAnchor="middle" fontSize="26" fontWeight="600" fill="#2c2c2c" fontFamily="serif">
        {NUM_CN[n]}
      </text>
      <text x="30" y="64" textAnchor="middle" fontSize="22" fontWeight="700" fill="#c8201f" fontFamily="serif">
        万
      </text>
    </>
  );
}

// ---------- Cercles (筒) ----------

/**
 * Position des cercles. Boîte 60×80. Chaque numéro a un motif clairement distinct.
 * 8 utilise une grille 2×4 (séparation verticale claire), 9 une grille 3×3.
 */
const DOT_POSITIONS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [], // index 0 unused
  [[30, 40]],                                                              // 1 : centre
  [[20, 22], [40, 58]],                                                    // 2 : diagonale
  [[16, 22], [30, 40], [44, 58]],                                          // 3 : diagonale
  [[20, 22], [40, 22], [20, 58], [40, 58]],                                // 4 : carré 2×2
  [[20, 22], [40, 22], [30, 40], [20, 58], [40, 58]],                      // 5 : X
  [[20, 22], [40, 22], [20, 40], [40, 40], [20, 58], [40, 58]],            // 6 : grille 2×3
  [[15, 18], [30, 18], [45, 18], [30, 40], [20, 60], [30, 60], [40, 60]],  // 7 : 3+1+3
  [[20, 18], [40, 18], [20, 33], [40, 33], [20, 47], [40, 47], [20, 62], [40, 62]], // 8 : 2×4
  [[15, 18], [30, 18], [45, 18], [15, 40], [30, 40], [45, 40], [15, 60], [30, 60], [45, 60]], // 9 : 3×3
];

const DOT_COLORS = ["#c8201f", "#157f3e", "#1e5fa8"]; // rouge, vert, bleu

function DotsFace({ n }: { n: number }) {
  return (
    <>
      {DOT_POSITIONS[n]!.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill={DOT_COLORS[i % 3]} stroke="#2c2c2c" strokeWidth="0.5" />
          <circle cx={x} cy={y} r="2.5" fill="#faf5e0" />
        </g>
      ))}
    </>
  );
}

// ---------- Bambous (条) ----------

function BambooFace({ n }: { n: number }) {
  if (n === 1) {
    return (
      <>
        <BambooStick x="30" y="22" />
        <circle cx="30" cy="55" r="13" fill="#c8201f" stroke="#2c2c2c" strokeWidth="0.5" />
        <text x="30" y="62" textAnchor="middle" fontSize="14" fontWeight="700" fill="#faf5e0">
          鸟
        </text>
      </>
    );
  }
  // 8 = grille 2×4 (clairement séparée verticalement du 9 qui est 3×3)
  const arrangements: Record<number, Array<[number, number]>> = {
    2: [[22, 30], [38, 30]],
    3: [[15, 30], [30, 30], [45, 30]],
    4: [[20, 22], [40, 22], [20, 58], [40, 58]],
    5: [[20, 22], [40, 22], [30, 40], [20, 58], [40, 58]],
    6: [[18, 22], [30, 22], [42, 22], [18, 58], [30, 58], [42, 58]],
    7: [[15, 18], [30, 18], [45, 18], [30, 40], [20, 60], [30, 60], [40, 60]],
    8: [[20, 18], [40, 18], [20, 33], [40, 33], [20, 47], [40, 47], [20, 62], [40, 62]],
    9: [[15, 18], [30, 18], [45, 18], [15, 40], [30, 40], [45, 40], [15, 60], [30, 60], [45, 60]],
  };
  const arr = arrangements[n] ?? [];
  return (
    <>
      {arr.map(([x, y], i) => (
        <BambooStick key={i} x={x.toString()} y={y.toString()} />
      ))}
    </>
  );
}

function BambooStick({ x, y }: { x: string; y: string }) {
  const cx = parseFloat(x);
  const cy = parseFloat(y);
  return (
    <g>
      <rect x={cx - 3} y={cy - 9} width="6" height="18" rx="2" fill="#157f3e" stroke="#0f4a26" strokeWidth="0.5" />
      <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#0f4a26" strokeWidth="0.5" />
    </g>
  );
}

// ---------- Honneurs ----------

function HonorText({ text, color = "#2c2c2c" }: { text: string; color?: string }) {
  return (
    <text
      x="30"
      y="52"
      textAnchor="middle"
      fontSize="32"
      fontWeight="700"
      fill={color}
      fontFamily="serif"
    >
      {text}
    </text>
  );
}

function BaiBanFace() {
  // Tuile blanche — souvent juste un cadre intérieur
  return (
    <rect
      x="14"
      y="20"
      width="32"
      height="42"
      fill="none"
      stroke="#888"
      strokeWidth="1.5"
      rx="3"
    />
  );
}
