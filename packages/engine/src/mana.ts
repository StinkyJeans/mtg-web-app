import type { CardDef, GameState, Permanent, PlayerId } from "./types.js";
import { getCard } from "./cards.js";
import { hasKeyword } from "./keywords.js";

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
  return parseManaCost(def.manaCost);
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

function manaAbility(def: CardDef): { colors: ManaColor[]; amount: number; chosen: boolean } | undefined {
  const text = (def.text ?? "").replace(/\([^)]*\)/g, "").replace(/\.? ?spend this mana only to cast an instant or sorcery spell\.?/gi, "").toLowerCase();
  const found = new Set<ManaColor>();
  let amount = 1;
  let chosen = false;
  for (const raw of text.split("\n")) {
    const m = /^\{t\}(?:, sacrifice (?:~|this [a-z]+))?: add (.+?)\.?$/.exec(raw.trim());
    if (!m) continue;
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
  const withChosen = (colors: ManaColor[]) => [...new Set([...colors, ...chosen])];
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

/** How many mana one tap of this permanent makes. */
function manaAmountOf(state: GameState, perm: Permanent): number {
  return manaAbilityAmount(getCard(state, perm.card.defId));
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
  const order = [...state.players[player].battlefield].sort((a, b) => Number(getCard(state, b.card.defId).type === "land") - Number(getCard(state, a.card.defId).type === "land"));
  for (const perm of order) {
    if (perm.tapped || spare.includes(perm.card.iid)) continue;
    const colors = manaColorsOf(state, perm, forSpell);
    // A source that makes two mana counts twice; tapping it once pays for both.
    const amount = colors.length > 0 ? manaAmountOf(state, perm) : 0;
    for (let i = 0; i < amount; i++) sources.push({ iid: perm.card.iid, colors });
  }

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
    const rank = (src: Source) => (src.colors.length === 1 ? -(plenty.get(src.colors[0]) ?? 0) : 1000 + src.colors.length);
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
    for (const color of manaColorsOf(state, perm)) pool[color]++;
  }
  return pool;
}
