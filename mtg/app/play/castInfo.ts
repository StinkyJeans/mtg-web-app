import { castCostOf, manaSourcesToConfirm, parseCard, parseManaCost, payMana } from "@mtg/engine";
import type { Action, CardDef, Castable, GameState, PlayerId } from "@mtg/engine";

/** A spell being cast step by step: modes, then the kicker, then X, then an additional cost, then targets. */
export interface CastPlan {
  iid: string;
  name: string;
  from?: "graveyard" | "exile" | "prepared";
  castable: Castable;
  modes?: number[];
  kicked?: boolean;
  x?: number;
  sacrifice?: string;
  /** Cast for its warp cost. */
  warp?: boolean;
}

/** What paying for this action involves: the life it costs (Phyrexian mana with no mana to match) and the creatures it would tap for mana. */
export function paymentOf(state: GameState, action: Action, who: PlayerId, spare: string[]): { ok: boolean; life: number; ask: string[] } {
  const me = state.players[who];
  let cost: ReturnType<typeof parseManaCost> = null;
  if (action.type === "castSpell" || action.type === "castCreature") {
    const fromYard = action.type === "castSpell" && action.from === "graveyard";
    const prepared = action.type === "castSpell" && action.from === "prepared" ? me.battlefield.find((p) => p.card.iid === action.iid)?.prepared : undefined;
    const card = (fromYard ? me.graveyard : me.hand).find((c) => c.iid === action.iid);
    const def = prepared ? state.cards[prepared] : card ? state.cards[card.defId] : undefined;
    cost = def ? (fromYard ? parseManaCost(parseCard(def).flashback ?? "") : castCostOf(state, who, def, action.type === "castSpell" ? action.targets : undefined)) : null;
  } else if (action.type === "activateAbility") {
    const source = [...me.battlefield.map((p) => p.card), ...me.hand, ...me.graveyard].find((c) => c.iid === action.iid);
    const ability = source ? parseCard(state.cards[source.defId]).activated[action.index] : undefined;
    cost = ability?.mana ? parseManaCost(ability.mana) : null;
  }
  if (!cost) return { ok: true, life: 0, ask: [] };
  const held = spare.length > 0 ? { ...state, players: { ...state.players, [who]: { ...me, spareMana: spare } } } : state;
  const paid = payMana(held, who, cost);
  return paid.ok ? { ok: true, life: paid.life, ask: manaSourcesToConfirm(state, who, paid.tap) } : { ok: false, life: 0, ask: [] };
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
