import type { AnnouncementEvent } from "../hooks/useGame.js";

interface ClaimAnnouncementProps {
  announcement: AnnouncementEvent | null;
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

const ACTION_INFO: Record<string, { cn: string; fr: string; color: string }> = {
  chi: { cn: "吃", fr: "CHI", color: "#5fb96f" },
  pong: { cn: "碰", fr: "PONG", color: "#4aa3df" },
  kong: { cn: "杠", fr: "KONG", color: "#e85a4f" },
  hu: { cn: "胡", fr: "HU", color: "#f5d75d" },
};

/**
 * Toast central transient quand un siège fait une action notable :
 * Chi / Pong / Kong / Hu. Visible ~1.6s puis disparaît.
 */
export function ClaimAnnouncement({ announcement }: ClaimAnnouncementProps) {
  if (!announcement) return null;

  const seatName = SEAT_NAMES[announcement.seat]!;
  const info =
    announcement.type === "hu"
      ? ACTION_INFO.hu!
      : ACTION_INFO[announcement.intent.type] ?? ACTION_INFO.pong!;

  // key sur (type + seat + counter implicite via ts) pour re-mount à chaque nouvelle annonce
  const key = `${announcement.type}-${announcement.seat}-${
    announcement.type === "claimed" ? announcement.intent.type : announcement.selfPick
  }-${Date.now()}`;

  return (
    <div className="claim-announcement" key={key} style={{ borderColor: info.color }}>
      <div className="claim-ann-cn" style={{ color: info.color }}>
        {info.cn}
      </div>
      <div className="claim-ann-fr">{info.fr} !</div>
      <div className="claim-ann-seat">{seatName}</div>
    </div>
  );
}
