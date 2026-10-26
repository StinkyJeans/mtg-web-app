// Turns a track written as text (notes, chord symbols, drum patterns) into what sounds on each step of the loop.

export type LeadVoice = "flute" | "musicbox" | "brass" | "keys";
export type BassVoice = "triangle" | "funk" | "sub";
export type ChordVoice = "stab" | "pad" | "rhodes" | "clav";
export type DrumVoice = "kick" | "snare" | "hat";
export type Voice = LeadVoice | BassVoice | ChordVoice | DrumVoice | "wind";

export interface Hit {
  voice: Voice;
  freq: number;
  /** Seconds. */
  dur: number;
  /** A ghost note: played quietly. */
  soft?: boolean;
}

export interface Track {
  id: string;
  name: string;
  /** One line for the music menu. */
  blurb: string;
  bpm: number;
  /** Steps a beat: 2 writes in eighth notes, 4 in sixteenths. */
  grid: 2 | 4;
  /** How late the offbeat steps come, as a part of a step: the shuffle. */
  swing: number;
  /** Semitones the whole track is moved by. */
  transpose: number;
  /** Semitones the melody alone is moved by. */
  leadShift?: number;
  volume: number;
  /** A bar each, one token a step: a note ("C5", "F#4") starts there, "-" holds it, "." is silence. */
  melody: string[];
  /** A chord a bar ("Am", "E7b9", "Fmaj9"); "Dm|G" is two, half a bar each. */
  harmony: string[];
  lead: LeadVoice;
  /** One bar, played under every chord: R the root, f the fifth below, F the fifth above, O the octave, 7 the flat seventh. `base`: the lowest MIDI note the root may be. */
  bass: { voice: BassVoice; pattern: string; base: number };
  /** One bar: "x" plays the chord, "-" holds it. `base`: the lowest MIDI note its root may be. */
  chords: { voice: ChordVoice; pattern: string; base: number };
  /** One bar each, a character a step: "x" a hit, "o" a soft one. */
  drums: Partial<Record<DrumVoice, string>>;
  /** An echo on the lead. */
  echo?: { steps: number; feedback: number; wet: number };
  /** Everything through a low-pass filter at this frequency: the warm, muffled lo-fi sound. */
  lowpass?: number;
  /** Vinyl crackle. */
  crackle?: boolean;
  /** A slow gust of wind every two bars. */
  wind?: boolean;
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const accidental = (a: string | undefined) => (a === "#" ? 1 : a === "b" ? -1 : 0);

/** "A4" is 69, middle C ("C4") is 60. */
export function noteMidi(note: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) throw new Error(`Not a note: ${note}`);
  return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + accidental(m[2]);
}

const QUALITY: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "9": [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  "7b9": [0, 4, 7, 10, 13],
  dim: [0, 3, 6],
};

/** "Em7" is the pitch class of E and the steps of a minor seventh chord above it. */
export function parseChord(symbol: string): { root: number; intervals: number[] } {
  const m = /^([A-G])(#|b)?(.*)$/.exec(symbol);
  const intervals = m ? QUALITY[m[3]] : undefined;
  if (!m || !intervals) throw new Error(`Not a chord: ${symbol}`);
  return { root: (SEMITONE[m[1]] + accidental(m[2]) + 12) % 12, intervals };
}

const BASS_STEP: Record<string, number> = { R: 0, f: -5, F: 7, O: 12, "7": 10 };

/** The lowest MIDI note at or above `base` with this pitch class. */
const above = (pitchClass: number, base: number) => base + ((((pitchClass - base) % 12) + 12) % 12);

/** Where each note of a bar starts, and how many steps it lasts (itself and the "-" after it). */
function runs(tokens: string[]): { at: number; token: string; len: number }[] {
  const out: { at: number; token: string; len: number }[] = [];
  tokens.forEach((token, at) => {
    if (token === "-" || token === ".") return;
    let len = 1;
    while (tokens[at + len] === "-") len++;
    out.push({ at, token, len });
  });
  return out;
}

function bar(text: string, per: number, what: string): string[] {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length !== per) throw new Error(`${what} has ${tokens.length} steps, not ${per}: "${text}"`);
  return tokens;
}

export const stepSeconds = (t: Track) => 60 / t.bpm / t.grid;

/** The whole loop as what sounds on each step. Throws on a bar of the wrong length or an unknown note or chord. */
export function compileTrack(t: Track): Hit[][] {
  const per = t.grid * 4;
  const step = stepSeconds(t);
  if (t.melody.length !== t.harmony.length) throw new Error(`${t.name}: ${t.melody.length} bars of melody, ${t.harmony.length} of chords`);
  const freq = (midi: number) => 440 * 2 ** ((midi + t.transpose - 69) / 12);
  const steps: Hit[][] = Array.from({ length: t.harmony.length * per }, () => []);

  const melody = t.melody.flatMap((b, i) => bar(b, per, `${t.name} melody bar ${i + 1}`));
  for (const r of runs(melody)) steps[r.at].push({ voice: t.lead, freq: freq(noteMidi(r.token) + (t.leadShift ?? 0)), dur: r.len * step });

  const bass = runs(bar(t.bass.pattern, per, `${t.name} bass`));
  const chords = runs(bar(t.chords.pattern, per, `${t.name} chords`));
  for (const [voice, pattern] of Object.entries(t.drums)) {
    if (pattern.length !== per) throw new Error(`${t.name} ${voice} has ${pattern.length} steps, not ${per}`);
  }
  t.harmony.forEach((symbol, b) => {
    const halves = symbol.split("|").map(parseChord);
    const chordAt = (s: number) => halves[halves.length === 1 || s < per / 2 ? 0 : 1];
    const at = b * per;
    for (const r of bass) {
      const step0 = BASS_STEP[r.token];
      if (step0 === undefined) throw new Error(`${t.name} bass: unknown step "${r.token}"`);
      steps[at + r.at].push({ voice: t.bass.voice, freq: freq(above(chordAt(r.at).root, t.bass.base) + step0), dur: r.len * step });
    }
    for (const r of chords) {
      const c = chordAt(r.at);
      const root = above(c.root, t.chords.base);
      for (const i of c.intervals) steps[at + r.at].push({ voice: t.chords.voice, freq: freq(root + i), dur: r.len * step });
    }
    for (const [voice, pattern] of Object.entries(t.drums) as [DrumVoice, string][]) {
      [...pattern].forEach((ch, s) => (ch === "x" || ch === "o") && steps[at + s].push({ voice, freq: 0, dur: 0, ...(ch === "o" ? { soft: true } : {}) }));
    }
    if (t.wind && b % 2 === 0) steps[at].push({ voice: "wind", freq: 0, dur: per * 2 * step });
  });
  return steps;
}
