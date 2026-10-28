import { castCostOf, manaSourcesToConfirm, parseCard, parseManaCost, payForAbility, payMana, withPhyrexianLife } from "@mtg/engine";
import type { Action, CardDef, Castable, GameState, ManaCost, PlayerId } from "@mtg/engine";

/** A spell being cast step by step: teamwork, modes, then the kicker, then X, then an additional cost, then targets. */
export interface CastPlan {
  iid: string;
  name: string;
  from?: "graveyard" | "exile" | "prepared";
  castable: Castable;
  modes?: number[];
  kicked?: boolean;
  /** Teamwork: the creatures tapped as an additional cost ([] = cast without it). */
  teamwork?: string[];
  x?: number;
  sacrifice?: string;
  /** Cast for its warp cost. */
  warp?: boolean;
}

/** The mana cost of a spell or ability being used, and for a permanent's ability the card (paid like the engine pays it). */
function costOf(state: GameState, action: Action, who: PlayerId): { cost: ManaCost | null; ability: { def: CardDef; iid?: string } | null } {
  const me = state.players[who];
  if (action.type === "castSpell" || action.type === "castCreature") {
    const fromYard = action.type === "castSpell" && action.from === "graveyard";
    const prepared = action.type === "castSpell" && action.from === "prepared" ? me.battlefield.find((p) => p.card.iid === action.iid)?.prepared : undefined;
    const card = (fromYard ? me.graveyard : me.hand).find((c) => c.iid === action.iid);
    const def = prepared ? state.cards[prepared] : card ? state.cards[card.defId] : undefined;
    return { cost: def ? (fromYard ? parseManaCost(parseCard(def).flashback ?? "") : castCostOf(state, who, def, action.type === "castSpell" ? action.targets : undefined)) : null, ability: null };
  }
  if (action.type !== "activateAbility") return { cost: null, ability: null };
  const source = [...me.battlefield.map((p) => p.card), ...me.hand, ...me.graveyard].find((c) => c.iid === action.iid);
  const used = source ? parseCard(state.cards[source.defId]).activated[action.index] : undefined;
  const ability = source ? { def: state.cards[source.defId], ...(me.battlefield.some((p) => p.card.iid === source.iid) ? { iid: source.iid } : {}) } : null;
  return { cost: used?.mana ? parseManaCost(used.mana) : null, ability };
}

/** What paying for this action involves: the life it costs (Phyrexian mana with no mana to match, or paid with life by choice) and the creatures it would tap for mana. */
export function paymentOf(state: GameState, action: Action, who: PlayerId, spare: string[]): { ok: boolean; life: number; ask: string[] } {
  const { cost, ability } = costOf(state, action, who);
  if (!cost) return { ok: true, life: 0, ask: [] };
  const chosen = withPhyrexianLife(cost, action.type === "castSpell" || action.type === "activateAbility" ? (action.phyrexianLife ?? 0) : 0);
  if (!chosen) return { ok: false, life: 0, ask: [] };
  const me = state.players[who];
  const held = spare.length > 0 ? { ...state, players: { ...state.players, [who]: { ...me, spareMana: spare } } } : state;
  const paid = ability ? payForAbility(held, who, chosen, ability.def, ability.iid) : payMana(held, who, chosen);
  return paid.ok ? { ok: true, life: paid.life, ask: manaSourcesToConfirm(state, who, paid.tap) } : { ok: false, life: 0, ask: [] };
}

/**
 * The ways to pay a cost with Phyrexian mana ({B/P}: black mana or 2 life) when the player has the mana for some of it:
 * each with the life it costs and the mana it still takes. Empty when there is nothing to choose.
 */
export function phyrexianChoices(state: GameState, action: Action, who: PlayerId, spare: string[]): { action: Action; life: number; mana: string }[] {
  if ((action.type !== "castSpell" && action.type !== "activateAbility") || action.phyrexianLife !== undefined) return [];
  const symbols = costOf(state, action, who).cost?.phyrexian ?? [];
  const choices: { action: Action; life: number; mana: string }[] = [];
  for (let n = 0; n <= symbols.length; n++) {
    const choice = { ...action, phyrexianLife: n };
    const pay = paymentOf(state, choice, who, spare);
    if (!pay.ok || choices.some((c) => c.life === pay.life)) continue;
    choices.push({ action: choice, life: pay.life, mana: symbols.slice(0, symbols.length - pay.life / 2).map((c) => `{${c}}`).join("") });
  }
  return choices.length > 1 ? choices : [];
}

/** A prepared creature of the player's: the spell a copy of which may be cast, and the creature's own name. */
export function preparedSpell(state: GameState, player: PlayerId, iid: string): { spell: CardDef; creature: string } | null {
  const perm = state.players[player].battlefield.find((p) => p.card.iid === iid);
  if (!perm?.prepared || !state.cards[perm.prepared]) return null;
  return { spell: state.cards[perm.prepared], creature: state.cards[perm.card.defId].name.split(" // ")[0] };
}

/** The name of a card wherever it is: on the battlefield, or in a hand or graveyard (some abilities work from there). */
export function cardNameAnywhere(state: GameState, iid: string): string {
  for (const p of Object.values(state.players)) {
    const card = [...p.battlefield.map((x) => x.card), ...p.hand, ...p.graveyard].find((c) => c.iid === iid);
    if (card) return state.cards[card.defId].name;
  }
  return "a card";
}
