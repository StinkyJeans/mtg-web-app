const KEY = "mtg-sound";

/** Sound effects are on unless the player turns them off with the switch in the top bar. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true; // storage blocked, or running on the server
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore: the switch just won't be remembered
  }
}

export type Sound =
  | "draw"
  | "shuffle"
  | "land"
  | "creature"
  | "cast"
  | "ability"
  | "attack"
  | "charge"
  | "block"
  | "hit"
  | "clash"
  | "die"
  | "lifeGain"
  | "lifeLoss"
  | "burn"
  | "counter"
  | "discard"
  | "turn"
  | "win"
  | "lose";

// Every sound is synthesized with the Web Audio API: no files to load, and it works offline.
interface Out {
  ctx: AudioContext;
  out: GainNode;
}

let out: Out | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): Out | null {
  if (typeof window === "undefined" || !soundEnabled()) return null;
  try {
    if (!out) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      out = { ctx, out: master };
    }
    // Browsers keep audio suspended until the page has been clicked; resume() starts it once that has happened.
    if (out.ctx.state === "suspended") void out.ctx.resume();
    return out;
  } catch {
    return null;
  }
}

/** Starts the audio on the first click, so the first sound of the game isn't lost to the browser's autoplay block. */
export function unlockSound(): () => void {
  const unlock = () => audio();
  window.addEventListener("pointerdown", unlock, { once: true });
  return () => window.removeEventListener("pointerdown", unlock);
}

/** A quick rise to `gain`, then an exponential fade to silence over `dur` seconds. */
function envelope(a: Out, t: number, dur: number, gain: number): GainNode {
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(a.out);
  return env;
}

interface ToneOpts {
  freq: number;
  /** Slides the pitch to this by the end. */
  to?: number;
  type?: OscillatorType;
  at?: number;
  dur?: number;
  gain?: number;
}

function tone(a: Out, { freq, to, type = "sine", at = 0, dur = 0.2, gain = 0.2 }: ToneOpts) {
  const t = a.ctx.currentTime + at;
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  osc.connect(envelope(a, t, dur, gain));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts {
  /** Where the filter sits; it slides to `to` by the end. */
  freq: number;
  to?: number;
  filter?: BiquadFilterType;
  q?: number;
  at?: number;
  dur?: number;
  gain?: number;
}

/** Filtered white noise: high and narrow it is a swish, low it is a thud. */
function noise(a: Out, { freq, to, filter = "bandpass", q = 1, at = 0, dur = 0.15, gain = 0.2 }: NoiseOpts) {
  const t = a.ctx.currentTime + at;
  if (!noiseBuffer) {
    noiseBuffer = a.ctx.createBuffer(1, a.ctx.sampleRate, a.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = a.ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  src.connect(f).connect(envelope(a, t, dur, gain));
  src.start(t);
  src.stop(t + dur + 0.05);
}

const notes = (a: Out, freqs: number[], step: number, opts: Omit<ToneOpts, "freq" | "at">, at = 0) =>
  freqs.forEach((freq, i) => tone(a, { ...opts, freq, at: at + i * step }));

const RECIPES: Record<Sound, (a: Out, at: number) => void> = {
  // a card sliding off the library
  draw: (a, at) => noise(a, { freq: 1800, to: 4800, q: 0.8, dur: 0.13, gain: 0.22, at }),
  shuffle: (a, at) => {
    for (let i = 0; i < 7; i++) noise(a, { freq: 2600 + (i % 3) * 500, q: 1.2, dur: 0.05, gain: 0.16, at: at + i * 0.045 });
  },
  land: (a, at) => {
    tone(a, { freq: 120, to: 50, dur: 0.24, gain: 0.45, at });
    noise(a, { freq: 500, filter: "lowpass", dur: 0.09, gain: 0.18, at });
  },
  creature: (a, at) => {
    tone(a, { freq: 190, to: 70, type: "triangle", dur: 0.28, gain: 0.4, at });
    noise(a, { freq: 900, filter: "lowpass", dur: 0.12, gain: 0.2, at });
    notes(a, [330, 494], 0.06, { dur: 0.35, gain: 0.07 }, at + 0.04);
  },
  // a shimmer rising
  cast: (a, at) => {
    notes(a, [660, 880, 1320], 0.05, { dur: 0.38, gain: 0.1 }, at);
    noise(a, { freq: 6000, filter: "highpass", dur: 0.32, gain: 0.05, at });
  },
  ability: (a, at) => tone(a, { freq: 520, to: 820, dur: 0.14, gain: 0.14, at }),
  // war drums
  attack: (a, at) => {
    tone(a, { freq: 95, to: 60, type: "triangle", dur: 0.22, gain: 0.5, at });
    tone(a, { freq: 110, to: 65, type: "triangle", dur: 0.3, gain: 0.55, at: at + 0.16 });
    noise(a, { freq: 300, filter: "lowpass", dur: 0.12, gain: 0.25, at: at + 0.16 });
  },
  // the whoosh of a creature charging
  charge: (a, at) => noise(a, { freq: 350, to: 1900, q: 0.7, dur: 0.34, gain: 0.26, at }),
  block: (a, at) => {
    tone(a, { freq: 260, to: 190, type: "triangle", dur: 0.16, gain: 0.25, at });
    noise(a, { freq: 700, filter: "lowpass", dur: 0.08, gain: 0.2, at });
  },
  // a punch landing on the player
  hit: (a, at) => {
    tone(a, { freq: 170, to: 40, dur: 0.26, gain: 0.6, at });
    noise(a, { freq: 1400, to: 200, filter: "lowpass", dur: 0.16, gain: 0.4, at });
  },
  // two creatures crashing into each other
  clash: (a, at) => {
    noise(a, { freq: 3200, q: 7, dur: 0.22, gain: 0.3, at });
    notes(a, [587, 831], 0, { type: "triangle", dur: 0.26, gain: 0.08 }, at);
    tone(a, { freq: 150, to: 50, dur: 0.2, gain: 0.4, at });
  },
  die: (a, at) => {
    tone(a, { freq: 300, to: 55, type: "sawtooth", dur: 0.5, gain: 0.08, at });
    noise(a, { freq: 700, to: 90, filter: "lowpass", dur: 0.42, gain: 0.18, at });
  },
  lifeGain: (a, at) => notes(a, [784, 988, 1175, 1568], 0.06, { dur: 0.32, gain: 0.1 }, at),
  lifeLoss: (a, at) => tone(a, { freq: 230, to: 170, dur: 0.26, gain: 0.2, at }),
  // a crackle of fire
  burn: (a, at) => {
    noise(a, { freq: 1000, to: 280, q: 1.5, dur: 0.32, gain: 0.3, at });
    tone(a, { freq: 210, to: 80, type: "sawtooth", dur: 0.22, gain: 0.06, at });
  },
  counter: (a, at) => {
    notes(a, [620, 310], 0.09, { type: "square", dur: 0.16, gain: 0.05 }, at);
    noise(a, { freq: 2000, to: 500, dur: 0.2, gain: 0.12, at });
  },
  discard: (a, at) => noise(a, { freq: 1300, to: 600, dur: 0.16, gain: 0.2, at }),
  // a bell: your turn
  turn: (a, at) => {
    tone(a, { freq: 880, dur: 0.9, gain: 0.12, at });
    tone(a, { freq: 1320, dur: 0.9, gain: 0.1, at: at + 0.14 });
  },
  win: (a, at) => {
    notes(a, [523, 659, 784], 0.12, { type: "triangle", dur: 0.3, gain: 0.18 }, at);
    tone(a, { freq: 1047, type: "triangle", dur: 0.9, gain: 0.2, at: at + 0.36 });
  },
  lose: (a, at) => notes(a, [392, 330, 262], 0.22, { type: "triangle", dur: 0.55, gain: 0.15 }, at),
};

/** Plays `sound`, `at` seconds from now. Does nothing when sound is off or the browser has no audio. */
export function playSound(sound: Sound, at = 0): void {
  const a = audio();
  if (!a) return;
  try {
    RECIPES[sound](a, at);
  } catch {
    // a sound that fails to play should never interrupt the game
  }
}
