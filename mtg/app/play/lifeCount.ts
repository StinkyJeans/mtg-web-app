// The life totals count down WHILE an attack lands, not after it. The attack animation tells the number the moment its hit connects
// (`dropLife`), and the number counts down one point at a time from there; when the game state arrives a moment later it already shows the
// right value, so nothing more happens. The number itself lives in SidePanels (`LifeTotal`), which registers here.

type Counter = (change: number) => void;
const counters = new Map<string, Counter>();

let settleAt = 0;
/** How long (ms) until the life totals have finished counting: the result screen waits for it, so the last points are seen going down. */
export const lifeSettling = () => Math.max(0, settleAt - performance.now());
export const lifeBusyUntil = (at: number) => void (settleAt = Math.max(settleAt, at));

/** A life total is on screen and can be told to count. Returns the way to stop. */
export function registerLife(id: string, counter: Counter): () => void {
  counters.set(id, counter);
  return () => void (counters.get(id) === counter && counters.delete(id));
}

/** A hit of `amount` damage has just landed on this player: their life total starts counting down. */
export const dropLife = (id: string, amount: number) => counters.get(id)?.(-amount);
