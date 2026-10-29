import { getCard } from "../../cards.js";
import { shuffle } from "../../state.js";
import { removeFromBattlefield } from "../zones.js";
import { subjectsOf } from "../targets.js";
import type { EffectHandlers } from "./shared.js";

/** Effects that came with the Azorius Stun deck. */
export const STUN_EFFECTS = {
  shuffleIntoLibrary({ state, ctx, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (!card) continue;
      const owner = state.players[card.owner];
      [owner.library, state.rng] = shuffle([...owner.library, card], state.rng);
      say(`${getCard(state, card.defId).name} is shuffled into its owner's library.`);
    }
  },
} satisfies EffectHandlers;
