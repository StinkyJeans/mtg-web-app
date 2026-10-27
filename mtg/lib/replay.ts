import { applyAction, createGame } from "@mtg/engine";
import type { Action, CardDef, GameEvent, GameState, PlayerId } from "@mtg/engine";
import { createClient } from "@/lib/supabase/client";

/** What the game server saved (game-server/src/rooms/MatchRoom.ts, `Replay`). */
export interface Replay {
  v: 1;
  seed: number;
  starting: PlayerId;
  names: Record<PlayerId, string>;
  decks: Record<PlayerId, string[]>;
  cards: Record<string, CardDef>;
  log: { p: PlayerId; a: Action; s?: string[] }[];
  winner?: PlayerId | "draw";
  reason?: string | null;
  at: string;
}

export async function fetchReplay(matchId: string): Promise<Replay> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api/replay?id=${matchId}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const body = (await res.json()) as Replay | { error: string };
  if (!res.ok) throw new Error("error" in body ? body.error : "The replay could not be loaded.");
  return body as Replay;
}

export interface Step {
  /** The game after this step. */
  state: GameState;
  /** What happened in it. */
  events: GameEvent[];
  who: PlayerId | null;
  action: Action | null;
}

/**
 * Plays the whole match again, step by step, with the same engine and seed: the engine is deterministic, so every state is
 * exactly what the players saw. `broken` is set if the recorded actions stop making sense (the rules changed since).
 */
export function buildSteps(replay: Replay): { steps: Step[]; broken: string | null } {
  let state = createGame(replay.decks, replay.seed, replay.cards, { startingPlayer: replay.starting, mulligan: true, shuffleStep: true });
  const steps: Step[] = [{ state, events: [], who: null, action: null }];
  for (const [i, entry] of replay.log.entries()) {
    // mana the player chose to keep untapped was set aside while the server applied the action
    const held = entry.s && entry.s.length > 0 ? { ...state, players: { ...state.players, [entry.p]: { ...state.players[entry.p], spareMana: entry.s } } } : state;
    const r = applyAction(held, entry.p, entry.a);
    if (!r.ok) return { steps, broken: `Step ${i + 1} (${entry.a.type}) was refused: ${r.error}` };
    r.state.players[entry.p].spareMana = undefined;
    state = r.state;
    steps.push({ state, events: r.events, who: entry.p, action: entry.a });
  }
  return { steps, broken: null };
}
