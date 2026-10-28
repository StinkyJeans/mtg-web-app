import type { Effect, TokenSpec } from "../effects.js";
import { isCreatureRef, isPlayerRef, refFor } from "./targets.js";
import type { Ctx } from "./targets.js";
import { isKeyword, keywordList } from "./words.js";

// Sentences of the Marvel Super Heroes set, in the same shape as the ones in sentences.ts.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

const KEYWORD_COUNTERS = ["indestructible", "double strike", "haste", "flying", "first strike", "deathtouch", "lifelink", "menace", "reach", "trample", "vigilance", "hexproof"];

/** "Put an indestructible counter on target creature you control." */
const keywordCounter: SentenceParser = (s, ctx) => {
  const m = /^put an? ([a-z ]+) counter on (.+)$/.exec(s);
  if (!m || !KEYWORD_COUNTERS.includes(m[1]) || !isKeyword(m[1])) return null;
  const what = refFor(m[2], ctx);
  return what && isCreatureRef(what, ctx) ? [{ type: "addKeywordCounter", keyword: m[1], what }] : null;
};

/** "Put a +1/+1 counter and a double strike counter on ~." */
const counterAndKeyword: SentenceParser = (s, ctx) => {
  const m = /^put a \+1\/\+1 counter and an? ([a-z ]+) counter on (.+)$/.exec(s);
  if (!m || !KEYWORD_COUNTERS.includes(m[1]) || !isKeyword(m[1])) return null;
  const what = refFor(m[2], ctx);
  return what && isCreatureRef(what, ctx) ? [{ type: "addCounters", amount: 1, what }, { type: "addKeywordCounter", keyword: m[1], what }] : null;
};

/** "Put a plan counter on this enchantment." */
const planCounter: SentenceParser = (s) => (s === "put a plan counter on ~" ? [{ type: "planCounter" }] : null);

/** "~ fights up to one other target creature." / "Target creature you control fights up to one other target creature." */
const fightUpToOne: SentenceParser = (s, ctx) => {
  const m = /^(~|target creature you control) fights up to one (other )?target creature( an opponent controls)?$/.exec(s);
  if (!m) return null;
  const a = refFor(m[1], ctx);
  if (!a) return null;
  ctx.targets.push({
    kind: "creature",
    optional: true,
    ...(m[3] ? { controller: "opponent" as const } : {}),
    ...(m[2] && a.t === "self" ? { other: true } : { distinct: true }), // "other": not the creature that fights (or, for two targets, a different one)
    label: `up to one ${m[2] ?? ""}target creature${m[3] ?? ""}`,
  });
  if (a.t === "target") ctx.targets[a.i] = { ...ctx.targets[a.i], distinct: true };
  return [{ type: "fight", a, b: { t: "target", i: ctx.targets.length - 1 } }];
};

/** "Choose target creature you control." (only picks the target; the next sentence says what happens to it) */
const chooseTarget: SentenceParser = (s, ctx) => {
  const m = /^choose (target .+)$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return what?.t === "target" ? [] : null;
};

/** "Double target creature's power and toughness until end of turn." / "Until end of turn, double its power and toughness and it gains trample." */
const doublePT: SentenceParser = (s, ctx) => {
  let m = /^double (target creature)'s power and toughness until end of turn$/.exec(s);
  if (m) {
    const what = refFor(m[1], ctx);
    return what ? [{ type: "doublePT", what }] : null;
  }
  m = /^until end of turn, double (?:its|that creature's) power and toughness and it gains ([a-z ,]+)$/.exec(s);
  const keywords = m ? keywordList(m[1]) : null;
  if (!m || !keywords || ctx.targets.length === 0) return null;
  const what = { t: "target" as const, i: ctx.targets.length - 1 };
  return [{ type: "doublePT", what }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what }))];
};

/** "Artifact spells you cast this turn cost {1} less to cast." */
const costLess: SentenceParser = (s) => {
  const m = /^artifact spells you cast this turn cost \{(\d+)\} less to cast$/.exec(s);
  return m ? [{ type: "costLess", n: Number(m[1]), spell: "artifact" }] : null;
};

/** "The next red or green creature spell you cast this turn can be cast without paying its mana cost." */
const freeNext: SentenceParser = (s) => {
  const m = /^the next (red|green|white|blue|black)(?: or (red|green|white|blue|black))? creature spell you cast this turn can be cast without paying its mana cost$/.exec(s);
  if (!m) return null;
  const letter = (w: string) => ({ white: "W", blue: "U", black: "B", red: "R", green: "G" })[w] as string;
  return [{ type: "freeNext", colors: [m[1], m[2]].filter((w): w is string => !!w).map(letter) }];
};

/** "You may put a Hero creature card with mana value 3 or less from your hand onto the battlefield. If you don't, draw a card." */
const putFromHand: SentenceParser = (s) => {
  const m = /^you may put an? ([a-z]+) creature card with mana value (\d+) or less from your hand onto the battlefield(?:, else draw a card)?$/.exec(s);
  return m ? [{ type: "putFromHand", subtype: m[1], maxMV: Number(m[2]), elseDraw: s.includes("else draw") }] : null;
};

/** "You may draw a card for each artifact you control. If you do, each opponent draws a card." */
const mayDrawForEach: SentenceParser = (s) => {
  if (s !== "@@armorwars@@") return null;
  return [
    {
      type: "mayPay",
      cost: "",
      prompt: "You may draw a card for each artifact you control. If you do, each opponent draws a card.",
      then: [
        { type: "draw", amount: { count: { kind: "permanents", what: "artifact", scope: "you" } }, who: { t: "you" } },
        { type: "draw", amount: 1, who: { t: "opp" } },
      ],
    },
  ];
};

const titleCase = (name: string) => name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
const COLOR_LETTER: Record<string, string> = { white: "W", blue: "U", black: "B", red: "R", green: "G" };

/**
 * A token with a name and an ability of its own: 'Create Redwing, a legendary 1/1 blue Bird Scout creature token with flying and "Whenever Redwing attacks, surveil 1."',
 * 'target opponent creates The Void, a legendary 5/5 black Horror Villain creature token with flying, indestructible, and "The Void attacks each combat if able."',
 * 'create a 1/1 green Minion creature token named Moloid with "Whenever this token attacks, you may mill a card."'
 */
const namedAbilityToken: SentenceParser = (s, ctx) => {
  const m = /^(?:(target opponent|each opponent) creates|create) (?:(.+?), an? legendary |an? )(\d+)\/(\d+) ((?:(?:white|blue|black|red|green|colorless)(?:, | and )?)+) ([a-z ]+?) creature token(?: named ([a-z' ]+?))? with (?:([a-z, ]+?),? (?:and )?)?"([^"]+?)\.?"$/.exec(s);
  if (!m) return null;
  const name = titleCase(m[2] ?? m[7] ?? m[6]);
  const keywords = m[8] ? keywordList(m[8].replace(/,$/, "")) : [];
  if (!keywords) return null;
  const colors = [...m[5].matchAll(/\b(white|blue|black|red|green)\b/g)].map((c) => COLOR_LETTER[c[1]]);
  // the ability's own name for the token reads "~"
  const ability = m[9].replace(new RegExp(name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), name).replace(/^./, (c) => c.toUpperCase());
  const token: TokenSpec = { name, type: "creature", power: Number(m[3]), toughness: Number(m[4]), colors, subtypes: titleCase(m[6]), keywords, text: `${ability}.` };
  if (!m[1]) return [{ type: "createToken", amount: 1, token }];
  const who = refFor(m[1], ctx);
  return who && isPlayerRef(who, ctx) ? [{ type: "createToken", amount: 1, token, who }] : null;
};

/** "Draw cards equal to the difference." (The Ten Rings: ten minus the cards in your hand) */
const drawDifference: SentenceParser = (s) => (s === "draw cards equal to the difference" ? [{ type: "draw", amount: { count: { kind: "handDeficit", to: 10 } }, who: { t: "you" } }] : null);

/** "Return up to two target instant and/or sorcery cards from your graveyard to your hand." */
const returnSpells: SentenceParser = (s, ctx) => {
  const m = /^return up to (one|two|three) target instant (?:and\/or|or) sorcery cards? from your graveyard to your hand$/.exec(s);
  if (!m) return null;
  const n = { one: 1, two: 2, three: 3 }[m[1] as "one"];
  const out: Effect[] = [];
  for (let i = 0; i < n; i++) {
    ctx.targets.push({ kind: "graveyardSpell", controller: "you", optional: true, distinct: true, label: "up to " + n + " target instant and/or sorcery cards from your graveyard" });
    out.push({ type: "reanimate", what: { t: "target", i: ctx.targets.length - 1 }, to: "hand" });
  }
  return out;
};

/** 'Until end of turn, ~ gains "~'s base power is equal to the number of cards in your hand."' (Ms. Marvel) */
const basePowerFromHand: SentenceParser = (s) => (/^until end of turn, ~ gains "~'s base power is equal to the number of cards in your hand\.?"$/.test(s) ? [{ type: "powerFromHand" }] : null);

/** "Each other Hero you control gets +X/+X until end of turn, where X is ~'s toughness." / "Another target creature you control gets +X/+0 until end of turn, where X is War Machine's power." */
const pumpBySelf: SentenceParser = (s, ctx) => {
  const m = /^(each other [a-z]+ you control|another target creature you control) gets \+x\/\+(x|0) until end of turn, where x is ~'s (toughness|power)$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  if (!m || !what) return null;
  return [{ type: "pump", power: 1, toughness: m[2] === "x" ? 1 : 0, what, per: { kind: m[3] === "toughness" ? "selfToughness" : "selfPower" } }];
};

/** "Until end of turn, ~'s base power and toughness become 6/6 and they gain trample." (Moon Girl) */
const baseBecomes: SentenceParser = (s) => {
  const m = /^until end of turn, ~'s base power and toughness become (\d+)\/(\d+) and they gain ([a-z ,]+)$/.exec(s);
  const keywords = m ? keywordList(m[3]) : null;
  if (!m || !keywords) return null;
  const what = { t: "self" as const };
  return [{ type: "setBase", what, power: Number(m[1]), toughness: Number(m[2]) }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what }))];
};

/** "Until end of turn, target artifact or creature becomes an artifact creature with base power and toughness 4/4 and gains flying." */
const becomesArtifactCreature: SentenceParser = (s, ctx) => {
  const m = /^until end of turn, (target artifact or creature) becomes an artifact creature with base power and toughness (\d+)\/(\d+) and gains ([a-z ,]+)$/.exec(s);
  const keywords = m ? keywordList(m[4]) : null;
  const what = m ? refFor(m[1], ctx) : null;
  if (!m || !keywords || !what) return null;
  return [{ type: "becomeCreatureNow", what }, { type: "setBase", what, power: Number(m[2]), toughness: Number(m[3]) }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what }))];
};

/** "Target player gains 2 life, then searches their library for a basic land card, puts it onto the battlefield tapped, then shuffles." (the second half) */
const searchBasic: SentenceParser = (s, ctx) => {
  if (s !== "searches their library for a basic land card, puts it onto the battlefield tapped, then shuffles" || ctx.targets.length === 0) return null;
  const who = ctx.targets.findIndex((t) => t.kind === "player");
  return who >= 0 ? [{ type: "search", tapped: true, who: { t: "target", i: who } }] : null;
};

/** "Transform ~." */
const transform: SentenceParser = (s) => (s === "transform ~" ? [{ type: "transform" }] : null);

/** Enrage (The Incredible Hulk): "If he's attacking, untap him and there is an additional combat phase after this phase." */
const extraCombat: SentenceParser = (s) => (s === "if he's attacking, untap him and there is an additional combat phase after this phase" ? [{ type: "extraCombatIfAttacking" }] : null);

/** Enrage (Red Hulk): "~ deals damage equal to the number of +1/+1 counters on him to any other target." */
const damageByCounters: SentenceParser = (s, ctx) => {
  const m = /^~ deals damage equal to the number of \+1\/\+1 counters on (?:~|him) to (any other target)$/.exec(s);
  const to = m ? refFor(m[1], ctx) : null;
  return to ? [{ type: "damage", amount: { count: { kind: "selfCounters" } }, to }] : null;
};

/** "You may put a land card from your hand onto the battlefield tapped." */
const landFromHand: SentenceParser = (s) => (s === "you may put a land card from your hand onto the battlefield tapped" ? [{ type: "putFromHand", subtype: "", maxMV: 99, elseDraw: false, cardType: "land", tapped: true }] : null);

/** "Target Villain you control connives." / "...up to one target creature you control connives." */
const connivesTarget: SentenceParser = (s, ctx) => {
  const m = /^(target [a-z ]+? you control(?:@\d+)?) connives$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return what && isCreatureRef(what, ctx) ? [{ type: "connive", what }] : null;
};

/** "Then discard two cards unless you discard an artifact card." */
const thirst: SentenceParser = (s) => {
  const m = /^discard two cards unless you discard an? (artifact|creature) card$/.exec(s);
  return m ? [{ type: "discardUnless", cardType: m[1] as "artifact" | "creature" }] : null;
};

export const MARVEL_SENTENCES: SentenceParser[] = [connivesTarget, thirst, transform, extraCombat, damageByCounters, landFromHand, pumpBySelf, baseBecomes, becomesArtifactCreature, searchBasic, drawDifference, returnSpells, basePowerFromHand, planCounter, counterAndKeyword, keywordCounter, fightUpToOne, chooseTarget, doublePT, costLess, freeNext, putFromHand, mayDrawForEach, namedAbilityToken];
