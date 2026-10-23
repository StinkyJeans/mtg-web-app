import type { CardDef, GameState } from "./types.js";

const defs: CardDef[] = [
  { id: "mountain", name: "Mountain", type: "land", cost: 0 },
  { id: "forest", name: "Forest", type: "land", cost: 0 },
  { id: "goblin-scout", name: "Goblin Scout", type: "creature", cost: 1, power: 1, toughness: 1 },
  { id: "grizzly-bears", name: "Grizzly Bears", type: "creature", cost: 2, power: 2, toughness: 2 },
  { id: "hill-giant", name: "Hill Giant", type: "creature", cost: 3, power: 3, toughness: 3 },
  { id: "ogre-brute", name: "Ogre Brute", type: "creature", cost: 4, power: 4, toughness: 4 },
];

/** Built-in card set: used by tests and as an offline fallback. The real set lives in Supabase. */
export const CARDS: Record<string, CardDef> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
);

/** Look up a card definition in the game's own registry. */
export function getCard(state: Pick<GameState, "cards">, defId: string): CardDef {
  const def = state.cards[defId];
  if (!def) throw new Error(`Unknown card: ${defId}`);
  return def;
}

/** 40-card starter deck that follows the deck rules: 24 lands + 4 copies of each creature. */
export const STARTER_DECK: string[] = [
  ...Array(12).fill("mountain"),
  ...Array(12).fill("forest"),
  ...Array(4).fill("goblin-scout"),
  ...Array(4).fill("grizzly-bears"),
  ...Array(4).fill("hill-giant"),
  ...Array(4).fill("ogre-brute"),
];
