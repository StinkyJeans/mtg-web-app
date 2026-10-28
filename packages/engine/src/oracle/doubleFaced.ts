import { SUPPORTED_KEYWORDS } from "../keywords.js";
import type { CardDef } from "../types.js";

// Transforming cards ("Tony Stark // The Invincible Iron Man", "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki"): one card
// with two faces. The database keeps both faces in one row (the front's power and toughness, the text of both), so the back's
// numbers are listed here. A back face's mana value is its front's. A modal land ("Blightstep Pathway // Searstep Pathway") is
// played with either face up.

export const BACK_SUFFIX = "//back";

const BACK: Record<string, { cost: string; power: number; toughness: number; colors: string[] }> = {
  "Tony Stark": { cost: "{4}{U}{R}", power: 5, toughness: 5, colors: ["U", "R"] },
  "Monica Rambeau": { cost: "{2}{R}{W}{W}", power: 4, toughness: 4, colors: ["R", "W"] },
  "Bruce Banner": { cost: "{2}{R}{R}{G}{G}", power: 8, toughness: 8, colors: ["G", "R"] },
  "Jennifer Walters": { cost: "{3}{G}{W}{W}", power: 6, toughness: 6, colors: ["G", "W"] },
  "King T'Challa": { cost: "{4}{W}{U}", power: 3, toughness: 3, colors: ["U", "W"] },
  "Fable of the Mirror-Breaker": { cost: "{2}{R}", power: 2, toughness: 2, colors: ["R"] },
  "The Legend of Roku": { cost: "{2}{R}{R}", power: 4, toughness: 4, colors: [] },
};

const manaValueOf = (cost: string) => (cost.match(/\{[^}]+\}/g) ?? []).reduce((n, sym) => n + (/^\{\d+\}$/.test(sym) ? Number(sym.slice(1, -1)) : sym === "{X}" ? 0 : 1), 0);

/** The keywords a face's text lists on lines of their own ("Flying, haste"). */
function keywordsOf(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.replace(/\([^)]*\)/g, "").split("\n")) {
    const words = line.toLowerCase().split(/,\s*/).map((w) => w.trim());
    if (words.length > 0 && words.every((w) => (SUPPORTED_KEYWORDS as readonly string[]).includes(w))) words.forEach((w) => out.add(w));
  }
  return [...out];
}

const cache = new WeakMap<CardDef, { front: CardDef; back: CardDef } | null>();

function modalLand(def: CardDef, names: string[], types: string[], texts: string[]): { front: CardDef; back: CardDef } {
  const face = (i: number, id: string): CardDef => ({
    ...def,
    id,
    name: names[i],
    type: "land",
    cost: 0,
    typeLine: types[i],
    manaCost: "",
    text: texts[i],
    colors: [],
    keywords: [],
  });
  return { front: face(0, def.id), back: face(1, `${def.id}${BACK_SUFFIX}`) };
}

/** A modal double-faced land: the player chooses which face is up as it is played. */
export const isModalLand = (def: CardDef): boolean => doubleFaces(def)?.back.type === "land";

/** The two faces of a transforming card, or null for any other card. */
export function doubleFaces(def: CardDef): { front: CardDef; back: CardDef } | null {
  const hit = cache.get(def);
  if (hit !== undefined) return hit;
  const names = def.name.split(" // ");
  const types = (def.typeLine ?? "").split(" // ");
  const costs = (def.manaCost ?? "").split(" // ");
  const texts = (def.text ?? "").split("\n//\n");
  const stats = BACK[names[0]];
  const twoFaces = names.length === 2 && types.length === 2 && texts.length === 2;
  if (twoFaces && !stats && types.every((t) => /^Land\b/.test(t))) {
    const faces = modalLand(def, names, types, texts);
    cache.set(def, faces);
    return faces;
  }
  const faces =
    stats && twoFaces
      ? {
          front: { ...def, name: names[0], typeLine: types[0], manaCost: costs[0], text: texts[0], keywords: keywordsOf(texts[0]) },
          back: {
            id: `${def.id}${BACK_SUFFIX}`,
            name: names[1],
            type: "creature" as const,
            cost: manaValueOf(stats.cost),
            power: stats.power,
            toughness: stats.toughness,
            typeLine: types[1],
            manaCost: stats.cost,
            text: texts[1],
            colors: stats.colors,
            keywords: keywordsOf(texts[1]),
            ...(def.image ? { image: def.image } : {}),
            ...(def.scryfallId ? { scryfallId: def.scryfallId } : {}),
          },
        }
      : null;
  cache.set(def, faces);
  return faces;
}
