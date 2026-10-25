import { getCard } from "../cards.js";
import type { GameEvent } from "../actions.js";
import type { StackItem, TokenSpec } from "../effects.js";
import { parseCard } from "../oracle.js";
import type { CardDef, CardInstance, GameState, Permanent, PlayerId } from "../types.js";
import { findPermanentOrNull, isCreature, nameOf, newId, powerOf, subtypesOf } from "./permanents.js";
import { creatureEntered, creatureMoved, queueTriggers } from "./triggers.js";

// Life, drawing, counters, and cards leaving the battlefield or the stack.

export function changeLife(state: GameState, player: PlayerId, delta: number, events: GameEvent[]): void {
  if (delta === 0) return;
  if (delta > 0) {
    // "If you would gain life, you gain that much life plus 1" / "twice that much": the player's permanents change the amount.
    for (const perm of state.players[player].battlefield) {
      const parsed = parseCard(getCard(state, perm.card.defId));
      if (parsed.lifeGainDouble) delta *= 2;
    }
    for (const perm of state.players[player].battlefield) delta += parseCard(getCard(state, perm.card.defId)).lifeGainPlus ?? 0;
    state.players[player].lifeGainedThisTurn = (state.players[player].lifeGainedThisTurn ?? 0) + delta;
    // "Enchanted creature has 'Whenever you gain life, put that many +1/+1 counters on this creature'" (Light of Promise)
    for (const aura of [...state.players.p1.battlefield, ...state.players.p2.battlefield]) {
      if (!aura.attachedTo || !parseCard(getCard(state, aura.card.defId)).hostGainLifeCounters) continue;
      const host = state.players[player].battlefield.find((p) => p.card.iid === aura.attachedTo);
      if (host) putCounters(state, host, player, delta);
    }
  }
  state.players[player].life += delta;
  if (delta < 0) state.players[player].lifeLostThisTurn = (state.players[player].lifeLostThisTurn ?? 0) - delta;
  events.push(delta > 0 ? { type: "lifeGained", player, amount: delta } : { type: "lifeLost", player, amount: -delta });
  if (delta > 0) onLifeGained(state, player);
}

/** "Whenever you gain life, ...": the player's permanents with that trigger queue it. */
export function onLifeGained(state: GameState, player: PlayerId): void {
  for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "lifeGained");
}

export function drawCards(state: GameState, player: PlayerId, count: number, events: GameEvent[], drawStep = false): void {
  const p = state.players[player];
  // "If you would draw a card except the first one you draw in each of your draw steps, draw two cards instead."
  if (!drawStep && p.battlefield.some((perm) => parseCard(getCard(state, perm.card.defId)).drawDouble)) count *= 2;
  for (let i = 0; i < count; i++) {
    const card = p.library.shift();
    if (!card) {
      p.drewFromEmpty = true; // loses the game when state-based actions are next checked
      return;
    }
    p.hand.push(card);
    events.push({ type: "cardDrawn", player, iid: card.iid });
    p.drawnThisTurn = (p.drawnThisTurn ?? 0) + 1;
    for (const perm of p.battlefield) {
      queueTriggers(state, perm.card, player, "drawCard");
      if (p.drawnThisTurn === 2) queueTriggers(state, perm.card, player, "drawSecond");
      if (p.drawnThisTurn === 5) queueTriggers(state, perm.card, player, "drawFifth");
    }
  }
}


/** Regeneration: instead of being destroyed the creature is tapped, healed and taken out of combat (rule 701.15). */
export function regenerateInstead(state: GameState, perm: Permanent): boolean {
  if ((perm.regenShield ?? 0) <= 0 || perm.noRegen) return false;
  perm.regenShield = (perm.regenShield ?? 0) - 1;
  perm.tapped = true;
  perm.damage = 0;
  perm.deathtouched = false;
  if (state.combat) {
    state.combat.attackers = state.combat.attackers.filter((a) => a.attacker !== perm.card.iid);
    for (const a of state.combat.attackers) a.blockers = a.blockers.filter((b) => b !== perm.card.iid);
  }
  return true;
}

/** Tokens only exist on the battlefield: anywhere else they cease to exist (rule 111.7). */
export const isToken = (card: CardInstance) => (card.printed ?? card.defId).startsWith("token-");

/** Off the battlefield a card is its printed self again (it stops being a copy, or an enchantment instead of a creature). */
const printedCard = (card: CardInstance): CardInstance => (card.printed ? { iid: card.iid, defId: card.printed, owner: card.owner } : card);

/** A creature dies: it goes to its owner's graveyard and its "when this dies" abilities trigger. */
export function putIntoGraveyard(state: GameState, perm: Permanent, controller: PlayerId, events: GameEvent[]): void {
  const battlefield = state.players[controller].battlefield;
  const at = battlefield.indexOf(perm);
  if (at < 0) return;
  // "If that creature would die this turn, exile it instead." / a finality counter
  if ((perm.exileOnDeath && isCreature(state, perm)) || perm.finality) {
    const card = removeFromBattlefield(state, perm, controller);
    if (card) state.players[card.owner].exile.push(card);
    events.push({ type: "effect", text: `${nameOf(state, perm)} is exiled instead of dying.` });
    return;
  }
  const creature = isCreature(state, perm);
  const types = creature ? subtypesOf(state, perm) : [];
  const lki = { power: creature ? powerOf(state, perm) : 0, counters: perm.counters ?? 0, minusCounters: perm.minusCounters ?? 0 };
  battlefield.splice(at, 1);
  leaveCombat(state, perm);
  creatureMoved(state, perm, controller, "leaves");
  releaseHeld(state, perm);
  if (!isToken(perm.card)) state.players[perm.card.owner].graveyard.push(printedCard(perm.card));
  events.push({ type: "creatureDied", player: controller, iid: perm.card.iid });
  queueTriggers(state, perm.card, controller, "dies", { died: lki }); // as it was on the battlefield ("if it was a creature")
  // "Whenever a Vampire you control dies" / "whenever this creature or another creature you control dies": the dying creature looks back too.
  if (creature) for (const other of [perm, ...battlefield]) queueTriggers(state, other.card, controller, "allyDies", { subtypes: types, self: other === perm });
  if (perm.diesReturn) {
    const text = "When this creature dies, return it to the battlefield tapped under its owner's control with a +1/+1 counter on it.";
    state.triggerQueue.push({ specs: [], item: { kind: "ability", id: newId(state), controller, source: perm.card.iid, sourceName: nameOf(state, perm), effects: [{ type: "returnSelfToBattlefield", tapped: true, counters: 1 }], targets: [], specs: [], text } });
  }
  // "When enchanted creature dies, ...": the Auras that were on it (they fall off as state-based actions are checked).
  for (const owner of Object.values(state.players)) {
    for (const aura of owner.battlefield) if (aura.attachedTo === perm.card.iid) queueTriggers(state, aura.card, owner.id, "enchantedDies");
  }
  // "Whenever a creature dealt damage by ~ this turn dies": the permanents that damaged it get the trigger.
  if (perm.damagedBy?.length) {
    for (const owner of Object.values(state.players)) {
      for (const other of owner.battlefield) {
        if (perm.damagedBy.includes(other.card.iid)) queueTriggers(state, other.card, owner.id, "damagedDies");
      }
    }
  }
}

/** A creature that leaves the battlefield is no longer an attacker. (A blocker that leaves stays listed: its attacker remains blocked.) */
function leaveCombat(state: GameState, perm: Permanent): void {
  if (state.combat) state.combat.attackers = state.combat.attackers.filter((a) => a.attacker !== perm.card.iid);
}

/** Cards in exile the player may play right now ("During any turn you attacked with ~, you may play that card"). */
export function exilePlayable(state: GameState, player: PlayerId): CardInstance[] {
  const me = state.players[player];
  return (me.mayPlay ?? []).flatMap((entry) => {
    const card = me.exile.find((c) => c.iid === entry.iid);
    if (entry.fromTurn !== undefined) return card && state.turn >= entry.fromTurn ? [card] : []; // warp: "on a later turn"
    const source = findPermanentOrNull(state, entry.source)?.perm;
    return source?.attackedThisTurn && card ? [card] : [];
  });
}

/** "Until this leaves the battlefield": what it was keeping in exile comes back under its owner's control (a card from a hand goes back to the hand). */
function releaseHeld(state: GameState, perm: Permanent): void {
  for (const card of perm.heldFromHand ?? []) {
    const owner = state.players[card.owner];
    const at = owner.exile.findIndex((c) => c.iid === card.iid);
    if (at >= 0) owner.hand.push(...owner.exile.splice(at, 1));
  }
  perm.heldFromHand = undefined;
  for (const card of perm.held ?? []) {
    const owner = state.players[card.owner];
    const at = owner.exile.findIndex((c) => c.iid === card.iid);
    if (at < 0) continue;
    owner.exile.splice(at, 1);
    owner.battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
    queueTriggers(state, card, card.owner, "enters");
    creatureEntered(state, card, card.owner);
  }
  perm.held = undefined;
}

/** Takes a permanent off the battlefield. Returns its card, or null for a token (which simply vanishes) or if it was gone. */
export function removeFromBattlefield(state: GameState, perm: Permanent, controller: PlayerId): CardInstance | null {
  const battlefield = state.players[controller].battlefield;
  const at = battlefield.indexOf(perm);
  if (at < 0) return null;
  battlefield.splice(at, 1);
  leaveCombat(state, perm);
  creatureMoved(state, perm, controller, "leaves");
  releaseHeld(state, perm);
  return isToken(perm.card) ? null : printedCard(perm.card);
}

/** Makes a token and puts it onto the battlefield under `controller`. */
export function makeToken(state: GameState, spec: TokenSpec, controller: PlayerId, events: GameEvent[]): void {
  const defId = `token-${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${spec.power ?? 0}-${spec.toughness ?? 0}-${spec.colors.join("")}-${spec.keywords.join("-")}`;
  state.cards[defId] ??= {
    id: defId,
    name: spec.name,
    type: spec.type,
    cost: 0,
    power: spec.power,
    toughness: spec.toughness,
    typeLine: `Token ${spec.artifact && spec.type === "creature" ? "Artifact Creature" : spec.type === "creature" ? "Creature" : "Artifact"} — ${spec.subtypes}`,
    text: spec.text,
    colors: spec.colors,
    keywords: spec.keywords,
    playable: false, // never in a deck
  };
  const card: CardInstance = { iid: `tok${state.nextId++}`, defId, owner: controller };
  state.players[controller].battlefield.push({ card, tapped: false, summoningSick: spec.type === "creature", damage: 0 });
  events.push({ type: "permanentEntered", player: controller, iid: card.iid });
  // "...tapped and attacking": the token joins the attack that is going on.
  if (spec.tappedAttacking && state.combat && spec.type === "creature") {
    const perm = state.players[controller].battlefield[state.players[controller].battlefield.length - 1];
    perm.tapped = true;
    state.combat.attackers.push({ attacker: card.iid, blockers: [] });
  }
  if (spec.type === "creature") creatureEntered(state, card, controller);
}

/** A token that is a copy of a card, with base power and toughness 1/1 (offspring). */
export function makeTokenCopy(state: GameState, def: CardDef, controller: PlayerId, events: GameEvent[]): void {
  const defId = `token-copy-${def.id}-1-1`;
  state.cards[defId] ??= { ...def, id: defId, power: 1, toughness: 1, playable: false };
  const card: CardInstance = { iid: `tok${state.nextId++}`, defId, owner: controller };
  state.players[controller].battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
  events.push({ type: "permanentEntered", player: controller, iid: card.iid });
  queueTriggers(state, card, controller, "enters");
  creatureEntered(state, card, controller);
}

/** Removes a spell or ability from the stack without it resolving. A countered spell goes to its owner's graveyard (exile, for flashback). */
/** A spell that resolved or left the stack goes to its owner's graveyard (exile after flashback, or the hand). A copy simply ceases to exist. */
export function spellLeavesStack(state: GameState, item: Extract<StackItem, { kind: "spell" }>, to: "graveyard" | "hand" = "graveyard"): void {
  if (item.copy) return;
  state.players[item.card.owner][to === "hand" ? "hand" : item.flashback ? "exile" : "graveyard"].push(item.card);
}

export function counterStackItem(state: GameState, item: StackItem, events: GameEvent[]): void {
  state.stack.splice(state.stack.indexOf(item), 1);
  if (item.kind === "spell") {
    spellLeavesStack(state, item);
    events.push({ type: "countered", name: getCard(state, item.card.defId).name });
  }
}


/** Puts +1/+1 counters on a permanent: "whenever one or more +1/+1 counters are put on another creature you control" triggers. */
export function putCounters(state: GameState, perm: Permanent, controller: PlayerId, n: number): void {
  if (n <= 0) return;
  perm.counters = (perm.counters ?? 0) + n;
  if (!isCreature(state, perm)) return;
  const types = subtypesOf(state, perm);
  for (const other of state.players[controller].battlefield) queueTriggers(state, other.card, controller, "allyCountersAdded", { subtypes: types, self: other === perm });
}
