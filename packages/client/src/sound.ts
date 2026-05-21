/**
 * Petit moteur audio basé sur Web Audio API.
 * Tous les sons sont synthétisés à la volée (pas d'asset externe).
 *
 * Le contexte est créé paresseusement à la 1ère interaction utilisateur
 * (pour respecter la politique autoplay des navigateurs).
 */

export type SoundName =
  | "click"   // défausse / pioche d'une tuile
  | "draw"    // tirage discret depuis le mur
  | "pong"    // claim pong
  | "kong"    // claim kong (deeper)
  | "chi"     // claim chi (plus light)
  | "hu"      // victoire (arpège)
  | "turn"    // notification "à vous"
  | "lose";   // bot fait Hu

const STORAGE_KEY = "mjwz-audio-enabled";

function readStoredEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = readStoredEnabled();
  private masterVolume = 0.6;

  setEnabled(b: boolean) {
    this.enabled = b;
    try {
      localStorage.setItem(STORAGE_KEY, b ? "1" : "0");
    } catch {
      /* localStorage indisponible */
    }
    if (b) this.ensureCtx();
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const fn = SYNTHS[name];
    fn(ctx, this.masterVolume);
  }
}

export const sound = new SoundManager();

// ---------- Synthèses ----------

type Synth = (ctx: AudioContext, vol: number) => void;

const SYNTHS: Record<SoundName, Synth> = {
  click: (ctx, vol) => woodenClack(ctx, vol, 1.0, 700),
  draw: (ctx, vol) => woodenClack(ctx, vol, 0.4, 1100),
  pong: (ctx, vol) => bellChime(ctx, vol, [659, 880], 0.5),         // mi-la
  kong: (ctx, vol) => bellChime(ctx, vol, [440, 554, 659], 0.7),    // la-do#-mi (deeper accord)
  chi: (ctx, vol) => bellChime(ctx, vol, [880, 1108], 0.35),        // la-do# light
  hu: (ctx, vol) => victoryArpeggio(ctx, vol),
  turn: (ctx, vol) => bellChime(ctx, vol, [988], 0.25),
  lose: (ctx, vol) => sadTone(ctx, vol),
};

/** Clac de tuile en bois : burst de bruit + filtre passe-bas + decay rapide */
function woodenClack(ctx: AudioContext, vol: number, intensity: number, cutoff: number) {
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, 1200, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 8);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.4 * intensity * vol;

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

/** Cloche / clochette : sinusoïdes empilées avec decay exponentiel */
function bellChime(ctx: AudioContext, vol: number, freqs: number[], duration: number) {
  const now = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const startVol = 0.35 * vol / freqs.length;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(startVol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(now + i * 0.02);
    osc.stop(now + duration + 0.05);
  });
}

/** Arpège ascendant pour la victoire : do-mi-sol-do octave */
function victoryArpeggio(ctx: AudioContext, vol: number) {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    setTimeout(() => bellChime(ctx, vol * 0.9, [f, f * 2], 0.45), i * 110);
  });
}

/** Note triste pour défaite : descente mineure */
function sadTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.3 * vol, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.7);
}
