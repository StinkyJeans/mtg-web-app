import type { CardDef, GameState, PlayerId } from "./types.js";
import { getCard } from "./cards.js";

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
}

/**
 * Parses a printed cost like "{2}{G}{G}". Returns null if it contains anything the engine
 * can't pay yet (hybrid, Phyrexian, X, snow...), so such cards are treated as unplayable.
 */
export function parseManaCost(text: string): ManaCost | null {
  const cost: ManaCost = { generic: 0, colored: {} };
  let rest = text.trim();
  while (rest) {
    const m = /^\{([^}]+)\}/.exec(rest);
    if (!m) return null;
    const symbol = m[1];
    if (/^\d+$/.test(symbol)) cost.generic += Number(symbol);
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

/** Can the engine handle this card's costs and mana today? (Rules text is checked at import time.) */
export function isSupportedCard(def: CardDef): boolean {
  if (def.type === "land") return landColor(def) !== undefined;
  if (def.type === "creature") return manaCostOf(def) !== null;
  return false;
}

export type PayResult =
  | { ok: true; tap: string[] }
  | { ok: false; missing: ManaColor | "generic" };

/**
 * Chooses which untapped lands to tap for `cost`. Colored requirements are paid first from lands
 * of that color; generic mana is then paid from whichever color the player has the most of,
 * so scarce colors stay untapped for the next spell.
 */
export function payMana(state: GameState, player: PlayerId, cost: ManaCost): PayResult {
  const byColor = new Map<ManaColor, string[]>();
  for (const perm of state.players[player].battlefield) {
    if (perm.tapped) continue;
    const color = landColor(getCard(state, perm.card.defId));
    if (!color) continue;
    byColor.set(color, [...(byColor.get(color) ?? []), perm.card.iid]);
  }

  const tap: string[] = [];
  for (const color of MANA_COLORS) {
    const need = cost.colored[color] ?? 0;
    const have = byColor.get(color) ?? [];
    if (have.length < need) return { ok: false, missing: color };
    tap.push(...have.splice(0, need));
  }

  for (let i = 0; i < cost.generic; i++) {
    let best: ManaColor | undefined;
    for (const color of MANA_COLORS) {
      if ((byColor.get(color)?.length ?? 0) > (best ? byColor.get(best)!.length : 0)) best = color;
    }
    if (!best) return { ok: false, missing: "generic" };
    tap.push(byColor.get(best)!.shift()!);
  }
  return { ok: true, tap };
}

/** Mana the player could produce right now, per color. */
export function availableMana(state: GameState, player: PlayerId): Record<ManaColor, number> {
  const pool: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const perm of state.players[player].battlefield) {
    if (perm.tapped) continue;
    const color = landColor(getCard(state, perm.card.defId));
    if (color) pool[color]++;
  }
  return pool;
}
