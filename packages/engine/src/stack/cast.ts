import type { GameEvent } from "../actions.js";
import { getCard } from "../cards.js";
import {
  bindSpecs,
  cardMatches,
  cardsDiscarded,
  changeLife,
  checkStateBasedActions,
  countFor,
  exilePlayable,
  exilePlayTerms,
  findPermanentOrNull,
  forbidden,
  isCreature,
  isPermanentCard,
  kw,
  newId,
  powerOf,
  putIntoGraveyard,
  queueTriggers,
  queueWard,
  shiftTargets,
  subtypesOf,
} from "../core.js";
import type { CardFilter, TargetChoice } from "../effects.js";
import { addCosts, COLOR_NAMES, hasteFrom, manaCostOf, parseManaCost, payMana, withX } from "../mana.js";
import { parseCard } from "../oracle.js";
import { OPPONENT } from "../types.js";
import type { CardDef, GameState, Permanent, PlayerId } from "../types.js";
import { applyPayment, canCastNow, checkTargets, holdsPriority, openRound, sorceryTiming, timingError } from "./shared.js";

// Casting spells and activating abilities: each puts something on the stack and opens a round of priority.

/**
 * What a card costs to cast right now: the printed cost, less what its own text gives ("costs {1} less if you control a Wizard",
 * "for each spell your opponents have cast this turn") and what the caster's permanents give ("Goblin spells you cast cost {1} less").
 * `targets`: the ones chosen, for "costs {3} less to cast if it targets a tapped permanent" (no discount while they aren't known).
 */
export function castCostOf(state: GameState, player: PlayerId, def: CardDef, targets?: TargetChoice[]): ReturnType<typeof manaCostOf> {
  const base = manaCostOf(def);
  if (!base) return base;
  const me = state.players[player];
  const spellTypes = ((def.typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/);
  let less = 0;
  const own = parseCard(def).costReduction;
  if (own) {
    if (own.ifControl && me.battlefield.some((p) => subtypesOf(state, p).includes(own.ifControl!))) less += own.n;
    if (own.ifFlyer && me.battlefield.some((p) => isCreature(state, p) && kw(state, p, "flying"))) less += own.n;
    if (own.perOpponentSpell) less += own.n * (state.players[OPPONENT[player]].spellsCastThisTurn ?? 0);
    if (own.per) less += own.n * countFor(state, player, own.per);
    if (own.ifTargetsTapped && targets?.some((t) => t.kind === "permanent" && findPermanentOrNull(state, t.iid)?.perm.tapped)) less += own.n;
  }
  for (const perm of me.battlefield) {
    for (const mod of parseCard(getCard(state, perm.card.defId)).costMods ?? []) {
      if (mod.subtype && !(def.type === "creature" && spellTypes.includes(mod.subtype))) continue;
      if (mod.minMV !== undefined && def.cost < mod.minMV) continue;
      if (mod.otherTurn && state.active === player) continue;
      less += mod.n;
    }
  }
  return less > 0 ? { ...base, generic: Math.max(0, base.generic - less) } : base;
}

export function castSpell(state: GameState, player: PlayerId, iid: string, targets: TargetChoice[], events: GameEvent[], x = 0, kicked = false, from: "hand" | "graveyard" | "exile" | "prepared" = "hand", modes?: number[], sacrifice?: string, warp = false): string | null {
  const me = state.players[player];
  // A prepared creature: a copy of its spell is cast (`iid` is the creature).
  const prepared = from === "prepared" ? me.battlefield.find((p) => p.card.iid === iid && p.prepared) : undefined;
  const zone = from === "graveyard" ? me.graveyard : from === "exile" ? me.exile : from === "prepared" ? (prepared ? [{ iid, defId: prepared.prepared!, owner: player }] : []) : me.hand;
  const idx = zone.findIndex((c) => c.iid === iid);
  if (idx < 0) return from === "graveyard" ? "That card is not in your graveyard." : from === "exile" ? "That card is not in exile." : from === "prepared" ? "That creature isn't prepared." : "That card is not in your hand.";
  if (from === "exile" && !exilePlayable(state, player).some((c) => c.iid === iid)) return "You can't play that exiled card right now: attack with the creature that exiled it first.";
  const def = getCard(state, zone[idx].defId);
  if (def.type === "land") return "Lands are played, not cast.";
  if (!isPermanentCard(def) && def.type !== "instant" && def.type !== "sorcery") return `${def.name} can't be cast yet.`;
  const parsed = parseCard(def);
  let cost = castCostOf(state, player, def, targets);
  // A creature card that may be cast from the graveyard this turn (Case of the Uneaten Feast) costs what it always does.
  const fromYard = from === "graveyard" && def.type === "creature" && (me.yardCastable ?? []).includes(iid);
  if (from === "graveyard" && !fromYard) {
    // Flashback: only instants and sorceries, for the flashback cost instead of the mana cost.
    if (!parsed.flashback || (def.type !== "instant" && def.type !== "sorcery")) return `${def.name} doesn't have flashback.`;
    cost = parseManaCost(parsed.flashback);
  }
  if (warp) {
    // Warp: from the hand only, for the warp cost; the permanent is exiled at the beginning of the next end step.
    if (!parsed.warp || from !== "hand") return `${def.name} can't be cast for a warp cost${parsed.warp ? " from there" : ""}.`;
    cost = parseManaCost(parsed.warp);
  }
  if (!parsed.ok || !cost) return `${def.name} can't be played yet.`;
  if (from === "exile") cost = { ...cost, generic: cost.generic + exilePlayTerms(state, player, iid).tax }; // "each spell cast this way costs {1} more"
  if (!canCastNow(state, player, def)) return timingError(state, def);

  let specs = parsed.spell?.targets ?? [];
  let effects = parsed.spell?.effects ?? [];
  const modal = parsed.spell?.modal;
  if (modal) {
    // "Choose one —": the effects and targets are those of the chosen mode(s), in printed order.
    const chosen = [...new Set(modes ?? [])].sort((a, b) => a - b);
    if (chosen.length < modal.min || chosen.length > modal.max || chosen.some((m) => !modal.modes[m])) {
      return `${def.name}: choose ${modal.max === 1 ? "one mode" : "one or both modes"}.`;
    }
    specs = [];
    effects = [];
    for (const m of chosen) {
      effects.push(...shiftTargets(modal.modes[m].effects, specs.length));
      specs.push(...modal.modes[m].targets);
    }
  } else if (modes && modes.length > 0) {
    return `${def.name} has no modes.`;
  }
  const targetError = checkTargets(state, specs, targets, player, def.name);
  if (targetError) return targetError;

  if (!Number.isInteger(x) || x < 0) return "X must be a whole number, 0 or more.";
  if (!cost.x && x > 0) return `${def.name} has no X in its cost.`;
  const kickerCost = parsed.kicker ? parseManaCost(parsed.kicker) : null;
  if (kicked && !kickerCost && !parsed.blight) return `${def.name} has no kicker.`;
  // "As an additional cost to cast this spell, you may blight 1": paid (as `kicked`) with -1/-1 counters on a creature you control (`sacrifice`).
  const blighted = parsed.blight && kicked ? (sacrifice ? findPermanentOrNull(state, sacrifice) : null) : null;
  if (parsed.blight && kicked && (!blighted || blighted.owner.id !== player || !isCreature(state, blighted.perm))) return `${def.name}: choose a creature you control to blight.`;
  // "As an additional cost to cast this, sacrifice a creature." / "...sacrifice a creature or pay {3}{B}" ("pay") / "...discard a card" (`sacrifice` is the card)
  let sacrificed: ReturnType<typeof findPermanentOrNull> = null;
  const payInstead = parsed.extraSacrificeOrPay !== undefined && sacrifice === "pay" ? parseManaCost(parsed.extraSacrificeOrPay) : null;
  if (parsed.extraDiscard) {
    if (!sacrifice || sacrifice === iid || !me.hand.some((c) => c.iid === sacrifice)) return `${def.name}: choose a card to discard (an additional cost).`;
  } else if (parsed.extraSacrifice || (parsed.extraSacrificeOrPay !== undefined && !payInstead)) {
    sacrificed = sacrifice ? findPermanentOrNull(state, sacrifice) : null;
    const typed = parsed.extraSacrificeType;
    const fits = (perm: Permanent) => isCreature(state, perm) && (!typed || subtypesOf(state, perm).includes(typed));
    if (!sacrificed || sacrificed.owner.id !== player || !fits(sacrificed.perm)) return `${def.name}: choose a ${typed ?? "creature"} you control to sacrifice${parsed.extraSacrificeOrPay ? `, or pay ${parsed.extraSacrificeOrPay}` : ""}.`;
  } else if (sacrifice && !payInstead && !blighted) {
    return `${def.name} has no sacrifice cost.`;
  }
  // "Spells your opponents cast that target this cost {2} more to cast."
  let tax = 0;
  for (const t of targets) {
    const hit = t.kind === "permanent" ? findPermanentOrNull(state, t.iid) : null;
    if (hit && hit.owner.id !== player) tax += parseCard(getCard(state, hit.perm.card.defId)).targetTax ?? 0;
  }
  const taxed = tax > 0 ? { ...cost, generic: cost.generic + tax } : cost;
  const extra = [kicked ? kickerCost : null, payInstead].filter((c): c is NonNullable<typeof c> => c !== null);
  const paid = payMana(state, player, withX(extra.reduce(addCosts, taxed), x), def);
  if (!paid.ok) {
    const price = warp ? `warp ${parsed.warp}` : from === "graveyard" && !fromYard ? `flashback ${parsed.flashback}` : (cost.x ? `${def.manaCost} with X = ${x}` : (def.manaCost ?? String(def.cost))) + (kicked ? ` + kicker ${parsed.kicker}` : "") + (payInstead ? ` + ${parsed.extraSacrificeOrPay}` : "");
    return paid.missing === "life"
      ? `Not enough life to pay for ${def.name} (${price}).`
      : paid.missing === "generic"
        ? `Not enough mana: ${def.name} costs ${price}.`
        : `Not enough ${COLOR_NAMES[paid.missing]} mana: ${def.name} costs ${price}.`;
  }
  applyPayment(state, player, paid, events);
  // "Deals damage equal to the sacrificed creature's power": its power is remembered as the spell's X.
  const sacrificedPower = sacrificed ? Math.max(0, powerOf(state, sacrificed.perm)) : undefined;
  if (sacrificed) {
    putIntoGraveyard(state, sacrificed.perm, player, events); // paid as part of the cost
    checkStateBasedActions(state, events); // an Aura on the sacrificed creature falls off right away
  }

  if (blighted) {
    blighted.perm.minusCounters = (blighted.perm.minusCounters ?? 0) + parsed.blight!;
    events.push({ type: "effect", text: `${def.name}: ${getCard(state, blighted.perm.card.defId).name} gets ${parsed.blight === 1 ? "a -1/-1 counter" : `${parsed.blight} -1/-1 counters`} (blight).` });
    checkStateBasedActions(state, events);
  }
  if (fromYard) me.yardCastable = me.yardCastable!.filter((id) => id !== iid);
  const [taken] = zone.splice(idx, 1);
  if (parsed.extraDiscard && sacrifice) {
    me.graveyard.push(me.hand.splice(me.hand.findIndex((c) => c.iid === sacrifice), 1)[0]);
    cardsDiscarded(state, player, [sacrifice], events);
  }
  // Mana from Carnelian Orb of Dragonkind spent on a Dragon creature spell: it gains haste.
  const haste = paid.tap.some((src) => hasteFrom(state, src, def));
  if (from === "exile") me.mayPlay = (me.mayPlay ?? []).filter((e) => e.iid !== iid);
  if (prepared) prepared.prepared = undefined; // casting the copy unprepares it
  const card = prepared ? { ...taken, iid: `copy${state.nextId++}` } : taken;
  state.stack.push({ kind: "spell", id: newId(state), controller: player, card, effects, targets, specs, x: cost.x ? x : (sacrificedPower ?? x), ...(kicked ? { kicked } : {}), ...(haste ? { haste } : {}), ...(from === "graveyard" && !fromYard ? { flashback: true } : {}), ...(prepared ? { copy: true } : {}), ...(warp ? { warped: true } : {}) });
  events.push(
    def.type === "creature"
      ? { type: "creatureCast", player, iid: card.iid, tapped: paid.tap }
      : { type: "spellCast", player, iid: card.iid, tapped: paid.tap, targets },
  );
  queueWard(state, state.stack[state.stack.length - 1]);
  // Prowess and friends: "whenever you cast a noncreature spell" ("...a noncreature or Dragon spell" counts Dragon creature spells too).
  const spellTypes = ((def.typeLine ?? "").split(" // ")[0].split("—")[1] ?? "").toLowerCase().split(/\s+/);
  for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "noncreatureSpell", def.type === "creature" ? { subtypes: spellTypes } : undefined);
  if (def.type === "instant" || def.type === "sorcery") for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "instantOrSorcery");
  me.spellsCastThisTurn = (me.spellsCastThisTurn ?? 0) + 1;
  for (const perm of me.battlefield) queueTriggers(state, perm.card, player, "youCast", { castCount: me.spellsCastThisTurn });
  for (const perm of state.players[OPPONENT[player]].battlefield) queueTriggers(state, perm.card, OPPONENT[player], "opponentCasts");
  openRound(state, OPPONENT[player]);
  return null;
}

/** Two untapped creatures you control that share a creature type (to pay "Tap two untapped creatures that share a creature type"). */
export function tapPair(state: GameState, player: PlayerId): [Permanent, Permanent] | null {
  const mine = state.players[player].battlefield.filter((p) => isCreature(state, p) && !p.tapped);
  const types = (p: Permanent) => subtypesOf(state, p);
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 1; j < mine.length; j++) if (types(mine[i]).some((t) => types(mine[j]).includes(t))) return [mine[i], mine[j]];
  }
  return null;
}

/** The cards that could pay a "discard a card" / "sacrifice a creature" cost. */
export function costChoices(state: GameState, player: PlayerId, ability: { costCard?: { kind: "discard" | "sacrifice"; filter?: CardFilter; other?: boolean } }, sourceIid: string): string[] {
  const cost = ability.costCard;
  if (!cost) return [];
  const me = state.players[player];
  if (cost.kind === "discard") return me.hand.filter((c) => c.iid !== sourceIid).map((c) => c.iid);
  return me.battlefield
    .filter((p) => !(cost.other && p.card.iid === sourceIid))
    .filter((p) => {
      const def = getCard(state, p.card.defId);
      const f = cost.filter;
      // a creature type or basic land type is matched against the type line; a card type against the card
      return !f || f.all || cardMatches(def, f) || (f.types?.includes("creature") === true && isCreature(state, p));
    })
    .map((p) => p.card.iid);
}

export function activateAbility(state: GameState, player: PlayerId, iid: string, index: number, targets: TargetChoice[], events: GameEvent[], payWith?: string): string | null {
  const onBoard = findPermanentOrNull(state, iid);
  // A card in the hand or graveyard can have an ability that works from there.
  const zoneCard = onBoard ? undefined : [...state.players[player].hand, ...state.players[player].graveyard].find((c) => c.iid === iid);
  if ((!onBoard || onBoard.owner.id !== player) && !zoneCard) return "You can only use abilities of your own permanents.";
  const cardDefId = onBoard ? onBoard.perm.card.defId : zoneCard!.defId;
  const def = getCard(state, cardDefId);
  const ability = parseCard(def).activated[index];
  if (!ability) return `${def.name} has no such ability.`;
  if (zoneCard) {
    const inHand = state.players[player].hand.some((c) => c.iid === iid);
    if (ability.zone !== (inHand ? "hand" : "graveyard")) return `${def.name}'s ability can't be used from there.`;
  } else if (ability.zone) {
    return `${def.name}'s ability only works from your ${ability.zone}.`;
  }
  // (a card that isn't on the battlefield has no permanent: stand in a blank one for the checks below)
  const found = onBoard ?? { perm: { card: zoneCard!, tapped: false, summoningSick: false, damage: 0 } as Permanent, owner: state.players[player] };
  if (!holdsPriority(state, player)) return "You can only do that when you have priority.";
  if (ability.sorceryOnly && !sorceryTiming(state, player)) return `${def.name}'s ability can only be activated as a sorcery: in your main phase with nothing on the stack.`;
  if (ability.oncePerTurn && found.perm.usedAbilities?.includes(index)) return `${def.name}'s ability can only be activated once each turn.`;
  if (ability.onceOnly && found.perm.usedOnce?.includes(index)) return `${def.name}'s ability can only be activated once.`;
  if (ability.yourTurnOnly && state.active !== player) return `${def.name}'s ability can only be activated during your turn.`;
  if (ability.solvedOnly && !found.perm.solved) return `${def.name} isn't solved yet.`;
  if (ability.minLife !== undefined && state.players[player].life < ability.minLife) return `${def.name}'s ability needs you to have at least ${ability.minLife} life.`;
  if (forbidden(state, found.perm, "noActivated")) return `${def.name}'s abilities can't be activated.`;

  if (ability.tap) {
    if (found.perm.tapped) return `${def.name} is tapped.`;
    if (isCreature(state, found.perm) && found.perm.summoningSick && !kw(state, found.perm, "haste")) {
      return `${def.name} just arrived and can't use an ability that taps it.`;
    }
  }
  const abilitySpecs = bindSpecs(ability.targets, iid);
  const targetError = checkTargets(state, abilitySpecs, targets, player, def.name);
  if (targetError) return targetError;

  if (ability.mana) {
    const cost = parseManaCost(ability.mana);
    if (!cost) return `${def.name}'s ability can't be used yet.`;
    const paid = payMana(state, player, cost);
    if (!paid.ok) return `Not enough mana for ${def.name}'s ability (${ability.mana}).`;
    applyPayment(state, player, paid, events);
  }
  if (ability.costCard) {
    if (!payWith || !costChoices(state, player, ability, iid).includes(payWith)) return `${def.name}: choose ${ability.costCard.label}.`;
    if (ability.costCard.kind === "discard") {
      const hand = state.players[player].hand;
      state.players[player].graveyard.push(hand.splice(hand.findIndex((c) => c.iid === payWith), 1)[0]);
      cardsDiscarded(state, player, [payWith], events);
    } else {
      const victim = findPermanentOrNull(state, payWith);
      if (victim) {
        putIntoGraveyard(state, victim.perm, player, events); // paid as part of the cost
        checkStateBasedActions(state, events);
      }
    }
  }
  if (ability.tapTwoSharing) {
    const pair = tapPair(state, player);
    if (!pair) return `${def.name}: you need two untapped creatures that share a creature type.`;
    pair.forEach((p) => (p.tapped = true));
  }
  if (ability.exileFromYard) {
    // "Exile two cards from your graveyard": the oldest ones go.
    const yard = state.players[player].graveyard;
    if (yard.length < ability.exileFromYard) return `${def.name}: you need ${ability.exileFromYard} cards in your graveyard.`;
    state.players[player].exile.push(...yard.splice(0, ability.exileFromYard));
  }
  if (ability.payLife) {
    if (state.players[player].life < ability.payLife) return `Not enough life to pay ${ability.payLife}.`;
    changeLife(state, player, -ability.payLife, events);
  }
  if (zoneCard && ability.discardSelf) {
    const hand = state.players[player].hand;
    state.players[player].graveyard.push(hand.splice(hand.findIndex((c) => c.iid === iid), 1)[0]);
    cardsDiscarded(state, player, [iid], events);
  }
  if (zoneCard && ability.exileSelf) {
    const yard = state.players[player].graveyard;
    state.players[player].exile.push(yard.splice(yard.findIndex((c) => c.iid === iid), 1)[0]);
  }
  if (ability.tap) found.perm.tapped = true;
  if (ability.oncePerTurn) found.perm.usedAbilities = [...(found.perm.usedAbilities ?? []), index];
  if (ability.onceOnly) found.perm.usedOnce = [...(found.perm.usedOnce ?? []), index];
  // "Sacrifice this permanent" is part of the cost: it is gone before the ability goes on the stack.
  const sacrificedPower = ability.sacrifice && onBoard ? Math.max(0, powerOf(state, found.perm)) : undefined;
  if (ability.sacrifice) {
    putIntoGraveyard(state, found.perm, player, events);
    checkStateBasedActions(state, events);
  }

  state.stack.push({
    kind: "ability",
    id: newId(state),
    controller: player,
    source: iid,
    sourceName: def.name,
    effects: ability.effects,
    targets,
    specs: abilitySpecs,
    text: ability.text,
    ...(sacrificedPower !== undefined ? { x: sacrificedPower } : {}),
  });
  events.push({ type: "abilityActivated", player, iid, name: def.name, text: ability.text });
  queueWard(state, state.stack[state.stack.length - 1]);
  openRound(state, OPPONENT[player]);
  return null;
}

/** Activates a loyalty ability: loyalty goes up or down as the cost, then the ability goes on the stack. */
export function activateLoyalty(state: GameState, player: PlayerId, iid: string, index: number, targets: TargetChoice[], events: GameEvent[]): string | null {
  const perm = state.players[player].battlefield.find((p) => p.card.iid === iid);
  if (!perm || getCard(state, perm.card.defId).type !== "planeswalker") return "You can only use the loyalty abilities of your own planeswalkers.";
  const def = getCard(state, perm.card.defId);
  const ability = parseCard(def).loyaltyAbilities?.[index];
  if (!ability) return `${def.name} has no such ability.`;
  if (!sorceryTiming(state, player)) return "Loyalty abilities can only be activated in your main phase with an empty stack.";
  if (perm.loyaltyUsed) return `${def.name} already used a loyalty ability this turn.`;
  if (ability.cost < 0 && (perm.loyalty ?? 0) < -ability.cost) return `${def.name} doesn't have enough loyalty (${perm.loyalty ?? 0}).`;
  const targetError = checkTargets(state, ability.targets, targets, player, def.name);
  if (targetError) return targetError;
  perm.loyalty = (perm.loyalty ?? 0) + ability.cost;
  perm.loyaltyUsed = true;
  state.stack.push({ kind: "ability", id: newId(state), controller: player, source: iid, sourceName: def.name, effects: ability.effects, targets, specs: ability.targets, text: ability.text });
  events.push({ type: "abilityActivated", player, iid, name: def.name, text: ability.text });
  queueWard(state, state.stack[state.stack.length - 1]);
  openRound(state, OPPONENT[player]);
  checkStateBasedActions(state, events); // a walker that paid its last loyalty is gone, but its ability still resolves
  return null;
}

/** Untapped creatures that could crew (any creature you control, summoning-sick ones too). */
export const crewers = (state: GameState, player: PlayerId, vehicle: string) =>
  state.players[player].battlefield.filter((p) => p.card.iid !== vehicle && !p.tapped && isCreature(state, p));

/** Starts crewing: the player now chooses which creatures to tap (see pickCard). */
export function crewVehicle(state: GameState, player: PlayerId, iid: string): string | null {
  if (!holdsPriority(state, player)) return "You can only crew when you have priority.";
  const perm = state.players[player].battlefield.find((p) => p.card.iid === iid);
  if (!perm) return "You can only crew your own Vehicles.";
  const def = getCard(state, perm.card.defId);
  const crew = parseCard(def).crew;
  if (crew === undefined) return `${def.name} can't be crewed.`;
  const options = crewers(state, player, iid);
  if (options.reduce((n, c) => n + Math.max(0, powerOf(state, c)), 0) < crew) return `You don't have enough untapped creatures to crew ${def.name} (total power ${crew} needed).`;
  state.pendingPick = {
    player,
    prompt: `Crew ${crew}: tap creatures with total power ${crew} or more`,
    kind: "crew",
    options: options.map((c) => c.card.iid),
    optional: true,
    owner: player,
    remaining: crew,
    ordered: [],
    vehicle: iid,
    source: { iid, name: def.name, defId: perm.card.defId },
  };
  return null;
}

/** Cycling: pay the cost and discard the card; the ability to draw a card goes on the stack. */
export function cycleCard(state: GameState, player: PlayerId, iid: string, events: GameEvent[]): string | null {
  if (!holdsPriority(state, player)) return "You can only cycle a card when you have priority.";
  const me = state.players[player];
  const idx = me.hand.findIndex((c) => c.iid === iid);
  if (idx < 0) return "That card is not in your hand.";
  const def = getCard(state, me.hand[idx].defId);
  const parsed = parseCard(def);
  const landcycle = parsed.cycling === undefined && parsed.landcycling !== undefined;
  const cycling = parsed.cycling ?? parsed.landcycling;
  const cost = cycling ? parseManaCost(cycling) : null;
  if (!cycling || !cost) return `${def.name} doesn't have cycling.`;
  const paid = payMana(state, player, cost);
  if (!paid.ok) return `Not enough mana to cycle ${def.name} (${cycling}).`;
  applyPayment(state, player, paid, events);
  const [card] = me.hand.splice(idx, 1);
  me.graveyard.push(card); // discarding is part of the cost
  cardsDiscarded(state, player, [iid], events);
  events.push({ type: "abilityActivated", player, iid, name: def.name, text: landcycle ? `Basic landcycling ${cycling}: search for a basic land card.` : `Cycling ${cycling}: draw a card.` });
  state.stack.push({
    kind: "ability",
    id: newId(state),
    controller: player,
    source: iid,
    sourceName: def.name,
    effects: landcycle ? [{ type: "search", for: "basicLand", to: "hand", reveal: true }] : [{ type: "draw", amount: 1, who: { t: "you" } }],
    targets: [],
    specs: [],
    text: landcycle ? "Basic landcycling: search for a basic land card" : "Cycling: draw a card",
  });
  openRound(state, OPPONENT[player]);
  return null;
}
