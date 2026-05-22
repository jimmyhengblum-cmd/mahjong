import { useState } from "react";
import { ModeSelect } from "./ModeSelect.js";
import { SoloGame } from "./SoloGame.js";
import { Lobby } from "./online/Lobby.js";
import { OnlineGame } from "./online/OnlineGame.js";
import { disconnectSocket } from "./online/socket.js";

type Mode = "menu" | "solo" | "online-lobby" | "online-game";

export function App() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <>
      {/* Overlay "tourne ton téléphone" en portrait mobile.
          CSS-only (display via media-query orientation:portrait), pas de JS. */}
      <div className="rotate-hint" role="alert" aria-label="Tournez votre téléphone">
        <div className="rotate-hint-icon">📱</div>
        <div className="rotate-hint-title">Tournez votre téléphone</div>
        <div className="rotate-hint-sub">
          Le mahjong se joue en mode paysage 🀄
        </div>
      </div>

      {renderMode(mode, setMode)}
    </>
  );
}

function renderMode(mode: Mode, setMode: (m: Mode) => void) {
  if (mode === "menu") {
    return (
      <ModeSelect
        onSolo={() => setMode("solo")}
        onOnline={() => setMode("online-lobby")}
      />
    );
  }
  if (mode === "solo") {
    return <SoloGame onExit={() => setMode("menu")} />;
  }
  if (mode === "online-lobby") {
    return (
      <Lobby
        onJoined={() => setMode("online-game")}
        onBack={() => {
          disconnectSocket();
          setMode("menu");
        }}
      />
    );
  }
  if (mode === "online-game") {
    return <OnlineGame onExit={() => setMode("menu")} />;
  }
  return null;
}
