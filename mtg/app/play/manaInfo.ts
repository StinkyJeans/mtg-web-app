import { manaSources } from "@mtg/engine";
import type { GameEvent, GameState, PlayerId } from "@mtg/engine";
import { nameOf } from "./log";

/** A change in a player's untapped mana, and why, shown next to their mana for a few seconds. */
export interface ManaNote {
  delta: number;
  why: string;
  key: number;
}

/** How much mana a player can still spend this turn: their untapped sources that are ready. */
export const readyMana = (state: GameState, id: PlayerId) => manaSources(state, id).filter((s) => !s.tapped && !s.sick).reduce((n, s) => n + s.amount, 0);

/** Why a player's untapped mana went up or down in one action, in a few words: "paid for Become Immense", "Forest played". */
function reason(events: GameEvent[], id: PlayerId, after: GameState): string {
  const paidAt = events.findIndex((e) => e.type === "manaPaid" && e.player === id);
  if (paidAt >= 0) {
    const what = events.slice(paidAt).find((e) => e.type === "spellCast" || e.type === "creatureCast" || e.type === "abilityActivated");
    if (!what) return "paid";
    return `paid for ${what.type === "abilityActivated" ? what.name : nameOf(after, what.iid)}`;
  }
  if (events.some((e) => e.type === "turnStarted" && e.player === id)) return "new turn: untapped";
  const land = events.find((e) => e.type === "landPlayed" && e.player === id);
  if (land?.type === "landPlayed") return `${nameOf(after, land.iid)} played`;
  const resolved = [...events].reverse().find((e) => e.type === "resolved");
  if (resolved?.type === "resolved") return `by ${resolved.name}`;
  if (events.some((e) => e.type === "attackersDeclared" && e.player === id)) return "tapped to attack";
  return "";
}

let nextKey = 1;

/** Each player whose untapped mana changed in this action: by how much, and why. */
export function manaNotes(before: GameState | null, after: GameState, events: GameEvent[]): Partial<Record<PlayerId, ManaNote>> {
  if (!before) return {};
  const out: Partial<Record<PlayerId, ManaNote>> = {};
  for (const id of ["p1", "p2"] as const) {
    const delta = readyMana(after, id) - readyMana(before, id);
    if (delta !== 0) out[id] = { delta, why: reason(events, id, after), key: nextKey++ };
  }
  return out;
}
