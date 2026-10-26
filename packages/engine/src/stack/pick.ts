import type { GameEvent } from "../actions.js";
import { getCard } from "../cards.js";
import {
  askAsEnters,
  bindSpecs,
  cardsDiscarded,
  changeLife,
  checkStateBasedActions,
  counterStackItem,
  drawCards,
  findPermanentOrNull,
  landEntered,
  newId,
  powerOf,
  removeFromBattlefield,
  runEffects,
} from "../core.js";
import { parseManaCost, payMana } from "../mana.js";
import { parseCard } from "../oracle.js";
import { shuffle } from "../state.js";
import { OPPONENT } from "../types.js";
import type { PendingPick } from "../effects.js";
import type { CardInstance, GameState, PlayerId } from "../types.js";
import { applyPayment, openRound, rememberMode } from "./shared.js";
import { afterResolution } from "./resolve.js";

// Answering a pending pick: the card, target, color or option a player was asked to choose.

const playerLabelOf = (id: PlayerId) => (id === "p1" ? "Player 1" : "Player 2");

/** "If you do, ..." after paying or discarding. "When you do, ... target ..." is a new ability, whose target is chosen now. */
function afterYouDo(state: GameState, player: PlayerId, pick: PendingPick, events: GameEvent[]): void {
  if (!pick.thenEffects || !pick.thenCtx) return;
  if (!pick.thenSpecs) {
    runEffects(state, pick.thenEffects, pick.thenCtx, events);
    checkStateBasedActions(state, events);
    return;
  }
  const ctx = pick.thenCtx;
  state.triggerQueue.push({
    specs: pick.thenSpecs,
    item: { kind: "ability", id: newId(state), controller: player, source: ctx.sourceId, sourceName: ctx.sourceName, effects: pick.thenEffects, targets: [], specs: pick.thenSpecs, text: `${ctx.sourceName}: when you ${pick.kind === "discard" ? "discarded" : "paid"}`, ...(ctx.other ? { other: ctx.other } : {}) },
  });
}

/** Answers a PendingPick. `iid` is missing when the player declines (only allowed when the pick is optional). */
export function pickCard(state: GameState, player: PlayerId, iid: string | undefined, events: GameEvent[]): string | null {
  const pick = state.pendingPick;
  if (!pick || pick.player !== player) return "There is nothing to choose.";
  const owner = state.players[pick.owner];
  const finish = () => {
    const { rest, ctx } = pick;
    state.pendingPick = null;
    // The effects that came after the choice on the same card ("Scry 2, then draw a card").
    if (rest && ctx) {
      runEffects(state, rest, ctx, events);
      checkStateBasedActions(state, events);
    }
    if (!state.pendingPick) afterResolution(state);
  };
  const take = (zone: CardInstance[], id: string) => zone.splice(zone.findIndex((c) => c.iid === id), 1)[0];

  if (pick.kind === "color") {
    const perm = iid && pick.options.includes(iid) ? owner.battlefield.find((p) => p.card.iid === pick.colorFor) : undefined;
    if (!iid || !pick.options.includes(iid)) return "Choose one of the colors.";
    if (perm) perm.chosenColor = iid as "W" | "U" | "B" | "R" | "G";
    finish();
    return null;
  }

  if (pick.kind === "creatureType") {
    if (!iid || !pick.options.includes(iid)) return "Choose one of the creature types.";
    const perm = owner.battlefield.find((p) => p.card.iid === pick.colorFor);
    if (perm) perm.chosenType = iid;
    finish();
    return null;
  }

  if (pick.kind === "mode") {
    const mode = iid !== undefined && pick.options.includes(iid) ? pick.modes?.[Number(iid)] : undefined;
    if (!mode || !pick.modeItem) return "Choose one of the modes.";
    const item = pick.modeItem;
    if (pick.modeUnchosen) rememberMode(state, item.source, Number(iid));
    const targets = bindSpecs(mode.targets, item.source);
    state.triggerQueue.unshift({ specs: targets, item: { ...item, effects: mode.effects, specs: targets, text: `${item.text}: ${mode.text}` } });
    finish();
    return null;
  }

  if (pick.kind === "crew") {
    // Each pick taps one more creature; at enough total power the Vehicle's crew ability goes on the stack. Declining cancels.
    if (iid === undefined) {
      finish();
      return null;
    }
    if (!pick.options.includes(iid)) return "That creature can't crew.";
    const crewer = owner.battlefield.find((p) => p.card.iid === iid)!;
    pick.ordered.push(iid);
    pick.options = pick.options.filter((o) => o !== iid);
    pick.remaining -= Math.max(0, powerOf(state, crewer));
    if (pick.remaining > 0) {
      pick.prompt = `Crew: ${pick.remaining} more power needed`;
      return null;
    }
    for (const id of pick.ordered) owner.battlefield.find((p) => p.card.iid === id)!.tapped = true;
    const vehicle = owner.battlefield.find((p) => p.card.iid === pick.vehicle)!;
    vehicle.crewedBy = [...(vehicle.crewedBy ?? []), ...pick.ordered];
    const name = getCard(state, vehicle.card.defId).name;
    state.stack.push({ kind: "ability", id: newId(state), controller: player, source: vehicle.card.iid, sourceName: name, effects: [{ type: "crewed" }], targets: [], specs: [], text: "Crew" });
    events.push({ type: "abilityActivated", player, iid: vehicle.card.iid, name, text: `Crew ${getCard(state, vehicle.card.defId) && parseCard(getCard(state, vehicle.card.defId)).crew}` });
    openRound(state, OPPONENT[player]);
    state.pendingPick = null;
    return null;
  }

  if (pick.kind === "ward") {
    // Pay the ward cost (answer "pay"), or the spell or ability is countered.
    const item = state.stack.find((i) => i.id === pick.wardItem);
    const cost = pick.wardCost !== undefined ? parseManaCost(pick.wardCost) : null; // "" for "Ward—Pay 3 life"
    if (item && cost) {
      const paid = iid === "pay" && (pick.payLife ?? 0) <= state.players[player].life ? payMana(state, player, cost) : null;
      if (paid?.ok) {
        applyPayment(state, player, paid, events);
        if (pick.payLife) changeLife(state, player, -pick.payLife, events);
      } else counterStackItem(state, item, events);
    }
    finish();
    return null;
  }

  if (pick.kind === "mayPay") {
    // "You may pay {1}. If you do, ...": paying runs the rest.
    const cost = pick.wardCost !== undefined ? parseManaCost(pick.wardCost) : null;
    if (iid === "pay" && cost && pick.thenEffects && pick.thenCtx) {
      const paid = payMana(state, player, cost);
      if (paid.ok && (pick.payLife ?? 0) <= state.players[player].life) {
        applyPayment(state, player, paid, events);
        if (pick.payLife) changeLife(state, player, -pick.payLife, events);
        state.pendingPick = null;
        afterYouDo(state, player, pick, events);
        finish();
        return null;
      }
    }
    finish();
    return null;
  }

  if (pick.kind === "tax") {
    const cost = pick.wardCost ? parseManaCost(pick.wardCost) : null;
    const paid = iid === "pay" && cost ? payMana(state, player, cost) : null;
    if (paid?.ok) applyPayment(state, player, paid, events);
    else if (pick.taxFor) drawCards(state, pick.taxFor, 1, events);
    finish();
    return null;
  }

  if (pick.kind === "tapSome") {
    // Each click taps one more creature and makes the source 1/1 bigger; "Done" (no card) ends it.
    if (iid === undefined) {
      finish();
      return null;
    }
    const creature = owner.battlefield.find((p) => p.card.iid === iid);
    const source = findPermanentOrNull(state, pick.toggleIid ?? "");
    if (!creature || !pick.options.includes(iid)) return "Choose one of your untapped creatures.";
    creature.tapped = true;
    if (source) {
      source.perm.powerBonus = (source.perm.powerBonus ?? 0) + 1;
      source.perm.toughnessBonus = (source.perm.toughnessBonus ?? 0) + 1;
    }
    pick.options = pick.options.filter((o) => o !== iid);
    if (pick.options.length > 0) return null;
    finish();
    return null;
  }

  if (pick.kind === "topBottom") {
    const found = findPermanentOrNull(state, pick.toggleIid ?? "");
    if (!found || (iid !== "top" && iid !== "bottom")) return "Choose the top or the bottom.";
    const card = removeFromBattlefield(state, found.perm, found.owner.id);
    if (card) {
      const library = state.players[card.owner].library;
      if (iid === "top") library.unshift(card);
      else library.push(card);
      events.push({ type: "effect", text: `${getCard(state, card.defId).name} is put on the ${iid} of its owner's library.` });
    }
    finish();
    return null;
  }

  if (pick.kind === "bounceOwn") {
    const found = iid ? findPermanentOrNull(state, iid) : null;
    if (!found || !pick.options.includes(iid!)) return "Choose one of your creatures.";
    removeFromBattlefield(state, found.perm, found.owner.id);
    found.owner.hand.push(found.perm.card);
    events.push({ type: "effect", text: `${getCard(state, found.perm.card.defId).name} returns to its owner's hand.` });
    finish();
    return null;
  }

  if (pick.kind === "toggle") {
    if (iid === "tap" || iid === "untap") {
      const target = findPermanentOrNull(state, pick.toggleIid ?? "");
      if (target) target.perm.tapped = iid === "tap";
    }
    finish();
    return null;
  }

  if (pick.kind === "revealToHand") {
    // Take the chosen card (or none), then every other card that was looked at goes to the bottom.
    if (iid !== undefined) {
      if (!pick.options.includes(iid)) return "That isn't one of the choices.";
      owner.hand.push(take(owner.library, iid));
      // The opponent learns the card only when the card text reveals it; otherwise it stays hidden in the hand.
      const taken = getCard(state, owner.hand[owner.hand.length - 1].defId).name;
      events.push({ type: "effect", text: pick.reveal ? `${playerLabelOf(pick.owner)} reveals ${taken} and puts it into their hand.` : `${playerLabelOf(pick.owner)} puts a card into their hand.` });
    }
    const cards = (pick.bottomIids ?? []).filter((id) => id !== iid).map((id) => take(owner.library, id));
    if (pick.restToGraveyard) {
      owner.graveyard.push(...cards);
    } else {
      const [ordered, rng] = pick.randomBottom ? shuffle(cards, state.rng) : [cards, state.rng];
      state.rng = rng;
      owner.library.push(...ordered);
    }
    finish();
    return null;
  }

  if (iid === undefined) {
    if (!pick.optional) return "You have to choose a card.";
    if (pick.kind === "searchLand" || pick.kind === "searchAny") [owner.library, state.rng] = shuffle(owner.library, state.rng);
    finish();
    return null;
  }
  if (!pick.options.includes(iid)) return "That isn't one of the choices.";

  switch (pick.kind) {
    case "handExile": {
      // Kept by the permanent until it leaves the battlefield; then it returns to its owner's hand.
      const holder = pick.holder ? findPermanentOrNull(state, pick.holder)?.perm : undefined;
      if (!holder) break;
      const card = take(owner.hand, iid);
      owner.exile.push(card);
      holder.heldFromHand = [...(holder.heldFromHand ?? []), card];
      events.push({ type: "effect", text: `${getCard(state, card.defId).name} is exiled from ${playerLabelOf(pick.owner)}'s hand until ${getCard(state, holder.card.defId).name} leaves the battlefield.` });
      break;
    }
    case "exileToPlay": {
      const card = take(owner.hand, iid);
      owner.exile.push(card);
      owner.mayPlay = [...(owner.mayPlay ?? []), { iid, source: "exiled", fromTurn: state.turn, tax: pick.playTax ?? 0, ...(pick.playLandTapped ? { tappedLand: true } : {}) }];
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} exiles ${getCard(state, card.defId).name} from their hand; they may play it while it stays exiled.` });
      break;
    }
    case "discard": {
      owner.graveyard.push(take(owner.hand, iid));
      pick.ordered.push(iid);
      pick.options = pick.options.filter((o) => o !== iid);
      pick.remaining -= 1;
      if (pick.remaining > 0 && pick.options.length > 0) return null; // the next card
      cardsDiscarded(state, pick.owner, pick.ordered, events);
      state.pendingPick = null;
      afterYouDo(state, player, pick, events);
      break;
    }
    case "rummage": {
      if (pick.bottomIids?.[0] === "bottom") {
        owner.library.push(take(owner.hand, iid)); // "put a card from your hand on the bottom of your library"
      } else {
        owner.graveyard.push(take(owner.hand, iid));
        cardsDiscarded(state, pick.owner, [iid], events);
      }
      drawCards(state, pick.owner, 1, events);
      break;
    }
    case "toHand": {
      owner.hand.push(take(owner.library, iid));
      for (const other of pick.options.filter((o) => o !== iid)) owner.library.push(take(owner.library, other)); // to the bottom
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} puts a card into their hand.` });
      break;
    }
    case "scry": {
      owner.library.push(take(owner.library, iid)); // to the bottom
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} puts a card on the bottom of their library.` });
      pick.options = pick.options.filter((o) => o !== iid);
      if (pick.options.length > 0) return null; // maybe another one
      break;
    }
    case "surveil": {
      owner.graveyard.push(take(owner.library, iid));
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} puts a card from the top of their library into their graveyard.` });
      pick.options = pick.options.filter((o) => o !== iid);
      if (pick.options.length > 0) return null;
      break;
    }
    case "toGraveyard":
      owner.graveyard.push(take(owner.library, iid));
      events.push({ type: "effect", text: `The top card of ${playerLabelOf(pick.owner)}'s library is put into their graveyard.` });
      break;
    case "searchAny": {
      const found = take(owner.library, iid);
      owner.hand.push(found);
      events.push({ type: "effect", text: pick.reveal ? `${playerLabelOf(pick.owner)} searches their library, reveals ${getCard(state, found.defId).name} and puts it into their hand.` : `${playerLabelOf(pick.owner)} searches their library and puts a card into their hand.` });
      [owner.library, state.rng] = shuffle(owner.library, state.rng);
      break;
    }
    case "searchLand": {
      const land = take(owner.library, iid);
      owner.battlefield.push({ card: land, tapped: pick.entersTapped !== false, summoningSick: false, damage: 0 });
      events.push({ type: "permanentEntered", player: pick.owner, iid });
      landEntered(state, pick.owner);
      askAsEnters(state, owner.battlefield[owner.battlefield.length - 1], pick.owner);
      [owner.library, state.rng] = shuffle(owner.library, state.rng);
      break;
    }
    case "arrange": {
      pick.ordered.push(iid);
      pick.options = pick.options.filter((o) => o !== iid);
      if (pick.options.length > 1) {
        pick.prompt = `Choose the next card (${pick.ordered.length + 1} from the top).`;
        return null;
      }
      pick.ordered.push(...pick.options); // the last one has no choice
      const cards = pick.ordered.map((id) => take(owner.library, id));
      owner.library.unshift(...cards);
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} puts the cards back in a new order.` });
      break;
    }
  }
  finish();
  return null;
}
