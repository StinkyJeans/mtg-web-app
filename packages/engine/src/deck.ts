import type { CardDef } from "./types.js";
import { isSupportedCard } from "./oracle.js";

/** The deck sizes a game can be played with. Both players vote for one before the game starts. */
export const DECK_SIZES = [20, 40, 60] as const;
export type DeckSize = (typeof DECK_SIZES)[number];
export const MIN_DECK_SIZE = 20;
export const MAX_COPIES = 4;

/** Basic lands may appear any number of times in a deck. */
export function isBasicLand(def: CardDef): boolean {
  return def.type === "land" && (!def.typeLine || def.typeLine.startsWith("Basic"));
}

/** Deck-building rules. Returns human-readable problems (empty = legal). `deck` lists one id per copy. */
export function validateDeck(defs: Record<string, CardDef>, deck: string[], size?: number): string[] {
  const errors: string[] = [];
  if (size !== undefined && deck.length !== size) errors.push(`Needs exactly ${size} cards (has ${deck.length}).`);
  else if (size === undefined && deck.length < MIN_DECK_SIZE) errors.push(`Needs at least ${MIN_DECK_SIZE} cards (has ${deck.length}).`);

  const counts = new Map<string, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const def = defs[id];
    if (!def) errors.push(`Unknown card: ${id}`);
    else if (n > MAX_COPIES && !isBasicLand(def)) errors.push(`${def.name}: ${n} copies (max ${MAX_COPIES}).`);
  }
  return errors;
}

/** Cards in the deck the engine can't play yet. A deck with any of these can't start a game. */
export function unplayableCards(defs: Record<string, CardDef>, deck: string[]): CardDef[] {
  return [...new Set(deck)].map((id) => defs[id]).filter((def): def is CardDef => def !== undefined && (def.playable === false || !isSupportedCard(def)));
}
