/**
 * Petit moteur audio basé sur Web Audio API + Web Speech API.
 *
 * - SFX : synthétisés à la volée (pas d'asset externe), via AudioContext
 * - Voix : annonces TTS en mandarin (一万, 碰, 胡...) via speechSynthesis
 *
 * Le contexte audio est créé paresseusement à la 1ère interaction utilisateur
 * (pour respecter la politique autoplay des navigateurs).
 */

import type { TileCode } from "@mjwz/engine";

export type SoundName =
  | "click"   // défausse / pioche d'une tuile
  | "draw"    // tirage discret depuis le mur
  | "pong"    // claim pong
  | "kong"    // claim kong (deeper)
  | "chi"     // claim chi (plus light)
  | "hu"      // victoire (arpège)
  | "turn"    // notification "à vous"
  | "lose";   // bot fait Hu

/** Noms en mandarin des tuiles, pour la TTS. */
const TILE_NAMES_CN: Record<TileCode, string> = {
  m1: "一万", m2: "二万", m3: "三万", m4: "四万", m5: "五万",
  m6: "六万", m7: "七万", m8: "八万", m9: "九万",
  p1: "一筒", p2: "二筒", p3: "三筒", p4: "四筒", p5: "五筒",
  p6: "六筒", p7: "七筒", p8: "八筒", p9: "九筒",
  s1: "一条", s2: "二条", s3: "三条", s4: "四条", s5: "五条",
  s6: "六条", s7: "七条", s8: "八条", s9: "九条",
  we: "东风", ws: "南风", ww: "西风", wn: "北风",
  dr: "红中", dg: "发财", dw: "白板",
};

const ACTION_NAMES_CN: Record<string, string> = {
  pong: "碰",
  kong: "杠",
  chi: "吃",
  hu: "胡了",
};

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
  private chineseVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.refreshVoice();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.refreshVoice();
    }
  }

  /** Recherche la meilleure voix chinoise disponible sur le système. */
  private refreshVoice() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    // Priorité : zh-CN > zh-TW > zh-HK > toute voix zh-*
    this.chineseVoice =
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => v.lang === "zh-TW") ||
      voices.find((v) => v.lang === "zh-HK") ||
      voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ||
      null;
  }

  setEnabled(b: boolean) {
    this.enabled = b;
    try {
      localStorage.setItem(STORAGE_KEY, b ? "1" : "0");
    } catch {
      /* localStorage indisponible */
    }
    if (b) {
      this.ensureCtx();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      // Coupe immédiatement toute voix en cours
      window.speechSynthesis.cancel();
    }
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

  /** Annonce vocale d'une tuile (ex: "五筒" pour p5). */
  speakTile(tile: TileCode) {
    const text = TILE_NAMES_CN[tile];
    if (text) this._speak(text, 1.05);
  }

  /** Annonce vocale d'une action (碰 / 杠 / 吃 / 胡了). */
  speakAction(actionType: "pong" | "kong" | "chi" | "hu") {
    const text = ACTION_NAMES_CN[actionType];
    if (text) this._speak(text, 1.0);
  }

  private _speak(text: string, rate: number) {
    if (!this.enabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = rate;
      u.pitch = 1.0;
      u.volume = Math.min(1, this.masterVolume * 0.9);
      if (this.chineseVoice) u.voice = this.chineseVoice;
      window.speechSynthesis.speak(u);
    } catch {
      /* speechSynthesis indisponible ou erreur */
    }
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
