import os from "node:os";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { botAction } from "@mtg/engine";
import type { Action, GameState, PlayerId } from "@mtg/engine";

type Job = { id: number; view: GameState; seat: PlayerId; resolve: (a: Action | null) => void };

/** Longest a worker may take for one move (the bot itself stops thinking after about 0.7 s). */
const JOB_TIMEOUT_MS = 5000;

/**
 * Where the bot thinks: a few worker threads, so that its thinking never blocks the server's main thread (and with it
 * every other match). If a worker cannot start, dies, or takes too long, that move is thought out right here instead,
 * so a bot never gets stuck.
 */
export class BotPool {
  private workers: { worker: Worker; job: Job | null; timer?: ReturnType<typeof setTimeout> }[] = [];
  private queue: Job[] = [];
  private nextId = 1;
  private closed = false;
  private broken = false;

  /** `size` worker threads (BOT_WORKERS; 0 makes the bot think on the main thread, which is only useful for comparing). */
  constructor(private size = process.env.BOT_WORKERS === "0" ? 0 : Math.max(1, Math.min(Number(process.env.BOT_WORKERS) || os.cpus().length - 1, 4))) {
    if (size === 0) this.broken = true;
  }

  /** The bot's move for what `seat` can see. */
  think(view: GameState, seat: PlayerId): Promise<Action | null> {
    if (this.closed || this.broken) return Promise.resolve(botAction(view, seat));
    return new Promise((resolve) => {
      this.queue.push({ id: this.nextId++, view, seat, resolve });
      this.pump();
    });
  }

  /** Waiting moves and busy workers: for watching the server's load. */
  stats() {
    return { workers: this.workers.length, busy: this.workers.filter((w) => w.job).length, waiting: this.queue.length };
  }

  async close() {
    this.closed = true;
    for (const job of this.queue.splice(0)) job.resolve(botAction(job.view, job.seat));
    await Promise.all(this.workers.splice(0).map((w) => (clearTimeout(w.timer), w.worker.terminate())));
  }

  private spawn() {
    const file = fileURLToPath(import.meta.url);
    const ts = file.endsWith(".ts"); // running from source (tests, `npm start`): the worker needs the same TypeScript loader
    const worker = new Worker(new URL(ts ? "./botWorker.ts" : "./botWorker.js", import.meta.url), ts ? { execArgv: ["--import", "tsx"] } : {});
    worker.unref(); // an idle worker never keeps the server from shutting down
    const slot: BotPool["workers"][number] = { worker, job: null };
    worker.on("message", (m: { id: number; action?: Action | null; error?: string }) => {
      const job = slot.job;
      if (!job || job.id !== m.id) return;
      clearTimeout(slot.timer);
      slot.job = null;
      if (m.error !== undefined) job.resolve(botAction(job.view, job.seat));
      else job.resolve(m.action ?? null);
      this.pump();
    });
    const lost = () => this.lose(slot);
    worker.on("error", lost);
    worker.on("exit", lost);
    this.workers.push(slot);
    return slot;
  }

  /** A worker died or hung: its move is thought out here, and the worker is replaced. */
  private lose(slot: BotPool["workers"][number]) {
    const i = this.workers.indexOf(slot);
    if (i === -1) return; // already handled
    this.workers.splice(i, 1);
    clearTimeout(slot.timer);
    void slot.worker.terminate();
    const job = slot.job;
    slot.job = null;
    if (job) job.resolve(botAction(job.view, job.seat));
    if (this.closed) return;
    this.crashes++;
    if (this.crashes > 5) {
      this.broken = true; // something is wrong with threads here: think on the main thread from now on
      console.warn("The bot's worker threads keep failing; the bot now thinks on the main thread.");
      for (const waiting of this.queue.splice(0)) waiting.resolve(botAction(waiting.view, waiting.seat));
      return;
    }
    this.pump();
  }
  private crashes = 0;

  private pump() {
    while (this.queue.length > 0 && !this.closed && !this.broken) {
      let slot = this.workers.find((w) => !w.job);
      if (!slot && this.workers.length < this.size) {
        try {
          slot = this.spawn();
        } catch (e) {
          console.warn("Could not start a bot worker:", e);
          this.broken = true;
          for (const waiting of this.queue.splice(0)) waiting.resolve(botAction(waiting.view, waiting.seat));
          return;
        }
      }
      if (!slot) return; // all busy: the move waits its turn
      const job = this.queue.shift()!;
      slot.job = job;
      const s = slot;
      slot.timer = setTimeout(() => this.lose(s), JOB_TIMEOUT_MS);
      slot.worker.postMessage({ id: job.id, view: job.view, seat: job.seat });
    }
  }
}

/** The one pool of this server process. */
export const botPool = new BotPool();
