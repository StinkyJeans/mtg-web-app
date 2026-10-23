import { CARDS } from "./cards.js";
import { isSupportedCard } from "./mana.js";
import type { CardDef, CardInstance, GameState, PlayerId, PlayerState } from "./types.js";

export const STARTING_LIFE = 20;
export const STARTING_HAND = 7;

/** mulberry32: tiny seeded RNG. Takes a state, returns [0,1) value and next state. */
export function nextRandom(rng: number): [number, number] {
  let t = (rng + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Fisher-Yates. Returns a new array and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], rng: number): [T[], number] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(rng);
    rng = next;
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, rng];
}

function makePlayer(id: PlayerId, deck: string[], rng: number, defs: Record<string, CardDef>): [PlayerState, number] {
  const cards: CardInstance[] = deck.map((defId, i) => {
    if (!defs[defId]) throw new Error(`Unknown card: ${defId}`);
    if (defs[defId].playable === false || !isSupportedCard(defs[defId])) throw new Error(`${defs[defId].name} can't be played yet.`);
    return { iid: `${id}-${i}`, defId, owner: id };
  });
  const [library, nextRng] = shuffle(cards, rng);
  const player: PlayerState = {
    id,
    life: STARTING_LIFE,
    library: library.slice(STARTING_HAND),
    hand: library.slice(0, STARTING_HAND),
    battlefield: [],
    graveyard: [],
    landsPlayedThisTurn: 0,
  };
  return [player, nextRng];
}

/**
 * Create a new game. Both players draw an opening hand of 7.
 * By default p1 goes first and the game starts at main1 of turn 1. With `mulligan: true` the game
 * starts in the mulligan phase instead; the starting player skips their first draw (rule 103.8a).
 */
export function createGame(
  decks: Record<PlayerId, string[]>,
  seed: number,
  cardDefs: Record<string, CardDef> = CARDS,
  options: { startingPlayer?: PlayerId; mulligan?: boolean } = {},
): GameState {
  const [p1, rng1] = makePlayer("p1", decks.p1, seed, cardDefs);
  const [p2, rng2] = makePlayer("p2", decks.p2, rng1, cardDefs);
  // Keep only the cards actually used in this game.
  const cards = Object.fromEntries(
    [...new Set([...decks.p1, ...decks.p2])].map((id) => [id, cardDefs[id]]),
  );
  return {
    cards,
    players: { p1, p2 },
    startingPlayer: options.startingPlayer ?? "p1",
    opening: options.mulligan
      ? { taken: { p1: 0, p2: 0 }, kept: { p1: false, p2: false } }
      : null,
    active: options.startingPlayer ?? "p1",
    turn: 1,
    phase: options.mulligan ? "mulligan" : "main1",
    combat: null,
    rng: rng2,
    winner: null,
  };
}
