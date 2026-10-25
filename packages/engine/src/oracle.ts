import type { ActivatedAbility, CardFilter, CountSpec, Effect, LoyaltyAbility, ModeSpec, ParsedCard, Ref, StaticEffect, TargetSpec, TokenSpec, TriggeredAbility } from "./effects.js";
import { SUPPORTED_KEYWORDS } from "./keywords.js";
import type { Keyword } from "./keywords.js";
import { keywordsSupported } from "./keywords.js";
import { landManaColors, manaAbilityColors, manaAbilityUsesChosenColor, manaCostOf, parseManaCost } from "./mana.js";
import type { CardDef } from "./types.js";

// Reads a card's rules text and turns it into structured effects (see effects.ts).
// The reader is strict on purpose: if any line of a card is not fully understood, the card is reported as
// not ok and stays unplayable. A half-understood card would behave wrongly, which is worse than missing.

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const toAmount = (word: string): number | "X" | null => (word === "x" ? "X" : toNumber(word));
const toNumber = (word: string): number | null => (/^\d+$/.test(word) ? Number(word) : (NUMBERS[word] ?? null));

const KEYWORD_SET = new Set<string>(SUPPORTED_KEYWORDS);
const isKeyword = (word: string): word is Keyword => KEYWORD_SET.has(word);

const COLOR_OF: Record<string, string> = { black: "B", white: "W", blue: "U", red: "R", green: "G" };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Reminder text removed, the card's own name replaced by "~", and everything lower-cased. Lines are kept apart. */
export function normalizeText(def: CardDef): string {
  let text = (def.text ?? "").replace(/\([^)]*\)/g, "");
  for (const name of new Set([def.name, def.name.split(",")[0]])) {
    if (name.length >= 3) text = text.replace(new RegExp(escapeRegex(name), "gi"), "~");
  }
  text = text.replace(/\bthis (creature|permanent|spell|artifact|enchantment|land|aura|equipment|vehicle|card)\b/gi, "~").toLowerCase();
  text = text.replace(/\{([^}]+)\}/g, (_, symbol: string) => `{${symbol.toUpperCase()}}`).replace(/\u2212/g, "-"); // a real minus sign in loyalty costs
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ───────── targets ─────────

interface Ctx {
  /** In triggers and activated abilities "it" is the permanent itself; in a spell it is the last thing targeted. */
  allowSelf?: boolean;
  targets: TargetSpec[];
  /** The same phrase twice in one text ("target creature ... that creature") is one target. */
  phrases: Map<string, number>;
}

function targetSpec(phrase: string): TargetSpec | null {
  if (phrase === "any target") return { kind: "any", label: phrase };
  if (phrase === "target creature or player" || phrase === "target player or creature") return { kind: "any", label: phrase };
  if (phrase === "target player or planeswalker") return { kind: "playerOrPlaneswalker", label: phrase };
  if (phrase === "target creature or planeswalker") return { kind: "creatureOrPlaneswalker", label: phrase };
  if (phrase === "target planeswalker") return { kind: "planeswalker", label: phrase };
  if (phrase === "target spell") return { kind: "spell", label: phrase };
  if (phrase === "target player") return { kind: "player", label: phrase };
  if (phrase === "target opponent") return { kind: "player", opponentOnly: true, label: phrase };
  if (phrase === "target permanent") return { kind: "permanent", label: phrase };
  const nonland = /^target nonland permanent( you control| an opponent controls)?$/.exec(phrase);
  if (nonland) return { kind: "permanent", nonland: true, ...(nonland[1] ? { controller: nonland[1].trim() === "you control" ? ("you" as const) : ("opponent" as const) } : {}), label: phrase };
  const spellKind = /^target (creature|noncreature|artifact or creature) spell$/.exec(phrase);
  if (spellKind) return { kind: "spell", spellKind: spellKind[1] === "creature" ? "creature" : spellKind[1] === "noncreature" ? "noncreature" : "artifactOrCreature", label: phrase };
  if (phrase === "target land") return { kind: "land", label: phrase };
  if (phrase === "target artifact or land") return { kind: "artifactOrLand", label: phrase };
  if (phrase === "target artifact") return { kind: "artifact", label: phrase };
  if (phrase === "target enchantment") return { kind: "enchantment", label: phrase };
  if (phrase === "target artifact or enchantment") return { kind: "artifactOrEnchantment", label: phrase };
  if (phrase === "target creature card from your graveyard") return { kind: "graveyardCreature", controller: "you", label: phrase };
  if (phrase === "target instant or sorcery card from your graveyard") return { kind: "graveyardSpell", controller: "you", label: phrase };
  // "target nonartifact, nonblack creature with flying an opponent controls": any mix of these parts
  const m = /^target ((?:non[a-z]+(?:,? (?:and )?| ))*)(tapped |attacking |attacking or blocking )?creature(?: (with|without) ([a-z ]+?))?(?: with power (\d+) or (less|greater))?(?: (you control|an opponent controls|you don't control|your opponents control))?$/.exec(phrase);
  if (m) {
    const spec: TargetSpec = { kind: "creature", label: phrase };
    for (const non of m[1].match(/non([a-z]+)/g) ?? []) {
      const word = non.slice(3);
      if (word === "artifact") spec.notArtifact = true;
      else if (COLOR_OF[word]) spec.notColors = [...(spec.notColors ?? []), COLOR_OF[word]];
      else return null;
    }
    if (m[2]) spec.filter = m[2].trim() === "tapped" ? "tapped" : m[2].trim() === "attacking" ? "attacking" : "attackingOrBlocking";
    if (m[3]) {
      if (!isKeyword(m[4])) return null;
      spec.keyword = { name: m[4], has: m[3] === "with" };
    }
    if (m[5]) spec.power = { n: Number(m[5]), op: m[6] === "less" ? "max" : "min" };
    if (m[7]) spec.controller = m[7] === "you control" ? "you" : "opponent";
    return spec;
  }
  return null;
}

/** A phrase naming who or what an effect applies to: a target, "you", "each opponent", "each creature"... */
function refFor(phrase: string, ctx: Ctx): Ref | null {
  switch (phrase) {
    case "you":
      return { t: "you" };
    case "~":
      return { t: "self" };
    case "each opponent":
    case "your opponents":
      return { t: "opp" };
    case "each player":
      return { t: "eachPlayer" };
    case "enchanted creature":
    case "enchanted permanent":
    case "equipped creature":
      return { t: "enchanted" };
    case "its owner":
    case "that creature's owner":
    case "its controller":
    case "that creature's controller": {
      if (ctx.targets.length === 0) return null;
      return { t: phrase.endsWith("owner") ? "ownerOf" : "controllerOf", i: ctx.targets.length - 1 };
    }
    case "it":
    case "that creature":
    case "that permanent":
      if (ctx.targets.length > 0) return { t: "target", i: ctx.targets.length - 1 };
      return ctx.allowSelf ? { t: "self" } : null;
    case "attacking creatures":
    case "each attacking creature":
      return { t: "attackingCreatures" };
    case "each creature that player controls": {
      const player = ctx.phrases.get("target player");
      return player === undefined ? null : { t: "creaturesOf", i: player };
    }
    case "each creature":
    case "all creatures":
      return { t: "allCreatures", scope: "all" };
    case "each creature you control":
    case "all creatures you control":
    case "creatures you control":
      return { t: "allCreatures", scope: "yours" };
    case "each creature you don't control":
    case "each creature your opponents control":
    case "all creatures you don't control":
    case "creatures you don't control":
    case "creatures your opponents control":
      return { t: "allCreatures", scope: "opponents" };
  }
  const known = ctx.phrases.get(phrase);
  if (known !== undefined) return { t: "target", i: known };
  const spec = targetSpec(phrase);
  if (!spec) return null;
  ctx.targets.push(spec);
  ctx.phrases.set(phrase, ctx.targets.length - 1);
  return { t: "target", i: ctx.targets.length - 1 };
}

const isCreatureRef = (r: Ref, ctx: Ctx) =>
  r.t === "allCreatures" || r.t === "attackingCreatures" || r.t === "creaturesOf" || r.t === "enchanted" || r.t === "self" || (r.t === "target" && (ctx.targets[r.i].kind === "creature" || ctx.targets[r.i].kind === "creatureOrPlaneswalker"));
/** Something that can be destroyed: a creature, or a targeted land / artifact. */
const isPermanentRef = (r: Ref, ctx: Ctx) =>
  isCreatureRef(r, ctx) || (r.t === "target" && ["permanent", "land", "artifact", "artifactOrLand", "enchantment", "artifactOrEnchantment", "planeswalker"].includes(ctx.targets[r.i].kind));
const isPlayerRef = (r: Ref, ctx: Ctx) =>
  r.t === "you" || r.t === "opp" || r.t === "eachPlayer" || r.t === "ownerOf" || r.t === "controllerOf" || (r.t === "target" && (ctx.targets[r.i].kind === "player" || ctx.targets[r.i].kind === "playerOrPlaneswalker"));

// ───────── sentences ─────────

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

const damage: SentenceParser = (s, ctx) => {
  // "~ deals damage to target creature equal to the number of Mountains you control"
  const counted = /^~ deals damage to (.+?) equal to the number of (.+)$/.exec(s);
  if (counted) {
    const count = parseCount(counted[2]);
    const at = refFor(counted[1], ctx);
    return count && at && !(at.t === "target" && ctx.targets[at.i].kind === "spell") ? [{ type: "damage", amount: { count }, to: at }] : null;
  }
  const m = /^~ deals (\d+|x) damage to (.+)$/.exec(s);
  if (!m) return null;
  const amount = toAmount(m[1])!;
  if (m[2] === "each creature and each player") {
    return [{ type: "damage", amount, to: { t: "allCreatures", scope: "all" } }, { type: "damage", amount, to: { t: "eachPlayer" } }];
  }
  const to = refFor(m[2], ctx);
  if (!to || (to.t === "target" && ctx.targets[to.i].kind === "spell")) return null;
  return [{ type: "damage", amount, to }];
};

const draw: SentenceParser = (s, ctx) => {
  const m = /^(?:(you|target player|target opponent|each player|each opponent) )?draws? (a|an|one|two|three|four|five|six|seven|\d+|x) cards?$/.exec(s);
  if (!m) return null;
  const amount = toAmount(m[2]);
  const who = refFor(m[1] ?? "you", ctx);
  return amount !== null && who && isPlayerRef(who, ctx) ? [{ type: "draw", amount, who }] : null;
};

const life: SentenceParser = (s, ctx) => {
  const m = /^(you|target player|target opponent|each player|each opponent|its owner|its controller|that creature's owner|that creature's controller) (gain|gains|lose|loses) (\d+|x) life$/.exec(s);
  if (!m) return null;
  const who = refFor(m[1], ctx);
  if (!who || !isPlayerRef(who, ctx)) return null;
  return [{ type: m[2].startsWith("gain") ? "gainLife" : "loseLife", amount: toAmount(m[3])!, who }];
};

/** "destroy / exile / return to hand / tap / untap" and similar one-object effects on creatures. */
function creatureVerb(re: RegExp, make: (what: Ref, m: RegExpExecArray) => Effect): SentenceParser {
  return (s, ctx) => {
    const m = re.exec(s);
    if (!m) return null;
    const what = refFor(m[1], ctx);
    return what && isCreatureRef(what, ctx) ? [make(what, m)] : null;
  };
}

const destroy: SentenceParser = (s, ctx) => {
  const m = /^destroy (.+)$/.exec(s);
  if (!m) return null;
  const what = refFor(m[1], ctx);
  return what && isPermanentRef(what, ctx) ? [{ type: "destroy", what }] : null;
};
const topOfLibrary = creatureVerb(/^put (.+) on top of its owner's library$/, (what) => ({ type: "topOfLibrary", what }));

/** "Return target creature card from your graveyard to the battlefield (tapped) / to your hand." */
const reanimate: SentenceParser = (s, ctx) => {
  const m = /^(?:you may )?return (target (?:creature|instant or sorcery) card from your graveyard) to (the battlefield tapped|the battlefield|your hand)$/.exec(s);
  if (!m || (m[1].includes("instant") && m[2] !== "your hand")) return null;
  const what = refFor(m[1], ctx);
  if (!what) return null;
  return [{ type: "reanimate", what, to: m[2] === "your hand" ? "hand" : "battlefield", tapped: m[2].endsWith("tapped") }];
};

/** "flying", "flying and lifelink", "flying, first strike and lifelink": every word must be a supported keyword. */
function keywordList(text: string): Keyword[] | null {
  const words = text.split(/, and |, | and /).map((w) => w.trim());
  return words.length > 0 && words.every(isKeyword) ? (words as Keyword[]) : null;
}
/** Like creatureVerb, but any permanent: "return target nonland permanent to its owner's hand". */
function permanentVerb(re: RegExp, make: (what: Ref) => Effect): SentenceParser {
  return (s, ctx) => {
    const m = re.exec(s);
    if (!m) return null;
    const what = refFor(m[1], ctx);
    return what && isPermanentRef(what, ctx) ? [make(what)] : null;
  };
}
const exile = permanentVerb(/^exile (.+)$/, (what) => ({ type: "exile", what }));
const bounce = permanentVerb(/^return (.+) to (?:its|their) owner's hand$/, (what) => ({ type: "bounce", what }));
const tapUntap = creatureVerb(/^(?:tap|untap) (.+)$/, (what, m) => ({ type: m[0].startsWith("tap") ? "tap" : "untap", what }));

const pump: SentenceParser = (s, ctx) => {
  const m = /^(.+?) gets? ([+-]\d+)\/([+-]\d+)(?: and gains? ([a-z ,]+?))? until end of turn$/.exec(s);
  if (!m) return null;
  const keywords = m[4] !== undefined ? keywordList(m[4]) : [];
  if (!keywords) return null;
  const what = refFor(m[1], ctx);
  if (!what || !isCreatureRef(what, ctx)) return null;
  return [{ type: "pump", power: Number(m[2]), toughness: Number(m[3]), what }, ...keywords.map((keyword): Effect => ({ type: "grant", keyword, what }))];
};

const grant: SentenceParser = (s, ctx) => {
  const m = /^(.+?) gains? ([a-z ,]+?) until end of turn$/.exec(s);
  const keywords = m ? keywordList(m[2]) : null;
  if (!m || !keywords) return null;
  const what = refFor(m[1], ctx);
  return what && isCreatureRef(what, ctx) ? keywords.map((keyword): Effect => ({ type: "grant", keyword, what })) : null;
};

const counter: SentenceParser = (s, ctx) => {
  const m = /^counter (target (?:(?:creature|noncreature|artifact or creature) )?spell)$/.exec(s);
  if (!m) return null;
  const what = refFor(m[1], ctx);
  return what ? [{ type: "counter", what }] : null;
};

/** There is no regeneration in the engine, so "it can't be regenerated" changes nothing. */
const noRegen: SentenceParser = (s) =>
  /^(?:(?:it|they) can't be regenerated(?: this turn)?|(?:a|that) creature dealt damage this way can't be regenerated this turn)$/.test(s) ? [{ type: "noRegen" }] : null;

/** "Target creature you control fights target creature you don't control." */
const fight: SentenceParser = (s, ctx) => {
  const m = /^(target creature you control) fights (target creature you don't control|target creature an opponent controls)$/.exec(s);
  if (!m) return null;
  const a = refFor(m[1], ctx);
  const b = refFor(m[2], ctx);
  return a && b ? [{ type: "fight", a, b }] : null;
};

/** "Target creature you control deals damage equal to its power to target creature you don't control." */
const bite: SentenceParser = (s, ctx) => {
  const m = /^(~|target creature you control) deals damage equal to its power to (target creature(?: you don't control| an opponent controls)?)$/.exec(s);
  if (!m) return null;
  const from = refFor(m[1], ctx);
  const to = refFor(m[2], ctx);
  return from && to ? [{ type: "bite", from, to }] : null;
};

const gainControl = creatureVerb(/^gain control of (.+) until end of turn$/, (what) => ({ type: "gainControl", what }));
const cantBlockNow = creatureVerb(/^(.+) can't block this turn$/, (what) => ({ type: "cantBlockThisTurn", what }));
const regenerate = creatureVerb(/^regenerate (.+)$/, (what) => ({ type: "regenerate", what }));

/** "Put a +1/+1 counter on target creature", "put two +1/+1 counters on ~". */
const counters: SentenceParser = (s, ctx) => {
  const m = /^put (a|an|one|two|three|four|\d+|x) (\+1\/\+1|-1\/-1) counters? on (.+)$/.exec(s);
  if (!m) return null;
  const amount = toAmount(m[1]);
  const what = refFor(m[3], ctx);
  return amount !== null && what && isCreatureRef(what, ctx) ? [{ type: "addCounters", amount, what, ...(m[2] === "-1/-1" ? { kind: "minus" as const } : {}) }] : null;
};

/** "target player mills three cards": the top cards of their library go to the graveyard. */
const mill: SentenceParser = (s, ctx) => {
  const m = /^(?:(you|target player|target opponent|each opponent|each player) )?mills? (a|one|two|three|four|five|six|seven|eight|nine|ten|\d+|x) cards?$/.exec(s);
  if (!m) return null;
  const amount = toAmount(m[2]);
  const who = refFor(m[1] ?? "you", ctx);
  return amount !== null && who && isPlayerRef(who, ctx) ? [{ type: "mill", amount, who }] : null;
};

/** "scry 2": the player may put any of the top cards on the bottom. Waits for the player, so nothing else can follow. */
const scry: SentenceParser = (s) => {
  const m = /^scry (a|one|two|three|four|five|\d+)$/.exec(s);
  const n = m ? toNumber(m[1]) : null;
  return n ? [{ type: "scry", n }] : null;
};

/** "surveil 2": like scry, but the cards you don't keep go to the graveyard. */
const surveil: SentenceParser = (s) => {
  const m = /^surveil (a|one|two|three|four|five|\d+)$/.exec(s);
  const n = m ? toNumber(m[1]) : null;
  return n ? [{ type: "surveil", n }] : null;
};

const TOKEN_COLOR: Record<string, string> = { white: "W", blue: "U", black: "B", red: "R", green: "G" };
const FOOD: TokenSpec = { name: "Food", type: "artifact", colors: [], subtypes: "Food", keywords: [], text: "{2}, {T}, Sacrifice this artifact: You gain 3 life." };
const CLUE: TokenSpec = { name: "Clue", type: "artifact", colors: [], subtypes: "Clue", keywords: [], text: "{2}, Sacrifice this artifact: Draw a card." };
const TREASURE: TokenSpec = { name: "Treasure", type: "artifact", colors: [], subtypes: "Treasure", keywords: [], text: "{T}, Sacrifice this artifact: Add one mana of any color." };

/** "Create a Treasure token", "create two 1/1 white Soldier creature tokens", "...with flying". */
const createToken: SentenceParser = (s) => {
  const m = /^create (a|an|one|two|three|four|five|\d+|x) (.+?) tokens?(?: with ([a-z ,]+))?$/.exec(s);
  const amount = m ? toAmount(m[1]) : null;
  if (!m || amount === null) return null;
  if (m[2] === "treasure") return m[3] === undefined ? [{ type: "createToken", token: TREASURE, amount }] : null;
  if (m[2] === "food") return m[3] === undefined ? [{ type: "createToken", token: FOOD, amount }] : null;
  if (m[2] === "clue") return m[3] === undefined ? [{ type: "createToken", token: CLUE, amount }] : null;
  const body = /^(\d+)\/(\d+) (?:(colorless|white|blue|black|red|green)(?:(?:,| and) (white|blue|black|red|green))* )?([a-z]+(?: [a-z]+)*?) creature$/.exec(m[2]);
  if (!body || body[5].includes("legendary")) return null;
  const artifactToken = /(?:^| )artifact$/.test(body[5]);
  if (body[5].includes("artifact") && !artifactToken) return null;
  const colors = [...m[2].matchAll(/\b(white|blue|black|red|green)\b/g)].map((c) => TOKEN_COLOR[c[1]]);
  const keywords = m[3] === undefined ? [] : keywordList(m[3]);
  if (!keywords) return null;
  const subtypes = body[5].replace(/ ?artifact$/, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return [{ type: "createToken", amount, token: { name: subtypes, type: "creature", power: Number(body[1]), toughness: Number(body[2]), colors, subtypes, keywords, text: "", ...(artifactToken ? { artifact: true } : {}) } }];
};

/** "target player discards two cards": the player who discards chooses which. */
const discard: SentenceParser = (s, ctx) => {
  const m = /^(?:(you|target player|target opponent|each opponent) )?discards? (a|one|two|three|\d+) cards?$/.exec(s);
  if (!m) return null;
  const amount = toNumber(m[2]);
  const who = refFor(m[1] ?? "you", ctx);
  return amount !== null && who && isPlayerRef(who, ctx) ? [{ type: "discard", who, amount, chooser: "victim" }] : null;
};

/** "~ deals damage equal to the sacrificed creature's power to any target" (the power is remembered when the creature is sacrificed as a cost). */
const flingDamage: SentenceParser = (s, ctx) => {
  const m = /^~ deals damage equal to the sacrificed creature's power to (.+)$/.exec(s);
  const to = m ? refFor(m[1], ctx) : null;
  return to ? [{ type: "damage", amount: "X", to }] : null;
};
const investigate: SentenceParser = (s) => (s === "investigate" ? [{ type: "createToken", token: CLUE, amount: 1 }] : null);

/** "Put a stun counter on it": the next time it would untap, it doesn't. */
const stunCounter: SentenceParser = (s, ctx) => {
  const m = /^put a stun counter on (.+)$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return what && isCreatureRef(what, ctx) ? [{ type: "stun", what }] : null;
};

const unblockable = creatureVerb(/^(.+) can't be blocked this turn$/, (what) => ({ type: "unblockable", what }));

/** "Exile target nonland permanent an opponent controls until ~ leaves the battlefield." */
const exileUntil: SentenceParser = (s, ctx) => {
  const m = /^exile ((?:another )?target (?:nonland permanent|creature) an opponent controls|another target creature you control) until ~ leaves the battlefield$/.exec(s);
  const what = m ? refFor(m[1].replace(/^another /, ""), ctx) : null;
  return what ? [{ type: "exileUntilLeaves", what }] : null;
};

/** "creature", "artifact or creature", "land", "forest", "goblin", "permanent": what may be sacrificed as a cost. */
function parseSacrificeFilter(phrase: string): CardFilter | null {
  if (phrase === "permanent") return { all: true };
  const filter: CardFilter = {};
  for (const term of phrase.split(/ or /).map((x) => x.trim())) {
    if (["creature", "artifact", "land", "enchantment"].includes(term)) (filter.types ??= []).push(term);
    else if (["plains", "island", "swamp", "mountain", "forest"].includes(term)) (filter.subtypes ??= []).push(term);
    else if (/^[a-z]+$/.test(term)) (filter.subtypes ??= []).push(term); // a creature type: goblin, elf...
    else return null;
  }
  return filter.types || filter.subtypes ? filter : null;
}

const sacrificeIt: SentenceParser = (s) => (s === "sacrifice it" || s === "sacrifice ~" ? [{ type: "sacrifice", what: { t: "self" } }] : null);

const returnSelfYard: SentenceParser = (s) => (s === "return ~ from your graveyard to your hand" ? [{ type: "returnFromYard" }] : null);

const fog: SentenceParser = (s) => (s === "prevent all combat damage that would be dealt this turn" ? [{ type: "fog" }] : null);
const rummage: SentenceParser = (s) => (s === "@@rummage@@" ? [{ type: "rummage" }] : null);

/** "Attach it to target creature you control" (an Equipment that attaches itself as it enters). */
const attachSelf: SentenceParser = (s, ctx) => {
  const m = /^attach (?:~|it) to (target creature you control)$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return what ? [{ type: "attach", what }] : null;
};

/** "Counter target spell unless its controller pays {2}." */
const counterUnless: SentenceParser = (s, ctx) => {
  const m = /^counter (target spell) unless its controller pays ((?:\{[^}]+\})+)$/.exec(s);
  const what = m ? refFor(m[1], ctx) : null;
  return m && what && parseManaCost(m[2]) ? [{ type: "counterUnlessPay", what, cost: m[2] }] : null;
};

const PARSERS: SentenceParser[] = [sacrificeIt, returnSelfYard, flingDamage, investigate, stunCounter, unblockable, exileUntil, fog, rummage, attachSelf, counterUnless, damage, draw, life, mill, scry, surveil, createToken, discard, fight, bite, gainControl, cantBlockNow, regenerate, counters, destroy, exile, bounce, topOfLibrary, reanimate, tapUntap, pump, grant, counter, noRegen];

function parseSimple(s: string, ctx: Ctx): Effect[] | null {
  for (const parse of PARSERS) {
    const result = parse(s, ctx);
    if (result) return result;
  }
  return null;
}

/** One sentence, or two joined by "and" ("you gain 3 life and draw a card"). Undoes target bookkeeping on a failed try. */
function parseClause(s: string, ctx: Ctx): Effect[] | null {
  const direct = parseSimple(s, ctx);
  if (direct) return direct;

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
    const right = left && (parseSimple(rest, ctx) ?? parseSimple(`you ${rest}`, ctx) ?? parseSimple(`~ deals ${rest}`, ctx));
    if (left && right) return [...left, ...right];
    ctx.targets.length = before;
    ctx.phrases = phrases;
  }
  return null;
}

/**
 * Whole spells that ask the player to choose cards. Each is matched as a whole, because a choice needs the game to
 * stop and wait, so these can't be mixed with other effects.
 */
const NUMBER_WORDS = "two|three|four|five|six|seven";
const CARD_TYPES = ["creature", "land", "instant", "sorcery", "artifact", "enchantment", "planeswalker"];

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
function parseChoiceText(text: string, ctx: Ctx): Effect[] | null {
  const t = text.replace(/\.$/, "");
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
  m = new RegExp(`^look at the top (${NUMBER_WORDS}) cards of your library\. put one of them into your hand and the (?:rest|other) (on the bottom of your library in any order|into your graveyard)$`).exec(t);
  if (m) return [{ type: "revealToHand", n: toNumber(m[1]) ?? 0, filter: { all: true }, random: false, required: true, restTo: m[2].startsWith("into") ? "graveyard" : "bottom" }];
  m = /^search your library for a basic land card, put (?:that card|it) onto the battlefield( tapped)?, then shuffle$/.exec(t);
  if (m) return [{ type: "search", tapped: m[1] !== undefined }];
  if (/^search your library for a basic land card, (?:reveal (?:it|that card), )?put (?:that card|it) into your hand, then shuffle$/.test(t)) return [{ type: "search", for: "basicLand", to: "hand" }];
  if (t === "search your library for a card, put that card into your hand, then shuffle") return [{ type: "search", for: "any", to: "hand" }];
  const reveal = new RegExp(`^look at the top (${NUMBER_WORDS}|\\d+) cards of your library\\. you may reveal (?:a|an) (.+?) card from among them and put (?:it|that card) into your hand\\. put the rest on the bottom of your library in (a random|any) order$`).exec(t);
  const filter = reveal ? parseCardFilter(reveal[2]) : null;
  if (reveal && filter) return [{ type: "revealToHand", n: toNumber(reveal[1]) ?? 0, filter, random: reveal[3] === "a random" }];
  return null;
}

/** The bullet lines of a "Choose one —" block, each read as its own mode. Null if any mode is not understood. */
function parseModes(bullets: string[], allowSelf: boolean): ModeSpec[] | null {
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
function parseEffectText(rawText: string, ctx: Ctx): Effect[] | null {
  // "You may discard a card. If you do, draw a card." is one effect: the draw depends on the discard.
  const text = rawText.replace(/you may discard a card\. if you do, draw a card/g, "@@rummage@@");
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
  for (const sentence of text.split(/\.(?:\s+|$)/).map((x) => x.trim()).filter(Boolean)) {
    const kicked = /^if (?:~|this spell|it) was kicked, (.+)$/.exec(sentence);
    if (kicked) {
      const instead = kicked[1].endsWith(" instead");
      const body = instead ? kicked[1].slice(0, -" instead".length) : kicked[1];
      const previous = effects.slice(lastGroup);
      // "It deals 5 damage instead": the same target, a different amount
      const amount = /^(?:it|~) deals (\d+|x) damage$/.exec(body);
      const prevDamage = previous.length === 1 && previous[0].type === "damage" ? previous[0] : null;
      const then = amount && prevDamage ? ([{ ...prevDamage, amount: toAmount(amount[1])! }] as Effect[]) : parseClause(body, ctx);
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
    const parsed = parseClause(sentence, ctx);
    if (!parsed) return null;
    lastGroup = effects.length;
    effects.push(...parsed);
  }
  return effects;
}

// ───────── a whole card ─────────

const newCtx = (allowSelf = false): Ctx => ({ allowSelf, targets: [], phrases: new Map() });
const cache = new WeakMap<CardDef, ParsedCard>();

/** Understands the card's rules text. Cached per card definition. */
export function parseCard(def: CardDef): ParsedCard {
  const hit = cache.get(def);
  if (hit) return hit;

  const result: ParsedCard = { ok: true, triggers: [], activated: [], unsupported: [] };
  // "Cycling {2}" can sit on any kind of card: take it out first, the rest of the text is read as usual.
  const text = normalizeText(def)
    .split("\n")
    .filter((line) => {
      if (line === "~ can't be countered" || line === "~ can't be countered.") {
        result.cantBeCountered = true;
        return false;
      }
      if (line === "as an additional cost to cast ~, sacrifice a creature" || line === "as an additional cost to cast ~, sacrifice a creature.") {
        result.extraSacrifice = true;
        return false;
      }
      const flashback = /^flashback (\{[^}]+\}(?:\{[^}]+\})*)\.?$/.exec(line);
      if (flashback && parseManaCost(flashback[1])) {
        result.flashback = flashback[1];
        return false;
      }
      const kicker = /^kicker (\{[^}]+\}(?:\{[^}]+\})*)\.?$/.exec(line);
      if (kicker && parseManaCost(kicker[1])) {
        result.kicker = kicker[1];
        return false;
      }
      const reduction = /^~ costs \{(\d+)\} less to cast if you control an? ([a-z]+)\.?$/.exec(line);
      if (reduction) {
        result.costReduction = { n: Number(reduction[1]), ifControl: reduction[2] };
        return false;
      }
      const landcycling = /^basic landcycling (\{[^}]+\}(?:\{[^}]+\})*)\.?$/.exec(line);
      if (landcycling && parseManaCost(landcycling[1])) {
        result.landcycling = landcycling[1];
        return false;
      }
      const cycling = /^cycling (\{[^}]+\}(?:\{[^}]+\})*)\.?$/.exec(line);
      if (cycling && parseManaCost(cycling[1])) result.cycling = cycling[1];
      return !cycling || !parseManaCost(cycling[1]);
    })
    .join("\n");

  const lines = text.split("\n");
  const header = /^choose (one|one or both) —$/.exec(lines[0] ?? "");
  if ((def.type === "instant" || def.type === "sorcery") && header && lines.length >= 3 && lines.slice(1).every((l) => l.startsWith("• "))) {
    const modes = parseModes(lines.slice(1).map((l) => l.slice(2)), false);
    if (modes) result.spell = { effects: [], targets: [], modal: { min: 1, max: header[1] === "one" ? 1 : 2, modes } };
    else result.unsupported.push(text);
  } else if (def.type === "instant" || def.type === "sorcery") {
    const ctx = newCtx();
    const effects = text ? parseEffectText(text.replace(/\n/g, " "), ctx) : null;
    // A spell has no permanent to act on: "Return ~ to its owner's hand" would silently do nothing, so it stays unplayable.
    if (effects && effects.length > 0 && !JSON.stringify(effects).includes('"t":"self"')) result.spell = { effects, targets: ctx.targets };
    else result.unsupported.push(text || "(no text)");
  } else if (def.type === "creature" || def.type === "land" || def.type === "artifact" || def.type === "enchantment" || def.type === "planeswalker") {
    const creatureLines = text.split("\n").filter(Boolean);
    for (let i = 0; i < creatureLines.length; i++) {
      // "When ~ enters, choose one —" followed by one bullet line per mode
      if (/^when ~ enters(?: the battlefield)?,? choose one —$/.test(creatureLines[i])) {
        const bullets: string[] = [];
        while (i + 1 < creatureLines.length && creatureLines[i + 1].startsWith("• ")) bullets.push(creatureLines[++i].slice(2));
        const modes = bullets.length >= 2 ? parseModes(bullets, true) : null;
        if (modes) result.triggers.push({ event: "enters", effects: [], targets: [], modes, text: "When this enters, choose one" });
        else result.unsupported.push(creatureLines[i]);
        continue;
      }
      parseCreatureLine(creatureLines[i], result);
    }
  } else if (text) {
    result.unsupported.push(...text.split("\n"));
  }

  if (def.keywords?.includes("prowess")) {
    result.triggers.push({ event: "noncreatureSpell", effects: [{ type: "pump", power: 1, toughness: 1, what: { t: "self" } }], targets: [], text: "Prowess" });
  }
  // An Aura is cast with a target: the spell has no effects of its own, only the thing it will be attached to.
  if (result.aura) result.spell = { effects: [], targets: [result.aura] };
  else if (def.type === "enchantment" && (def.typeLine ?? "").includes("Aura")) result.unsupported.push("(an Aura without an \"Enchant\" line)");
  // Protection looks at what is targeting: remember this card's colors on every target it can choose.
  const source = { colors: def.colors ?? [], artifact: def.type === "artifact" || (def.typeLine ?? "").split("—")[0].includes("Artifact") };
  const stamp = (specs: TargetSpec[]) => specs.map((spec) => ({ ...spec, source }));
  if (result.spell) result.spell = { ...result.spell, targets: stamp(result.spell.targets) };
  result.triggers = result.triggers.map((t) => ({ ...t, targets: stamp(t.targets) }));
  result.activated = result.activated.map((a) => ({ ...a, targets: stamp(a.targets) }));
  if (result.aura) result.aura = stamp([result.aura])[0];
  result.ok = result.unsupported.length === 0;
  cache.set(def, result);
  return result;
}

const AURA_TARGETS: Record<string, TargetSpec> = {
  "enchant creature": { kind: "creature", label: "creature" },
  "enchant creature you control": { kind: "creature", controller: "you", label: "creature you control" },
  "enchant creature an opponent controls": { kind: "creature", controller: "opponent", label: "creature an opponent controls" },
  "enchant land": { kind: "land", label: "land" },
  "enchant permanent": { kind: "permanent", label: "permanent" },
};

/** "Enchanted creature gets +2/+2 and has flying", "Creatures you control get +1/+1", "...can't attack or block". */
function parseStatic(line: string): StaticEffect | null {
  const m = /^(enchanted creature|enchanted permanent|equipped creature|other creatures you control|creatures you control|creatures your opponents control|creatures you don't control|all creatures) (.+)$/.exec(line);
  if (!m) return null;
  const scope = m[1] === "enchanted creature" || m[1] === "enchanted permanent" || m[1] === "equipped creature" ? "enchanted" : m[1].includes("you control") ? "yours" : m[1] === "all creatures" ? "all" : "opponents";
  const st: StaticEffect = { scope, power: 0, toughness: 0, keywords: [] };
  if (m[1].startsWith("other")) st.other = true;
  let rest = m[2].trim();
  const pt = /^gets? ([+-]\d+)\/([+-]\d+)(?: and )?/.exec(rest);
  if (pt) {
    st.power = Number(pt[1]);
    st.toughness = Number(pt[2]);
    rest = rest.slice(pt[0].length);
    if (rest === "") return st;
  }
  const has = /^(?:has|have) (.+)$/.exec(rest);
  if (has) {
    const keywords = keywordList(has[1]);
    if (!keywords) return null;
    st.keywords = keywords;
    return st;
  }
  if (/^can't attack or block, and its activated abilities can't be activated(?: unless they're mana abilities)?$/.test(rest)) return { ...st, cantAttack: true, cantBlock: true, noActivated: true };
  if (rest === "can't attack or block") return { ...st, cantAttack: true, cantBlock: true };
  if (rest === "can't attack") return { ...st, cantAttack: true };
  if (rest === "can't block") return { ...st, cantBlock: true };
  if (rest === "doesn't untap during its controller's untap step") return { ...st, noUntap: true };
  return null;
}

/** "the number of creatures you control", "cards in your hand", "forests you control"... */
function parseCount(phrase: string): CountSpec | null {
  if (phrase === "cards in your hand") return { kind: "hand" };
  if (phrase === "cards in your graveyard") return { kind: "graveyard", creaturesOnly: false };
  if (phrase === "creature cards in your graveyard") return { kind: "graveyard", creaturesOnly: true };
  const m = /^(creatures|lands|artifacts|enchantments|plains|islands|swamps|mountains|forests) (you control|your opponents control|on the battlefield)$/.exec(phrase);
  if (!m) return null;
  const scope = m[2] === "you control" ? "you" : m[2] === "on the battlefield" ? "all" : "opponents";
  const landTypes: Record<string, string> = { plains: "Plains", islands: "Island", swamps: "Swamp", mountains: "Mountain", forests: "Forest" };
  if (landTypes[m[1]]) return { kind: "permanents", what: "landType", landType: landTypes[m[1]], scope };
  const what = { creatures: "creature", lands: "land", artifacts: "artifact", enchantments: "enchantment" }[m[1]] as "creature" | "land" | "artifact" | "enchantment";
  return { kind: "permanents", what, scope };
}

/** "+1: Draw a card.", "-3: Destroy target creature.", "0: ...": a planeswalker's loyalty abilities. */
function parseLoyalty(line: string, out: ParsedCard): boolean {
  const m = /^([+-]?\d+): (.+)$/.exec(line);
  if (!m) return false;
  const ctx = newCtx(true);
  const effects = parseEffectText(m[2], ctx);
  if (!effects || effects.length === 0) {
    out.unsupported.push(line);
    return true;
  }
  const ability: LoyaltyAbility = { cost: Number(m[1]), effects, targets: ctx.targets, text: line };
  (out.loyaltyAbilities ??= []).push(ability);
  return true;
}

const PROTECTION_PART = /^protection from ((?:white|blue|black|red|green|artifacts)(?:(?:,| and)? (?:and )?(?:from )?(?:white|blue|black|red|green|artifacts))*)$/;

function parseCreatureLine(rawLine: string, out: ParsedCard): void {
  // "... This ability triggers only once each turn.": read the line without it, then mark the triggers it produced.
  const once = /\.? this ability triggers only once each turn\.?$/.exec(rawLine);
  if (once) {
    const before = out.triggers.length;
    parseCreatureLine(rawLine.slice(0, once.index), out);
    for (let i = before; i < out.triggers.length; i++) out.triggers[i] = { ...out.triggers[i], oncePerTurn: true };
    return;
  }
  const line = rawLine.replace(/\.$/, "");

  if (parseLoyalty(line, out)) return;

  // "Ward {1}", "Flying, ward {2}"
  const wardParts = line.split(/,\s+(?=[a-z])/);
  const WARD = /^ward (\{[^}]+\}(?:\{[^}]+\})*)$/;
  if (wardParts.some((p) => WARD.test(p)) && wardParts.every((p) => WARD.test(p) || isKeyword(p) || PROTECTION_PART.test(p))) {
    out.ward = wardParts.map((p) => WARD.exec(p)?.[1]).find(Boolean);
    if (wardParts.every((p) => !PROTECTION_PART.test(p))) return;
  }

  // "Whenever you gain life, put a +1/+1 counter on this creature."
  const gain = /^whenever you gain life,? (.+)$/.exec(line);
  if (gain) {
    const ctx = newCtx(true);
    const effects = parseEffectText(gain[1].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) out.triggers.push({ event: "lifeGained", effects, targets: ctx.targets, text: line });
    else out.unsupported.push(line);
    return;
  }

  // "Landfall — Whenever a land you control enters, ..."
  const landfall = /^(?:landfall — )?whenever a land (?:you control enters|enters(?: the battlefield)? under your control),? (.+)$/.exec(line);
  if (landfall) {
    const ctx = newCtx(true);
    const effects = parseEffectText(landfall[1].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: "landfall", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }

  // "Protection from red", "Flying, protection from black", "Protection from white and from blue"
  const parts = line.split(/,\s+(?=[a-z])/);
  if (parts.some((p) => PROTECTION_PART.test(p)) && parts.every((p) => PROTECTION_PART.test(p) || WARD.test(p) || isKeyword(p))) {
    const protection = out.protection ?? { colors: [], artifacts: false };
    for (const p of parts) {
      for (const word of PROTECTION_PART.exec(p)?.[1].match(/white|blue|black|red|green|artifacts/g) ?? []) {
        if (word === "artifacts") protection.artifacts = true;
        else if (!protection.colors.includes(TOKEN_COLOR[word])) protection.colors.push(TOKEN_COLOR[word]);
      }
    }
    out.protection = protection;
    return;
  }

  const cda = /^~'s power and toughness are each equal to the number of (.+)$/.exec(line);
  const count = cda ? parseCount(cda[1]) : null;
  if (count) {
    out.dynamicStats = count;
    return;
  }

  if (AURA_TARGETS[line]) {
    out.aura = AURA_TARGETS[line];
    return;
  }
  const staticEffect = parseStatic(line);
  if (staticEffect) {
    (out.statics ??= []).push(staticEffect);
    return;
  }
  // "Flying, first strike": keywords are checked from the card's keyword list, so just accept the line.
  if (line.split(",").every((w) => isKeyword(w.trim()))) return;

  const withCounters = /^~ enters with (a|an|one|two|three|four|\d+|x) \+1\/\+1 counters? on it$/.exec(line);
  if (withCounters && toAmount(withCounters[1]) !== null) {
    out.entersWithCounters = toAmount(withCounters[1])!;
    return;
  }
  if (/^(?:devoid|partner|changeling)$/.test(line)) return; // no effect on how the game plays
  const crew = /^crew (\d+)$/.exec(line);
  if (crew) {
    out.crew = Number(crew[1]);
    return;
  }
  const walk = /^(plains|island|swamp|mountain|forest)walk$/.exec(line);
  if (walk) {
    (out.landwalk ??= []).push(walk[1]);
    return;
  }
  if (line === "~ attacks each combat if able") {
    out.mustAttack = true;
    return;
  }
  const equip = /^equip (\{[^}]+\}(?:\{[^}]+\})*)$/.exec(line);
  if (equip && parseManaCost(equip[1])) {
    out.activated.push({
      tap: false,
      mana: equip[1],
      effects: [{ type: "attach", what: { t: "target", i: 0 } }],
      targets: [{ kind: "creature", controller: "you", label: "creature you control" }],
      text: `Equip ${equip[1]}`,
      sorceryOnly: true,
    });
    return;
  }
  if (/^\{T\}, sacrifice ~: add /i.test(line)) {
    // A Treasure-style mana ability: the colors come from the same reader the mana payment uses.
    const colors = manaAbilityColors({ id: "", name: "", type: "artifact", cost: 0, text: line });
    if (colors) {
      out.manaColors = [...new Set([...(out.manaColors ?? []), ...colors])];
      return;
    }
  }
  const withMinus = /^~ enters with (a|an|one|two|three|four|five|\d+) -1\/-1 counters? on it$/.exec(line);
  if (withMinus && toNumber(withMinus[1]) !== null) {
    out.entersWithMinus = toNumber(withMinus[1])!;
    return;
  }
  const kickedCounters = /^if ~ was kicked, it enters with (a|an|one|two|three|four|five|\d+) \+1\/\+1 counters? on it$/.exec(line);
  if (kickedCounters && toNumber(kickedCounters[1]) !== null) {
    out.kickedCounters = toNumber(kickedCounters[1])!;
    return;
  }
  const colorWords: Record<string, string> = { white: "W", blue: "U", black: "B", red: "R", green: "G" };
  const chooseColor = /^(?:(~) enters tapped\. )?as (?:it|~) enters, choose a color(?: other than (white|blue|black|red|green))?$/.exec(line);
  if (chooseColor) {
    if (chooseColor[1]) out.entersTapped = true;
    out.chooseColor = chooseColor[2] ? { except: colorWords[chooseColor[2]] } : {};
    return;
  }
  // "Can't be blocked except by walls and/or creatures with flying"
  const only = /^~ can't be blocked except by (.+)$/.exec(line);
  if (only) {
    const rule = { subtypes: [] as string[], keywords: [] as Keyword[], colors: [] as string[], artifact: false };
    for (const term of only[1].split(/ and\/or | or /)) {
      const t = term.trim();
      if (t === "walls") rule.subtypes.push("Wall");
      else if (t === "artifact creatures") rule.artifact = true;
      else if (/^creatures with (flying|reach|flying or reach)$/.test(t)) rule.keywords.push(...(t.endsWith("flying or reach") ? (["flying", "reach"] as Keyword[]) : [t.split(" ").pop() as Keyword]));
      else if (/^(white|blue|black|red|green) creatures$/.test(t)) rule.colors.push(COLOR_OF[t.split(" ")[0]]);
      else {
        out.unsupported.push(line);
        return;
      }
    }
    out.blockedOnlyBy = rule;
    return;
  }
  if (line === "~ can't be blocked by more than one creature") {
    out.maxBlockers = 1;
    return;
  }
  if (line === "~ can't block") {
    out.cantBlock = true;
    return;
  }
  const reduction = /^~ costs \{(\d+)\} less to cast if you control an? ([a-z]+)$/.exec(line);
  if (reduction) {
    out.costReduction = { n: Number(reduction[1]), ifControl: reduction[2] };
    return;
  }
  // "~ gets +1/+1 as long as you've drawn two or more cards this turn" / "~ can't be blocked as long as ..."
  const drawnCond = /^~ (gets ([+-]\d+)\/([+-]\d+)|can't be blocked) as long as you've drawn (two|three|four|\d+) or more cards this turn$/.exec(line);
  if (drawnCond) {
    const st: StaticEffect = { scope: "self", power: 0, toughness: 0, keywords: [], cond: { drawnAtLeast: toNumber(drawnCond[4]) ?? 2 } };
    if (drawnCond[2]) {
      st.power = Number(drawnCond[2]);
      st.toughness = Number(drawnCond[3]);
    } else st.unblockable = true;
    (out.statics ??= []).push(st);
    return;
  }
  // "Battalion — Whenever ~ and at least two other creatures attack, ..." / "Whenever you attack with two or more creatures, ..."
  const attackN = /^(?:battalion — )?whenever (~ and at least two other creatures attack|you attack with two or more creatures),? (.+)$/.exec(line);
  if (attackN) {
    const ctx = newCtx(true);
    const effects = parseEffectText(attackN[2].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: attackN[1].startsWith("~") ? "battalion" : "attackTwo", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  const targeted = /^when ~ becomes the target of a spell or ability,? (.+)$/.exec(line);
  if (targeted) {
    const ctx = newCtx(true);
    const effects = parseEffectText(targeted[1], ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: "becomesTarget", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  // Lands that enter tapped unless a condition holds (check lands, fast lands, slow lands, ...)
  const unless = /^~ enters (?:the battlefield )?tapped unless (.+)$/.exec(line);
  if (unless) {
    const cond = unless[1];
    const n = (w: string) => toNumber(w) ?? 0;
    let m2: RegExpExecArray | null;
    if ((m2 = /^you control (two|three|four|\d+) or more basic lands$/.exec(cond))) out.entersTappedUnless = { basics: n(m2[1]) };
    else if ((m2 = /^you control (two|three|four|\d+) or more other lands$/.exec(cond))) out.entersTappedUnless = { otherLands: n(m2[1]) };
    else if ((m2 = /^you control (two|three|four|\d+) or fewer other lands$/.exec(cond))) out.entersTappedUnless = { fewerOtherLands: n(m2[1]) };
    else if (cond === "you control a planeswalker") out.entersTappedUnless = { planeswalker: true };
    else if ((m2 = /^a player has (\d+) or less life$/.exec(cond))) out.entersTappedUnless = { lifeAtMost: Number(m2[1]) };
    else if ((m2 = /^your opponents control (two|three|four|five|six|seven|eight|nine|ten|\d+) or more lands$/.exec(cond))) out.entersTappedUnless = { opponentLands: n(m2[1]) };
    else if (cond === "you have two or more opponents") out.entersTappedUnless = { never: true }; // never true in a two-player game
    else out.unsupported.push(line);
    return;
  }
  const power = /^~ can't be blocked by creatures with power (\d+) or (less|greater)$/.exec(line);
  if (power) {
    out.cantBeBlockedByPower = { n: Number(power[1]), op: power[2] === "less" ? "max" : "min" };
    return;
  }
  const attackUnless = /^~ can't attack unless defending player controls an? (island|swamp|mountain|forest|plains)$/.exec(line);
  if (attackUnless) {
    out.attackOnlyIfDefenderControls = attackUnless[1].charAt(0).toUpperCase() + attackUnless[1].slice(1);
    return;
  }
  // "Whenever you cast a noncreature spell, ..." / "...an instant or sorcery spell, ..."
  const cast = /^whenever you cast (a noncreature|an instant or sorcery) spell,? (.+)$/.exec(line);
  if (cast) {
    const ctx = newCtx(true);
    const effects = parseEffectText(cast[2].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: cast[1] === "a noncreature" ? "noncreatureSpell" : "instantOrSorcery", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  const landcycling = /^basic landcycling (\{[^}]+\}(?:\{[^}]+\})*)$/.exec(line);
  if (landcycling && parseManaCost(landcycling[1])) {
    out.landcycling = landcycling[1];
    return;
  }
  // "Whenever you draw your second card each turn, ..." / "Whenever you draw a card, ..."
  const drawn = /^whenever you draw (your second card each turn|a card),? (.+)$/.exec(line);
  if (drawn) {
    const ctx = newCtx(true);
    const effects = parseEffectText(drawn[2].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: drawn[1] === "a card" ? "drawCard" : "drawSecond", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  if (line === "all creatures able to block ~ do so") {
    out.lureAll = true;
    return;
  }
  const damagedDies = /^whenever a creature dealt damage by ~ this turn dies,? (.+)$/.exec(line);
  if (damagedDies) {
    const ctx = newCtx(true);
    const effects = parseEffectText(damagedDies[1].replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: "damagedDies", effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  if (line === "~ can block only creatures with flying") {
    out.blocksOnlyFlying = true;
    return;
  }
  if (line === "~ can't attack or block alone") {
    out.cantAttackAlone = true;
    return;
  }
  // "Whenever another creature you control enters, you gain 1 life." / "...with power 2 or less enters..."
  const ally = /^whenever (another|a) creature you control(?: with power (\d+) or less)? enters(?: the battlefield)?,? (.+)$/.exec(line);
  if (ally) {
    const ctx = newCtx(true);
    const effects = parseEffectText(ally[3], ctx);
    if (effects && effects.length > 0) {
      out.triggers.push({ event: "allyEnters", ...(ally[1] === "another" ? { other: true } : {}), ...(ally[2] ? { maxPower: Number(ally[2]) } : {}), effects, targets: ctx.targets, text: line });
      return;
    }
    out.unsupported.push(line);
    return;
  }
  if (line === "~ can't be blocked") {
    out.cantBeBlocked = true;
    return;
  }
  if (line === "~ enters tapped" || line === "~ enters the battlefield tapped") {
    out.entersTapped = true;
    return;
  }

  // "When ~ enters, ...", "Whenever ~ attacks, ...", "When ~ dies, ..."
  const trigger = /^when(?:ever)? ~ (enters(?: the battlefield)?|dies|is put into a graveyard from the battlefield|attacks|blocks|becomes blocked|deals combat damage to a player),? (.+)$/.exec(line);
  if (trigger) {
    const ctx = newCtx(true);
    const head = trigger[1];
    const eventOf = (): TriggeredAbility["event"] =>
      head.startsWith("enters") ? "enters" : head === "dies" || head.startsWith("is put") ? "dies" : head === "attacks" ? "attacks" : head === "blocks" ? "blocks" : head === "becomes blocked" ? "blocked" : "combatDamagePlayer";
    // "When this dies, return it to its owner's hand": the card is not on the battlefield any more.
    if (eventOf() === "dies" && /^return (?:it|~) to its owner's hand$/.test(trigger[2])) {
      out.triggers.push({ event: "dies", effects: [{ type: "returnFromYard" }], targets: [], text: line });
      return;
    }
    // "When this enters, it deals 1 damage...": "it" is the creature itself.
    const wasKicked = /^if (?:it|~) was kicked, /.test(trigger[2]);
    const effects = parseEffectText(trigger[2].replace(/^if (?:it|~) was kicked, /, "").replace(/^it /, "~ ").replace(/ on it$/, " on ~"), ctx);
    if (effects && effects.length > 0) {
      const event = eventOf();
      const ability: TriggeredAbility = { event, effects, targets: ctx.targets, text: line, ...(wasKicked ? { ifKicked: true } : {}) };
      out.triggers.push(ability);
      return;
    }
    out.unsupported.push(line);
    return;
  }

  // "{T}: ...", "{1}{R}, {T}: ..." (an activated ability), or a mana ability "{T}: Add {G}."
  const colon = line.indexOf(": ");
  if (colon > 0) {
    let cost = line.slice(0, colon);
    const rest = line.slice(colon + 2);
    // "{4}{U}, {T}, Sacrifice this land: ..." : the sacrifice is part of the cost
    let sacrifice = false;
    cost = cost.replace(/(?:^|,\s*)sacrifice ~$/i, () => ((sacrifice = true), ""));
    // Costs that make the ability work from another zone, or cost life
    let zone: "hand" | "graveyard" | undefined;
    let discardSelf = false;
    let exileSelf = false;
    let payLife = 0;
    cost = cost.replace(/(?:^|,\s*)discard ~$/i, () => ((zone = "hand"), (discardSelf = true), ""));
    cost = cost.replace(/(?:^|,\s*)exile ~ from your graveyard$/i, () => ((zone = "graveyard"), (exileSelf = true), ""));
    cost = cost.replace(/(?:^|,\s*)pay (\d+) life$/i, (_, n: string) => ((payLife = Number(n)), ""));
    let costCard: ActivatedAbility["costCard"];
    cost = cost.replace(/(?:^|,\s*)discard a card$/i, () => ((costCard = { kind: "discard", label: "a card to discard" }), ""));
    cost = cost.replace(/(?:^|,\s*)sacrifice (a|an|another) ([a-z ]+?)$/i, (all, who: string, what: string) => {
      const filter = parseSacrificeFilter(what);
      if (!filter) return all;
      costCard = { kind: "sacrifice", filter, ...(who === "another" ? { other: true } : {}), label: `a ${what} to sacrifice` };
      return "";
    });
    const otherCost = sacrifice || zone !== undefined || payLife > 0 || costCard !== undefined;
    const symbols: string[] | null = cost.match(/\{[^}]+\}/g) ?? (otherCost ? [] : null);
    if (symbols && (otherCost && cost === "" ? true : /^(\{[^}]+\}|, )+$/.test(cost))) {
      const tap = symbols.includes("{T}");
      const mana = symbols.filter((s) => s !== "{T}").join("");
      // "{T}: Add {G}", "{T}: Add {G} or {W}", "{T}: Add one mana of any color"
      const colors = tap && !mana ? manaAbilityColors({ id: "", name: "", type: "land", cost: 0, text: line }) : undefined;
      const usesChosen = tap && !mana && manaAbilityUsesChosenColor({ id: "", name: "", type: "land", cost: 0, text: line });
      if (colors || usesChosen) {
        out.manaColors = [...new Set([...(out.manaColors ?? []), ...(colors ?? [])])];
        if (usesChosen) out.manaChosen = true;
        return;
      }
      const ctx = newCtx(true);
      // "Activate only as a sorcery." / "Activate only once each turn." end the ability's text.
      let body = rest;
      let sorceryOnly = false;
      let oncePerTurn = false;
      body = body.replace(/\.?\s*activate only as a sorcery\.?$/, () => ((sorceryOnly = true), ""));
      body = body.replace(/\.?\s*activate only once each turn\.?$/, () => ((oncePerTurn = true), ""));
      let yourTurnOnly = false;
      body = body.replace(/^it deals /, "~ deals ");
      body = body.replace(/\.?\s*activate only during your turn\.?$/, () => ((yourTurnOnly = true), ""));
      const effects = parseManaCostOk(mana) ? parseEffectText(body, ctx) : null;
      if (effects && effects.length > 0) {
        const ability: ActivatedAbility = { tap, mana, effects, targets: ctx.targets, text: line, ...(sorceryOnly ? { sorceryOnly } : {}), ...(oncePerTurn ? { oncePerTurn } : {}), ...(yourTurnOnly ? { yourTurnOnly } : {}), ...(sacrifice ? { sacrifice } : {}), ...(zone ? { zone } : {}), ...(discardSelf ? { discardSelf } : {}), ...(exileSelf ? { exileSelf } : {}), ...(payLife ? { payLife } : {}), ...(costCard ? { costCard } : {}) };
        out.activated.push(ability);
        return;
      }
    }
  }

  out.unsupported.push(line);
}

const parseManaCostOk = (mana: string) => mana === "" || parseManaCost(mana) !== null;

/** For tooling: the individual sentences of a card's text that were not understood (empty if the card is ok). */
export function failedSentences(def: CardDef): string[] {
  const out: string[] = [];
  for (const line of parseCard(def).unsupported) {
    // Look inside the line: after "When ~ enters," or after a cost such as "{T}:".
    const body = line.replace(/^when(?:ever)? ~ (?:enters(?: the battlefield)?|dies|attacks),? /, "").replace(/^[^:]*\{[^:]*: /, "");
    for (const sentence of body.replace(/\n/g, " ").split(/\.(?:\s+|$)/).map((x) => x.trim()).filter(Boolean)) {
      if (!parseClause(sentence, newCtx())) out.push(sentence);
    }
  }
  return out;
}

/** Can the engine play this card today? Its cost, keywords and every line of its rules text must be understood. */
export function isSupportedCard(def: CardDef): boolean {
  // A land needs a way to make mana, or an ability of its own (Evolving Wilds).
  if (def.type === "land") return (landManaColors(def).length > 0 || manaAbilityUsesChosenColor(def) || parseCard(def).activated.length > 0) && keywordsSupported(def) && parseCard(def).ok;
  if (def.type === "planeswalker") {
    return (def.loyalty ?? def.toughness) !== undefined && (parseCard(def).loyaltyAbilities?.length ?? 0) > 0 && manaCostOf(def) !== null && keywordsSupported(def) && parseCard(def).ok;
  }
  if (def.type === "creature" || def.type === "artifact" || def.type === "enchantment" || def.type === "instant" || def.type === "sorcery") {
    // A creature with a "*" power must have a line that says what it is counted from.
    if (def.type === "creature" && (def.power === undefined || def.toughness === undefined) && !parseCard(def).dynamicStats) return false;
    return manaCostOf(def) !== null && keywordsSupported(def) && parseCard(def).ok;
  }
  return false;
}
