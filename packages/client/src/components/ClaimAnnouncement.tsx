import type { TileCode } from "@mjwz/engine";
import type { AnnouncementEvent } from "../hooks/useGame.js";
import { Tile, tileRole } from "./Tile.js";

interface ClaimAnnouncementProps {
  announcement: AnnouncementEvent | null;
  jokerValue: TileCode;
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

const ACTION_INFO: Record<string, { cn: string; fr: string; color: string }> = {
  chi: { cn: "吃", fr: "CHI", color: "#5fb96f" },
  pong: { cn: "碰", fr: "PONG", color: "#4aa3df" },
  kong: { cn: "杠", fr: "KONG", color: "#e85a4f" },
  hu: { cn: "胡", fr: "HU", color: "#f5d75d" },
};

/**
 * Toast central pour Chi / Pong / Kong / Hu. Affiche le caractère chinois
 * en gros + les tuiles de la combinaison formée (sauf pour Hu) avec une
 * animation séquentielle "tuile par tuile qui claque en place".
 */
export function ClaimAnnouncement({ announcement, jokerValue }: ClaimAnnouncementProps) {
  if (!announcement) return null;

  const seatName = SEAT_NAMES[announcement.seat]!;
  const info =
    announcement.type === "hu"
      ? ACTION_INFO.hu!
      : ACTION_INFO[announcement.intent.type] ?? ACTION_INFO.pong!;

  const meldTiles =
    announcement.type === "claimed" ? announcement.meld.tiles : null;

  const key = `${announcement.type}-${announcement.seat}-${
    announcement.type === "claimed" ? announcement.intent.type : announcement.selfPick
  }-${Date.now()}`;

  return (
    <div className="claim-announcement" key={key} style={{ borderColor: info.color }}>
      <div className="claim-ann-text">
        <span className="claim-ann-cn" style={{ color: info.color }}>
          {info.cn}
        </span>
        <span className="claim-ann-fr">{info.fr}</span>
      </div>
      <div className="claim-ann-seat">{seatName}</div>
      {meldTiles && (
        <div className="claim-ann-meld">
          {meldTiles.map((t, i) => (
            <span
              key={i}
              className="claim-ann-tile"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <Tile tile={t} size={40} role={tileRole(t, jokerValue)} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
