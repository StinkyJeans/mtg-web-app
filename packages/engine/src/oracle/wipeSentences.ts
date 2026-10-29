import type { Effect } from "../effects.js";
import { parseStatic } from "./abilities.js";
import type { Ctx } from "./targets.js";

// Sentences of the Orzhov Board Wipes deck: Kaya's Wrath, Fumigate, Elspeth, Sun's Champion.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

/** Elspeth, Sun's Champion: "Destroy all creatures with power 4 or greater." / Ritual of Soot: "Destroy all creatures with mana value 3 or less." */
const sweepByStat: SentenceParser = (s) => {
  const m = /^destroy all creatures with (power|mana value) (\d+) or (greater|less)$/.exec(s);
  if (!m) return null;
  const filter = { n: Number(m[2]), op: m[3] === "greater" ? ("min" as const) : ("max" as const) };
  return [{ type: "destroy", what: { t: "allCreatures", scope: "all", ...(m[1] === "power" ? { power: filter } : { mv: filter }) } }];
};

/** Kaya's Wrath: "You gain life equal to the number of creatures you controlled that were destroyed this way." / Fumigate: "You gain 1 life for each creature destroyed this way." */
const lifePerDestroyed: SentenceParser = (s) => {
  const yours = s === "you gain life equal to the number of creatures you controlled that were destroyed this way";
  if (!yours && s !== "you gain 1 life for each creature destroyed this way") return null;
  return [{ type: "gainLife", amount: { count: { kind: "destroyedThisWay", ...(yours ? { yours } : {}) } }, who: { t: "you" } }];
};

/** Elspeth, Sun's Champion: 'You get an emblem with "Creatures you control get +2/+2 and have flying."' */
const emblem: SentenceParser = (s) => {
  const m = /^you get an emblem with "(.+?)\.?"$/.exec(s);
  const st = m ? parseStatic(m[1]) : null;
  if (!m || !st || st.scope !== "yours") return null;
  return [{ type: "emblem", static: st, text: `${m[1][0].toUpperCase()}${m[1].slice(1)}.` }];
};

export const WIPE_SENTENCES: SentenceParser[] = [sweepByStat, lifePerDestroyed, emblem];
