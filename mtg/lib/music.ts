"use client";

import { useSyncExternalStore } from "react";

// The dashboard's background music: one small store shared by the player (on the dashboard) and the control in the top bar.
// The volume and the mute switch are remembered on this device.

const KEY = "mtg-music";
export const DEFAULT_VOLUME = 0.2;

export interface MusicState {
  /** 0 to 1. */
  volume: number;
  muted: boolean;
  /** The dashboard (the only page with music) is open: the control in the top bar shows only then. */
  active: boolean;
  /** The browser won't start sound until the player clicks something. */
  blocked: boolean;
}

const server: MusicState = { volume: DEFAULT_VOLUME, muted: false, active: false, blocked: false };
let state: MusicState | null = null;
const listeners = new Set<() => void>();

function load(): MusicState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { volume?: number; muted?: boolean } | null;
    const volume = typeof saved?.volume === "number" && saved.volume >= 0 && saved.volume <= 1 ? saved.volume : DEFAULT_VOLUME;
    return { volume, muted: saved?.muted === true, active: false, blocked: false };
  } catch {
    return { ...server }; // storage blocked: the defaults, not remembered
  }
}

const current = () => (state ??= load());

function set(patch: Partial<MusicState>) {
  state = { ...current(), ...patch };
  if ("volume" in patch || "muted" in patch) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: state.volume, muted: state.muted }));
    } catch {
      // not remembered
    }
  }
  listeners.forEach((l) => l());
}

export const setVolume = (volume: number) => set({ volume: Math.min(1, Math.max(0, volume)), ...(volume > 0 ? { muted: false } : {}) }); // moving the slider up un-mutes
export const setMuted = (muted: boolean) => set({ muted });
export const setMusicActive = (active: boolean) => set({ active });
export const setMusicBlocked = (blocked: boolean) => set({ blocked });

export function useMusic(): MusicState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    current,
    () => server,
  );
}
