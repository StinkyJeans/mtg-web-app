// The rule for wrong passwords: 5 wrong tries lock the account for 10 minutes. Pure functions, so they can be tested alone.

export const MAX_WRONG_TRIES = 5;
export const LOCK_MS = 10 * 60_000;
/** Wrong tries older than this no longer count (a typo last month shouldn't add up with one today). */
export const FORGET_MS = 10 * 60_000;

export interface LoginLock {
  /** Wrong tries in a row. */
  fails: number;
  /** When the last wrong try happened (ms). */
  last: number;
  /** While this is in the future, the account is locked (ms); 0 when it never was. */
  until: number;
}

/** Seconds the account still has to wait, or 0. */
export function waitSeconds(
  lock: LoginLock | null | undefined,
  now = Date.now(),
): number {
  return lock && lock.until > now ? Math.ceil((lock.until - now) / 1000) : 0;
}

/** The lock after one more wrong password. */
export function afterWrongPassword(
  prev: LoginLock | null | undefined,
  now = Date.now(),
): LoginLock {
  const fresh =
    !prev ||
    now - prev.last > FORGET_MS ||
    (prev.until > 0 && prev.until <= now); // a finished lock starts the count over
  const fails = (fresh ? 0 : prev!.fails) + 1;
  return fails >= MAX_WRONG_TRIES
    ? { fails, last: now, until: now + LOCK_MS }
    : { fails, last: now, until: 0 };
}

/** "10 minutes", "1 minute", "45 seconds" */
export function describeWait(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}
