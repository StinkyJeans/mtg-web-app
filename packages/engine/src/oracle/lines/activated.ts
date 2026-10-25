import type { ActivatedAbility, ParsedCard } from "../../effects.js";
import { manaAbilityColors, manaAbilityUsesChosenColor, parseManaCost } from "../../mana.js";
import { toNumber } from "../words.js";
import { newCtx } from "../targets.js";
import { parseSacrificeFilter } from "../sentences.js";
import { parseEffectText } from "../effectText.js";
import { parseLoyalty } from "../abilities.js";

// Activated abilities, and the keywords that are abilities with a cost. Each reader takes one line of a permanent's text and says whether it read it.

const parseManaCostOk = (mana: string) => mana === "" || parseManaCost(mana) !== null;

export function readLoyaltyAbility(line: string, out: ParsedCard): boolean {
  if (parseLoyalty(line, out)) return true;
  return false;
}

// no effect on how the game plays
export function readCrew(line: string, out: ParsedCard): boolean {
  const crew = /^crew (\d+)$/.exec(line);
  if (crew) {
    out.crew = Number(crew[1]);
    return true;
  }
  return false;
}

export function readEquip(line: string, out: ParsedCard): boolean {
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
    return true;
  }
  return false;
}

export function readSacrificeForMana(line: string, out: ParsedCard): boolean {
  if (/^\{T\}, sacrifice ~: add /i.test(line)) {
    // A Treasure-style mana ability: the colors come from the same reader the mana payment uses.
    const colors = manaAbilityColors({ id: "", name: "", type: "artifact", cost: 0, text: line });
    if (colors) {
      out.manaColors = [...new Set([...(out.manaColors ?? []), ...colors])];
      return true;
    }
  }
  return false;
}

// "{T}: Add {B}. Spend this mana only to cast a creature spell." (the payment reads the restriction from the card)
export function readCreatureOnlyMana(line: string, out: ParsedCard): boolean {
  return /^\{T\}: add \{[WUBRGC]\}\. spend this mana only to cast a creature spell$/.test(line);
}

// A Case: "Solved — Sacrifice this Case: ...", usable only once it is solved.
export function readSolvedAbility(line: string, out: ParsedCard): boolean {
  const m = /^solved — (.+)$/.exec(line);
  if (!m) return false;
  const before = out.activated.length;
  if (!readActivatedAbility(m[1].replace(/^sacrifice this case:/, "sacrifice ~:"), out) || out.activated.length !== before + 1) {
    out.unsupported.push(line);
    return true;
  }
  out.activated[before] = { ...out.activated[before], solvedOnly: true, text: line };
  return true;
}

export function readLandcycling(line: string, out: ParsedCard): boolean {
  const landcycling = /^basic landcycling (\{[^}]+\}(?:\{[^}]+\})*)$/.exec(line);
  if (landcycling && parseManaCost(landcycling[1])) {
    out.landcycling = landcycling[1];
    return true;
  }
  return false;
}

// "{T}: ...", "{1}{R}, {T}: ..." (an activated ability), or a mana ability "{T}: Add {G}."
export function readActivatedAbility(line: string, out: ParsedCard): boolean {
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
    let tapTwoSharing = false;
    cost = cost.replace(/(?:^|,\s*)tap two untapped creatures you control that share a creature type$/i, () => ((tapTwoSharing = true), ""));
    let exileFromYard = 0;
    cost = cost.replace(/(?:^|,\s*)exile (two|three|\d+) cards from your graveyard$/i, (_, n: string) => ((exileFromYard = toNumber(n.toLowerCase()) ?? 0), ""));
    const otherCost = sacrifice || zone !== undefined || payLife > 0 || costCard !== undefined || exileFromYard > 0 || tapTwoSharing;
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
        return true;
      }
      const ctx = newCtx(true);
      // "Activate only as a sorcery." / "Activate only once each turn." end the ability's text.
      let body = rest;
      let sorceryOnly = false;
      let oncePerTurn = false;
      body = body.replace(/\.?\s*activate only as a sorcery\.?$/, () => ((sorceryOnly = true), ""));
      body = body.replace(/\.?\s*activate only once each turn\.?$/, () => ((oncePerTurn = true), ""));
      let onceOnly = false;
      body = body.replace(/\.?\s*activate only once\.?$/, () => ((onceOnly = true), ""));
      let minLife: number | undefined;
      body = body.replace(/\.?\s*activate only if you have at least (\d+) life more than your starting life total(?: and only as a sorcery)?\.?$/, (all, n: string) => ((minLife = 20 + Number(n)), all.includes("sorcery") ? ((sorceryOnly = true), "") : ""));
      let yourTurnOnly = false;
      body = body.replace(/^it deals /, "~ deals ");
      body = body.replace(/\.?\s*activate only during your turn\.?$/, () => ((yourTurnOnly = true), ""));
      const effects = parseManaCostOk(mana) ? parseEffectText(body, ctx) : null;
      // "{1}{B}: Return this card from your graveyard to the battlefield tapped.": the ability works from the graveyard.
      if (!zone && effects?.some((e) => e.type === "returnSelfToBattlefield" || e.type === "returnFromYard")) zone = "graveyard";
      if (effects && effects.length > 0) {
        const ability: ActivatedAbility = { tap, mana, effects, targets: ctx.targets, text: line, ...(sorceryOnly ? { sorceryOnly } : {}), ...(oncePerTurn ? { oncePerTurn } : {}), ...(onceOnly ? { onceOnly } : {}), ...(yourTurnOnly ? { yourTurnOnly } : {}), ...(minLife !== undefined ? { minLife } : {}), ...(sacrifice ? { sacrifice } : {}), ...(zone ? { zone } : {}), ...(discardSelf ? { discardSelf } : {}), ...(exileSelf ? { exileSelf } : {}), ...(payLife ? { payLife } : {}), ...(costCard ? { costCard } : {}), ...(exileFromYard ? { exileFromYard } : {}), ...(tapTwoSharing ? { tapTwoSharing } : {}) };
        out.activated.push(ability);
        return true;
      }
    }
  }
  return false;
}
