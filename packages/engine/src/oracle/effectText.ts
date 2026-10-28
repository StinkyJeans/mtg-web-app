import type { CardFilter, Effect, ModeSpec } from "../effects.js";
import { parseManaCost } from "../mana.js";
import { CARD_TYPES, COLOR_OF, NUMBER_WORDS, singularType, toAmount, toNumber } from "./words.js";
import { newCtx, refFor, targetSpec } from "./targets.js";
import type { Ctx } from "./targets.js";
import { parseSimple } from "./sentences.js";

// A whole piece of effect text: sentences joined by "and"/"then", "up to" targets, choices and modes.

/** One sentence, or two joined by "and" ("you gain 3 life and draw a card"). Undoes target bookkeeping on a failed try. */
/**
 * "Up to two target creatures": two optional targets, and the effect once for each. "Tap up to one target creature" has one.
 * (Each copy gets its own target slot, so the player can choose fewer or none.)
 */
function expandUpTo(s: string, ctx: Ctx): Effect[] | null {
  const m = /^(.*?)(?:each of )?(up to (?:one|two|three)|one or two) (other |another )?(targets|target (?:creature card from your graveyard|creature|permanent|nonland permanent|artifact|enchantment)s?(?: (?:or|and\/or) (?:artifact|enchantment|planeswalker)s?)?(?: you control| an opponent controls| you don't control| you own)?)(.*)$/.exec(s);
  if (!m) return null;
  const firstRequired = m[2] === "one or two"; // "one or two target ...": at least one
  const count = firstRequired ? 2 : (toNumber(m[2].slice(6)) ?? 0);
  // "each of one or two targets": any target, each a different one
  const base = m[4] === "targets" ? "any target" : m[4].replace(/^target (creature|permanent|nonland permanent|artifact|enchantment)s/, "target $1").replace(/ and\/or /, " or ").replace(/ or (artifact|enchantment|planeswalker)s\b/, " or $1");
  const spec = targetSpec(base);
  if (!spec || count < 1) return null;
  const out: Effect[] = [];
  const before = ctx.targets.length;
  for (let i = 0; i < count; i++) {
    const key = `${base}@${i}`;
    ctx.targets.push({ ...spec, ...(firstRequired && i === 0 ? {} : { optional: true }), ...(m[3] ? { other: true } : {}), ...(count > 1 ? { distinct: true } : {}), label: firstRequired ? `${i === 0 ? "" : "second "}${base}${i === 0 ? "" : " (optional)"}` : `up to ${count === 1 ? "one" : count} ${base}` });
    ctx.phrases.set(key, ctx.targets.length - 1);
    const effects = parseSimple(`${m[1]}${key}${m[5]}`, ctx);
    if (!effects) {
      ctx.targets.length = before;
      return null;
    }
    out.push(...effects);
  }
  return out;
}

export function parseClause(s: string, ctx: Ctx): Effect[] | null {
  const direct = parseSimple(s, ctx);
  if (direct) return direct;
  const upTo = expandUpTo(s, ctx);
  if (upTo) return upTo;

  // "Scry 2, then draw a card." / "Draw a card, then discard a card." (the second half may wait for a choice made in the first)
  const then = s.indexOf(", then ");
  if (then !== -1) {
    const before = ctx.targets.length;
    const phrases = new Map(ctx.phrases);
    const left = parseClause(s.slice(0, then), ctx);
    const right = left && (parseClause(s.slice(then + 7), ctx) ?? parseClause(`you ${s.slice(then + 7)}`, ctx));
    if (left && right) return [...left, ...right];
    ctx.targets.length = before;
    ctx.phrases = phrases;
  }

  for (let at = s.indexOf(" and "); at !== -1; at = s.indexOf(" and ", at + 1)) {
    const before = ctx.targets.length;
    const phrases = new Map(ctx.phrases);
    const left = parseSimple(s.slice(0, at), ctx);
    const rest = s.slice(at + 5);
    // "~ deals 3 damage to target player and 1 damage to each creature they control": the second half borrows the subject.
    const right = left && (parseSimple(rest, ctx) ?? parseSimple(`you ${rest}`, ctx) ?? parseSimple(`~ deals ${rest}`, ctx) ?? parseSimple(`put ${rest}`, ctx) ?? parseSimple(`that creature ${rest}`, ctx));
    if (left && right) return [...left, ...right];
    ctx.targets.length = before;
    ctx.phrases = phrases;
  }
  return null;
}

/** "a basic Plains card or a creature card with mana value 1 or less": a filter for each alternative. */
function searchFilters(phrase: string): CardFilter[] | null {
  const out: CardFilter[] = [];
  for (const part of phrase.split(/ or (?=an? )/)) {
    const m = /^an? (basic )?(.+?) card(?: with mana value (\d+) or less)?$/.exec(part);
    const filter = m ? parseCardFilter(m[2]) : null;
    if (!filter) return null;
    out.push({ ...filter, ...(m![1] ? { basic: true } : {}), ...(m![3] ? { maxMV: Number(m![3]) } : {}) });
  }
  return out;
}

/** "creature", "instant or sorcery", "nonland", "human", "elf, warrior, or tyvar": what a reveal effect may take. */
function parseCardFilter(phrase: string): CardFilter | null {
  if (phrase === "nonland") return { nonland: true };
  const filter: CardFilter = {};
  for (const term of phrase.split(/, or |, | or /).map((x) => x.trim())) {
    if (CARD_TYPES.includes(term)) (filter.types ??= []).push(term);
    else if (COLOR_OF[term]) (filter.colors ??= []).push(COLOR_OF[term]);
    else if (/^[a-z]+$/.test(term) && term !== "basic" && term !== "legendary") (filter.subtypes ??= []).push(term);
    else return null;
  }
  return filter.types || filter.subtypes || filter.colors ? filter : null;
}
const BASIC_LAND_TYPES = ["plains", "island", "swamp", "mountain", "forest"];

function parseChoiceText(text: string, ctx: Ctx): Effect[] | null {
  const t = text.replace(/\.$/, "");
  if (t === "look at target opponent's hand. you may exile a nonland card from it until ~ leaves the battlefield") {
    const who = refFor("target opponent", ctx);
    return who ? [{ type: "exileFromHand", who }] : null;
  }
  if (t === "target opponent reveals their hand. you choose a card from it. that player discards that card") {
    const who = refFor("target opponent", ctx);
    return who ? [{ type: "discard", who, amount: 1, chooser: "you" }] : null;
  }
  let m = new RegExp(`^look at the top (${NUMBER_WORDS}) cards of your library, then put them back in any order$`).exec(t);
  if (m) return [{ type: "lookPick", mode: "arrange", n: toNumber(m[1]) ?? 0 }];
  if (t === "look at the top two cards of your library. put one of them into your hand and the other on the bottom of your library") {
    return [{ type: "lookPick", mode: "toHand", n: 2 }];
  }
  if (t === "look at the top card of target player's library. you may put that card into their graveyard") {
    const who = refFor("target player", ctx);
    return who ? [{ type: "lookPick", mode: "toGraveyard", n: 1, who }] : null;
  }
  m = new RegExp(`^look at the top (${NUMBER_WORDS}) cards of your library\\. put (one|two) of them into your hand and the (?:rest|other) (on the bottom of your library in any order|into your graveyard)$`).exec(t);
  if (m) return [{ type: "revealToHand", n: toNumber(m[1]) ?? 0, filter: { all: true }, random: false, required: true, restTo: m[3].startsWith("into") ? "graveyard" : "bottom", ...(m[2] === "two" ? { take: 2 } : {}) }];
  // Flow State: "... Put one of them into your hand and the rest on the bottom of your library in any order. If there is an instant card and a sorcery card in your graveyard, instead put two of them ..."
  m = new RegExp(`^look at the top (${NUMBER_WORDS}) cards of your library\\. put one of them into your hand and the rest on the bottom of your library in any order\\. if there is an instant card and a sorcery card in your graveyard, instead put two of them into your hand and the rest on the bottom of your library in any order$`).exec(t);
  if (m) {
    const dig = { type: "revealToHand" as const, n: toNumber(m[1]) ?? 0, filter: { all: true }, random: false, required: true, restTo: "bottom" as const };
    return [{ type: "ifNow", cond: "instantAndSorcery", then: [{ ...dig, take: 2 }], otherwise: [dig] }];
  }
  m = new RegExp(`^reveal the top (${NUMBER_WORDS}) cards of your library\\. put all ([a-z]+) creature cards with mana value (\\d+) or less from among them onto the battlefield and the rest on the bottom of your library in a random order$`).exec(t);
  if (m) return [{ type: "revealPut", n: toNumber(m[1]) ?? 0, filter: { subtypes: [singularType(m[2])] }, maxMV: Number(m[3]) }];
  m = /^search your library for a basic land card, put (?:that card|it) onto the battlefield( tapped)?, then shuffle$/.exec(t);
  if (m) return [{ type: "search", tapped: m[1] !== undefined }];
  // A fetch land: "search your library for a mountain or plains card, put it onto the battlefield, then shuffle"
  m = /^search your library for (an? [a-z ]+? card), put (?:that card|it) onto the battlefield( tapped)?, then shuffle$/.exec(t);
  const lands = m ? searchFilters(m[1]) : null;
  if (m && lands?.every((f) => !f.types && !f.colors && f.subtypes?.every((s) => BASIC_LAND_TYPES.includes(s)))) {
    return [{ type: "search", for: "any", to: "battlefield", tapped: m[2] !== undefined, filters: lands, label: m[1].replace(/^an? /, "") }];
  }
  if (t === "look at the top three cards of your library. put one of them into your hand, put one of them on the bottom of your library, and exile one of them. you may play the exiled card this turn") {
    return [{ type: "lookPick", mode: "iterate", n: 3 }];
  }
  if (t === "look at the top card of target player's library. draw a card at the beginning of the next turn's upkeep") {
    const who = refFor("target player", ctx);
    return who ? [{ type: "lookPick", mode: "look", n: 1, who }, { type: "upkeepDraw" }] : null;
  }
  m = /^search your library for a basic land card, (reveal (?:it|that card), )?put (?:that card|it) into your hand, then shuffle$/.exec(t);
  if (m) return [{ type: "search", for: "basicLand", to: "hand", reveal: m[1] !== undefined }];
  if (t === "search your library for a card, put that card into your hand, then shuffle") return [{ type: "search", for: "any", to: "hand" }];
  m = /^search your library for (an? .+? card(?: with mana value \d+ or less)?(?: or an? .+? card(?: with mana value \d+ or less)?)?), (reveal (?:it|that card), )?put (?:that card|it) into your hand, then shuffle$/.exec(t);
  const filters = m ? searchFilters(m[1]) : null;
  if (m && filters) return [{ type: "search", for: "any", to: "hand", filters, label: m[1].replace(/^an? /, ""), reveal: m[2] !== undefined }];
  const reveal = new RegExp(`^look at the top (${NUMBER_WORDS}|\\d+) cards of your library\\. you may reveal (?:a|an) (.+?) card from among them and put (?:it|that card) into your hand\\. put the rest on the bottom of your library in (a random|any) order$`).exec(t);
  const filter = reveal ? parseCardFilter(reveal[2]) : null;
  if (reveal && filter) return [{ type: "revealToHand", n: toNumber(reveal[1]) ?? 0, filter, random: reveal[3] === "a random", reveal: true }];
  return null;
}

/** The bullet lines of a "Choose one —" block, each read as its own mode. Null if any mode is not understood. */
export function parseModes(bullets: string[], allowSelf: boolean): ModeSpec[] | null {
  const modes: ModeSpec[] = [];
  for (const bullet of bullets) {
    const ctx = newCtx(allowSelf);
    const effects = parseEffectText(bullet, ctx);
    if (!effects || effects.length === 0) return null;
    modes.push({ effects, targets: ctx.targets, text: bullet.charAt(0).toUpperCase() + bullet.slice(1).replace(/\.$/, "") + "." });
  }
  return modes;
}

/** Several sentences. Null if any one of them is not understood. */
export function parseEffectText(rawText: string, ctx: Ctx): Effect[] | null {
  // "You may discard a card. If you do, draw a card." is one effect: the draw depends on the discard.
  const text = rawText
    .replace(/you may draw a card for each artifact you control\. if you do, each opponent draws a card/g, "@@armorwars@@")
    .replace(/(you may put an? [a-z]+ creature card with mana value \d+ or less from your hand onto the battlefield)\. if you don't, draw a card/g, "$1, else draw a card")
    .replace(/you may discard a card\. if you do, draw a card/g, "@@rummage@@")
    .replace(/you may put a card from your hand on the bottom of your library\. if you do, draw a card/g, "@@rummagebottom@@")
    .replace(/exile the top card of your library\. during any turn you attacked with ~, you may play that card/g, "@@exiletopplay@@")
    .replace(/you may have it connive\. do this only once each turn/g, "it connives") // the once-a-turn limit is read by the trigger
    .replace(/exile the top card of your library\. you may play that card until your next end step/g, "@@exiletopuntil@@")
    .replace(/~ becomes an? (\d+\/\d+) ([a-z ]+?) artifact creature( with [a-z ,]+?)? until end of turn\. it's still a land/g, "@@animateland $1 $2$3@@")
    .replace(/exile the top card of your library\. until the end of your next turn, you may play that card/g, "@@exiletopnext@@")
    .replace(/each opponent exiles a card from their hand and may play that card for as long as it remains exiled\. each spell cast this way costs \{(\d+)\} more to cast\. each land played this way enters tapped/g, "@@exiletoplay $1@@")
    .replace(/you may tap any number of untapped creatures you control\. ~ gets \+1\/\+1 until end of turn for each creature tapped this way/g, "@@tapforbonus@@")
    .replace(/put each creature card exiled with ~ onto the battlefield under your control with a flying counter on it\. each of them is a 1\/1 spirit in addition to its other types/g, "@@putexiledwith@@");
  const whole = parseChoiceText(text, ctx);
  if (whole) return whole;
  // "Put two +1/+1 counters on target creature. Look at the top five cards ...": the digging part is the end of the text.
  const dig = text.search(/(?:^|\. )look at the top (?:two|three|four|five|six|seven|\d+) cards of your library\. you may reveal /);
  if (dig > 0) {
    const tail = text.slice(dig).replace(/^\. /, "");
    const head = parseEffectText(text.slice(0, dig).replace(/\.$/, ""), ctx);
    const rest = head ? parseChoiceText(tail, ctx) : null;
    return head && rest ? [...head, ...rest] : null;
  }
  const effects: Effect[] = [];
  let lastGroup = 0; // where the previous sentence's effects start, for "... instead"
  const sentences = text.split(/\.(?:\s+|$)/).map((x) => x.trim()).filter(Boolean);
  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si].replace(/^then /, "");
    // "You may pay {1}. If you do, draw a card." / "You may pay 2 life. ..." / "You may pay {W}{B} and 2 life. ..."
    const payMatch = /^you may pay ((?:\{[^}]+\})+)?(?:(?: and )?(\d+) life)?$/.exec(sentence);
    const pay = payMatch && (payMatch[1] || payMatch[2]) && (!payMatch[1] || parseManaCost(payMatch[1])) ? { cost: payMatch[1] ?? "", ...(payMatch[2] ? { life: Number(payMatch[2]) } : {}) } : null;
    const afterPay = /^if you do, (.+)$/.exec(sentences[si + 1] ?? "");
    const reflexive = /^when you do, (?:you may )?(.+)$/.exec(sentences[si + 1] ?? "");
    if (sentence === "you may discard a card" && reflexive) {
      // "You may discard a card. When you do, put a +1/+1 counter on target attacking creature. It gains trample until end of turn."
      // The sentence after it is about the same target, so it is part of the new ability.
      const more = /^it gains [a-z ]+ until end of turn$/.test(sentences[si + 2] ?? "") ? `. ${sentences[si + 2]}` : "";
      const inner = newCtx(true);
      const then = parseEffectText(`${reflexive[1]}${more}`, inner);
      if (!then || then.length === 0) return null;
      lastGroup = effects.length;
      effects.push({ type: "mayDiscard", then, ...(inner.targets.length > 0 ? { thenSpecs: inner.targets } : {}) });
      si += more ? 2 : 1;
      continue;
    }
    // "You may sacrifice an artifact or discard a card. If you do, draw a card." / "...discard a nonland card. When you do, ~ deals 2 damage to any target."
    const sacChoice = /^you may (sacrifice an artifact or discard a card|sacrifice an artifact or discard a nonland card|sacrifice another creature)$/.exec(sentence);
    const doNext = /^(if|when) you do, (.+)$/.exec(sentences[si + 1] ?? "");
    if (sacChoice && doNext) {
      const targeted = doNext[1] === "when";
      const inner = targeted ? newCtx(true) : ctx;
      const then = parseClause(doNext[2].replace(/^it deals /, "~ deals "), inner);
      if (!then || then.length === 0) return null;
      lastGroup = effects.length;
      const cost = sacChoice[1] === "sacrifice another creature" ? "otherCreature" : sacChoice[1].endsWith("nonland card") ? "artifactOrNonland" : "artifactOrCard";
      effects.push({ type: "mayCost", cost, then, ...(targeted && inner.targets.length > 0 ? { thenSpecs: inner.targets.map((t) => ({ ...t })) } : {}) });
      si++;
      continue;
    }
    if (pay && reflexive) {
      // "You may pay {1}. When you do, you may tap or untap target creature.": the target is chosen after paying.
      const inner = newCtx(true);
      const then = parseClause(reflexive[1], inner);
      if (!then || inner.targets.length === 0) return null;
      lastGroup = effects.length;
      effects.push({ type: "mayPay", ...pay, then, thenSpecs: inner.targets.map((t) => ({ ...t, optional: true })) });
      si++;
      continue;
    }
    if (pay && afterPay) {
      const then = parseClause(afterPay[1], ctx);
      if (!then) return null;
      // "If it's a Unicorn, put two +1/+1 counters on it instead."
      const instead = /^if it's an? ([a-z]+), put (two|three|four) \+1\/\+1 counters on it instead$/.exec(sentences[si + 2] ?? "");
      if (instead && then.length === 1 && then[0].type === "addCounters" && typeof then[0].amount === "number") {
        then[0] = { ...then[0], amount: { count: { kind: "ifOtherSubtype", subtype: instead[1], yes: toNumber(instead[2]) ?? 2, no: then[0].amount } } };
        si++;
      }
      lastGroup = effects.length;
      effects.push({ type: "mayPay", ...pay, then });
      si++;
      continue;
    }
    // "If this spell's additional cost was paid" (an optional blight): paying it counts as kicking.
    const kicked = /^if (?:~|this spell|it) was kicked, (.+)$/.exec(sentence) ?? /^if ~'s additional cost was paid, (.+)$/.exec(sentence) ?? /^if ~ was cast using teamwork, (.+)$/.exec(sentence);
    if (kicked) {
      const instead = kicked[1].endsWith(" instead");
      const body = (instead ? kicked[1].slice(0, -" instead".length) : kicked[1]).replace(/^(it|that creature) also /, "$1 ");
      const previous = effects.slice(lastGroup);
      // "It deals 5 damage instead": the same target, a different amount
      const amount = /^(?:it|~) deals (\d+|x) damage(?: to that creature)?$/.exec(body);
      const prevDamage = previous.length === 1 && previous[0].type === "damage" ? previous[0] : null;
      const then = amount && prevDamage ? ([{ ...prevDamage, amount: toAmount(amount[1])! }] as Effect[]) : parseClause(body.replace(/^it deals /, "~ deals "), ctx);
      if (!then) return null;
      if (instead) {
        if (previous.length === 0) return null;
        effects.splice(lastGroup, previous.length, { type: "ifKicked", then, otherwise: previous });
      } else {
        lastGroup = effects.length;
        effects.push({ type: "ifKicked", then });
      }
      continue;
    }
    // "If you cast this spell during your main phase, ... instead." / "Landfall — If you had a land enter the battlefield under your control this turn, ... instead."
    const nowIf = /^(?:landfall — )?if (you cast ~ during your main phase|you had a land enter the battlefield under your control this turn), (.+) instead$/.exec(sentence);
    if (nowIf) {
      const previous = effects.slice(lastGroup);
      const then = parseClause(nowIf[2], ctx);
      if (!then || previous.length === 0) return null;
      effects.splice(lastGroup, previous.length, { type: "ifNow", cond: nowIf[1].startsWith("you cast") ? "yourMainPhase" : "landEntered", then, otherwise: previous });
      continue;
    }
    // Ferocious: "That creature also gains trample until end of turn if you control a creature with power 4 or greater." (or the condition first)
    const ferocious = /^(?:ferocious — )?(?:if you control a creature with power 4 or greater, (.+)|(.+) if you control a creature with power 4 or greater)$/.exec(sentence);
    if (ferocious) {
      const then = parseClause((ferocious[1] ?? ferocious[2]).replace(/^(it|that creature) also /, "$1 "), ctx);
      if (!then) return null;
      lastGroup = effects.length;
      effects.push({ type: "ifNow", cond: "ferocious", then });
      continue;
    }
    // Delirium: "~ deals 6 damage instead if there are four or more card types among cards in your graveyard."
    const deliriumMore = /^(?:delirium — )?~ deals (\d+) damage instead if there are four or more card types among cards in your graveyard$/.exec(sentence);
    if (deliriumMore) {
      const previous = effects.slice(lastGroup);
      if (previous.length !== 1 || previous[0].type !== "damage") return null;
      effects.splice(lastGroup, 1, { type: "ifNow", cond: "delirium", then: [{ ...previous[0], amount: Number(deliriumMore[1]) }], otherwise: previous });
      continue;
    }
    // Delirium: "If there are four or more card types among cards in your graveyard, that creature gains double strike until end of turn."
    const delirium = /^(?:delirium — )?if there are four or more card types among cards in your graveyard, (.+)$/.exec(sentence);
    if (delirium) {
      const then = parseClause(delirium[1], ctx);
      if (!then) return null;
      lastGroup = effects.length;
      effects.push({ type: "ifNow", cond: "delirium", then });
      continue;
    }
    // "Return target nonland permanent to its owner's hand. If you controlled that permanent, draw a card."
    const controlled = /^if you controlled that permanent, (.+)$/.exec(sentence);
    if (controlled) {
      const i = ctx.targets.length - 1;
      const then = i >= 0 ? parseClause(controlled[1], ctx) : null;
      if (!then) return null;
      lastGroup = effects.length;
      effects.push({ type: "ifControlledTarget", i, then });
      continue;
    }
    // "Create a 1/1 white Monk creature token with prowess. You may attach ~ to it."
    if (sentence === "you may attach ~ to it" && effects.at(-1)?.type === "createToken") {
      lastGroup = effects.length;
      effects.push({ type: "mayPay", cost: "", prompt: "attach it to the token just created?", then: [{ type: "attachToCreated" }] });
      continue;
    }
    // "Put a +1/+1 counter on target creature. If that creature is another Hero, put two +1/+1 counters on it instead."
    const insteadSub = /^if that creature is another ([a-z]+), put (two|three|four) \+1\/\+1 counters on it instead$/.exec(sentence);
    if (insteadSub) {
      const prev = effects.slice(lastGroup);
      if (prev.length !== 1 || prev[0].type !== "addCounters" || typeof prev[0].amount !== "number" || prev[0].what.t !== "target") return null;
      effects[lastGroup] = { ...prev[0], amount: { count: { kind: "ifTargetSubtype", i: prev[0].what.i, subtype: insteadSub[1], notSelf: true, yes: toNumber(insteadSub[2]) ?? 2, no: prev[0].amount } } };
      continue;
    }
    // "Create a tapped 2/1 Villain token if there are two or more creature cards in your graveyard. Otherwise, mill two cards."
    const yardIf = /^(.+) if there are (two|three|\d+) or more creature cards in your graveyard$/.exec(sentence);
    if (yardIf) {
      const then = parseClause(yardIf[1], ctx);
      const other = /^otherwise, (.+)$/.exec(sentences[si + 1] ?? "");
      const otherwise = other ? parseClause(other[1], ctx) : undefined;
      if (!then || (other && !otherwise)) return null;
      lastGroup = effects.length;
      effects.push({ type: "ifYardCreatures", n: toNumber(yardIf[2]) ?? 2, then, ...(otherwise ? { otherwise } : {}) });
      if (other) si++;
      continue;
    }
    const parsed = parseClause(sentence, ctx);
    if (!parsed) return null;
    lastGroup = effects.length;
    effects.push(...parsed);
  }
  return effects;
}
