import { useCallback, useSyncExternalStore } from "react";

const KEY = "mtg-choose-lands";
const EVENT = "mtg-choose-lands-change";

const isOn = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};

/** "Choose which lands to pay with": off unless the player turned it on. The choice is kept in this browser. */
export function useChooseLands(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    isOn,
    () => false,
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
