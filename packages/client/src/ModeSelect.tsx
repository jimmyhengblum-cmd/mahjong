interface ModeSelectProps {
  onSolo: () => void;
  onOnline: () => void;
}

export function ModeSelect({ onSolo, onOnline }: ModeSelectProps) {
  return (
    <div className="mode-select">
      <div className="mode-select-card">
        <h1 className="mode-select-title">温州麻将</h1>
        <p className="mode-select-sub">Mahjong de Wenzhou — variante 17 tuiles</p>

        <div className="mode-select-options">
          <button className="mode-select-btn mode-select-btn-primary" onClick={onSolo}>
            <span className="mode-select-btn-title">Jouer en solo</span>
            <span className="mode-select-btn-desc">Contre 3 bots, hors-ligne</span>
          </button>
          <button className="mode-select-btn" onClick={onOnline}>
            <span className="mode-select-btn-title">Partie en ligne</span>
            <span className="mode-select-btn-desc">Crée ou rejoins une room avec un code</span>
          </button>
        </div>

        <div className="mode-select-footer">
          v0.1 — beta
        </div>
      </div>
    </div>
  );
}
