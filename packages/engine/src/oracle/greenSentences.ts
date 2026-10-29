import type { CountSpec, Effect } from "../effects.js";
import { COLOR_OF, keywordList, parseCount } from "./words.js";
import { isCreatureRef, refFor } from "./targets.js";
import type { Ctx } from "./targets.js";

// Sentences of the Mono-Green Stompy deck: Treetop Village, Craterhoof Behemoth, Aspect of Hydra, Werewolf Pack Leader, Ram Through, Kraul Harpooner.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

/** "the number of creatures you control" / "the greatest power among creatures you control" / "your devotion to green". */
function xCount(phrase: string): CountSpec | null {
  if (phrase === "the total power of creatures you control") return { kind: "totalPower" };
  if (phrase === "the greatest power among creatures you control") return { kind: "greatestPower" };
  const devotion = /^your devotion to (white|blue|black|red|green)$/.exec(phrase);
  if (devotion) return { kind: "devotion", color: COLOR_OF[devotion[1]] };
  const number = /^the number of (.+)$/.exec(phrase);
  return number ? parseCount(number[1]) : null;
}

/** Treetop Village: "~ becomes a 3/3 green Ape creature with trample until end of turn. It's still a land." */
const animateColored: SentenceParser = (s) => {
  const m = /^@@animatecolored (\d+)\/(\d+) (white|blue|black|red|green) ([a-z ]+?)(?: with ([a-z ,]+?))?@@$/.exec(s);
  const keywords = m?.[5] ? keywordList(m[5]) : [];
  if (!m || !keywords) return null;
  const what = { t: "self" as const };
  return [
    { type: "becomeCreatureNow", what, subtypes: m[4].split(" "), color: COLOR_OF[m[3]], nonartifact: true },
    { type: "setBase", what, power: Number(m[1]), toughness: Number(m[2]) },
    ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what })),
  ];
};

/**
 * Craterhoof Behemoth: "Creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control."
 * Overwhelming Stampede: "Until end of turn, creatures you control gain trample and get +X/+X, where X is the greatest power among creatures you control."
 * X is counted once, before anything gets bigger.
 */
const teamPumpX: SentenceParser = (s) => {
  const m = /^(?:until end of turn, )?creatures you control gain ([a-z ,]+?) and get \+x\/\+x(?: until end of turn)?, where x is (.+)$/.exec(s);
  const keywords = m ? keywordList(m[1]) : null;
  const per = m ? xCount(m[2]) : null;
  if (!keywords || !per) return null;
  const what = { t: "allCreatures" as const, scope: "yours" as const };
  return [{ type: "pump", power: 1, toughness: 1, what, per }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what }))];
};

/** Aspect of Hydra: "Target creature gets +X/+X until end of turn, where X is your devotion to green." */
const pumpWhereX: SentenceParser = (s, ctx) => {
  const m = /^(.+?) gets? \+x\/\+x until end of turn, where x is (your devotion to [a-z]+|the total power of creatures you control|the greatest power among creatures you control)$/.exec(s);
  const per = m ? xCount(m[2]) : null;
  const what = m && per ? refFor(m[1], ctx) : null;
  return per && what && isCreatureRef(what, ctx) ? [{ type: "pump", power: 1, toughness: 1, what, per }] : null;
};

/** Werewolf Pack Leader: "Until end of turn, this creature has base power and toughness 5/3, gains trample, and isn't a Human." */
const baseAndLoseType: SentenceParser = (s) => {
  const m = /^until end of turn, ~ has base power and toughness (\d+)\/(\d+), gains ([a-z ]+), and isn't an? ([a-z]+)$/.exec(s);
  const keywords = m ? keywordList(m[3]) : null;
  if (!m || !keywords) return null;
  const what = { t: "self" as const };
  return [{ type: "setBase", what, power: Number(m[1]), toughness: Number(m[2]) }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what })), { type: "loseSubtype", what, subtype: m[4] }];
};

/** Ram Through: "Target creature you control deals damage equal to its power to target creature you don't control. If the creature you control has trample, excess damage is dealt to that creature's controller instead." */
const biteTrample: SentenceParser = (s, ctx) => {
  if (s !== "@@bitetrample@@") return null;
  const from = refFor("target creature you control", ctx);
  const to = refFor("target creature you don't control", ctx);
  return from && to ? [{ type: "bite", from, to, trampleExcess: true }] : null;
};

/** Kraul Harpooner: "Choose up to one target creature you don't control with flying." (only picks the target; the next sentence fights it) */
const chooseUpToOne: SentenceParser = (s, ctx) => {
  const m = /^choose up to one target creature you don't control with ([a-z]+)$/.exec(s);
  const what = m ? refFor(`target creature with ${m[1]} you don't control`, ctx) : null;
  if (what?.t !== "target") return null;
  ctx.targets[what.i] = { ...ctx.targets[what.i], optional: true, label: s.replace(/^choose /, "") };
  return [];
};

/** Kraul Harpooner: "~ gets +X/+0 until end of turn, where X is the number of creature cards in your graveyard, then you may have ~ fight that creature." */
const pumpThenFight: SentenceParser = (s, ctx) => {
  const m = /^~ gets \+x\/\+0 until end of turn, where x is (.+), then you may have ~ fight that creature$/.exec(s);
  const per = m ? xCount(m[1]) : null;
  if (!per || ctx.targets.length === 0) return null;
  return [{ type: "pump", power: 1, toughness: 0, what: { t: "self" }, per }, { type: "fight", a: { t: "self" }, b: { t: "target", i: ctx.targets.length - 1 } }];
};

export const GREEN_SENTENCES: SentenceParser[] = [animateColored, teamPumpX, pumpWhereX, baseAndLoseType, biteTrample, chooseUpToOne, pumpThenFight];
