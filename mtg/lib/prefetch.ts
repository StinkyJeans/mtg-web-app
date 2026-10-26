// Doing the work for a click a moment before it happens: when the pointer rests on something (or a finger touches it), what it
// opens starts loading, so by the time the click lands the picture or the data is already here.

const HOVER_MS = 90; // a pointer just passing over something doesn't count

/** Event handlers that call `warm` once the pointer has rested on the element (or it got focus, or a finger touched it). */
export function onIntent(warm: () => void, delay = HOVER_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  return {
    onPointerEnter: () => {
      cancel();
      timer = setTimeout(warm, delay);
    },
    onPointerLeave: cancel,
    onFocus: warm,
    onTouchStart: warm,
  };
}

const requested = new Set<string>();

/** Starts downloading a picture so the browser has it (and keeps it) before it is shown. Each address is asked for once. */
export function preloadImage(url: string | null | undefined): void {
  if (!url || typeof window === "undefined" || requested.has(url)) return;
  requested.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

const remembered = new Map<string, { at: number; value: Promise<unknown> }>();
const MAX_REMEMBERED = 40;

/**
 * Runs `load` once per key and hands the same answer to everyone who asks within `ttlMs`: the warm-up on hover and the real
 * request on click share one call. A failed load is forgotten, so the click tries again.
 */
export function remember<T>(key: string, load: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  const hit = remembered.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value as string);
  const value = load();
  remembered.set(key, { at: Date.now(), value });
  value.catch(() => remembered.get(key)?.value === value && remembered.delete(key));
  return value;
}

/** Forget what was remembered under keys starting with `prefix` (after something was changed), or everything. */
export function forget(prefix = ""): void {
  for (const key of [...remembered.keys()]) if (key.startsWith(prefix)) remembered.delete(key);
}
