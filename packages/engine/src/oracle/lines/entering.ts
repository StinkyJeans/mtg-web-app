import type { ParsedCard } from "../../effects.js";
import { toAmount, toNumber } from "../words.js";

// How a permanent enters the battlefield, and replacement effects. Each reader takes one line of a permanent's text and says whether it read it.

export function readEntersWithCounters(line: string, out: ParsedCard): boolean {
  const withCounters = /^~ enters with (a|an|one|two|three|four|\d+|x) \+1\/\+1 counters? on it$/.exec(line);
  if (withCounters && toAmount(withCounters[1]) !== null) {
    out.entersWithCounters = toAmount(withCounters[1])!;
    return true;
  }
  return false;
}

export function readEntersWithMinusCounters(line: string, out: ParsedCard): boolean {
  const withMinus = /^~ enters with (a|an|one|two|three|four|five|\d+) -1\/-1 counters? on it$/.exec(line);
  if (withMinus && toNumber(withMinus[1]) !== null) {
    out.entersWithMinus = toNumber(withMinus[1])!;
    return true;
  }
  return false;
}

export function readKickedCounters(line: string, out: ParsedCard): boolean {
  const kickedCounters = /^if ~ was kicked, it enters with (a|an|one|two|three|four|five|\d+) \+1\/\+1 counters? on it$/.exec(line);
  if (kickedCounters && toNumber(kickedCounters[1]) !== null) {
    out.kickedCounters = toNumber(kickedCounters[1])!;
    return true;
  }
  return false;
}

export function readChooseColorOnEnter(line: string, out: ParsedCard): boolean {
  const colorWords: Record<string, string> = { white: "W", blue: "U", black: "B", red: "R", green: "G" };
  const chooseColor = /^(?:(~) enters tapped\. )?as (?:it|~) enters, choose a color(?: other than (white|blue|black|red|green))?$/.exec(line);
  if (chooseColor) {
    if (chooseColor[1]) out.entersTapped = true;
    out.chooseColor = chooseColor[2] ? { except: colorWords[chooseColor[2]] } : {};
    return true;
  }
  if (/^as (?:it|~) enters, choose a creature type$/.test(line)) {
    out.chooseType = true;
    return true;
  }
  return false;
}

// Giada: "Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control."
export function readOthersEnterWithCounters(line: string, out: ParsedCard): boolean {
  const m = /^each other ([a-z]+) you control enters with an additional \+1\/\+1 counter on it for each ([a-z]+) you already control$/.exec(line);
  if (!m || m[1] !== m[2]) return false;
  out.othersEnterWithCounters = m[1];
  return true;
}

// Lands that enter tapped unless a condition holds (check lands, fast lands, slow lands, ...)
export function readEntersTappedUnless(line: string, out: ParsedCard): boolean {
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
    return true;
  }
  return false;
}

// ── replacement of life gained
export function readPreventNoncombatDamage(line: string, out: ParsedCard): boolean {
  if (line === "prevent all noncombat damage that would be dealt to you and creatures you control") {
    out.preventNoncombat = true;
    return true;
  }
  return false;
}

export function readGrantsLifeGainCounters(line: string, out: ParsedCard): boolean {
  if (/^enchanted creature has "whenever you gain life, put that many \+1\/\+1 counters on ~\.?"$/.test(line)) {
    out.hostGainLifeCounters = true;
    return true;
  }
  return false;
}

export function readDrawsTwoInstead(line: string, out: ParsedCard): boolean {
  if (line === "if you would draw a card except the first one you draw in each of your draw steps, draw two cards instead") {
    out.drawDouble = true;
    return true;
  }
  return false;
}

export function readGainLifePlusOne(line: string, out: ParsedCard): boolean {
  if (line === "if you would gain life, you gain that much life plus 1 instead") {
    out.lifeGainPlus = 1;
    return true;
  }
  return false;
}

export function readGainTwiceLife(line: string, out: ParsedCard): boolean {
  if (line === "if you would gain life, you gain twice that much life instead") {
    out.lifeGainDouble = true;
    return true;
  }
  return false;
}

export function readEntersPrepared(line: string, out: ParsedCard): boolean {
  if (line === "~ enters prepared") {
    out.entersPrepared = true;
    return true;
  }
  return false;
}

export function readEntersTapped(line: string, out: ParsedCard): boolean {
  if (line === "~ enters tapped" || line === "~ enters the battlefield tapped") {
    out.entersTapped = true;
    return true;
  }
  return false;
}
