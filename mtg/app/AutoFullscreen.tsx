"use client";

import { useEffect } from "react";

/**
 * On a phone the whole app fills the screen (no address bar). Browsers only allow full screen right after a tap, so it is asked for on the
 * first touch of each visit; if the player leaves full screen themselves it is not forced back. (iPhones do not allow it for web pages:
 * "Add to Home Screen" is how they get the same thing.)
 */
export default function AutoFullscreen() {
  useEffect(() => {
    if (!matchMedia("(hover: none) and (pointer: coarse)").matches || !document.fullscreenEnabled || document.fullscreenElement) return;
    const go = () => {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
      window.removeEventListener("pointerup", go, true);
    };
    window.addEventListener("pointerup", go, true);
    return () => window.removeEventListener("pointerup", go, true);
  }, []);
  return null;
}
