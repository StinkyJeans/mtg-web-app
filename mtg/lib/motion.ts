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

const SPEED_KEY = "mtg-animation-speed";
/** How fast the game's animations play: the player's choice, for those who know what is coming and do not want to wait for it. */
export const SPEEDS = [
  { id: "normal", label: "Normal", rate: 1 },
  { id: "fast", label: "Fast", rate: 1.6 },
  { id: "faster", label: "Faster", rate: 2.5 },
] as const;
export type SpeedId = (typeof SPEEDS)[number]["id"];

let rate = 1;
function readSpeed(): SpeedId {
  try {
    const v = localStorage.getItem(SPEED_KEY);
    return SPEEDS.some((s) => s.id === v) ? (v as SpeedId) : "normal";
  } catch {
    return "normal";
  }
}

export const animationSpeed = (): SpeedId => readSpeed();

export function setAnimationSpeed(id: SpeedId): void {
  rate = SPEEDS.find((s) => s.id === id)?.rate ?? 1;
  try {
    localStorage.setItem(SPEED_KEY, id);
  } catch {
    // ignore: the choice just won't be remembered
  }
}

/** A pause in an animation sequence, shortened by the speed: use it for `setTimeout`-style waits. */
export const scaled = (ms: number) => ms / rate;

// Every animation the game plays goes through `Element.animate`: playing them all at the chosen rate (delays included) changes the speed of the
// whole game in one place, and what waits for an animation to finish simply waits less.
if (typeof window !== "undefined" && typeof Element !== "undefined" && !(Element.prototype.animate as { sped?: true }).sped) {
  rate = SPEEDS.find((s) => s.id === readSpeed())?.rate ?? 1;
  const original = Element.prototype.animate;
  const sped = function (this: Element, ...args: Parameters<Element["animate"]>) {
    const a = original.apply(this, args);
    if (rate !== 1) a.playbackRate = rate;
    return a;
  } as typeof original & { sped?: true };
  sped.sped = true;
  Element.prototype.animate = sped;
}
