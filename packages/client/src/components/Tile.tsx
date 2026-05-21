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
  // p1 a un dessin central plus grand et orné
  if (n === 1) {
    return (
      <g>
        <circle cx="30" cy="40" r="18" fill="#fbf7e8" stroke="#1a1a1a" strokeWidth="0.8" />
        <circle cx="30" cy="40" r="15" fill="none" stroke="#1a1a1a" strokeWidth="0.4" strokeDasharray="2 1" />
        <circle cx="30" cy="40" r="9" fill="none" stroke="#1a1a1a" strokeWidth="0.4" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i * Math.PI) / 4;
          const cx = 30 + Math.cos(angle) * 6;
          const cy = 40 + Math.sin(angle) * 6;
          return <circle key={i} cx={cx} cy={cy} r="1" fill="#c8201f" />;
        })}
        <circle cx="30" cy="40" r="2" fill="#c8201f" />
      </g>
    );
  }
  return (
    <>
      {DOT_POSITIONS[n]!.map(([x, y], i) => (
        <FloralDot key={i} x={x} y={y} red={n === 5 && i === 2} />
      ))}
    </>
  );
}

function FloralDot({ x, y, red }: { x: number; y: number; red?: boolean }) {
  const color = red ? "#c8201f" : "#1a1a1a";
  return (
    <g>
      {/* Outer ring */}
      <circle cx={x} cy={y} r="5" fill="#fbf7e8" stroke={color} strokeWidth="0.6" />
      <circle cx={x} cy={y} r="3.5" fill="none" stroke={color} strokeWidth="0.3" />
      {/* 4 petals around center */}
      <circle cx={x} cy={y - 2.5} r="0.9" fill={color} opacity="0.65" />
      <circle cx={x + 2.5} cy={y} r="0.9" fill={color} opacity="0.65" />
      <circle cx={x} cy={y + 2.5} r="0.9" fill={color} opacity="0.65" />
      <circle cx={x - 2.5} cy={y} r="0.9" fill={color} opacity="0.65" />
      {/* Center */}
      <circle cx={x} cy={y} r="0.9" fill={color} />
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

function BambooStick({ x, y, red }: { x: number; y: number; red?: boolean }) {
  const color = red ? "#c8201f" : "#157f3e";
  const stroke = red ? "#8a1212" : "#0a3818";
  return (
    <g>
      <rect
        x={x - 2.8}
        y={y - 9}
        width="5.6"
        height="18"
        rx="1.2"
        fill={color}
        stroke={stroke}
        strokeWidth="0.4"
      />
      {/* 3 joints horizontaux (segments du bambou) */}
      <line x1={x - 2.8} y1={y - 4.5} x2={x + 2.8} y2={y - 4.5} stroke={stroke} strokeWidth="0.4" />
      <line x1={x - 2.8} y1={y} x2={x + 2.8} y2={y} stroke={stroke} strokeWidth="0.4" />
      <line x1={x - 2.8} y1={y + 4.5} x2={x + 2.8} y2={y + 4.5} stroke={stroke} strokeWidth="0.4" />
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
