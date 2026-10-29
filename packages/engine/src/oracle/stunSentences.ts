import type { Effect } from "../effects.js";
import type { Ctx } from "./targets.js";

// Sentences of the Azorius Stun deck: Succumb to the Cold, Out Cold, Floodpits Drowner.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

/** "Tap one or two target creatures an opponent controls. Put a stun counter on each of them." (each creature target, not a target player before them) */
const stunEach: SentenceParser = (s, ctx) => {
  if (!/^put a stun counter on each of (?:them|those creatures)$/.test(s)) return null;
  const effects = ctx.targets.flatMap((spec, i): Effect[] => (spec.kind === "creature" ? [{ type: "stun", what: { t: "target", i } }] : []));
  return effects.length > 0 ? effects : null;
};

/** Floodpits Drowner: "Shuffle ~ and target creature with a stun counter on it into their owners' libraries." */
const shuffleWithStunned: SentenceParser = (s, ctx) => {
  if (s !== "shuffle ~ and target creature with a stun counter on it into their owners' libraries") return null;
  ctx.targets.push({ kind: "creature", stunned: true, label: "target creature with a stun counter on it" });
  return [
    { type: "shuffleIntoLibrary", what: { t: "self" } },
    { type: "shuffleIntoLibrary", what: { t: "target", i: ctx.targets.length - 1 } },
  ];
};

export const STUN_SENTENCES: SentenceParser[] = [stunEach, shuffleWithStunned];
