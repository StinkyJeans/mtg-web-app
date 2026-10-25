import { useCallback, useSyncExternalStore } from "react";

const KEY = "mtg-cursor";
const EVENT = "mtg-cursor-change";

/** The play screen's custom cursor is on unless the player turned it off. */
function isOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** Whether the custom cursor is on, and a way to switch it. The choice is kept in this browser. */
export function useCustomCursor(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    isOn,
    () => true,
  );
  const set = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "on" : "off");
    } catch {
      // ignore: the choice just won't be remembered
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [on, set];
}
