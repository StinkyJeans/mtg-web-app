"use client";

import { useSyncExternalStore } from "react";

/** Whether a media query matches right now, and again whenever it changes (false until the page is in the browser). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The one-column play screen: phones and small tablets (below Tailwind's `lg`). */
export const useStacked = () => useMedia("(max-width: 1023px)");
/** A screen with no mouse over it: there is no hovering, so nothing may depend on it. */
export const useTouch = () => useMedia("(hover: none)");
