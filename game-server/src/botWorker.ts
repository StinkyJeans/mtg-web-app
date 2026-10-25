import { parentPort } from "node:worker_threads";
import { botAction } from "@mtg/engine";

// Runs in its own thread: the bot's thinking (up to ~0.7 s of pure computing per move) must never stop the matches
// that are running on the main thread. See botPool.ts.

parentPort!.on("message", (job: { id: number; view: Parameters<typeof botAction>[0]; seat: Parameters<typeof botAction>[1] }) => {
  try {
    parentPort!.postMessage({ id: job.id, action: botAction(job.view, job.seat) });
  } catch (e) {
    parentPort!.postMessage({ id: job.id, error: e instanceof Error ? e.message : String(e) });
  }
});
