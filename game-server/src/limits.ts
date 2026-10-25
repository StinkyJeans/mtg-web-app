// Limits that keep one player (or one bad actor) from using up the server. Every number can be changed with an
// environment variable; the defaults suit a single small server.

const num = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const LIMITS = {
  /** Rooms open on this server at once; past this, nobody can open another. */
  maxRooms: () => num("MAX_ROOMS", 400),
  /** Rooms with a computer opponent at once: the bot is the one expensive thing the server does. */
  maxBotGames: () => num("MAX_BOT_GAMES", 30),
  /** Messages one browser may send per second before it is cut off (people click a few times a second at most). */
  messagesPerSecond: () => num("MAX_MESSAGES_PER_SECOND", 100),
  /** Largest single message from a browser, in bytes. A deck of 60 cards is about 2 KB. */
  maxPayloadBytes: () => num("MAX_PAYLOAD_BYTES", 64 * 1024),
  /** A room nobody is playing in is closed after this many minutes without activity. */
  idleMinutes: () => num("IDLE_MINUTES", 30),
  /** A game in progress is ended after this many minutes without any move. */
  stuckGameMinutes: () => num("STUCK_GAME_MINUTES", 120),
  /** Wrong room passwords an account may try before it has to wait. */
  passwordTries: () => num("PASSWORD_TRIES", 5),
  passwordLockSeconds: () => num("PASSWORD_LOCK_SECONDS", 60),
};

/** Counts wrong guesses per account; after too many the account waits, whatever room it tries. */
export class GuessLimiter {
  private fails = new Map<string, { count: number; until: number }>();

  /** Seconds the account still has to wait, or 0. */
  waitSeconds(key: string, now = Date.now()): number {
    const f = this.fails.get(key);
    return f && f.until > now ? Math.ceil((f.until - now) / 1000) : 0;
  }

  fail(key: string, now = Date.now()) {
    if (this.fails.size > 5000) this.prune(now);
    const f = this.fails.get(key);
    const count = (f && (f.until === 0 || f.until > now - 10 * 60_000) ? f.count : 0) + 1;
    const lock = count >= LIMITS.passwordTries();
    this.fails.set(key, { count: lock ? 0 : count, until: lock ? now + LIMITS.passwordLockSeconds() * 1000 : 0 });
  }

  succeed(key: string) {
    this.fails.delete(key);
  }

  private prune(now: number) {
    for (const [k, f] of this.fails) if (f.until < now) this.fails.delete(k);
  }
}

export const passwordGuesses = new GuessLimiter();
