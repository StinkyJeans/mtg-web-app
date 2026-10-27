import { useEffect, useState } from "react";

const KEY = "mtg-animations";

/**
 * Animations are on unless the player turns them off with the switch in the top bar.
 * The computer's own "reduce motion" setting is deliberately not used here: it silently hid the combat
 * animation for a player who wanted it, with no way to tell why.
 */
export function animationsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true; // storage blocked, or running on the server
  }
}

export function setAnimationsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
    window.dispatchEvent(new Event("mtg-animations")); // the live wallpaper listens for this
  } catch {
    // ignore: the switch just won't be remembered
  }
}

/** Follows the Animations switch in the top bar, for pictures that move by themselves (CSS animations can't read the switch). */
export function useAnimationsOn(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const update = () => setOn(animationsEnabled());
    update();
    window.addEventListener("mtg-animations", update);
    return () => window.removeEventListener("mtg-animations", update);
  }, []);
  return on;
}
