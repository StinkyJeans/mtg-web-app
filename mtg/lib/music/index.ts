import { audioContext } from "../sound";
import { compileTrack, stepSeconds } from "./theory";
import type { Hit, Track } from "./theory";
import { DEFAULT_TRACK, TRACKS, trackById } from "./tracks";
import { crackle, makeBus, playHit } from "./voices";
import type { Bus } from "./voices";

export { TRACKS };
export type { Track };

const KEY = "mtg-music";
const TRACK_KEY = "mtg-music-track";
const VOLUME_KEY = "mtg-music-volume";
const DEFAULT_VOLUME = 0.7;
const LOOKAHEAD = 0.3; // seconds of music scheduled ahead of time
/** Fired on window when the music starts, stops or changes, so the menu can follow. */
export const MUSIC_EVENT = "mtg-music";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked, or running on the server
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: the setting just won't be remembered
  }
};
const changed = () => typeof window !== "undefined" && window.dispatchEvent(new Event(MUSIC_EVENT));

/** The background music is on unless the player turns it off in the music menu. */
export const musicEnabled = () => read(KEY) !== "off";
export const musicTrack = (): Track => trackById(read(TRACK_KEY) ?? DEFAULT_TRACK);
export function musicVolume(): number {
  const v = Number(read(VOLUME_KEY));
  return read(VOLUME_KEY) !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
}

export function setMusicEnabled(on: boolean): void {
  write(KEY, on ? "on" : "off");
  if (on) startMusic();
  else stopMusic();
}

/** Switches to `id` and plays it (turning the music on if it was off). */
export function setMusicTrack(id: string): void {
  write(TRACK_KEY, trackById(id).id);
  write(KEY, "on");
  stopMusic();
  startMusic();
}

export function setMusicVolume(v: number): void {
  write(VOLUME_KEY, String(v));
  if (now) now.bus.out.gain.setTargetAtTime(now.track.volume * v, now.bus.ctx.currentTime, 0.05);
  changed();
}

const compiled = new Map<string, Hit[][]>();
let now: { track: Track; song: Hit[][]; bus: Bus; step: number; next: number } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

/** The track playing right now, or null. */
export const playingTrack = () => now?.track ?? null;

/** Schedules the next moment of music. Pauses while the tab is hidden, where timers are slowed and the tune would stutter. */
function tick() {
  if (!now || document.hidden) return;
  const { track, song, bus } = now;
  const step = stepSeconds(track);
  const t0 = bus.ctx.currentTime;
  if (now.next < t0) now.next = t0 + 0.05; // just started, or back from a hidden tab
  while (now.next < t0 + LOOKAHEAD) {
    const i = now.step % song.length;
    const t = now.next + (i % 2 === 1 ? track.swing * step : 0);
    for (const hit of song[i]) playHit(bus, hit, t);
    if (track.crackle && Math.random() < 0.7) crackle(bus, t + Math.random() * step);
    now.step++;
    now.next += step;
  }
}

/** Starts the chosen track from the top, looping. Browsers only allow it once the page has been clicked. */
export function startMusic(): void {
  if (timer || !musicEnabled()) return;
  const c = audioContext();
  if (!c) return;
  const track = musicTrack();
  let song = compiled.get(track.id);
  if (!song) {
    song = compileTrack(track);
    compiled.set(track.id, song);
  }
  now = { track, song, bus: makeBus(c, track, track.volume * musicVolume()), step: 0, next: 0 };
  timer = setInterval(tick, 60);
  tick();
  changed();
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  const old = now?.bus;
  now = null;
  changed();
  if (!old) return;
  // The notes already scheduled fade out instead of cutting off.
  const t = old.ctx.currentTime;
  old.out.gain.setValueAtTime(old.out.gain.value, t);
  old.out.gain.linearRampToValueAtTime(0, t + 0.4);
  setTimeout(() => old.out.disconnect(), 600);
}
