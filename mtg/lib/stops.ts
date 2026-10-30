import { useCallback, useSyncExternalStore } from "react";

const KEY = "mtg-stops";
const EVENT = "mtg-stops-change";

export interface Stops {
  attack: boolean;
  spell: boolean;
  block: boolean;
}

const DEFAULT: Stops = { attack: true, spell: true, block: true };
let cache: { raw: string | null; value: Stops } = { raw: null, value: DEFAULT };

function read(): Stops {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // (no storage: the defaults)
  }
  if (cache.raw === raw && cache.value) return cache.value;
  let value = DEFAULT;
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<Stops>;
      value = { attack: p.attack !== false, spell: p.spell !== false, block: p.block !== false };
    } catch {
      // (a damaged entry: the defaults)
    }
  }
  cache = { raw, value };
  return value;
}

/** Priority stops: stop and wait for the player to pass, when they are attacked, when the opponent casts a spell, and after blockers. All on unless the player turned one off. */
export function useStops(): [Stops, (key: keyof Stops, on: boolean) => void] {
  const stops = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    read,
    () => DEFAULT,
  );
  const set = useCallback((key: keyof Stops, on: boolean) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), [key]: on }));
    } catch {
      // (the choice is not remembered)
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [stops, set];
}
