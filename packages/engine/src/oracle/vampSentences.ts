import type { Effect } from "../effects.js";
import { CREATURE_TYPES } from "../creatureTypes.js";
import { parseClause } from "./effectText.js";
import { refFor } from "./targets.js";
import type { Ctx } from "./targets.js";

// Sentences of the Vampire Supreme deck: Sorin, Imperious Bloodlord and Olivia Voldaren.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

/** Sorin, Imperious Bloodlord: "If it's a Vampire, put a +1/+1 counter on it." (the creature it targeted) */
const ifTargetIs: SentenceParser = (s, ctx) => {
  const m = /^if it's an? ([a-z]+), (.+)$/.exec(s);
  if (!m || ctx.targets.length === 0 || !CREATURE_TYPES.includes(m[1])) return null;
  const then = parseClause(m[2], ctx);
  return then ? [{ type: "ifSubtype", what: { t: "target", i: ctx.targets.length - 1 }, subtype: m[1], then }] : null;
};

/** Sorin, Imperious Bloodlord: "You may put a Vampire creature card from your hand onto the battlefield." */
const putTypeFromHand: SentenceParser = (s) => {
  const m = /^you may put an? ([a-z]+) creature card from your hand onto the battlefield$/.exec(s);
  return m && CREATURE_TYPES.includes(m[1]) ? [{ type: "putFromHand", subtype: m[1], maxMV: 99, elseDraw: false }] : null;
};

/** Olivia Voldaren: "That creature becomes a Vampire in addition to its other types." */
const becomeTypeToo: SentenceParser = (s, ctx) => {
  const m = /^that creature becomes an? ([a-z]+) in addition to its other types$/.exec(s);
  const what = m && CREATURE_TYPES.includes(m[1]) ? refFor("that creature", ctx) : null;
  return m && what && what.t !== "self" ? [{ type: "addSubtype", what, subtype: m[1] }] : null;
};

/** Olivia Voldaren: "Gain control of target Vampire for as long as you control ~." */
const gainControlWhile: SentenceParser = (s, ctx) => {
  const m = /^gain control of (target [a-z]+) for as long as you control ~$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return what?.t === "target" ? [{ type: "gainControl", what, whileSource: true }] : null;
};

export const VAMP_SENTENCES: SentenceParser[] = [ifTargetIs, putTypeFromHand, becomeTypeToo, gainControlWhile];
