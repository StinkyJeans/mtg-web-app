import { abilityLockReason, getActivatable, getCastable, getCrewable, getCyclable, getLegalActions, getLoyaltyAbilities, parseCard, parseManaCost, payMana } from "@mtg/engine";
import type { GameState, PlayerId } from "@mtg/engine";
import { ManaText } from "./ManaSymbols";
import { readable } from "./cardText";
import { preparedSpell } from "./castInfo";

const COMBAT_KEYWORDS = ["trample", "flying", "menace", "first strike", "double strike", "deathtouch", "lifelink", "vigilance", "indestructible", "reach"];

/** Everything that can be done with abilities right now. It lives in a pop-up (the button is in the command bar) so it doesn't take board space. */
export function abilityList(state: GameState, actor: PlayerId) {
  const me = state.players[actor];
  return {
    abilities: getActivatable(state, actor),
    cycles: getCyclable(state, actor),
    crews: getCrewable(state, actor),
    loyalty: getLoyaltyAbilities(state, actor),
    // Spells that can be cast from the graveyard (flashback), from exile ("you may play that card") or as a copy from a prepared creature, and lands that can be played from exile.
    flashbacks: getCastable(state, actor)
      .filter((c) => c.zone === "graveyard" || c.zone === "exile" || c.zone === "prepared")
      .map((c) => {
        const prepared = c.zone === "prepared" ? preparedSpell(state, actor, c.iid) : null;
        if (prepared) return { iid: c.iid, name: prepared.spell.name, cost: prepared.spell.manaCost ?? "", zone: "prepared" as const, source: prepared.creature };
        const card = [...me.graveyard, ...me.exile].find((x) => x.iid === c.iid)!;
        const def = state.cards[card.defId];
        // A creature card cast from the graveyard (Case of the Uneaten Feast), or a warped card cast from exile, costs its mana cost.
        // One exiled from the hand by Lightstall Inquisitor costs more (`tax`).
        const entry = c.zone === "exile" ? me.mayPlay?.find((e) => e.iid === c.iid) : undefined;
        const why = c.zone === "graveyard" && def.type === "creature" ? ("yard" as const) : entry?.source === "warp" ? ("warp" as const) : entry?.source === "exiled" ? ("exiled" as const) : undefined;
        const cost = c.zone === "exile" || why === "yard" ? (def.manaCost ?? "") : (parseCard(def).flashback ?? "");
        return { iid: c.iid, name: def.name, cost, zone: c.zone as "graveyard" | "exile", ...(why ? { why } : {}), ...(entry?.tax ? { tax: entry.tax } : {}) };
      }),
    exileLands: getLegalActions(state, actor).flatMap((a) =>
      a.type === "playLand" && me.exile.some((c) => c.iid === a.iid)
        ? [{ iid: a.iid, name: state.cards[me.exile.find((c) => c.iid === a.iid)!.defId].name, ...(me.mayPlay?.some((e) => e.iid === a.iid && e.tappedLand) ? { tapped: true } : {}) }]
        : [],
    ),
  };
}

export const countAbilities = (list: ReturnType<typeof abilityList>) =>
  list.abilities.length + list.cycles.length + list.crews.length + list.loyalty.length + list.flashbacks.length + list.exileLands.length;

/** Abilities that exist but can't be used right now, each with the reason, so they can be shown greyed out. */
export function lockedAbilities(state: GameState, actor: PlayerId) {
  if (state.winner || state.pendingPick) return [];
  const out: { key: string; where: "hand" | "battlefield"; label: React.ReactNode; reason: string; help?: string }[] = [];
  const usable = getActivatable(state, actor);
  const hasPriority = !state.priority || state.priority.holder === actor;
  for (const perm of state.players[actor].battlefield) {
    const def = state.cards[perm.card.defId];
    parseCard(def).activated.forEach((ability, index) => {
      if (usable.some((u) => u.iid === perm.card.iid && u.index === index)) return;
      // the engine says exactly which condition is not met (tapped, mana, timing, life...)
      const reason = !hasPriority ? "wait for your turn to respond" : (abilityLockReason(state, actor, perm, index) ?? "can't be used right now");
      out.push({ key: `${perm.card.iid}-${index}`, where: "battlefield", label: <span><span className="font-semibold">{def.name}</span>: {readable(ability.text, def.name)}</span>, reason, help: ability.text });
    });
  }
  const cyclable = getCyclable(state, actor);
  for (const card of state.players[actor].hand) {
    const def = state.cards[card.defId];
    const cycling = parseCard(def).cycling;
    if (!cycling || cyclable.some((c) => c.iid === card.iid)) continue;
    const cost = parseManaCost(cycling);
    out.push({
      key: `cycle-${card.iid}`,
      where: "hand",
      label: <span><span className="font-semibold">Cycle {def.name}</span>: <ManaText text={cycling} /></span>,
      reason: !hasPriority ? "wait for your turn to respond" : cost && !payMana(state, actor, cost).ok ? "not enough mana" : "can't be used right now",
      help: "cycling",
    });
  }
  return out;
}

/** Abilities that would change nothing right now (a keyword the creature already has), so the player doesn't waste mana or life. */
export function abilityWarnings(state: GameState, actor: PlayerId): Record<string, string> {
  const out: Record<string, string> = {};
  for (const perm of state.players[actor].battlefield) {
    parseCard(state.cards[perm.card.defId]).activated.forEach((ability, index) => {
      const grants = ability.effects.filter((e) => e.type === "grant" && e.what.t === "self");
      if (grants.length === 0 || grants.length !== ability.effects.length) return;
      const names = grants.map((e) => (e.type === "grant" ? e.keyword : "")).join(" and ");
      const owned = grants.every((e) => e.type === "grant" && ((perm.tempKeywords ?? []).includes(e.keyword) || (state.cards[perm.card.defId].keywords ?? []).includes(e.keyword)));
      const combatOnly = grants.every((e) => e.type === "grant" && COMBAT_KEYWORDS.includes(e.keyword));
      const def = state.cards[perm.card.defId];
      if (owned) out[`${perm.card.iid}-${index}`] = `already has ${names}: this would change nothing`;
      else if (combatOnly && perm.summoningSick && def.type === "creature" && !(perm.tempKeywords ?? []).includes("haste") && !(def.keywords ?? []).includes("haste") && ["main1", "attackers", "main2", "end"].includes(state.phase) && state.active === actor) {
        out[`${perm.card.iid}-${index}`] = `it just arrived and can't attack this turn: ${names} won't matter until your next turn`;
      } else if (combatOnly && ["main2", "end", "cleanup"].includes(state.phase) && state.active === actor) {
        out[`${perm.card.iid}-${index}`] = `combat is over this turn: ${names} would change nothing`;
      }
    });
  }
  return out;
}
