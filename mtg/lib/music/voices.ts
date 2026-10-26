import { noiseBuffer } from "../sound";
import type { Hit, Track } from "./theory";

// The instruments, synthesized with the Web Audio API.

export interface Bus {
  ctx: AudioContext;
  /** Everything ends up here; its gain is the music volume. */
  out: GainNode;
  /** The melody goes in here, through the track's echo. */
  lead: AudioNode;
}

/** The mixer for one track: its volume, its echo on the melody and its low-pass filter. */
export function makeBus(c: AudioContext, track: Track, volume: number): Bus {
  const out = c.createGain();
  out.gain.value = volume;
  if (track.lowpass) {
    const warm = c.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = track.lowpass;
    out.connect(warm).connect(c.destination);
  } else {
    out.connect(c.destination);
  }
  const lead = c.createGain();
  lead.connect(out);
  if (track.echo) {
    const delay = c.createDelay(2);
    delay.delayTime.value = (60 / track.bpm / track.grid) * track.echo.steps;
    const feedback = c.createGain();
    feedback.gain.value = track.echo.feedback;
    const wet = c.createGain();
    wet.gain.value = track.echo.wet;
    lead.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(out);
  }
  return { ctx: c, out, lead };
}

/** A quick rise to `peak`, then an exponential fade to silence by `end`. */
function env(c: AudioContext, t: number, attack: number, peak: number, end: number, to: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, t + attack + 0.01));
  g.connect(to);
  return g;
}

/** Like env, but held near `peak` until `hold` and then released over `release` seconds. */
function held(c: AudioContext, t: number, attack: number, peak: number, hold: number, release: number, to: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(peak * 0.7, Math.max(hold, t + attack + 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, Math.max(hold, t + attack + 0.01) + release);
  g.connect(to);
  return g;
}

function osc(c: AudioContext, type: OscillatorType, freq: number, t: number, stop: number, to: AudioNode, detune = 0): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(to);
  o.start(t);
  o.stop(stop);
  return o;
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q: number, to: AudioNode): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(to);
  return f;
}

function noise(c: AudioContext, t: number, dur: number, to: AudioNode) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  src.connect(to);
  src.start(t);
  src.stop(t + dur + 0.05);
}

type Play = (b: Bus, t: number, h: Hit) => void;

const VOICES: Record<Hit["voice"], Play> = {
  // a breathy flute: a triangle with a soft octave above, and vibrato that grows as the note is held
  flute: ({ ctx: c, lead }, t, h) => {
    const g = held(c, t, 0.03, 0.13, t + h.dur, 0.12, lead);
    const stop = t + h.dur + 0.15;
    const body = osc(c, "triangle", h.freq, t, stop, g);
    const air = c.createGain();
    air.gain.value = 0.22;
    air.connect(g);
    osc(c, "sine", h.freq * 2, t, stop, air);
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(h.freq * 0.007, t + Math.min(0.35, h.dur));
    depth.connect(body.frequency);
    osc(c, "sine", 5.5, t, stop, depth);
  },
  // a music box tine: it rings on by itself, whatever the note's length
  musicbox: ({ ctx: c, lead }, t, h) => {
    for (const [mult, peak] of [[1, 0.08], [3, 0.012], [5.4, 0.006]]) {
      const end = t + 1.8 / Math.sqrt(mult);
      osc(c, "sine", h.freq * mult, t, end + 0.05, env(c, t, 0.004, peak, end, lead));
    }
  },
  // two detuned saws through a filter that opens on the attack
  brass: ({ ctx: c, lead }, t, h) => {
    const g = held(c, t, 0.02, 0.06, t + h.dur, 0.08, lead);
    const f = filter(c, "lowpass", 500, 3, g);
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2800, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(1200, t + Math.max(h.dur, 0.06));
    const stop = t + h.dur + 0.12;
    osc(c, "sawtooth", h.freq, t, stop, f, -6);
    osc(c, "sawtooth", h.freq, t, stop, f, 6);
  },
  // soft keys: a sine with a little bell on top
  keys: ({ ctx: c, lead }, t, h) => {
    const end = t + Math.max(h.dur, 0.5) + 0.4;
    osc(c, "sine", h.freq, t, end + 0.05, env(c, t, 0.005, 0.1, end, lead));
    osc(c, "sine", h.freq * 2, t, end + 0.05, env(c, t, 0.005, 0.03, end - 0.3, lead));
  },
  triangle: ({ ctx: c, out }, t, h) => {
    osc(c, "triangle", h.freq, t, t + h.dur + 0.05, env(c, t, 0.01, 0.3, t + h.dur, out));
  },
  // a slap: a resonant filter snapping shut
  funk: ({ ctx: c, out }, t, h) => {
    const end = t + Math.max(h.dur, 0.1) + 0.05;
    const f = filter(c, "lowpass", 2000, 8, env(c, t, 0.004, 0.2, end, out));
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(280, t + 0.14);
    osc(c, "sawtooth", h.freq, t, end + 0.05, f);
  },
  sub: ({ ctx: c, out }, t, h) => {
    osc(c, "sine", h.freq, t, t + h.dur + 0.2, held(c, t, 0.03, 0.26, t + h.dur, 0.15, out));
  },
  stab: ({ ctx: c, out }, t, h) => {
    const end = t + Math.min(h.dur, 0.2);
    osc(c, "square", h.freq, t, end + 0.05, filter(c, "lowpass", 1400, 1, env(c, t, 0.005, 0.035, end, out)));
  },
  // a slow swell that holds the whole chord
  pad: ({ ctx: c, out }, t, h) => {
    const g = held(c, t, 0.7, 0.028, t + h.dur, 1, out);
    const f = filter(c, "lowpass", 1800, 0.7, g);
    const stop = t + h.dur + 1.1;
    osc(c, "triangle", h.freq, t, stop, f, -7);
    osc(c, "sine", h.freq, t, stop, f, 7);
  },
  // an electric piano: a round tone, an octave above it and a quick tine at the attack
  rhodes: ({ ctx: c, out }, t, h) => {
    const g = held(c, t, 0.01, 0.045, t + h.dur, 0.3, out);
    const stop = t + h.dur + 0.35;
    osc(c, "sine", h.freq, t, stop, g);
    const octave = c.createGain();
    octave.gain.value = 0.25;
    octave.connect(g);
    osc(c, "sine", h.freq * 2, t, stop, octave);
    osc(c, "sine", h.freq * 4, t, t + 0.2, env(c, t, 0.003, 0.012, t + 0.15, out));
  },
  clav: ({ ctx: c, out }, t, h) => {
    osc(c, "square", h.freq, t, t + 0.15, filter(c, "bandpass", 1600, 1.5, env(c, t, 0.004, 0.04, t + 0.1, out)));
  },
  kick: ({ ctx: c, out }, t, h) => {
    const o = osc(c, "sine", 130, t, t + 0.16, env(c, t, 0.005, h.soft ? 0.11 : 0.22, t + 0.14, out));
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  },
  snare: ({ ctx: c, out }, t, h) => {
    noise(c, t, 0.16, filter(c, "bandpass", 1800, 0.7, env(c, t, 0.003, h.soft ? 0.045 : 0.14, t + 0.16, out)));
    const o = osc(c, "triangle", 190, t, t + 0.1, env(c, t, 0.003, h.soft ? 0.02 : 0.06, t + 0.08, out));
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  },
  hat: ({ ctx: c, out }, t, h) => {
    noise(c, t, 0.035, filter(c, "highpass", 7000, 0.7, env(c, t, 0.003, h.soft ? 0.012 : 0.025, t + 0.035, out)));
  },
  // a gust of wind that rises and falls over two bars
  wind: ({ ctx: c, out }, t, h) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + h.dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + h.dur);
    g.connect(out);
    const f = filter(c, "bandpass", 280, 5, g);
    f.frequency.setValueAtTime(280, t);
    f.frequency.exponentialRampToValueAtTime(900, t + h.dur / 2);
    f.frequency.exponentialRampToValueAtTime(300, t + h.dur);
    noise(c, t, h.dur, f);
  },
};

export function playHit(bus: Bus, hit: Hit, t: number): void {
  VOICES[hit.voice](bus, t, hit);
}

/** One tiny click of dust on the record. */
export function crackle(bus: Bus, t: number): void {
  const c = bus.ctx;
  noise(c, t, 0.008, filter(c, "highpass", 2500, 0.7, env(c, t, 0.001, 0.015 + Math.random() * 0.035, t + 0.008, bus.out)));
}
