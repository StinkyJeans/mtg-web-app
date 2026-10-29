import { nameOf } from "../permanents.js";
import { subjectsOf } from "../targets.js";
import type { EffectHandlers } from "./shared.js";

/** Effects that came with the Mono-Green Stompy deck. */
export const GREEN_EFFECTS = {
  loseSubtype({ state, ctx, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      s.perm.tempLostSubtypes = [...(s.perm.tempLostSubtypes ?? []), effect.subtype];
      say(`${nameOf(state, s.perm)} isn't a ${effect.subtype.charAt(0).toUpperCase()}${effect.subtype.slice(1)} until end of turn.`);
    }
  },
} satisfies EffectHandlers;
