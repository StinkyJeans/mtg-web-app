import type { GameEvent } from "./actions.js";
import { getCard } from "./cards.js";
import {
  changeLife,
  checkStateBasedActions,
  forbidden,
  landEntered,
  putIntoGraveyard,
  isCreature,
  isLegalTarget,
  kw,
  legalTargets,
  isPermanentCard,
  isToken,
  newId,
  powerOf,
  queueWard,
  askColor,
  entersTappedNow,
  drawCards,
  counterStackItem,
  playerToAct,
  queueTriggers,
  runEffects,
  findPermanentOrNull,
  creatureEntered,
  cardMatches,
} from "./core.js";
import type { CardFilter, StackItem, TargetChoice, TargetSpec } from "./effects.js";
import { hasKeyword } from "./keywords.js";
import { addCosts, COLOR_NAMES, manaAbilitySacrifices, manaCostOf, parseManaCost, payMana, withX } from "./mana.js";
import { parseCard } from "./oracle.js";
import { shuffle } from "./state.js";
import { OPPONENT } from "./types.js";
import type { CardDef, CardInstance, GameState, Permanent, PlayerId } from "./types.js";

// The stack (rule 405) and priority (rule 117), in a simplified but faithful form:
//  - Casting a spell or activating an ability puts it on the stack and gives the OTHER player priority.
//  - A player with nothing they could cast or activate is skipped automatically, so most plays resolve at once.
//  - When both players pass in a row, the top item resolves; the round goes on while the stack isn't empty.

const PRIORITY_PHASES = ["main1", "attackers", "blockers", "main2", "end"];

/** Can this player cast an instant or use an ability right now? */
export function holdsPriority(state: GameState, player: PlayerId): boolean {
  if (state.winner || state.pendingChoice || state.pendingPick) return false;
  if (state.priority) return state.priority.holder === player;
  return playerToAct(state) === player && PRIORITY_PHASES.includes(state.phase);
}

const isInstantSpeed = (def: CardDef) => def.type === "instant" || hasKeyword(def, "flash");

/** Instants (and flash creatures) any time you have priority; everything else in your main phase with an empty stack. */
export function canCastNow(state: GameState, player: PlayerId, def: CardDef): boolean {
  if (isInstantSpeed(def)) return holdsPriority(state, player);
  return (
    !state.priority &&
    !state.pendingChoice &&
    !state.pendingPick &&
    state.stack.length === 0 &&
    player === state.active &&
    playerToAct(state) === player &&
    (state.phase === "main1" || state.phase === "main2")
  );
}

function timingError(state: GameState, def: CardDef): string {
  if (isInstantSpeed(def)) return "You can only cast that when you have priority.";
  if (state.priority || state.stack.length > 0) return "Wait until the stack is empty to cast that.";
  return isPermanentCard(def) ? `${def.type === "creature" ? "Creatures" : "Artifacts"} can only be cast in a main phase.` : "Sorceries can only be cast in a main phase.";
}

/**
 * The player who just cast or activated something has implicitly passed (otherwise anyone holding a second instant
 * would be asked "pass?" after every spell), so `holder` is the opponent with one pass already counted.
 */
function openRound(state: GameState, holder: PlayerId): void {
  if (state.priority) {
    state.priority.holder = holder;
    state.priority.passes = 1;
  } else {
    state.priority = { holder, passes: 1, then: null };
  }
}

const tapPermanents = (state: GameState, player: PlayerId, iids: string[]) => {
  const battlefield = state.players[player].battlefield;
  for (const perm of [...battlefield]) {
    if (!iids.includes(perm.card.iid)) continue;
    perm.tapped = true;
    // A Treasure is sacrificed when it is tapped for mana; a token simply ceases to exist.
    if (manaAbilitySacrifices(getCard(state, perm.card.defId))) {
      battlefield.splice(battlefield.indexOf(perm), 1);
      if (!isToken(perm.card)) state.players[perm.card.owner].graveyard.push(perm.card);
    }
  }
};

/** Pays a cost worked out by payMana: taps (or sacrifices) the sources and pays any life for Phyrexian mana. */
function applyPayment(state: GameState, player: PlayerId, paid: { tap: string[]; life: number }, events: GameEvent[]): void {
  tapPermanents(state, player, paid.tap);
  if (paid.life > 0) changeLife(state, player, -paid.life, events);
}

/** Sorcery timing: your own main phase with nothing on the stack. */
const sorceryTiming = (state: GameState, player: PlayerId) =>
  !state.priority && !state.pendingChoice && !state.pendingPick && state.stack.length === 0 && player === state.active && playerToAct(state) === player && (state.phase === "main1" || state.phase === "main2");

/** Checks a list of chosen targets against what a spell or ability needs. Returns an error message, or null. */
function checkTargets(state: GameState, specs: TargetSpec[], targets: TargetChoice[], controller: PlayerId, name: string): string | null {
  if (targets.length !== specs.length) {
    return specs.length === 0 ? `${name} doesn't target anything.` : `${name} needs ${specs.length} target${specs.length === 1 ? "" : "s"}: ${specs.map((s) => s.label).join(", ")}.`;
  }
  for (let i = 0; i < specs.length; i++) {
    if (!isLegalTarget(state, specs[i], targets[i], controller)) return `That isn't a legal target for "${specs[i].label}".`;
  }
  return null;
}

// ───────── casting and activating ─────────

/** Mode effects count their targets from 0; when several modes are chosen the later ones are shifted. */
function shiftTargets<T>(value: T, offset: number): T {
  if (offset === 0) return value;
  if (Array.isArray(value)) return value.map((v) => shiftTargets(v, offset)) as T;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ((o.t === "target" || o.t === "creaturesOf") && typeof o.i === "number") return { ...o, i: o.i + offset } as T;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shiftTargets(v, offset)])) as T;
  }
  return value;
}

/** What a card costs to cast right now: the printed cost, less any reduction its text gives ("costs {1} less if you control a Wizard"). */
export function castCostOf(state: GameState, player: PlayerId, def: CardDef): ReturnType<typeof manaCostOf> {
  const base = manaCostOf(def);
  const cut = base ? parseCard(def).costReduction : undefined;
  if (!base || !cut) return base;
  const has = state.players[player].battlefield.some((p) => (getCard(state, p.card.defId).typeLine ?? "").split("—")[1]?.toLowerCase().split(/\s+/).includes(cut.ifControl));
  return has ? { ...base, generic: Math.max(0, base.generic - cut.n) } : base;
}

export function castSpell(state: GameState, player: PlayerId, iid: string, targets: TargetChoice[], events: GameEvent[], x = 0, kicked = false, from: "hand" | "graveyard" = "hand", modes?: number[], sacrifice?: string): string | null {
  const me = state.players[player];
  const zone = from === "graveyard" ? me.graveyard : me.hand;
  const idx = zone.findIndex((c) => c.iid === iid);
  if (idx < 0) return from === "graveyard" ? "That card is not in your graveyard." : "That card is not in your hand.";
  const def = getCard(state, zone[idx].defId);
  if (def.type === "land") return "Lands are played, not cast.";
  if (!isPermanentCard(def) && def.type !== "instant" && def.type !== "sorcery") return `${def.name} can't be cast yet.`;
  const parsed = parseCard(def);
  let cost = castCostOf(state, player, def);
  if (from === "graveyard") {
    // Flashback: only instants and sorceries, for the flashback cost instead of the mana cost.
    if (!parsed.flashback || (def.type !== "instant" && def.type !== "sorcery")) return `${def.name} doesn't have flashback.`;
    cost = parseManaCost(parsed.flashback);
  }
  if (!parsed.ok || !cost) return `${def.name} can't be played yet.`;
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
  if (kicked && !kickerCost) return `${def.name} has no kicker.`;
  // "As an additional cost to cast this, sacrifice a creature."
  let sacrificed: ReturnType<typeof findPermanentOrNull> = null;
  if (parsed.extraSacrifice) {
    sacrificed = sacrifice ? findPermanentOrNull(state, sacrifice) : null;
    if (!sacrificed || sacrificed.owner.id !== player || !isCreature(state, sacrificed.perm)) return `${def.name}: choose a creature you control to sacrifice.`;
  } else if (sacrifice) {
    return `${def.name} has no sacrifice cost.`;
  }
  const paid = payMana(state, player, withX(kicked && kickerCost ? addCosts(cost, kickerCost) : cost, x));
  if (!paid.ok) {
    const price = from === "graveyard" ? `flashback ${parsed.flashback}` : (cost.x ? `${def.manaCost} with X = ${x}` : (def.manaCost ?? String(def.cost))) + (kicked ? ` + kicker ${parsed.kicker}` : "");
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

  const [card] = zone.splice(idx, 1);
  state.stack.push({ kind: "spell", id: newId(state), controller: player, card, effects, targets, specs, x: cost.x ? x : (sacrificedPower ?? x), ...(kicked ? { kicked } : {}), ...(from === "graveyard" ? { flashback: true } : {}) });
  events.push(
    def.type === "creature"
      ? { type: "creatureCast", player, iid: card.iid, tapped: paid.tap }
      : { type: "spellCast", player, iid: card.iid, tapped: paid.tap, targets },
  );
  queueWard(state, state.stack[state.stack.length - 1]);
  // Prowess and friends: "whenever you cast a noncreature spell".
  if (def.type !== "creature") for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "noncreatureSpell");
  if (def.type === "instant" || def.type === "sorcery") for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "instantOrSorcery");
  openRound(state, OPPONENT[player]);
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
  if (ability.yourTurnOnly && state.active !== player) return `${def.name}'s ability can only be activated during your turn.`;
  if (forbidden(state, found.perm, "noActivated")) return `${def.name}'s abilities can't be activated.`;

  if (ability.tap) {
    if (found.perm.tapped) return `${def.name} is tapped.`;
    if (isCreature(state, found.perm) && found.perm.summoningSick && !kw(state, found.perm, "haste")) {
      return `${def.name} just arrived and can't use an ability that taps it.`;
    }
  }
  const targetError = checkTargets(state, ability.targets, targets, player, def.name);
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
      events.push({ type: "cardsDiscarded", player, iids: [payWith] });
    } else {
      const victim = findPermanentOrNull(state, payWith);
      if (victim) {
        putIntoGraveyard(state, victim.perm, player, events); // paid as part of the cost
        checkStateBasedActions(state, events);
      }
    }
  }
  if (ability.payLife) {
    if (state.players[player].life < ability.payLife) return `Not enough life to pay ${ability.payLife}.`;
    changeLife(state, player, -ability.payLife, events);
  }
  if (zoneCard && ability.discardSelf) {
    const hand = state.players[player].hand;
    state.players[player].graveyard.push(hand.splice(hand.findIndex((c) => c.iid === iid), 1)[0]);
    events.push({ type: "cardsDiscarded", player, iids: [iid] });
  }
  if (zoneCard && ability.exileSelf) {
    const yard = state.players[player].graveyard;
    state.players[player].exile.push(yard.splice(yard.findIndex((c) => c.iid === iid), 1)[0]);
  }
  if (ability.tap) found.perm.tapped = true;
  if (ability.oncePerTurn) found.perm.usedAbilities = [...(found.perm.usedAbilities ?? []), index];
  // "Sacrifice this permanent" is part of the cost: it is gone before the ability goes on the stack.
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
    specs: ability.targets,
    text: ability.text,
  });
  events.push({ type: "abilityActivated", player, iid, name: def.name, text: ability.text });
  queueWard(state, state.stack[state.stack.length - 1]);
  openRound(state, OPPONENT[player]);
  return null;
}

// ───────── what a player could do right now (for the screen and for auto-passing) ─────────

export interface Castable {
  iid: string;
  specs: TargetSpec[];
  /** The spell has X in its cost: the most the player can pay for X right now (0 or more). Missing when it has no X. */
  maxX?: number;
  /** Set when the card is in the graveyard and can be cast from there with flashback. */
  zone?: "graveyard";
  /** "Sacrifice a creature" is an additional cost: the creatures that could be sacrificed. */
  sacrifice?: string[];
  /** A "Choose one —" spell: each mode with what it targets and whether it could be chosen right now. */
  modal?: { min: number; max: number; modes: { text: string; specs: TargetSpec[]; available: boolean }[] };
  /** The spell has a kicker the player could pay on top of the cost right now: its printed cost, e.g. "{2}". */
  kicker?: string;
}

/** Cards in hand the player could cast right now: right timing, enough mana, and a legal target for each need. */
export function getCastable(state: GameState, player: PlayerId): Castable[] {
  const out: Castable[] = [];
  for (const card of state.players[player].hand) {
    const def = getCard(state, card.defId);
    if (!isPermanentCard(def) && def.type !== "instant" && def.type !== "sorcery") continue;
    const parsed = parseCard(def);
    const cost = castCostOf(state, player, def);
    if (!parsed.ok || !cost || !canCastNow(state, player, def)) continue;
    if (!payMana(state, player, withX(cost, 0)).ok) continue;
    const specs = parsed.spell?.targets ?? [];
    const modal = parsed.spell?.modal;
    const modeInfo = modal ? modal.modes.map((m) => ({ text: m.text, specs: m.targets, available: m.targets.every((spec) => legalTargets(state, spec, player).length > 0) })) : undefined;
    if (modeInfo ? !modeInfo.some((m) => m.available) : specs.some((spec) => legalTargets(state, spec, player).length === 0)) continue;
    const kickerCost = parsed.kicker ? parseManaCost(parsed.kicker) : null;
    const kickable = kickerCost !== null && payMana(state, player, addCosts(cost, kickerCost)).ok ? { kicker: parsed.kicker } : {};
    const modalPart = modal && modeInfo ? { modal: { min: modal.min, max: modal.max, modes: modeInfo } } : {};
    if (parsed.extraSacrifice) {
      const options = state.players[player].battlefield.filter((p) => isCreature(state, p)).map((p) => p.card.iid);
      if (options.length === 0) continue;
      Object.assign(modalPart, { sacrifice: options });
    }
    if (!cost.x) {
      out.push({ iid: card.iid, specs, ...kickable, ...modalPart });
      continue;
    }
    let maxX = 0;
    while (maxX < 30 && payMana(state, player, withX(cost, maxX + 1)).ok) maxX++;
    out.push({ iid: card.iid, specs, maxX, ...kickable, ...modalPart });
  }
  // Flashback: instants and sorceries in the graveyard, for their flashback cost.
  for (const card of state.players[player].graveyard) {
    const def = getCard(state, card.defId);
    if (def.type !== "instant" && def.type !== "sorcery") continue;
    const parsed = parseCard(def);
    const cost = parsed.flashback ? parseManaCost(parsed.flashback) : null;
    if (!parsed.ok || !cost || !canCastNow(state, player, def) || !payMana(state, player, cost).ok) continue;
    const specs = parsed.spell?.targets ?? [];
    if (parsed.spell?.modal || specs.some((spec) => legalTargets(state, spec, player).length === 0)) continue;
    out.push({ iid: card.iid, specs, zone: "graveyard" });
  }
  return out;
}

export interface LoyaltyOption {
  iid: string;
  index: number;
  cost: number;
  text: string;
  specs: TargetSpec[];
}

/** The loyalty abilities the player could activate right now (one per planeswalker per turn, at sorcery speed). */
export function getLoyaltyAbilities(state: GameState, player: PlayerId): LoyaltyOption[] {
  if (!sorceryTiming(state, player)) return [];
  const out: LoyaltyOption[] = [];
  for (const perm of state.players[player].battlefield) {
    if (perm.loyaltyUsed || getCard(state, perm.card.defId).type !== "planeswalker") continue;
    parseCard(getCard(state, perm.card.defId)).loyaltyAbilities?.forEach((ability, index) => {
      if (ability.cost < 0 && (perm.loyalty ?? 0) < -ability.cost) return;
      if (ability.targets.some((spec) => legalTargets(state, spec, player).length === 0)) return;
      out.push({ iid: perm.card.iid, index, cost: ability.cost, text: ability.text, specs: ability.targets });
    });
  }
  return out;
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

export interface Crewable {
  iid: string;
  /** The total power that must be tapped. */
  crew: number;
}

/** Untapped creatures that could crew (any creature you control, summoning-sick ones too). */
const crewers = (state: GameState, player: PlayerId, vehicle: string) =>
  state.players[player].battlefield.filter((p) => p.card.iid !== vehicle && !p.tapped && isCreature(state, p));

/** Vehicles the player could crew right now: they have priority and enough untapped creature power. */
export function getCrewable(state: GameState, player: PlayerId): Crewable[] {
  if (!holdsPriority(state, player)) return [];
  const out: Crewable[] = [];
  for (const perm of state.players[player].battlefield) {
    const crew = parseCard(getCard(state, perm.card.defId)).crew;
    if (crew === undefined || perm.crewed) continue;
    if (crewers(state, player, perm.card.iid).reduce((n, c) => n + Math.max(0, powerOf(state, c)), 0) >= crew) out.push({ iid: perm.card.iid, crew });
  }
  return out;
}

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
  };
  return null;
}

export interface Cyclable {
  iid: string;
  /** The printed cycling cost, e.g. "{2}". */
  cost: string;
}

/** Cards in hand the player can cycle right now (they hold priority and can pay). */
export function getCyclable(state: GameState, player: PlayerId): Cyclable[] {
  if (!holdsPriority(state, player)) return [];
  const out: Cyclable[] = [];
  for (const card of state.players[player].hand) {
    const parsed = parseCard(getCard(state, card.defId));
    const cycling = parsed.cycling ?? parsed.landcycling;
    const cost = cycling ? parseManaCost(cycling) : null;
    if (cycling && cost && payMana(state, player, cost).ok) out.push({ iid: card.iid, cost: cycling });
  }
  return out;
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
  events.push({ type: "cardsDiscarded", player, iids: [iid] });
  events.push({ type: "abilityActivated", player, iid, name: def.name, text: landcycle ? `Basic landcycling ${cycling}: search for a basic land card.` : `Cycling ${cycling}: draw a card.` });
  state.stack.push({
    kind: "ability",
    id: newId(state),
    controller: player,
    source: iid,
    sourceName: def.name,
    effects: landcycle ? [{ type: "search", for: "basicLand", to: "hand" }] : [{ type: "draw", amount: 1, who: { t: "you" } }],
    targets: [],
    specs: [],
    text: landcycle ? "Basic landcycling: search for a basic land card" : "Cycling: draw a card",
  });
  openRound(state, OPPONENT[player]);
  return null;
}

export interface Activatable {
  iid: string;
  index: number;
  text: string;
  specs: TargetSpec[];
  /** For a cost like "Sacrifice a creature": the cards the player may choose to pay with, and what to call the choice. */
  costChoices?: string[];
  costLabel?: string;
}

/** Abilities of the player's permanents they could use right now. */
export function getActivatable(state: GameState, player: PlayerId): Activatable[] {
  if (!holdsPriority(state, player)) return [];
  const out: Activatable[] = [];
  // Abilities that work from the hand or graveyard ("{1}{U}, discard this card: ...").
  for (const [zone, cards] of [["hand", state.players[player].hand], ["graveyard", state.players[player].graveyard]] as const) {
    for (const card of cards) {
      parseCard(getCard(state, card.defId)).activated.forEach((ability, index) => {
        if (ability.zone !== zone) return;
        if (ability.mana) {
          const cost = parseManaCost(ability.mana);
          if (!cost || !payMana(state, player, cost).ok) return;
        }
        if (ability.payLife && state.players[player].life < ability.payLife) return;
        if (ability.targets.some((spec) => legalTargets(state, spec, player).length === 0)) return;
        if (ability.sorceryOnly && !sorceryTiming(state, player)) return;
        if (ability.yourTurnOnly && state.active !== player) return;
        if (ability.costCard && costChoices(state, player, ability, card.iid).length === 0) return;
        out.push({ iid: card.iid, index, text: ability.text, specs: ability.targets, ...(ability.costCard ? { costChoices: costChoices(state, player, ability, card.iid), costLabel: ability.costCard.label } : {}) });
      });
    }
  }
  for (const perm of state.players[player].battlefield) {
    const def = getCard(state, perm.card.defId);
    parseCard(def).activated.forEach((ability, index) => {
      if (ability.zone) return;
      if (ability.tap && (perm.tapped || (isCreature(state, perm) && perm.summoningSick && !kw(state, perm, "haste")))) return;
      if (ability.mana) {
        const cost = parseManaCost(ability.mana);
        if (!cost || !payMana(state, player, cost).ok) return;
      }
      if (ability.targets.some((spec) => legalTargets(state, spec, player).length === 0)) return;
      if (ability.sorceryOnly && !sorceryTiming(state, player)) return;
      if (ability.oncePerTurn && perm.usedAbilities?.includes(index)) return;
      if (ability.yourTurnOnly && state.active !== player) return;
      if (forbidden(state, perm, "noActivated")) return;
      if (ability.costCard && costChoices(state, player, ability, perm.card.iid).length === 0) return;
      out.push({ iid: perm.card.iid, index, text: ability.text, specs: ability.targets, ...(ability.costCard ? { costChoices: costChoices(state, player, ability, perm.card.iid), costLabel: ability.costCard.label } : {}) });
    });
  }
  return out;
}

/** Does the player have anything to do with priority? If not they are passed automatically. */
export function hasResponse(state: GameState, player: PlayerId): boolean {
  return getCastable(state, player).length > 0 || getActivatable(state, player).length > 0;
}

// ───────── resolving ─────────

function enterBattlefield(state: GameState, card: CardInstance, controller: PlayerId, events: GameEvent[], attachedTo?: string, x = 0, kicked = false): void {
  const parsed = parseCard(getCard(state, card.defId));
  const printed = getCard(state, card.defId);
  const loyalty = printed.type === "planeswalker" ? (printed.loyalty ?? printed.toughness ?? 0) : undefined;
  const entering = parsed.entersWithCounters;
  const counters = (entering === "X" ? x : (entering ?? 0)) + (kicked ? (parsed.kickedCounters ?? 0) : 0);
  const minus = parsed.entersWithMinus ?? 0;
  state.players[controller].battlefield.push({ ...(attachedTo ? { attachedTo } : {}), ...(loyalty !== undefined ? { loyalty } : {}), ...(counters > 0 ? { counters } : {}), ...(minus > 0 ? { minusCounters: minus } : {}), ...(kicked ? { kicked } : {}), card, tapped: entersTappedNow(state, controller, getCard(state, card.defId)), summoningSick: getCard(state, card.defId).type === "creature" || parsed.crew !== undefined, damage: 0 });
  events.push({ type: "permanentEntered", player: controller, iid: card.iid });
  const entered = state.players[controller].battlefield[state.players[controller].battlefield.length - 1];
  askColor(state, entered, controller);
  queueTriggers(state, card, controller, "enters");
  if (printed.type === "creature") creatureEntered(state, card, controller);
}

function resolveTop(state: GameState, events: GameEvent[]): void {
  const item = state.stack.pop();
  if (!item) return;

  if (item.kind === "spell") {
    const def = getCard(state, item.card.defId);
    if (isPermanentCard(def)) {
      if (parseCard(def).aura) {
        // An Aura needs its target to still be legal when it resolves; otherwise it just goes to the graveyard.
        const target = item.targets[0];
        if (target?.kind === "permanent" && isLegalTarget(state, item.specs[0], target, item.controller, item.id)) {
          enterBattlefield(state, item.card, item.controller, events, target.iid);
        } else {
          events.push({ type: "effect", text: `${def.name} fizzles: its target is gone.` });
          state.players[item.card.owner].graveyard.push(item.card);
        }
      } else {
        enterBattlefield(state, item.card, item.controller, events, undefined, item.x, item.kicked === true);
      }
    } else {
      // If every target became illegal the spell is removed without doing anything (rule 608.2b).
      const allIllegal = item.specs.length > 0 && item.targets.every((t, i) => !isLegalTarget(state, item.specs[i], t, item.controller, item.id));
      if (allIllegal) events.push({ type: "effect", text: `${def.name} fizzles: its target is gone.` });
      else runEffects(state, item.effects, { controller: item.controller, sourceId: item.card.iid, sourceName: def.name, sourceDefId: item.card.defId, targets: item.targets, specs: item.specs, stackId: item.id, x: item.x, kicked: item.kicked }, events);
      state.players[item.card.owner][item.flashback ? "exile" : "graveyard"].push(item.card); // flashback: exiled afterwards
    }
  } else {
    const allIllegal = item.specs.length > 0 && item.targets.every((t, i) => !isLegalTarget(state, item.specs[i], t, item.controller));
    if (!allIllegal) {
      runEffects(state, item.effects, { controller: item.controller, sourceId: item.source, sourceName: item.sourceName, sourceDefId: findPermanentOrNull(state, item.source)?.perm.card.defId, targets: item.targets, specs: item.specs, stackId: item.id }, events);
    }
  }
  checkStateBasedActions(state, events);
  // An attacker that left the battlefield is no longer attacking (a blocked creature stays "blocked" even if its blocker is gone).
  if (state.combat) state.combat.attackers = state.combat.attackers.filter((a) => findPermanentOrNull(state, a.attacker) !== null);
}

/** Moves queued triggers onto the stack. One that needs a target waits for its controller to choose it. */
function flushTriggers(state: GameState): void {
  while (state.triggerQueue.length > 0 && !state.pendingChoice && !state.pendingPick && !state.winner) {
    const { item, specs, modes } = state.triggerQueue.shift()!;
    if (modes) {
      // "When this enters, choose one —": only modes that have what they need to target can be chosen.
      const available = modes.map((m, i) => (m.targets.every((spec) => legalTargets(state, spec, item.controller).length > 0) ? i : -1)).filter((i) => i >= 0);
      if (available.length === 0) continue; // nothing to do
      const choose = (m: number) => state.triggerQueue.unshift({ specs: modes[m].targets, item: { ...item, effects: modes[m].effects, specs: modes[m].targets, text: `${item.text}: ${modes[m].text}` } });
      if (available.length === 1) {
        choose(available[0]);
        continue;
      }
      state.pendingPick = { player: item.controller, prompt: `${item.sourceName}: choose one`, kind: "mode", options: available.map(String), optional: false, owner: item.controller, remaining: 1, ordered: [], modes, modeItem: item };
      return;
    }
    if (specs.length === 0) {
      state.stack.push(item);
      continue;
    }
    const options = specs.map((spec) => legalTargets(state, spec, item.controller));
    if (options.some((o) => o.length === 0)) continue; // no legal target: the trigger is removed
    if (options.every((o) => o.length === 1)) {
      item.targets = options.map((o) => o[0]); // only one choice: no need to ask
      state.stack.push(item);
      continue;
    }
    state.pendingChoice = { player: item.controller, item, specs };
  }
}

export function chooseTargets(state: GameState, player: PlayerId, targets: TargetChoice[]): string | null {
  const pending = state.pendingChoice;
  if (!pending || pending.player !== player) return "There is nothing to choose targets for.";
  const error = checkTargets(state, pending.specs, targets, player, pending.item.sourceName);
  if (error) return error;
  pending.item.targets = targets;
  state.stack.push(pending.item);
  state.pendingChoice = null;
  flushTriggers(state);
  if (!state.pendingChoice) openRound(state, OPPONENT[state.active]);
  return null;
}

// ───────── priority rounds ─────────

/** After something resolved: the round goes on while the stack isn't empty, and the active player gets priority first. */
function afterResolution(state: GameState): void {
  const round = state.priority;
  if (!round) return;
  if (state.stack.length === 0 && !round.then) {
    state.priority = null; // everything is resolved: back to normal play
    return;
  }
  round.holder = state.active;
  round.passes = 0;
}

const playerLabelOf = (id: PlayerId) => (id === "p1" ? "Player 1" : "Player 2");

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

  if (pick.kind === "mode") {
    const mode = iid !== undefined && pick.options.includes(iid) ? pick.modes?.[Number(iid)] : undefined;
    if (!mode || !pick.modeItem) return "Choose one of the modes.";
    const item = pick.modeItem;
    state.triggerQueue.unshift({ specs: mode.targets, item: { ...item, effects: mode.effects, specs: mode.targets, text: `${item.text}: ${mode.text}` } });
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
    const cost = pick.wardCost ? parseManaCost(pick.wardCost) : null;
    if (item && cost) {
      const paid = iid === "pay" ? payMana(state, player, cost) : null;
      if (paid?.ok) applyPayment(state, player, paid, events);
      else counterStackItem(state, item, events);
    }
    finish();
    return null;
  }

  if (pick.kind === "revealToHand") {
    // Take the chosen card (or none), then every other card that was looked at goes to the bottom.
    if (iid !== undefined) {
      if (!pick.options.includes(iid)) return "That isn't one of the choices.";
      owner.hand.push(take(owner.library, iid));
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} reveals ${getCard(state, owner.hand[owner.hand.length - 1].defId).name} and puts it into their hand.` });
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
    case "discard": {
      owner.graveyard.push(take(owner.hand, iid));
      events.push({ type: "cardsDiscarded", player: pick.owner, iids: [iid] });
      pick.options = pick.options.filter((o) => o !== iid);
      pick.remaining -= 1;
      if (pick.remaining > 0 && pick.options.length > 0) return null; // the next card
      break;
    }
    case "rummage": {
      owner.graveyard.push(take(owner.hand, iid));
      events.push({ type: "cardsDiscarded", player: pick.owner, iids: [iid] });
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
      events.push({ type: "effect", text: `${playerLabelOf(pick.owner)} searches their library and puts ${getCard(state, found.defId).name} into their hand.` });
      [owner.library, state.rng] = shuffle(owner.library, state.rng);
      break;
    }
    case "searchLand": {
      const land = take(owner.library, iid);
      owner.battlefield.push({ card: land, tapped: pick.entersTapped !== false, summoningSick: false, damage: 0 });
      events.push({ type: "permanentEntered", player: pick.owner, iid });
      landEntered(state, pick.owner);
      askColor(state, owner.battlefield[owner.battlefield.length - 1], pick.owner);
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

/** One pass. When both players have passed in a row, the top of the stack resolves (or the round ends). */
function passOnce(state: GameState, events: GameEvent[], onContinue: (then: "afterBlockers" | "afterAttackers") => void): void {
  const round = state.priority;
  if (!round) return;
  round.passes += 1;
  if (round.passes < 2) {
    round.holder = OPPONENT[round.holder];
    return;
  }

  if (state.stack.length > 0) {
    resolveTop(state, events);
    if (state.winner) {
      state.priority = null;
      return;
    }
    if (state.pendingPick) return; // waits for a choice among cards; pickCard() carries on
    flushTriggers(state);
    if (state.pendingChoice) return; // waits for the target choice
    afterResolution(state);
    return;
  }

  const then = round.then;
  state.priority = null;
  if (then) onContinue(then);
}

/** Keeps passing for players who have nothing to do, until a player must decide or the round ends. */
function advance(state: GameState, events: GameEvent[], onContinue: (then: "afterBlockers" | "afterAttackers") => void): void {
  for (let guard = 0; guard < 500 && state.priority && !state.winner && !state.pendingChoice && !state.pendingPick; guard++) {
    if (hasResponse(state, state.priority.holder)) return; // a human decides
    passOnce(state, events, onContinue);
  }
}

export function passPriority(state: GameState, player: PlayerId, events: GameEvent[], onContinue: (then: "afterBlockers" | "afterAttackers") => void): string | null {
  if (!state.priority || state.priority.holder !== player) return "You don't have priority.";
  passOnce(state, events, onContinue);
  return null;
}

/** Opens a round of priority that ends in `then` once the stack is empty and both players pass. */
export function openWindow(state: GameState, holder: PlayerId, then: "afterBlockers" | "afterAttackers"): void {
  state.priority = { holder, passes: 0, then };
}

/**
 * Brings the game to a state where a human has something to decide, or nothing is pending: queued triggers go on
 * the stack, players with nothing to do are passed, and things resolve. Called after every action.
 */
export function settle(state: GameState, events: GameEvent[], onContinue: (then: "afterBlockers" | "afterAttackers") => void): void {
  for (let guard = 0; guard < 100; guard++) {
    flushTriggers(state);
    if (state.pendingChoice || state.pendingPick || state.winner) return;
    if (state.stack.length > 0 && !state.priority) state.priority = { holder: OPPONENT[state.active], passes: 1, then: null };
    advance(state, events, onContinue);
    if (state.priority || state.pendingChoice || state.pendingPick || state.winner) return; // waiting for a decision
    if (state.triggerQueue.length === 0) return; // nothing more to do
  }
}

export type { StackItem };
