"use client";

import { useSyncExternalStore } from "react";
import type { CardDef } from "@mtg/engine";
import type { Inspected } from "./CardDetail";

// What the mouse is over, kept outside the play screen: moving across the cards changes this several times a second, and it
// should only redraw the two small panels that show it, not the whole board.

/** How wide the big card is. */
export const PREVIEW_W = 320;

export interface Preview {
  def: CardDef;
  /** The card the mouse is over: if it leaves the page (a creature moved to the attack zone) no mouse-leave ever arrives. */
  el: HTMLElement;
  left: number;
  top: number;
}

function store<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    use: () =>
      useSyncExternalStore(
        (l) => (listeners.add(l), () => void listeners.delete(l)),
        () => value,
        () => initial,
      ),
  };
}

const inspected = store<Inspected | null>(null);
const preview = store<Preview | null>(null);

export const setInspected = inspected.set;
export const useInspected = inspected.use;
export const setPreview = preview.set;
export const usePreview = preview.use;
