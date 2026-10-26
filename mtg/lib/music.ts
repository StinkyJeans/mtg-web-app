import { audioContext, noiseBuffer } from "./sound";

const KEY = "mtg-music";

/** The background music is on unless the player turns it off with the switch in the top bar. */
export function musicEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true; // storage blocked, or running on the server
  }
}

export function setMusicEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore: the switch just won't be remembered
  }
  if (on) startMusic();
  else stopMusic();
}

// An original, cheerful town tune: a flute over an oom-pah bass, with a little shuffle. Synthesized, like the sound effects.
const BPM = 112;
const STEP = 60 / BPM / 2; // one eighth note, in seconds
const SWING = STEP * 0.16; // the offbeat eighths come a little late
const TRANSPOSE = -7; // written in C major, played in F
const LOOKAHEAD = 0.3; // seconds of music scheduled ahead of time
const VOLUME = 0.22;

// Eight eighth notes a bar: a note starts there, "-" holds it, "." is silence.
const A = [
  "E5 - G5 - C6 - B5 A5",
  "A5 - E5 - C5 - . D5",
  "F5 - A5 - C6 - A5 F5",
  "G5 - - - D5 E5 F5 D5",
  "E5 - G5 - C6 - D6 E6",
  "D6 C6 A5 - E5 - C5 D5",
  "F5 - A5 G5 - - B4 D5",
];
const B = [
  "A5 - - G5 F5 - C5 -",
  "D5 - G5 - B5 - A5 G5",
  "G5 - - E5 B4 - E5 G5",
  "A5 - - - C6 - B5 A5",
  "F5 - A5 - D6 - C6 A5",
  "B5 - G5 - D5 - G5 B5",
  "C6 - G5 E5 F5 - A5 C6",
  "D6 - - - B5 - G5 -",
];
const BRIDGE = [
  "C6 - B5 A5 E5 - - .",
  "F5 - A5 C6 - - A5 -",
  "G5 - E5 C5 E5 - G5 -",
  "D5 - - - - - . .",
  "C6 - B5 A5 E5 - A5 B5",
  "C6 - A5 F5 - - C6 D6",
  "F6 - E6 D6 A5 - D6 -",
  "B5 - - - G5 - - -",
];
const MELODY = [...A, "C5 - E5 G5 - - . .", ...B, ...A, "C5 - - - G4 - . .", ...BRIDGE];

// One chord a bar; "Dm|G" is two, half a bar each.
const A_CHORDS = ["C", "Am", "F", "G", "C", "Am", "Dm|G", "C"];
const HARMONY = [...A_CHORDS, "F", "G", "Em", "Am", "Dm", "G", "C|F", "G", ...A_CHORDS, "Am", "F", "C", "G", "Am", "F", "Dm", "G"];

const CHORDS: Record<string, { bass: [string, string]; notes: string[] }> = {
  C: { bass: ["C4", "G3"], notes: ["E4", "G4", "C5"] },
  Am: { bass: ["A3", "E3"], notes: ["E4", "A4", "C5"] },
  F: { bass: ["F3", "C4"], notes: ["F4", "A4", "C5"] },
  G: { bass: ["G3", "D3"], notes: ["D4", "G4", "B4"] },
  Dm: { bass: ["D3", "A3"], notes: ["D4", "F4", "A4"] },
  Em: { bass: ["E3", "B3"], notes: ["E4", "G4", "B4"] },
};

type Voice = "lead" | "bass" | "chord" | "kick" | "hat";
export interface Hit {
  voice: Voice;
  freq: number;
  dur: number;
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" is 440 Hz, before the tune is moved to its key. */
export function freqOf(note: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) throw new Error(`Not a note: ${note}`);
  const midi = 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + TRANSPOSE;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** The whole tune as what sounds on each eighth note. */
export function compileSong(): Hit[][] {
  const tokens = MELODY.join(" ").split(/\s+/);
  const steps: Hit[][] = tokens.map(() => []);
  tokens.forEach((t, i) => {
    if (t === "-" || t === ".") return;
    let len = 1;
    while (tokens[i + len] === "-") len++;
    steps[i].push({ voice: "lead", freq: freqOf(t), dur: len * STEP });
  });
  HARMONY.forEach((bar, b) => {
    const halves = bar.split("|");
    for (let h = 0; h < 2; h++) {
      const chord = CHORDS[halves[halves.length === 1 ? 0 : h]];
      const at = b * 8 + h * 4;
      // oom on the beat (root, then fifth), pah on the offbeat
      steps[at].push({ voice: "bass", freq: freqOf(chord.bass[halves.length === 1 ? h : 0]), dur: STEP * 2 });
      steps[at].push({ voice: "kick", freq: 0, dur: 0 });
      for (const n of chord.notes) steps[at + 2].push({ voice: "chord", freq: freqOf(n), dur: 0.2 });
    }
  });
  steps.forEach((s, i) => i % 2 === 1 && s.push({ voice: "hat", freq: 0, dur: 0 }));
  return steps;
}

interface Bus {
  ctx: AudioContext;
  out: GainNode;
  /** The flute goes through a soft echo. */
  lead: GainNode;
}

function makeBus(c: AudioContext): Bus {
  const out = c.createGain();
  out.gain.value = VOLUME;
  out.connect(c.destination);
  const lead = c.createGain();
  lead.connect(out);
  const delay = c.createDelay(1);
  delay.delayTime.value = STEP * 3;
  const feedback = c.createGain();
  feedback.gain.value = 0.28;
  const wet = c.createGain();
  wet.gain.value = 0.22;
  lead.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);
  return { ctx: c, out, lead };
}

function envelope(c: AudioContext, t: number, peak: number, end: number, to: AudioNode): GainNode {
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  env.connect(to);
  return env;
}

/** A breathy flute: a triangle with a soft octave above, and vibrato that grows as the note is held. */
function flute(bus: Bus, t: number, freq: number, dur: number) {
  const c = bus.ctx;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.13, t + 0.03);
  env.gain.exponentialRampToValueAtTime(0.09, t + dur);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  env.connect(bus.lead);
  const body = c.createOscillator();
  body.type = "triangle";
  body.frequency.value = freq;
  body.connect(env);
  const air = c.createOscillator();
  air.frequency.value = freq * 2;
  const airGain = c.createGain();
  airGain.gain.value = 0.22;
  air.connect(airGain).connect(env);
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.5;
  const depth = c.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.007, t + Math.min(0.35, dur));
  lfo.connect(depth).connect(body.frequency);
  for (const o of [body, air, lfo]) {
    o.start(t);
    o.stop(t + dur + 0.15);
  }
}

function play(bus: Bus, hit: Hit, t: number) {
  const c = bus.ctx;
  if (hit.voice === "lead") return flute(bus, t, hit.freq, hit.dur);
  if (hit.voice === "hat") {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    src.connect(f).connect(envelope(c, t, 0.025, t + 0.035, bus.out));
    src.start(t);
    src.stop(t + 0.06);
    return;
  }
  const osc = c.createOscillator();
  if (hit.voice === "kick") {
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    osc.connect(envelope(c, t, 0.22, t + 0.14, bus.out));
    osc.start(t);
    osc.stop(t + 0.16);
    return;
  }
  osc.frequency.value = hit.freq;
  if (hit.voice === "bass") {
    osc.type = "triangle";
    osc.connect(envelope(c, t, 0.3, t + hit.dur, bus.out));
  } else {
    osc.type = "square";
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    osc.connect(f).connect(envelope(c, t, 0.035, t + hit.dur, bus.out));
  }
  osc.start(t);
  osc.stop(t + hit.dur + 0.05);
}

let song: Hit[][] | null = null;
let bus: Bus | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;

/** Schedules the next moment of music. Pauses while the tab is hidden, where timers are slowed and the tune would stutter. */
function tick() {
  if (!bus || !song || document.hidden) return;
  const now = bus.ctx.currentTime;
  if (nextTime < now) nextTime = now + 0.05; // just started, or back from a hidden tab
  while (nextTime < now + LOOKAHEAD) {
    const i = step % song.length;
    const t = nextTime + (i % 2 === 1 ? SWING : 0);
    for (const hit of song[i]) play(bus, hit, t);
    step++;
    nextTime += STEP;
  }
}

/** Starts the tune from the top, looping. Browsers only allow it once the page has been clicked. */
export function startMusic(): void {
  if (timer || !musicEnabled()) return;
  const c = audioContext();
  if (!c) return;
  song ??= compileSong();
  bus = makeBus(c);
  step = 0;
  nextTime = 0;
  timer = setInterval(tick, 60);
  tick();
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  const old = bus;
  bus = null;
  if (!old) return;
  // The notes already scheduled fade out instead of cutting off.
  const t = old.ctx.currentTime;
  old.out.gain.setValueAtTime(old.out.gain.value, t);
  old.out.gain.linearRampToValueAtTime(0, t + 0.4);
  setTimeout(() => old.out.disconnect(), 600);
}
