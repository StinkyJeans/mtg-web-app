// A permanent as it is right now: power and toughness with pumps, counters, auras and anthems, and the damage it has taken.
// Every place that shows a creature uses these, so the numbers match the board everywhere.
import { powerOf, toughnessOf } from "@mtg/engine";
import type { GameState, Permanent } from "@mtg/engine";

/** A creature right now: a creature card, or a crewed Vehicle. */
export const isCreatureNow = (state: GameState, p: Permanent) => state.cards[p.card.defId].type === "creature" || p.crewed === true;

/** "3/4": power, and the toughness left after the damage it has taken. Empty for a permanent that isn't a creature. */
export const ptText = (state: GameState, p: Permanent) => (isCreatureNow(state, p) ? `${powerOf(state, p)}/${toughnessOf(state, p) - p.damage}` : "");

/** A permanent's name, with its power and toughness if it is a creature: "Grizzly Bears 3/3". */
export const nameWithStats = (state: GameState, p: Permanent) => [state.cards[p.card.defId].name, ptText(state, p)].filter(Boolean).join(" ");

/** What a card view needs to draw the permanent as it is now. */
export function liveCardProps(state: GameState, p: Permanent) {
  const creature = isCreatureNow(state, p);
  return {
    power: creature ? powerOf(state, p) : undefined,
    toughness: creature ? toughnessOf(state, p) : undefined,
    damage: p.damage,
    counters: { plus: p.counters, minus: p.minusCounters, infected: p.infected },
    tapped: p.tapped,
  };
}
