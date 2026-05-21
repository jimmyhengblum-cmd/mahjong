import { useEffect, useState } from "react";
import type { RoomPublicState } from "@mjwz/server/types";
import { getSocket } from "./socket.js";

interface LobbyProps {
  onJoined: () => void;
  onBack: () => void;
}

const SEAT_NAMES = ["东 Est", "南 Sud", "西 Ouest", "北 Nord"];

export function Lobby({ onJoined, onBack }: LobbyProps) {
  const [mode, setMode] = useState<"choice" | "create" | "join" | "waiting">("choice");
  const [name, setName] = useState(() => localStorage.getItem("mjwz-name") || "");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const onRoomState = (r: RoomPublicState) => {
      setRoom(r);
      if (r.status === "playing") onJoined();
    };
    socket.on("room:state", onRoomState);
    return () => {
      socket.off("room:state", onRoomState);
    };
  }, [onJoined]);

  const saveName = (n: string) => {
    setName(n);
    try {
      localStorage.setItem("mjwz-name", n);
    } catch {}
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Choisis un nom");
      return;
    }
    setError(null);
    getSocket().emit("room:create", name.trim(), (resp) => {
      if ("error" in resp) {
        setError(resp.error);
        return;
      }
      setIsHost(true);
      setMode("waiting");
    });
  };

  const handleJoin = () => {
    if (!name.trim() || !joinCode.trim()) {
      setError("Nom et code requis");
      return;
    }
    setError(null);
    getSocket().emit(
      "room:join",
      { code: joinCode.trim().toUpperCase(), name: name.trim() },
      (resp) => {
        if ("error" in resp) {
          setError(resp.error);
          return;
        }
        setIsHost(false);
        setMode("waiting");
      }
    );
  };

  const handleStart = () => {
    getSocket().emit("game:start", (resp) => {
      if ("error" in resp) setError(resp.error);
    });
  };

  const handleLeave = () => {
    getSocket().emit("room:leave");
    setRoom(null);
    setMode("choice");
    onBack();
  };

  // ---------- Render ----------

  if (mode === "choice") {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Partie en ligne</h2>
          <input
            type="text"
            className="lobby-input"
            placeholder="Ton nom"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <div className="lobby-actions">
            <button className="lobby-btn lobby-btn-primary" onClick={() => setMode("create")}>
              Créer une room
            </button>
            <button className="lobby-btn" onClick={() => setMode("join")}>
              Rejoindre avec un code
            </button>
          </div>
          {error && <div className="lobby-error">{error}</div>}
          <button className="lobby-link" onClick={onBack}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Créer une room</h2>
          <p className="lobby-hint">Tu seras l'hôte. Tu pourras inviter 3 amis (ou laisser des bots combler).</p>
          <input
            type="text"
            className="lobby-input"
            placeholder="Ton nom"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <div className="lobby-actions">
            <button className="lobby-btn lobby-btn-primary" onClick={handleCreate}>
              Créer
            </button>
            <button className="lobby-btn" onClick={() => setMode("choice")}>
              Annuler
            </button>
          </div>
          {error && <div className="lobby-error">{error}</div>}
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Rejoindre une room</h2>
          <input
            type="text"
            className="lobby-input"
            placeholder="Ton nom"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            maxLength={20}
          />
          <input
            type="text"
            className="lobby-input lobby-input-code"
            placeholder="Code (ex: ABCD)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            autoFocus
          />
          <div className="lobby-actions">
            <button className="lobby-btn lobby-btn-primary" onClick={handleJoin}>
              Rejoindre
            </button>
            <button className="lobby-btn" onClick={() => setMode("choice")}>
              Annuler
            </button>
          </div>
          {error && <div className="lobby-error">{error}</div>}
        </div>
      </div>
    );
  }

  // Waiting room
  if (!room) {
    return (
      <div className="lobby">
        <div className="lobby-card">Connexion…</div>
      </div>
    );
  }
  const humansCount = room.seats.filter((s) => s.kind === "human").length;
  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-code-block">
          <div className="lobby-code-label">Code à partager</div>
          <div className="lobby-code">{room.code}</div>
          <button
            className="lobby-link"
            onClick={() => navigator.clipboard?.writeText(room.code)}
          >
            Copier
          </button>
        </div>

        <div className="lobby-seats">
          {room.seats.map((s, i) => (
            <div
              key={i}
              className={`lobby-seat lobby-seat-${s.kind}`}
            >
              <span className="lobby-seat-wind">{SEAT_NAMES[i]}</span>
              <span className="lobby-seat-occupant">
                {s.kind === "human" ? s.name : s.kind === "bot" ? "Bot" : "vide"}
              </span>
            </div>
          ))}
        </div>

        <p className="lobby-hint">
          {humansCount}/4 humain{humansCount > 1 ? "s" : ""}. Les sièges vides seront remplis
          par des bots.
        </p>

        <div className="lobby-actions">
          {isHost && (
            <button className="lobby-btn lobby-btn-primary" onClick={handleStart}>
              Démarrer la partie
            </button>
          )}
          <button className="lobby-btn" onClick={handleLeave}>
            Quitter
          </button>
        </div>
        {error && <div className="lobby-error">{error}</div>}
      </div>
    </div>
  );
}
