import type { CardDef, GameState, Permanent, PlayerId } from "./types.js";
import { getCard } from "./cards.js";
import { hasKeyword } from "./keywords.js";
import { CREATURE_TYPES, defSubtypes } from "./creatureTypes.js";

export type ManaColor = "W" | "U" | "B" | "R" | "G" | "C";
export const MANA_COLORS: readonly ManaColor[] = ["W", "U", "B", "R", "G", "C"];

export const COLOR_NAMES: Record<ManaColor, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colorless",
};

export interface ManaCost {
  /** Any mana, from any land. */
  generic: number;
  /** Mana that must come from a land of that color. */
  colored: Partial<Record<ManaColor, number>>;
  /** How many {X} the cost has. X is chosen when the spell is cast and paid as generic mana. */
  x?: number;
  /** Hybrid symbols like {W/U}: each is paid with either color. */
  hybrid?: [ManaColor, ManaColor][];
  /** Phyrexian symbols like {G/P}: each is paid with that color, or with 2 life. */
  phyrexian?: ManaColor[];
  /** Symbols like {2/W}: each is paid with that color, or with 2 generic mana. */
  twoOrColor?: ManaColor[];
}

/** Two costs added together (the base cost plus a kicker, say). */
export function addCosts(a: ManaCost, b: ManaCost): ManaCost {
  const colored: ManaCost["colored"] = { ...a.colored };
  for (const [color, n] of Object.entries(b.colored)) colored[color as ManaColor] = (colored[color as ManaColor] ?? 0) + (n ?? 0);
  return {
    generic: a.generic + b.generic,
    colored,
    ...((a.x ?? 0) + (b.x ?? 0) > 0 ? { x: (a.x ?? 0) + (b.x ?? 0) } : {}),
    ...((a.hybrid ?? []).length + (b.hybrid ?? []).length > 0 ? { hybrid: [...(a.hybrid ?? []), ...(b.hybrid ?? [])] } : {}),
    ...((a.phyrexian ?? []).length + (b.phyrexian ?? []).length > 0 ? { phyrexian: [...(a.phyrexian ?? []), ...(b.phyrexian ?? [])] } : {}),
    ...((a.twoOrColor ?? []).length + (b.twoOrColor ?? []).length > 0 ? { twoOrColor: [...(a.twoOrColor ?? []), ...(b.twoOrColor ?? [])] } : {}),
  };
}

/** The cost with X filled in: every {X} becomes `x` generic mana. */
export function withX(cost: ManaCost, x: number): ManaCost {
  return { ...cost, generic: cost.generic + (cost.x ?? 0) * x, x: 0 };
}

/**
 * Parses a printed cost like "{2}{G}{G}". Returns null if it contains anything the engine
 * can't pay yet (snow, three-way hybrid...), so such cards are treated as unplayable.
 */
export function parseManaCost(text: string): ManaCost | null {
  const cost: ManaCost = { generic: 0, colored: {} };
  let rest = text.trim();
  while (rest) {
    const m = /^\{([^}]+)\}/.exec(rest);
    if (!m) return null;
    const symbol = m[1];
    if (/^\d+$/.test(symbol)) cost.generic += Number(symbol);
    else if (symbol === "X") cost.x = (cost.x ?? 0) + 1;
    else if (/^[WUBRG]\/[WUBRG]$/.test(symbol)) (cost.hybrid ??= []).push([symbol[0] as ManaColor, symbol[2] as ManaColor]);
    else if (/^[WUBRG]\/P$/.test(symbol)) (cost.phyrexian ??= []).push(symbol[0] as ManaColor);
    else if (/^2\/[WUBRG]$/.test(symbol)) (cost.twoOrColor ??= []).push(symbol[2] as ManaColor);
    else if ((MANA_COLORS as readonly string[]).includes(symbol)) {
      const color = symbol as ManaColor;
      cost.colored[color] = (cost.colored[color] ?? 0) + 1;
    } else return null;
    rest = rest.slice(m[0].length);
  }
  return cost;
}

/** The cost to cast a card. Hand-made cards without a printed cost just cost `cost` generic mana. */
export function manaCostOf(def: CardDef): ManaCost | null {
  if (def.manaCost === undefined) return { generic: def.cost, colored: {} };
  return parseManaCost(def.manaCost.split(" // ")[0]); // a two-part card is cast as its first half
}

const BASIC_LAND_COLOR: Record<string, ManaColor> = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
  Wastes: "C",
};

/** The one color of mana a basic land taps for (Forest -> G). Undefined for lands the engine can't use yet. */
export function landColor(def: CardDef): ManaColor | undefined {
  if (def.type !== "land") return undefined;
  const subtype = def.typeLine?.split("—")[1]?.trim().split(/\s+/)[0] ?? def.name.replace(/^Snow-Covered /, "");
  return BASIC_LAND_COLOR[subtype];
}

const ALL_FIVE: ManaColor[] = ["W", "U", "B", "R", "G"];

/**
 * "{T}: Add {G}", "{T}: Add {G} or {W}", "{T}: Add {B}, {R}, or {G}", "{T}: Add one mana of any color": the colors the
 * permanent can be tapped for (one mana per tap). Undefined when the card has no such ability. Abilities that make
 * two mana, cost extra, or hurt you are not matched, so those cards stay unplayable.
 */
export function manaAbilityColors(def: CardDef): ManaColor[] | undefined {
  const info = manaAbility(def);
  return info && info.colors.length > 0 ? info.colors : undefined;
}

/** Does a "{T}: Add ... one mana of the chosen color" ability exist? (The color is chosen as the permanent enters.) */
export function manaAbilityUsesChosenColor(def: CardDef): boolean {
  return manaAbility(def)?.chosen === true;
}

/** How much mana one tap makes: "{T}: Add {C}{C}" makes two. */
export function manaAbilityAmount(def: CardDef): number {
  return manaAbility(def)?.amount ?? 1;
}

/** "{T}, Sacrifice this artifact: Add one mana of any color." (a Treasure): the permanent is sacrificed when it is tapped for mana. */
export function manaAbilitySacrifices(def: CardDef): boolean {
  return /^\{t\}, sacrifice (?:~|this [a-z]+): add /m.test((def.text ?? "").replace(/\([^)]*\)/g, "").toLowerCase());
}

/** "{T}: Add {C}. Spend this mana only to cast an instant or sorcery spell.": the restriction, if there is one. */
export function manaAbilityRestriction(def: CardDef): "instantOrSorcery" | undefined {
  return /\bspend this mana only to cast an instant or sorcery spell\b/i.test(def.text ?? "") ? "instantOrSorcery" : undefined;
}

/** "{T}: Add {R}. If that mana is spent on a Dragon creature spell, it gains haste until end of turn.": the creature type. */
export function manaAbilityHasteFor(def: CardDef): string | undefined {
  return /\bif that mana is spent on an? ([a-z]+) creature spell, it gains haste until end of turn\b/i.exec(def.text ?? "")?.[1].toLowerCase();
}

/** "{T}: Add {G} for each Elf you control.": the creature type counted. */
function manaAbilityPerSubtype(def: CardDef): string | undefined {
  return /^\{t\}: add \{[wubrgc]\} for each ([a-z]+) you control\.?$/im.exec((def.text ?? "").replace(/\([^)]*\)/g, ""))?.[1].toLowerCase();
}

/** An Aura such as New Horizons: 'Enchanted land has "{T}: Add two mana of any one color."' */
export const grantsTwoOfOneColor = (def: CardDef): boolean => /^enchanted land has "\{t\}: add two mana of any one color\.?"\.?$/im.test(def.text ?? "");

function manaAbility(def: CardDef): { colors: ManaColor[]; amount: number; chosen: boolean } | undefined {
  const text = (def.text ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\.? ?spend this mana only to cast an instant or sorcery spell\.?/gi, "")
    .replace(/^\{t\}: add [^\n]*?\. spend this mana only to [^\n]*$/gim, "") // restricted lines: see restrictedMana
    .replace(/\.? ?if that mana is spent on an? [a-z]+ creature spell, it gains haste until end of turn\.?/gi, "")
    .toLowerCase();
  const found = new Set<ManaColor>();
  let amount = 1;
  let chosen = false;
  for (const raw of text.split("\n")) {
    const m = /^\{t\}(?:, sacrifice (?:~|this [a-z]+))?: add (.+?)\.?$/.exec(raw.trim());
    if (!m) continue;
    const perType = /^(\{[wubrgc]\}) for each [a-z]+ you control$/.exec(m[1]);
    if (perType) {
      found.add(perType[1][1].toUpperCase() as ManaColor);
      continue;
    }
    const twice = /^(\{[wubrgc]\})\1+$/.exec(m[1]); // "{c}{c}": two mana of one color
    if (twice) {
      found.add(twice[1][1].toUpperCase() as ManaColor);
      amount = Math.max(amount, m[1].length / 3);
      continue;
    }
    if (m[1] === "one mana of any color") {
      ALL_FIVE.forEach((c) => found.add(c));
      continue;
    }
    const pieces = m[1].split(/, or |, | or /).map((p) => p.trim());
    // "one mana of the chosen color" is a color that is only known once the permanent has entered
    const fixed = pieces.filter((p) => p !== "one mana of the chosen color").map((p) => /^\{([wubrgc])\}$/.exec(p));
    if (pieces.includes("one mana of the chosen color")) chosen = true;
    if (fixed.every(Boolean) && (fixed.length > 0 || chosen)) fixed.forEach((p) => found.add(p![1].toUpperCase() as ManaColor));
    else if (pieces.includes("one mana of the chosen color")) chosen = false;
  }
  return found.size > 0 || chosen ? { colors: [...found], amount, chosen } : undefined;
}

/** Every color a land can tap for: its basic land types ("Land — Forest Plains") and any "{T}: Add ..." line. */
export function landManaColors(def: CardDef): ManaColor[] {
  if (def.type !== "land") return [];
  const sub = def.typeLine?.split("—")[1]?.trim();
  const subtypes = sub ? sub.split(/\s+/) : [def.name.replace(/^Snow-Covered /, "")]; // "Basic Land" alone: Wastes
  const colors = new Set<ManaColor>(manaAbilityColors(def) ?? []);
  for (const s of subtypes) if (BASIC_LAND_COLOR[s]) colors.add(BASIC_LAND_COLOR[s]);
  return [...colors];
}

/** The colors this permanent can currently be tapped for (empty: it can't make mana right now). */
function manaColorsOf(state: GameState, perm: Permanent, forSpell?: CardDef): ManaColor[] {
  const def = getCard(state, perm.card.defId);
  // Restricted mana can only pay for the kind of spell it names.
  if (manaAbilityRestriction(def) === "instantOrSorcery" && !(forSpell && (forSpell.type === "instant" || forSpell.type === "sorcery"))) return [];
  const chosen = manaAbilityUsesChosenColor(def) && perm.chosenColor ? [perm.chosenColor] : [];
  const only = forSpell ? restrictedMana(def).filter((r) => restrictionAllows(r, perm, forSpell)).flatMap((r) => r.colors) : [];
  const withChosen = (colors: ManaColor[]) => [...new Set([...colors, ...chosen, ...only])];
  if (def.type === "land") return withChosen(landManaColors(def));
  if (def.type === "artifact") return withChosen(manaAbilityColors(def) ?? []); // artifacts aren't "summoning sick"
  if (def.type === "creature" && (!perm.summoningSick || hasKeyword(def, "haste"))) return withChosen(manaAbilityColors(def) ?? []);
  return [];
}

export type PayResult =
  /** `life` is what Phyrexian mana costs in life (0 when it was paid with mana). */
  | { ok: true; tap: string[]; life: number }
  | { ok: false; missing: ManaColor | "generic" | "life" };

interface Source {
  iid: string;
  colors: ManaColor[];
}

/** An enchanted land with "{T}: Add two mana of any one color." */
function makesTwoOfOneColor(state: GameState, perm: Permanent): boolean {
  if (getCard(state, perm.card.defId).type !== "land") return false;
  return Object.values(state.players).some((pl) => pl.battlefield.some((aura) => aura.attachedTo === perm.card.iid && grantsTwoOfOneColor(getCard(state, aura.card.defId))));
}

/** How many mana one tap of this permanent makes ("{T}: Add {G} for each Elf you control" counts the controller's Elves). */
function manaAmountOf(state: GameState, player: PlayerId, perm: Permanent): number {
  const def = getCard(state, perm.card.defId);
  const per = manaAbilityPerSubtype(def);
  if (!per) return makesTwoOfOneColor(state, perm) ? 2 : manaAbilityAmount(def);
  const isType = (p: Permanent) => {
    const line = (getCard(state, p.card.defId).typeLine ?? "").split(" // ")[0].toLowerCase();
    return line.includes("creature") && (p.subtypesOverride ?? line.split("—")[1]?.trim().split(/\s+/) ?? []).includes(per);
  };
  return state.players[player].battlefield.filter(isType).length;
}

/**
 * Chooses which untapped permanents to tap for `cost`. Every colored requirement needs its own source that can make
 * that color (a matching problem: a Forest/Plains dual may pay for either, but only one of them). Generic mana is
 * then paid from what is left, single-color sources of the most plentiful color first, so scarce colors and the
 * flexible multi-color sources stay untapped for the next spell.
 */
export function payMana(state: GameState, player: PlayerId, cost: ManaCost, forSpell?: CardDef): PayResult {
  const sources: Source[] = [];
  const spare = state.players[player].spareMana ?? [];
  // Lands come first, so a creature or artifact that makes mana is only used when the lands can't pay.
  // Mana that gives the spell haste (Carnelian Orb of Dragonkind on a Dragon) goes before everything.
  const rank = (p: Permanent) => (forSpell && hasteFrom(state, p.card.iid, forSpell) ? -1 : getCard(state, p.card.defId).type === "land" ? 0 : 1);
  const order = [...state.players[player].battlefield].sort((a, b) => rank(a) - rank(b));
  const oneColor: string[] = [];
  for (const perm of order) {
    if (perm.tapped || spare.includes(perm.card.iid)) continue;
    const colors = manaColorsOf(state, perm, forSpell);
    // A source that makes two mana counts twice; tapping it once pays for both.
    const amount = colors.length > 0 ? manaAmountOf(state, player, perm) : 0;
    if (amount > 0 && makesTwoOfOneColor(state, perm)) oneColor.push(perm.card.iid);
    for (let i = 0; i < amount; i++) sources.push({ iid: perm.card.iid, colors: oneColor.includes(perm.card.iid) ? ALL_FIVE : colors });
  }
  if (oneColor.length === 0) return paySources(state, player, cost, sources, forSpell);
  // "Two mana of any one color": try each color for each such land, keeping the payment that taps the fewest permanents.
  let best: PayResult | undefined;
  const tryColors = (i: number, picked: ManaColor[]) => {
    if (i === oneColor.length) {
      const fixed = sources.map((src) => (oneColor.includes(src.iid) ? { ...src, colors: [picked[oneColor.indexOf(src.iid)]] } : src));
      const paid = paySources(state, player, cost, fixed, forSpell);
      if (paid.ok && (!best?.ok || paid.tap.length < best.tap.length)) best = paid;
      else best ??= paid;
      return;
    }
    for (const c of ALL_FIVE) tryColors(i + 1, [...picked, c]);
  };
  tryColors(0, []);
  return best!;
}

interface RestrictedMana {
  colors: ManaColor[];
  /** "...to cast a creature spell" / "...an artifact spell" / "...an Angel spell" / "...a creature spell of the chosen type". */
  creature?: boolean;
  cardType?: string;
  subtype?: string;
  chosenType?: boolean;
}

/**
 * Mana lines that may only pay for some spells: "{T}: Add {B}. Spend this mana only to cast a creature spell.", "...an Angel spell.",
 * "{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type or activate an ability of a creature source of the chosen type."
 * (Only the spell half of that last one is used: abilities are paid without it.)
 */
export function restrictedMana(def: CardDef): RestrictedMana[] {
  const out: RestrictedMana[] = [];
  const lines = (def.text ?? "").toLowerCase().matchAll(/^\{t\}: add (\{[wubrgc]\}|one mana of any color)\. spend this mana only to cast (a creature spell of the chosen type or activate an ability of a creature source of the chosen type|a creature spell|an? ([a-z]+) spell)\.?$/gm);
  for (const m of lines) {
    const colors = m[1] === "one mana of any color" ? [...ALL_FIVE] : [m[1][1].toUpperCase() as ManaColor];
    if (m[2].includes("chosen type")) out.push({ colors, creature: true, chosenType: true });
    else if (m[2] === "a creature spell") out.push({ colors, creature: true });
    else if (SPELL_TYPES.includes(m[3])) out.push({ colors, cardType: m[3] });
    else if (CREATURE_TYPES.includes(m[3])) out.push({ colors, subtype: m[3] });
  }
  return out;
}

/** Card types a restriction may name ("Spend this mana only to cast an artifact spell"). */
export const SPELL_TYPES = ["artifact", "enchantment", "planeswalker", "instant", "sorcery"];

const restrictionAllows = (r: RestrictedMana, perm: Permanent, spell: CardDef): boolean =>
  (!r.creature || spell.type === "creature") &&
  (!r.cardType || (spell.typeLine ?? spell.type).toLowerCase().split("—")[0].includes(r.cardType)) &&
  (!r.subtype || defSubtypes(spell).includes(r.subtype)) && (!r.chosenType || (!!perm.chosenType && defSubtypes(spell).includes(perm.chosenType)));

/** Was this permanent's mana the kind that gives `spell` haste? */
export function hasteFrom(state: GameState, iid: string, spell: CardDef): boolean {
  const perm = Object.values(state.players).flatMap((pl) => pl.battlefield).find((p) => p.card.iid === iid);
  const type = perm ? manaAbilityHasteFor(getCard(state, perm.card.defId)) : undefined;
  if (!type) return false;
  const line = (spell.typeLine ?? "").split(" // ")[0].toLowerCase();
  return line.includes("creature") && (line.split("—")[1] ?? "").trim().split(/\s+/).includes(type);
}

function paySources(state: GameState, player: PlayerId, cost: ManaCost, sources: Source[], forSpell?: CardDef): PayResult {
  // Every requirement lists the colors that can pay it: a plain {R} is [R], a hybrid {W/U} is [W, U].
  const needs: ManaColor[][] = [
    ...MANA_COLORS.flatMap((c) => Array<ManaColor[]>(cost.colored[c] ?? 0).fill([c])),
    ...(cost.hybrid ?? []).map(([a, b]): ManaColor[] => [a, b]),
  ];
  // Kuhn's algorithm: give each need a source, moving earlier choices around when that frees one up.
  const owner: (number | undefined)[] = Array(sources.length).fill(undefined); // source -> need
  const place = (need: number, seen: Set<number>): boolean => {
    for (let s = 0; s < sources.length; s++) {
      if (seen.has(s) || !sources[s].colors.some((c) => needs[need].includes(c))) continue;
      seen.add(s);
      if (owner[s] === undefined || place(owner[s]!, seen)) {
        owner[s] = need;
        return true;
      }
    }
    return false;
  };
  for (let need = 0; need < needs.length; need++) {
    if (!place(need, new Set())) return { ok: false, missing: needs[need][0] };
  }
  // Phyrexian and {2/W} symbols: paid with mana when that is possible, otherwise with life or two generic mana.
  let life = 0;
  let extraGeneric = 0;
  for (const color of cost.phyrexian ?? []) {
    needs.push([color]);
    if (!place(needs.length - 1, new Set())) {
      needs.pop();
      life += 2;
    }
  }
  for (const color of cost.twoOrColor ?? []) {
    needs.push([color]);
    if (!place(needs.length - 1, new Set())) {
      needs.pop();
      extraGeneric += 2;
    }
  }
  if (life > state.players[player].life) return { ok: false, missing: "life" };

  const tap = [...new Set(sources.filter((_, s) => owner[s] !== undefined).map((src) => src.iid))];
  const rest = sources.filter((_, s) => owner[s] === undefined);
  const plenty = new Map<ManaColor, number>();
  for (const src of rest) if (src.colors.length === 1) plenty.set(src.colors[0], (plenty.get(src.colors[0]) ?? 0) + 1);
  rest.sort((a, b) => {
    const rank = (src: Source) => (forSpell && hasteFrom(state, src.iid, forSpell) ? -Infinity : src.colors.length === 1 ? -(plenty.get(src.colors[0]) ?? 0) : 1000 + src.colors.length);
    return rank(a) - rank(b);
  });
  if (rest.length < cost.generic + extraGeneric) return { ok: false, missing: "generic" };
  for (const src of rest.slice(0, cost.generic + extraGeneric)) if (!tap.includes(src.iid)) tap.push(src.iid);
  return { ok: true, tap, life };
}

/**
 * Permanents in a payment that are worth asking about before they are tapped: a creature (it could attack or block
 * instead) or anything that is sacrificed for its mana. Lands and plain mana artifacts are tapped without asking.
 */
export function manaSourcesToConfirm(state: GameState, player: PlayerId, tap: string[]): string[] {
  return tap.filter((iid) => {
    const perm = state.players[player].battlefield.find((p) => p.card.iid === iid);
    const def = perm ? getCard(state, perm.card.defId) : undefined;
    return !!def && def.type !== "land" && (def.type === "creature" || manaAbilitySacrifices(def));
  });
}

/** Mana the player could produce right now, per color. */
export function availableMana(state: GameState, player: PlayerId): Record<ManaColor, number> {
  const pool: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const perm of state.players[player].battlefield) {
    if (perm.tapped) continue;
    const colors = makesTwoOfOneColor(state, perm) ? ALL_FIVE : manaColorsOf(state, perm);
    for (const color of colors) pool[color] += manaAmountOf(state, player, perm);
  }
  return pool;
}
