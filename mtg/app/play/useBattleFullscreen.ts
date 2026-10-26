"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const supported = () => typeof document !== "undefined" && document.fullscreenEnabled === true;
const enter = () => document.documentElement.requestFullscreen({ navigationUI: "hide" });

/**
 * Takes the page full screen while a battle is on, on any screen size, and leaves it when the player goes elsewhere.
 * Browsers only allow it right after a click or key press, so it is tried at once (the click that started the match counts)
 * and, if the browser says no, on the first click or key press after that. Pressing Esc leaves full screen for good: it is
 * not forced back, but `useFullscreen` gives a button to go in again.
 */
export function useBattleFullscreen(active: boolean): void {
  const leftByPlayer = useRef(false);
  useEffect(() => {
    if (!active || !supported()) return;
    const retry = () => {
      if (!document.fullscreenElement && !leftByPlayer.current) void enter().catch(() => undefined);
    };
    const onChange = () => {
      if (!document.fullscreenElement) leftByPlayer.current = true;
    };
    document.addEventListener("fullscreenchange", onChange);
    if (!document.fullscreenElement) {
      enter().catch(() => {
        window.addEventListener("pointerdown", retry, { once: true });
        window.addEventListener("keydown", retry, { once: true });
      });
    }
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [active]);
}

/** Is the page full screen right now, and a way to switch (for a button). `available` is false where the browser can't do it. */
export function useFullscreen(): { on: boolean; available: boolean; toggle: () => void } {
  const on = useSyncExternalStore(
    (callback) => {
      document.addEventListener("fullscreenchange", callback);
      return () => document.removeEventListener("fullscreenchange", callback);
    },
    () => document.fullscreenElement !== null,
    () => false,
  );
  const available = useSyncExternalStore(
    () => () => undefined,
    supported,
    () => false,
  );
  return {
    on,
    available,
    toggle: () => void (document.fullscreenElement ? document.exitFullscreen() : enter()).catch(() => undefined),
  };
}
