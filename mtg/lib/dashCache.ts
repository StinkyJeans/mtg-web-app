"use client";

import { useSyncExternalStore } from "react";

// What the dashboard shows first (your profile, your friends) is kept on this device, so the next visit paints it at once
// while the fresh copy loads. It is the same data the pages fetch anyway: it is only shown sooner. It is cleared when the
// player signs out, so nobody sees the last person's name on a shared computer.

const PREFIX = "mtg-cache:";
const EVENT = "mtg-cache";

const parsed = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null; // storage blocked: nothing is remembered
  }
}

/** The kept copy, parsed once per change so React sees the same object until the data really changes. */
function snapshot<T>(key: string): T | null {
  const raw = readRaw(key);
  const hit = parsed.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null;
  let value: unknown = null;
  if (raw) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  parsed.set(key, { raw, value });
  return value as T | null;
}

const subscribe = (callback: () => void) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // another tab changed it
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

/** The copy kept on this device, or null (the first visit, or after signing out). The server always renders null. */
export function useCached<T>(key: string): T | null {
  return useSyncExternalStore(subscribe, () => snapshot<T>(key), () => null);
}

/** Keeps `value` for the next visit. Nothing happens when it is the same as what is already kept. */
export function writeCached(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    if (readRaw(key) === raw) return;
    localStorage.setItem(PREFIX + key, raw);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage full or blocked: the page just loads the slower way next time
  }
}

/** Forgets everything kept (on sign out or sign in). */
export function clearCached(): void {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // nothing to forget
  }
}
