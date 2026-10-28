import type { Effect, ParsedCard } from "../../effects.js";
import { parseManaCost } from "../../mana.js";
import { toNumber } from "../words.js";
import { newCtx } from "../targets.js";
import { parseEffectText } from "../effectText.js";
import { parseCreatureLine } from "../lines.js";

// Lines of the Jund Sacrifice deck: sacrifice triggers, firebending, a creature land that brings its own trigger.

/** "Whenever a player sacrifices a permanent, ..." / "Whenever you sacrifice a permanent, ..." / "Whenever you sacrifice a token, ..." */
export function readSacrificeTrigger(line: string, out: ParsedCard): boolean {
  const m = /^whenever (a player sacrifices|you sacrifice) a (permanent|token),? (.+)$/.exec(line);
  if (!m) return false;
  const ctx = newCtx(true);
  const effects = parseEffectText(m[3], ctx);
  if (!effects || effects.length === 0 || (m[1] === "a player sacrifices" && m[2] === "token")) {
    out.unsupported.push(line);
    return true;
  }
  out.triggers.push({ event: m[1] === "you sacrifice" ? "youSacrifice" : "anySacrifice", effects, targets: ctx.targets, text: line, ...(m[2] === "token" ? { tokenOnly: true } : {}) });
  return true;
}

/** "Firebending 4": whenever this creature attacks, add {R}{R}{R}{R}; the mana lasts until end of combat. */
export function readFirebending(line: string, out: ParsedCard): boolean {
  const m = /^firebending (\d+)$/.exec(line);
  if (!m) return false;
  const n = Number(m[1]);
  out.triggers.push({ event: "attacks", effects: [{ type: "addMana", mana: Array(n).fill("R"), combat: true }], targets: [], text: `Firebending ${n}` });
  return true;
}

/** Den of the Bugbear: "If you control two or more other lands, this land enters tapped." */
export function readTappedIfMoreLands(line: string, out: ParsedCard): boolean {
  const m = /^if you control (two|three|four|\d+) or more other lands, ~ enters tapped$/.exec(line);
  if (!m) return false;
  out.entersTappedUnless = { fewerOtherLands: (toNumber(m[1]) ?? 2) - 1 };
  return true;
}

/**
 * Den of the Bugbear: '{3}{R}: Until end of turn, this land becomes a 3/2 red Goblin creature with "Whenever this creature attacks,
 * create a 1/1 red Goblin creature token that's tapped and attacking." It's still a land.' The quoted trigger is read as the land's
 * own: it can only attack while it is a creature.
 */
export function readCreatureLandWithTrigger(line: string, out: ParsedCard): boolean {
  const m = /^((?:\{[^}]+\})+): until end of turn, ~ becomes an? (\d+)\/(\d+) (?:(?:white|blue|black|red|green) )?([a-z ]+?) creature with "(when(?:ever)? ~ attacks, .+?)\.?"\.? it's still a land$/.exec(line);
  if (!m) return false;
  const quoted: ParsedCard = { ok: true, triggers: [], activated: [], unsupported: [] };
  parseCreatureLine(m[5], quoted);
  if (!parseManaCost(m[1]) || quoted.unsupported.length > 0 || quoted.triggers.length !== 1) {
    out.unsupported.push(line);
    return true;
  }
  const what = { t: "self" as const };
  const effects: Effect[] = [{ type: "becomeCreatureNow", what, subtypes: m[4].split(" ") }, { type: "setBase", what, power: Number(m[2]), toughness: Number(m[3]) }];
  out.activated.push({ tap: false, mana: m[1], effects, targets: [], text: line });
  out.triggers.push(...quoted.triggers);
  return true;
}
