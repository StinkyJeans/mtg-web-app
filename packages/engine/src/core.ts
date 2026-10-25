import { getCard } from "./cards.js";
import type { GameEvent } from "./actions.js";
import type { Amount, CardFilter, CountSpec, Effect, PendingPick, Ref, RunContext, SourceQuality, StackItem, StaticEffect, TargetChoice, TargetSpec, TokenSpec, TriggeredAbility } from "./effects.js";
import { isBasicLand } from "./deck.js";
import { parseManaCost, payMana } from "./mana.js";
import { hasKeyword } from "./keywords.js";
import type { Keyword } from "./keywords.js";
import { parseCard } from "./oracle.js";
import { nextRandom, shuffle } from "./state.js";
import { OPPONENT } from "./types.js";
import type { CardDef, CardInstance, GameState, Permanent, PlayerId, PlayerState } from "./types.js";

// Helpers shared by combat (actions.ts) and the stack (stack.ts): reading permanents, moving cards between
// zones, dealing damage, running effects, and state-based actions.

export const playerLabel = (id: PlayerId) => (id === "p1" ? "Player 1" : "Player 2");

export const isCreature = (s: GameState, p: Permanent) => getCard(s, p.card.defId).type === "creature" || p.crewed === true;

/** Artifacts, including artifact creatures ("Artifact Creature — Construct"). */
/** Does a land with "enters tapped unless ..." enter tapped, given what its controller has on the battlefield right now? */
export function entersTappedNow(state: GameState, controller: PlayerId, def: CardDef): boolean {
  const parsed = parseCard(def);
  if (parsed.entersTapped) return true;
  const unless = parsed.entersTappedUnless;
  if (!unless) return false;
  if (unless.never) return true;
  const mine = state.players[controller].battlefield.filter((p) => getCard(state, p.card.defId).type === "land");
  const foe = state.players[OPPONENT[controller]];
  const untapped =
    (unless.basics !== undefined && mine.filter((p) => isBasicLand(getCard(state, p.card.defId))).length >= unless.basics) ||
    (unless.otherLands !== undefined && mine.length >= unless.otherLands) ||
    (unless.fewerOtherLands !== undefined && mine.length <= unless.fewerOtherLands) ||
    (unless.planeswalker === true && state.players[controller].battlefield.some((p) => getCard(state, p.card.defId).type === "planeswalker")) ||
    (unless.lifeAtMost !== undefined && Object.values(state.players).some((p) => p.life <= unless.lifeAtMost!)) ||
    (unless.opponentLands !== undefined && foe.battlefield.filter((p) => getCard(state, p.card.defId).type === "land").length >= unless.opponentLands);
  return !untapped;
}

/** Does this card fit a "reveal a ... card" filter (a type, a creature type, or "nonland")? */
export function cardMatches(def: CardDef, filter: CardFilter): boolean {
  if (filter.all) return true;
  if (filter.nonland) return def.type !== "land";
  const line = (def.typeLine ?? def.type).toLowerCase();
  if (filter.types?.some((t) => def.type === t || line.split("—")[0].includes(t))) return true;
  if (filter.colors?.some((c) => (def.colors ?? []).includes(c))) return true;
  return filter.subtypes?.some((s) => (line.split("—")[1] ?? "").split(/\s+/).includes(s)) ?? false;
}

/** "Another target creature": fill in which permanent that means (the one the ability belongs to). */
export const bindSpecs = (specs: TargetSpec[], sourceIid: string): TargetSpec[] => (specs.some((x) => x.other) ? specs.map((x) => (x.other ? { ...x, except: sourceIid } : x)) : specs);

export const isArtifactDef = (def: CardDef) => def.type === "artifact" || (def.typeLine ?? "").split("—")[0].includes("Artifact");

/** Cards that are put onto the battlefield when they resolve, instead of doing something and going to the graveyard. */
export const isPermanentCard = (def: CardDef) => def.type === "creature" || def.type === "artifact" || def.type === "enchantment" || def.type === "planeswalker";

export const isPlaneswalker = (s: GameState, p: Permanent) => getCard(s, p.card.defId).type === "planeswalker";

/** Enchantments, including enchantment creatures. */
export const isEnchantmentDef = (def: CardDef) => def.type === "enchantment" || (def.typeLine ?? "").split("—")[0].includes("Enchantment");

/** What protection looks at: the colors of a source, and whether it is an artifact. */
export const qualityOfDef = (def: CardDef): SourceQuality => ({ colors: def.colors ?? [], artifact: isArtifactDef(def) });

/** Is this permanent protected from sources with these qualities? ("Protection from red") */
export function isProtectedFrom(s: GameState, perm: Permanent, source: SourceQuality): boolean {
  const protection = parseCard(getCard(s, perm.card.defId)).protection;
  if (!protection) return false;
  return source.colors.some((c) => protection.colors.includes(c)) || (source.artifact && protection.artifacts);
}

const controllerOf = (s: GameState, p: Permanent): PlayerId => (s.players.p1.battlefield.includes(p) ? "p1" : "p2");

/** The continuous effects (auras, "creatures you control get +1/+1") that apply to `target` right now. */
export function staticEffectsOn(s: GameState, target: Permanent): StaticEffect[] {
  const out: StaticEffect[] = [];
  const controller = controllerOf(s, target);
  const creature = isCreature(s, target);
  for (const owner of Object.values(s.players)) {
    for (const source of owner.battlefield) {
      for (const st of parseCard(getCard(s, source.card.defId)).statics ?? []) {
        if (st.cond?.yourTurn && s.active !== owner.id) continue;
        if (st.attackingOnly && !s.combat?.attackers.some((a) => a.attacker === target.card.iid)) continue;
        if (st.cond?.drawnAtLeast !== undefined && (s.players[owner.id].drawnThisTurn ?? 0) < st.cond.drawnAtLeast) continue;
        if (st.cond?.lifeAtLeast !== undefined && s.players[owner.id].life < st.cond.lifeAtLeast) continue;
        if (st.subtypes) {
          const line = (getCard(s, target.card.defId).typeLine ?? "").split("—")[1]?.toLowerCase().split(/\s+/) ?? [];
          if (!st.subtypes.some((t) => line.includes(t))) continue;
        }
        if (st.scope === "self") {
          if (source === target) out.push(st);
          continue;
        }
        if (st.scope === "enchanted") {
          if (source.attachedTo === target.card.iid) out.push(st);
          continue;
        }
        if (!creature || (st.other && source === target)) continue;
        if (st.scope === "yours" && owner.id !== controller) continue;
        if (st.scope === "opponents" && owner.id === controller) continue;
        out.push(st);
      }
    }
  }
  return out;
}

/** Does a continuous effect forbid this? ("Enchanted creature can't attack or block.") */
export const forbidden = (s: GameState, p: Permanent, what: "cantAttack" | "cantBlock" | "noUntap" | "noActivated") =>
  staticEffectsOn(s, p).some((st) => st[what] === true) || (what === "cantBlock" && p.cantBlockTurn === true);
export const nameOf = (s: GameState, p: Permanent) => getCard(s, p.card.defId).name;

// "Until end of turn" bonuses count, so a pumped creature really is bigger.
/** How many things a "*" power and toughness counts right now. */
export function dynamicCount(s: GameState, p: Permanent, spec: CountSpec): number {
  return countFor(s, controllerOf(s, p), spec);
}

/** The count for a player: "the number of Mountains you control". */
export function countFor(s: GameState, me: PlayerId, spec: CountSpec, sourceIid?: string): number {
  if (spec.kind === "hand") return s.players[me].hand.length;
  if (spec.kind === "graveyard") {
    return s.players[me].graveyard.filter((c) => {
      const type = getCard(s, c.defId).type;
      return spec.spellsOnly ? type === "instant" || type === "sorcery" : !spec.creaturesOnly || type === "creature";
    }).length;
  }
  if (spec.kind === "attackers") {
    return (s.combat?.attackers ?? []).filter((a) => {
      const perm = s.players[me].battlefield.find((p) => p.card.iid === a.attacker);
      if (!perm || (spec.other && perm.card.iid === sourceIid)) return false;
      return !spec.subtype || ((getCard(s, perm.card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/).includes(spec.subtype);
    }).length;
  }
  if (spec.kind === "opponents") return 1;
  if (spec.kind === "toughnessGtPower") return s.players[me].battlefield.filter((p) => isCreature(s, p) && toughnessOf(s, p) > powerOf(s, p)).length;
  if (spec.kind !== "permanents") return 0; // the other kinds need the context of the effect (see runEffects)
  let n = 0;
  for (const owner of Object.values(s.players)) {
    if (spec.scope === "you" && owner.id !== me) continue;
    if (spec.scope === "opponents" && owner.id === me) continue;
    for (const perm of owner.battlefield) {
      const def = getCard(s, perm.card.defId);
      if (spec.other && perm.card.iid === sourceIid) continue;
      if (spec.nontoken && isToken(perm.card)) continue;
      if (spec.what === "subtype") {
        if ((def.typeLine ?? "").split("—")[1]?.toLowerCase().split(/\s+/).includes(spec.subtype ?? "?")) n++;
        continue;
      }
      if (spec.what === "creature" ? def.type === "creature" : spec.what === "land" ? def.type === "land" : spec.what === "artifact" ? isArtifactDef(def) : spec.what === "enchantment" ? isEnchantmentDef(def) : def.type === "land" && (def.typeLine ?? "").includes(spec.landType ?? "?")) n++;
    }
  }
  return n;
}

/** Printed power or toughness; a "*" is worked out from the board. */
function basePT(s: GameState, p: Permanent, which: "power" | "toughness"): number {
  if (p.tempBase) return p.tempBase[which]; // "becomes a 4/4 until end of turn"
  const def = getCard(s, p.card.defId);
  const printed = def[which];
  if (printed !== undefined) return printed;
  const dyn = parseCard(def).dynamicStats;
  return dyn ? dynamicCount(s, p, dyn) : 0;
}

// Continuous effects from Auras and anthems count too.
export const powerOf = (s: GameState, p: Permanent) =>
  basePT(s, p, "power") + (p.counters ?? 0) - (p.minusCounters ?? 0) + (p.powerBonus ?? 0) + staticEffectsOn(s, p).reduce((n, st) => n + st.power, 0);
export const toughnessOf = (s: GameState, p: Permanent) =>
  basePT(s, p, "toughness") + (p.counters ?? 0) - (p.minusCounters ?? 0) + (p.toughnessBonus ?? 0) + staticEffectsOn(s, p).reduce((n, st) => n + st.toughness, 0);

/** Printed keywords plus ones granted until end of turn. */
export const kw = (s: GameState, p: Permanent, keyword: Keyword) =>
  !(keyword === "defender" && p.tempNoDefender) && (
  hasKeyword(getCard(s, p.card.defId), keyword) || (p.tempKeywords ?? []).includes(keyword) || staticEffectsOn(s, p).some((st) => st.keywords.includes(keyword)));

export function findPermanentOrNull(state: GameState, iid: string): { owner: PlayerState; perm: Permanent } | null {
  for (const owner of Object.values(state.players)) {
    const perm = owner.battlefield.find((p) => p.card.iid === iid);
    if (perm) return { owner, perm };
  }
  return null;
}

export function findPermanent(state: GameState, iid: string): { owner: PlayerState; perm: Permanent } {
  const found = findPermanentOrNull(state, iid);
  if (!found) throw new Error(`No permanent ${iid} on the battlefield`);
  return found;
}

export const onBoard = (state: GameState, iid: string) => findPermanentOrNull(state, iid) !== null;

/** Damage that is lethal to `blocker` from `attacker`: 1 is enough if the attacker has deathtouch. */
export function lethalFor(s: GameState, attacker: Permanent, blocker: Permanent): number {
  if (kw(s, attacker, "deathtouch")) return 1;
  return Math.max(0, toughnessOf(s, blocker) - blocker.damage);
}

export const newId = (state: GameState): string => `s${state.nextId++}`;

/** The player who must act right now. */
export function playerToAct(state: GameState): PlayerId {
  if (state.pendingPick) return state.pendingPick.player;
  if (state.pendingChoice) return state.pendingChoice.player;
  if (state.priority) return state.priority.holder;
  if (state.phase === "mulligan" && state.opening) {
    // Starting player decides first (rule 103.5), then the other player.
    const order = [state.startingPlayer, OPPONENT[state.startingPlayer]];
    return order.find((p) => !state.opening!.kept[p]) ?? state.active;
  }
  return state.phase === "blockers" ? OPPONENT[state.active] : state.active;
}

// ───────── life, cards ─────────

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
      if (host) host.counters = (host.counters ?? 0) + delta;
    }
  }
  state.players[player].life += delta;
  events.push(delta > 0 ? { type: "lifeGained", player, amount: delta } : { type: "lifeLost", player, amount: -delta });
  if (delta > 0) onLifeGained(state, player);
}

/** "Whenever you gain life, ...": the player's permanents with that trigger queue it. */
export function onLifeGained(state: GameState, player: PlayerId): void {
  for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "lifeGained");
}

/** A random number from 0 up to (not including) 1, taken from the game's seeded generator. */
function rngNext(state: GameState): number {
  const [r, next] = nextRandom(state.rng);
  state.rng = next;
  return r;
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

// ───────── leaving the battlefield ─────────

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
export const isToken = (card: CardInstance) => card.defId.startsWith("token-");

/** A creature dies: it goes to its owner's graveyard and its "when this dies" abilities trigger. */
export function putIntoGraveyard(state: GameState, perm: Permanent, controller: PlayerId, events: GameEvent[]): void {
  const battlefield = state.players[controller].battlefield;
  const at = battlefield.indexOf(perm);
  if (at < 0) return;
  battlefield.splice(at, 1);
  leaveCombat(state, perm);
  creatureMoved(state, perm, controller, "leaves");
  releaseHeld(state, perm);
  if (!isToken(perm.card)) state.players[perm.card.owner].graveyard.push(perm.card);
  events.push({ type: "creatureDied", player: controller, iid: perm.card.iid });
  queueTriggers(state, perm.card, controller, "dies");
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
    const source = findPermanentOrNull(state, entry.source)?.perm;
    const card = me.exile.find((c) => c.iid === entry.iid);
    return source?.attackedThisTurn && card ? [card] : [];
  });
}

/** "Until this leaves the battlefield": what it was keeping in exile comes back under its owner's control. */
function releaseHeld(state: GameState, perm: Permanent): void {
  for (const card of perm.held ?? []) {
    const owner = state.players[card.owner];
    const at = owner.exile.findIndex((c) => c.iid === card.iid);
    if (at < 0) continue;
    owner.exile.splice(at, 1);
    owner.battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
    queueTriggers(state, card, card.owner, "enters");
    if (getCard(state, card.defId).type === "creature") creatureEntered(state, card, card.owner);
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
  return isToken(perm.card) ? null : perm.card;
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

/** Does an "intervening if" (and a spell-cast trigger's timing rules) hold right now? */
function triggerCondHolds(state: GameState, controller: PlayerId, trigger: TriggeredAbility, extra?: { castCount?: number; byOpponent?: boolean; attackers?: string[] }, sourceIid?: string): boolean {
  const p = state.players[controller];
  const c = trigger.cond;
  if (c?.lifeGainedAtLeast !== undefined && (p.lifeGainedThisTurn ?? 0) < c.lifeGainedAtLeast) return false;
  if (c?.lifeAtLeast !== undefined && p.life < c.lifeAtLeast) return false;
  if (c?.enchantedUntapped) {
    const host = sourceIid ? findPermanentOrNull(state, sourceIid)?.perm.attachedTo : undefined;
    const hostPerm = host ? findPermanentOrNull(state, host)?.perm : undefined;
    if (!hostPerm || hostPerm.tapped) return false;
  }
  if (c?.controlsTypes && !p.battlefield.some((perm) => c.controlsTypes!.some((t) => (t === "artifact" ? isArtifactDef(getCard(state, perm.card.defId)) : t === "enchantment" ? isEnchantmentDef(getCard(state, perm.card.defId)) : getCard(state, perm.card.defId).type === t)))) return false;
  if (trigger.opponentTurnOnly && state.active === controller) return false;
  if (trigger.firstOnly && (extra?.castCount ?? 1) !== 1) return false;
  if (trigger.byOpponent && !extra?.byOpponent) return false;
  if (c?.attackPowerAtLeast !== undefined && (extra?.attackers ?? []).reduce((n, iid) => n + Math.max(0, (() => { const p = findPermanentOrNull(state, iid)?.perm; return p ? powerOf(state, p) : 0; })()), 0) < c.attackPowerAtLeast) return false;
  if (trigger.attackerSubtypes) {
    const line = (iid: string): string[] => {
      const perm = findPermanentOrNull(state, iid)?.perm;
      return perm ? ((getCard(state, perm.card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/) : [];
    };
    if (!(extra?.attackers ?? []).some((iid) => trigger.attackerSubtypes!.some((t) => line(iid).includes(t)))) return false;
  }
  return true;
}

/** "Whenever another creature you control enters": the controller's other permanents with such a trigger. */
export function creatureEntered(state: GameState, card: CardInstance, controller: PlayerId): void {
  const entering = state.players[controller].battlefield.find((p) => p.card.iid === card.iid);
  if (entering) creatureMoved(state, entering, controller, "enters");
  for (const perm of state.players[controller].battlefield) {
    const def = getCard(state, perm.card.defId);
    for (const trigger of parseCard(def).triggers) {
      if (trigger.event !== "allyEnters") continue;
      if (trigger.other && perm.card.iid === card.iid) continue;
      if (!trigger.subtypes && !(entering && isCreature(state, entering))) continue; // plain "another creature enters" is about creatures
      if (trigger.nontoken && isToken(card)) continue;
      if (trigger.subtypes && !trigger.subtypes.some((t) => ((getCard(state, card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/).includes(t))) continue;
      if (trigger.maxPower !== undefined && entering && powerOf(state, entering) > trigger.maxPower) continue;
      state.triggerQueue.push({
        specs: bindSpecs(trigger.targets, perm.card.iid),
        item: { kind: "ability", id: newId(state), controller, source: perm.card.iid, sourceName: def.name, effects: trigger.effects, targets: [], specs: bindSpecs(trigger.targets, perm.card.iid), text: trigger.text, other: card.iid },
      });
    }
  }
}

/** "Whenever another creature enters" (any controller) and "whenever another creature you control leaves the battlefield". */
function creatureMoved(state: GameState, perm: Permanent, controller: PlayerId, kind: "enters" | "leaves"): void {
  if (!isCreature(state, perm)) return;
  if (kind === "enters") {
    for (const owner of Object.values(state.players)) {
      for (const other of owner.battlefield) if (other.card.iid !== perm.card.iid) queueTriggers(state, other.card, owner.id, "anyCreatureEnters");
    }
  } else {
    for (const other of state.players[controller].battlefield) if (other.card.iid !== perm.card.iid) queueTriggers(state, other.card, controller, "allyLeaves");
  }
}

/** Queues the card's triggered abilities for `event`. They go on the stack when the game next settles. */
export function queueTriggers(state: GameState, card: CardInstance, controller: PlayerId, event: TriggeredAbility["event"], extra?: { castCount?: number; other?: string; onlyOther?: boolean; byOpponent?: boolean; attackers?: string[] }): void {
  const def = getCard(state, card.defId);
  const triggers = parseCard(def).triggers;
  for (let n = 0; n < triggers.length; n++) {
    const trigger = triggers[n];
    if (trigger.event !== event) continue;
    if (trigger.ifKicked && !findPermanentOrNull(state, card.iid)?.perm.kicked) continue;
    if (!triggerCondHolds(state, controller, trigger, extra, card.iid)) continue;
    if (extra?.onlyOther && !trigger.usesOther) continue;
    if (trigger.oncePerTurn) {
      // "This ability triggers only once each turn": remembered like an ability used this turn (keys above 1000 are triggers).
      const perm = findPermanentOrNull(state, card.iid)?.perm;
      if (perm?.usedAbilities?.includes(1000 + n)) continue;
      if (perm) perm.usedAbilities = [...(perm.usedAbilities ?? []), 1000 + n];
    }
    state.triggerQueue.push({
      specs: bindSpecs(trigger.targets, card.iid),
      ...(trigger.modes ? { modes: trigger.modes } : {}),
      item: {
        kind: "ability",
        id: newId(state),
        controller,
        source: card.iid,
        sourceName: def.name,
        effects: trigger.effects,
        targets: [],
        specs: bindSpecs(trigger.targets, card.iid),
        text: trigger.text,
        ...(extra?.other ? { other: extra.other } : {}),
      },
    });
  }
}

/** "As this enters, choose a color": starts the choice (nothing to ask when only one color is allowed). */
export function askColor(state: GameState, perm: Permanent, controller: PlayerId): void {
  const choose = parseCard(getCard(state, perm.card.defId)).chooseColor;
  if (!choose || state.pendingPick) return;
  const options = (["W", "U", "B", "R", "G"] as const).filter((c) => c !== choose.except);
  if (options.length === 1) {
    perm.chosenColor = options[0];
    return;
  }
  state.pendingPick = {
    player: controller,
    prompt: `${nameOf(state, perm)}: choose a color${choose.except ? ` other than ${choose.except}` : ""}`,
    kind: "color",
    options: [...options],
    optional: false,
    owner: controller,
    remaining: 1,
    ordered: [],
    colorFor: perm.card.iid,
  };
}

/** Landfall: a land entered under `player`'s control, so their permanents with "whenever a land you control enters" trigger. */
export function landEntered(state: GameState, player: PlayerId): void {
  for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "landfall");
}

/** Ward: after a spell or ability is put on the stack, each opposing permanent with ward that it targets gets a trigger. */
export function queueWard(state: GameState, item: StackItem): void {
  item.targets.forEach((target) => {
    if (target.kind !== "permanent") return;
    const found = findPermanentOrNull(state, target.iid);
    // "When this becomes the target of a spell or ability, ...": a trigger for the permanent's controller.
    if (found) queueTriggers(state, found.perm.card, found.owner.id, "becomesTarget", { byOpponent: item.controller !== found.owner.id });
    const ward = found ? parseCard(getCard(state, found.perm.card.defId)).ward : undefined;
    if (!found || !ward || found.owner.id === item.controller) return;
    const name = getCard(state, found.perm.card.defId).name;
    state.triggerQueue.push({
      specs: [],
      item: { kind: "ability", id: newId(state), controller: found.owner.id, source: found.perm.card.iid, sourceName: name, effects: [{ type: "wardCheck", cost: ward, itemId: item.id }], targets: [], specs: [], text: `Ward ${ward}` },
    });
  });
}

/** Removes a spell or ability from the stack without it resolving. A countered spell goes to its owner's graveyard (exile, for flashback). */
export function counterStackItem(state: GameState, item: StackItem, events: GameEvent[]): void {
  state.stack.splice(state.stack.indexOf(item), 1);
  if (item.kind === "spell") {
    state.players[item.card.owner][item.flashback ? "exile" : "graveyard"].push(item.card);
    events.push({ type: "countered", name: getCard(state, item.card.defId).name });
  }
}

// ───────── targets ─────────

/** Can `choice` be a target for `spec` of something controlled by `controller`? `ignoreStackId` excludes the spell itself. */
export function isLegalTarget(state: GameState, spec: TargetSpec, choice: TargetChoice, controller: PlayerId, ignoreStackId?: string): boolean {
  switch (choice.kind) {
    case "player":
      return (spec.kind === "player" || spec.kind === "any" || spec.kind === "playerOrPlaneswalker") && (!spec.opponentOnly || choice.id !== controller);
    case "permanent": {
      const found = findPermanentOrNull(state, choice.iid);
      if (!found) return false;
      const def = getCard(state, found.perm.card.defId);
      // Protection: it can't be targeted by spells or abilities with the quality it is protected from.
      if (spec.source && isProtectedFrom(state, found.perm, spec.source)) return false;
      // Hexproof: only its controller can target it.
      if (found.owner.id !== controller && kw(state, found.perm, "hexproof")) return false;
      if (spec.except && spec.except === choice.iid) return false; // "another target creature"
      if (spec.subtype && !((def.typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/).includes(spec.subtype)) return false;
      if (spec.notSubtype && ((def.typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/).includes(spec.notSubtype)) return false;
      if (spec.mv && (spec.mv.op === "min" ? def.cost < spec.mv.n : def.cost > spec.mv.n)) return false;
      if (spec.kind === "permanent") {
        // "enchant permanent", or "target nonland permanent an opponent controls", or "target creature or enchantment"
        if (spec.nonland && def.type === "land") return false;
        if (spec.types && !spec.types.some((t) => (t === "creature" ? def.type === "creature" || found.perm.crewed === true : t === "artifact" ? isArtifactDef(def) : t === "enchantment" ? isEnchantmentDef(def) : def.type === t))) return false;
        if (spec.controller === "you" && found.owner.id !== controller) return false;
        if (spec.controller === "opponent" && found.owner.id === controller) return false;
        return true;
      }
      if (spec.kind === "land") return def.type === "land";
      const walker = def.type === "planeswalker";
      if (spec.kind === "planeswalker") return walker;
      if (spec.kind === "playerOrPlaneswalker") return walker;
      if (walker) return spec.kind === "any" || spec.kind === "creatureOrPlaneswalker";
      if (spec.kind === "enchantment") return isEnchantmentDef(def);
      if (spec.kind === "artifactOrEnchantment") return isArtifactDef(def) || isEnchantmentDef(def);
      if (spec.kind === "artifact") return isArtifactDef(def);
      if (spec.kind === "artifactOrLand") return def.type === "land" || isArtifactDef(def);
      if (spec.kind !== "creature" && spec.kind !== "any" && spec.kind !== "creatureOrPlaneswalker") return false;
      if (def.type !== "creature" && !found.perm.crewed) return false;
      if (spec.controller === "you" && found.owner.id !== controller) return false;
      if (spec.controller === "opponent" && found.owner.id === controller) return false;
      if (spec.filter === "tapped" && !found.perm.tapped) return false;
      if (spec.toughness && (spec.toughness.op === "min" ? toughnessOf(state, found.perm) < spec.toughness.n : toughnessOf(state, found.perm) > spec.toughness.n)) return false;
      if (spec.notArtifact && isArtifactDef(def)) return false;
      if (spec.power && (spec.power.op === "min" ? powerOf(state, found.perm) < spec.power.n : powerOf(state, found.perm) > spec.power.n)) return false;
      if (spec.keyword && kw(state, found.perm, spec.keyword.name) !== spec.keyword.has) return false;
      if (spec.filter && spec.filter !== "tapped") {
        const attacking = state.combat?.attackers.some((a) => a.attacker === choice.iid) ?? false;
        const blocking = state.combat?.attackers.some((a) => a.blockers.includes(choice.iid)) ?? false;
        if (spec.filter === "attacking" ? !attacking : spec.filter === "blocking" ? !blocking : !(attacking || blocking)) return false;
      }
      return !spec.notColors?.some((c) => (def.colors ?? []).includes(c));
    }
    case "card": {
      if (spec.kind !== "graveyardCreature" && spec.kind !== "graveyardSpell") return false;
      const owner = Object.values(state.players).find((p) => p.graveyard.some((c) => c.iid === choice.iid));
      const card = owner?.graveyard.find((c) => c.iid === choice.iid);
      const type = card ? getCard(state, card.defId).type : undefined;
      if (!owner || !card || (spec.kind === "graveyardCreature" ? type !== "creature" : type !== "instant" && type !== "sorcery")) return false;
      return spec.controller !== "you" || owner.id === controller;
    }
    case "none":
      return spec.optional === true;
    case "stack": {
      const item = state.stack.find((i) => i.id === choice.id && i.kind === "spell" && i.id !== ignoreStackId);
      if (!item || item.kind !== "spell") return false;
      if (spec.orSpell) return true; // "target spell or permanent": any spell on the stack
      if (spec.kind !== "spell") return false;
      if (!spec.spellKind) return true;
      const def = getCard(state, item.card.defId);
      const creature = def.type === "creature";
      return spec.spellKind === "creature" ? creature : spec.spellKind === "noncreature" ? !creature : creature || isArtifactDef(def);
    }
  }
}

/** Everything that could be chosen for `spec`. */
export function legalTargets(state: GameState, spec: TargetSpec, controller: PlayerId, ignoreStackId?: string): TargetChoice[] {
  const out: TargetChoice[] = [];
  for (const id of ["p1", "p2"] as const) {
    const choice: TargetChoice = { kind: "player", id };
    if (isLegalTarget(state, spec, choice, controller, ignoreStackId)) out.push(choice);
  }
  for (const player of Object.values(state.players)) {
    for (const perm of player.battlefield) {
      const choice: TargetChoice = { kind: "permanent", iid: perm.card.iid };
      if (isLegalTarget(state, spec, choice, controller, ignoreStackId)) out.push(choice);
    }
    for (const card of player.graveyard) {
      const choice: TargetChoice = { kind: "card", iid: card.iid };
      if (isLegalTarget(state, spec, choice, controller, ignoreStackId)) out.push(choice);
    }
  }
  for (const item of state.stack) {
    const choice: TargetChoice = { kind: "stack", id: item.id };
    if (isLegalTarget(state, spec, choice, controller, ignoreStackId)) out.push(choice);
  }
  if (spec.optional) out.push({ kind: "none" }); // "up to one": choosing nothing is always possible
  return out;
}

// ───────── running effects ─────────

export type { RunContext } from "./effects.js";

type Subject =
  | { k: "player"; id: PlayerId }
  | { k: "perm"; perm: Permanent; owner: PlayerId }
  | { k: "card"; card: CardInstance; owner: PlayerId } // a card in a graveyard
  | { k: "stack"; item: StackItem };

const creaturesOfPlayer = (state: GameState, owner: PlayerId): Subject[] =>
  state.players[owner].battlefield.filter((perm) => isCreature(state, perm)).map((perm): Subject => ({ k: "perm", perm, owner }));

function subjectsOf(state: GameState, ref: Ref, ctx: RunContext): Subject[] {
  switch (ref.t) {
    case "you":
      return [{ k: "player", id: ctx.controller }];
    case "opp":
      return [{ k: "player", id: OPPONENT[ctx.controller] }];
    case "eachPlayer":
      return [{ k: "player", id: "p1" }, { k: "player", id: "p2" }];
    case "self": {
      const found = findPermanentOrNull(state, ctx.sourceId);
      return found ? [{ k: "perm", perm: found.perm, owner: found.owner.id }] : [];
    }
    case "allCreatures": {
      const skip = ref.except !== undefined && ctx.targets[ref.except]?.kind === "permanent" ? (ctx.targets[ref.except] as { iid: string }).iid : undefined;
      return Object.values(state.players)
        .filter((p) => ref.scope === "all" || (ref.scope === "yours") === (p.id === ctx.controller))
        .flatMap((p) => p.battlefield.filter((perm) => isCreature(state, perm) && perm.card.iid !== skip && !(ref.noFlying && kw(state, perm, "flying")) && (!ref.subtype || ((getCard(state, perm.card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/).includes(ref.subtype))).map((perm): Subject => ({ k: "perm", perm, owner: p.id })));
    }
    case "allPlaneswalkers":
      return Object.values(state.players).flatMap((p) => p.battlefield.filter((perm) => isPlaneswalker(state, perm)).map((perm): Subject => ({ k: "perm", perm, owner: p.id })));
    case "ownerOf":
    case "controllerOf": {
      const choice = ctx.targets[ref.i];
      if (choice?.kind !== "permanent" && choice?.kind !== "card") return [];
      const iid = choice.iid;
      const now = findPermanentOrNull(state, iid);
      const controller = ctx.lki?.[iid] ?? now?.owner.id;
      const owner = now?.perm.card.owner ?? (iid.startsWith("p1-") ? "p1" : iid.startsWith("p2-") ? "p2" : controller);
      const who = ref.t === "ownerOf" ? owner : (controller ?? owner);
      return who ? [{ k: "player", id: who }] : [];
    }
    case "enchanted": {
      const source = findPermanentOrNull(state, ctx.sourceId)?.perm;
      const host = source?.attachedTo ? findPermanentOrNull(state, source.attachedTo) : null;
      return host ? [{ k: "perm", perm: host.perm, owner: host.owner.id }] : [];
    }
    case "other": {
      const found = ctx.other ? findPermanentOrNull(state, ctx.other) : null;
      return found ? [{ k: "perm", perm: found.perm, owner: found.owner.id }] : [];
    }
    case "attackingCreatures":
      return (state.combat?.attackers ?? []).filter((a) => !(ref.other && a.attacker === ctx.sourceId)).flatMap((a) => {
        const found = findPermanentOrNull(state, a.attacker);
        return found ? [{ k: "perm", perm: found.perm, owner: found.owner.id } as Subject] : [];
      });
    case "creaturesOf": {
      const choice = ctx.targets[ref.i];
      const spec = ctx.specs[ref.i];
      if (!choice || !spec || choice.kind !== "player" || !isLegalTarget(state, spec, choice, ctx.controller, ctx.stackId)) return [];
      return creaturesOfPlayer(state, choice.id);
    }
    case "target": {
      const choice = ctx.targets[ref.i];
      const spec = ctx.specs[ref.i];
      // A target that is no longer legal (it died, left, or was countered) is simply skipped.
      if (!choice || !spec || choice.kind === "none" || !isLegalTarget(state, spec, choice, ctx.controller, ctx.stackId)) return [];
      if (choice.kind === "player") return [{ k: "player", id: choice.id }];
      if (choice.kind === "card") {
        const owner = Object.values(state.players).find((p) => p.graveyard.some((c) => c.iid === choice.iid));
        const card = owner?.graveyard.find((c) => c.iid === choice.iid);
        return owner && card ? [{ k: "card", card, owner: owner.id }] : [];
      }
      if (choice.kind === "permanent") {
        const found = findPermanentOrNull(state, choice.iid);
        return found ? [{ k: "perm", perm: found.perm, owner: found.owner.id }] : [];
      }
      const item = state.stack.find((i) => i.id === choice.id);
      return item ? [{ k: "stack", item }] : [];
    }
  }
}

/** Damage that isn't combat damage (spells, abilities). Deathtouch and lifelink on the source count. */
export function dealDamage(
  state: GameState,
  source: { name: string; controller: PlayerId; deathtouch: boolean; lifelink: boolean },
  target: { k: "player"; id: PlayerId } | { k: "perm"; perm: Permanent },
  amount: number,
  events: GameEvent[],
): void {
  if (amount <= 0) return;
  // "Prevent all noncombat damage that would be dealt to you and creatures you control."
  const victim = target.k === "player" ? target.id : isPlaneswalker(state, target.perm) ? undefined : findPermanentOrNull(state, target.perm.card.iid)?.owner.id;
  if (victim && state.players[victim].battlefield.some((p) => parseCard(getCard(state, p.card.defId)).preventNoncombat)) {
    events.push({ type: "effect", text: `The damage to ${target.k === "player" ? playerLabel(target.id) : nameOf(state, target.perm)} is prevented.` });
    return;
  }
  if (target.k === "player") {
    if (state.players[source.controller].doubleDamage && target.id !== source.controller) amount *= 2; // "it deals double that damage instead"
    changeLife(state, target.id, -amount, events);
  } else if (isPlaneswalker(state, target.perm)) {
    target.perm.loyalty = (target.perm.loyalty ?? 0) - amount; // damage to a planeswalker removes that much loyalty
  } else {
    target.perm.damage += amount;
    if (source.deathtouch) target.perm.deathtouched = true;
  }
  events.push({ type: "damage", source: source.name, target: target.k === "player" ? target.id : target.perm.card.iid, amount });
  if (source.lifelink) changeLife(state, source.controller, amount, events);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Runs a spell's or ability's effects in order. State-based actions are checked by the caller afterwards. */
export function runEffects(state: GameState, effects: Effect[], ctx: RunContext, events: GameEvent[]): void {
  const source = findPermanentOrNull(state, ctx.sourceId)?.perm;
  const trait = { name: ctx.sourceName, controller: ctx.controller, deathtouch: source ? kw(state, source, "deathtouch") : false, lifelink: source ? kw(state, source, "lifelink") : false };
  const say = (text: string) => events.push({ type: "effect", text });
  const value = (amount: Amount): number => {
    if (amount === "X") return ctx.x ?? 0;
    if (typeof amount !== "object") return amount;
    const c = amount.count;
    const self = findPermanentOrNull(state, ctx.sourceId)?.perm;
    const chosen = (iid?: string) => (iid ? findPermanentOrNull(state, iid)?.perm : undefined);
    const n =
      c.kind === "selfPower" ? (self ? Math.max(0, powerOf(state, self)) : 0)
      : c.kind === "selfCounters" ? (self?.counters ?? 0)
      : c.kind === "targetPower" ? (() => {
          const t = ctx.targets[c.i];
          const p = t?.kind === "permanent" ? chosen(t.iid) : undefined;
          return p ? Math.max(0, powerOf(state, p)) : 0;
        })()
      : c.kind === "otherToughness" ? (() => {
          const p = chosen(ctx.other);
          return p ? Math.max(0, toughnessOf(state, p)) : 0;
        })()
      : c.kind === "ifOtherSubtype" ? (() => {
          const p = chosen(ctx.other);
          const types = p ? ((getCard(state, p.card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/) : [];
          return types.includes(c.subtype) ? c.yes : c.no;
        })()
      : c.kind === "otherPower" ? (() => {
          const p = chosen(ctx.other);
          return p ? Math.max(0, powerOf(state, p)) : 0;
        })()
      : countFor(state, ctx.controller, c, ctx.sourceId);
    return n * (amount.times ?? 1);
  };
  const preventRegen = effects.some((e) => e.type === "noRegen"); // "It can't be regenerated" is part of this spell
  // Remember who controls each target now, so "its controller" still works once it has been destroyed.
  if (!ctx.lki) {
    ctx.lki = {};
    for (const t of ctx.targets) if (t.kind === "permanent") {
      const found = findPermanentOrNull(state, t.iid);
      if (found) ctx.lki[t.iid] = found.owner.id;
    }
  }

  for (let step = 0; step < effects.length; step++) {
    if (state.pendingPick) break; // waiting for a choice: the effects that follow are saved with it and run afterwards
    const effect = effects[step];
    /** A choice among cards: the game waits, and the effects after this one run once it is answered. */
    const startPick = (pick: PendingPick) => {
      state.pendingPick = { ...pick, ...(step + 1 < effects.length ? { rest: effects.slice(step + 1), ctx } : {}) };
    };
    switch (effect.type) {
      case "damage":
        for (const s of subjectsOf(state, effect.to, ctx)) {
          if (s.k === "player") dealDamage(state, trait, s, value(effect.amount), events);
          else if (s.k === "perm") {
            if (ctx.sourceDefId && isProtectedFrom(state, s.perm, qualityOfDef(getCard(state, ctx.sourceDefId)))) {
              say(`${nameOf(state, s.perm)} has protection: the damage is prevented.`);
              continue;
            }
            if (preventRegen) s.perm.noRegen = true;
            dealDamage(state, trait, s, value(effect.amount), events);
            if (value(effect.amount) > 0 && findPermanentOrNull(state, ctx.sourceId)) (s.perm.damagedBy ??= []).push(ctx.sourceId);
          }
        }
        break;

      case "draw":
        for (const s of subjectsOf(state, effect.who, ctx)) {
          if (s.k !== "player") continue;
          drawCards(state, s.id, value(effect.amount), events);
          say(`${playerLabel(s.id)} draws ${plural(value(effect.amount), "card")}.`);
        }
        break;

      case "gainLife":
      case "loseLife":
        for (const s of subjectsOf(state, effect.who, ctx)) {
          if (s.k === "player") changeLife(state, s.id, effect.type === "gainLife" ? value(effect.amount) : -value(effect.amount), events);
        }
        break;

      case "destroy":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm" || kw(state, s.perm, "indestructible")) continue;
          if (preventRegen) s.perm.noRegen = true;
          if (regenerateInstead(state, s.perm)) say(`${nameOf(state, s.perm)} regenerates.`);
          else putIntoGraveyard(state, s.perm, s.owner, events);
        }
        break;

      case "exile":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          const card = removeFromBattlefield(state, s.perm, s.owner);
          if (card) {
            state.players[card.owner].exile.push(card);
            say(`${getCard(state, card.defId).name} is exiled.`);
          }
        }
        break;

      case "bounce":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k === "stack" && s.item.kind === "spell") {
            // "Return target spell to its owner's hand": it leaves the stack without resolving.
            state.stack.splice(state.stack.indexOf(s.item), 1);
            state.players[s.item.card.owner].hand.push(s.item.card);
            say(`${getCard(state, s.item.card.defId).name} returns to its owner's hand.`);
            continue;
          }
          if (s.k !== "perm") continue;
          const card = removeFromBattlefield(state, s.perm, s.owner);
          if (card) {
            state.players[card.owner].hand.push(card);
            say(`${getCard(state, card.defId).name} returns to its owner's hand.`);
          }
        }
        break;

      case "regenerate":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.regenShield = (s.perm.regenShield ?? 0) + 1;
          say(`${nameOf(state, s.perm)} gets a regeneration shield until end of turn.`);
        }
        break;

      case "noRegen":
        break;

      case "addCounters":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          if (effect.kind === "minus") s.perm.minusCounters = (s.perm.minusCounters ?? 0) + value(effect.amount);
          else s.perm.counters = (s.perm.counters ?? 0) + value(effect.amount);
          say(`${nameOf(state, s.perm)} gets ${plural(value(effect.amount), effect.kind === "minus" ? "-1/-1 counter" : "+1/+1 counter")}.`);
        }
        break;

      case "fight":
      case "bite": {
        const first = subjectsOf(state, effect.type === "fight" ? effect.a : effect.from, ctx).find((x) => x.k === "perm");
        const second = subjectsOf(state, effect.type === "fight" ? effect.b : effect.to, ctx).find((x) => x.k === "perm");
        if (first?.k !== "perm" || second?.k !== "perm") break; // a target is gone: nothing happens
        const traitOf = (perm: Permanent, controller: PlayerId) => ({ name: nameOf(state, perm), controller, deathtouch: kw(state, perm, "deathtouch"), lifelink: kw(state, perm, "lifelink") });
        const hit = (from: Permanent, fromOwner: PlayerId, to: Permanent) => {
          const quality = qualityOfDef(getCard(state, from.card.defId));
          if (isProtectedFrom(state, to, quality)) return say(`${nameOf(state, to)} has protection: the damage is prevented.`);
          dealDamage(state, traitOf(from, fromOwner), { k: "perm", perm: to }, Math.max(0, powerOf(state, from)), events);
        };
        const a = { perm: first.perm, owner: first.owner };
        const b = { perm: second.perm, owner: second.owner };
        hit(a.perm, a.owner, b.perm);
        if (effect.type === "fight") hit(b.perm, b.owner, a.perm); // power doesn't change from damage, so the order doesn't matter
        break;
      }

      case "gainControl":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm" || s.owner === ctx.controller) continue;
          const from = state.players[s.owner].battlefield;
          from.splice(from.indexOf(s.perm), 1);
          s.perm.controlReturn = s.perm.controlReturn ?? s.owner; // it goes back at the end of the turn
          s.perm.summoningSick = true;
          state.players[ctx.controller].battlefield.push(s.perm);
          say(`${playerLabel(ctx.controller)} gains control of ${nameOf(state, s.perm)} until end of turn.`);
        }
        break;

      case "cantBlockThisTurn":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.cantBlockTurn = true;
          say(`${nameOf(state, s.perm)} can't block this turn.`);
        }
        break;

      case "crewed":
        for (const s of subjectsOf(state, { t: "self" }, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.crewed = true;
          say(`${nameOf(state, s.perm)} becomes an artifact creature until end of turn.`);
        }
        break;

      case "counterUnlessPay": {
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "stack") continue;
          const item = s.item;
          const cost = parseManaCost(effect.cost);
          if (!cost || state.pendingPick) continue;
          const name = item.kind === "spell" ? getCard(state, item.card.defId).name : item.sourceName;
          if (!payMana(state, item.controller, cost).ok) {
            say(`${playerLabel(item.controller)} can't pay ${effect.cost}: ${name} is countered.`);
            counterStackItem(state, item, events);
            continue;
          }
          startPick({
            player: item.controller,
            prompt: `${ctx.sourceName}: pay ${effect.cost}, or ${name} is countered`,
            kind: "ward",
            options: ["pay"],
            optional: true,
            owner: item.controller,
            remaining: 1,
            ordered: [],
            wardItem: item.id,
            wardCost: effect.cost,
          });
        }
        break;
      }

      case "sacOnDamage":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k === "perm") s.perm.sacOnDamage = true;
        }
        break;

      case "revealPut": {
        const library = state.players[ctx.controller].library;
        const top = library.splice(0, effect.n);
        const keep = top.filter((c) => cardMatches(getCard(state, c.defId), effect.filter) && getCard(state, c.defId).cost <= effect.maxMV);
        const rest = top.filter((c) => !keep.includes(c));
        for (const card of keep) {
          state.players[ctx.controller].battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
          events.push({ type: "permanentEntered", player: ctx.controller, iid: card.iid });
          queueTriggers(state, card, ctx.controller, "enters");
          creatureEntered(state, card, ctx.controller);
        }
        const [ordered, rng] = shuffle(rest, state.rng);
        state.rng = rng;
        library.push(...ordered);
        say(`${playerLabel(ctx.controller)} reveals the top ${effect.n} cards and puts ${keep.length} onto the battlefield.`);
        break;
      }

      case "grantIfPowerBelow":
        for (const perm of state.players[ctx.controller].battlefield) {
          if (!isCreature(state, perm) || powerOf(state, perm) >= (ctx.x ?? 0)) continue;
          perm.tempKeywords = [...(perm.tempKeywords ?? []), effect.keyword];
        }
        say(`Creatures with power less than ${ctx.x ?? 0} gain ${effect.keyword} until end of turn.`);
        break;

      case "doubleDamage":
        state.players[ctx.controller].doubleDamage = true;
        say(`Damage ${playerLabel(ctx.controller)}'s sources deal to an opponent is doubled this turn.`);
        break;

      case "exileTop": {
        const library = state.players[ctx.controller].library;
        const card = library.shift();
        if (!card) break;
        state.players[ctx.controller].exile.push(card);
        if (effect.playIfAttacked) (state.players[ctx.controller].mayPlay ??= []).push({ iid: card.iid, source: ctx.sourceId });
        say(`${playerLabel(ctx.controller)} exiles the top card of their library.`);
        break;
      }

      case "blink":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          const card = removeFromBattlefield(state, s.perm, s.owner);
          if (!card) continue;
          // It comes back as a new object: no counters, damage or attachments, and its "enters" abilities trigger again.
          state.players[card.owner].battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
          events.push({ type: "permanentEntered", player: card.owner, iid: card.iid });
          queueTriggers(state, card, card.owner, "enters");
          if (getCard(state, card.defId).type === "creature") creatureEntered(state, card, card.owner);
          say(`${getCard(state, card.defId).name} is exiled and returns to the battlefield.`);
        }
        break;

      case "scryIfMV": {
        const t = ctx.targets[effect.what.t === "target" ? effect.what.i : 0];
        const iid = t?.kind === "permanent" ? t.iid : undefined;
        const card = iid ? Object.values(state.players).flatMap((p) => [...p.hand, ...p.graveyard, ...p.library, ...p.exile]).find((c) => c.iid === iid) : undefined;
        if (!card || getCard(state, card.defId).cost > effect.max || state.pendingPick) break;
        const top = state.players[ctx.controller].library.slice(0, effect.n);
        if (top.length === 0) break;
        startPick({
          player: ctx.controller,
          prompt: `Scry ${top.length}: choose a card to put on the bottom of your library, or keep it on top`,
          kind: "scry",
          options: top.map((c) => c.iid),
          optional: true,
          owner: ctx.controller,
          remaining: top.length,
          ordered: [],
        });
        break;
      }

      case "noGroundBlock":
        state.noGroundBlock = true;
        say("Creatures without flying can't block this turn.");
        break;

      case "setBase":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.tempBase = { power: effect.power, toughness: effect.toughness };
          say(`${nameOf(state, s.perm)} becomes ${effect.power}/${effect.toughness} until end of turn.`);
        }
        break;

      case "loseDefender":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k === "perm") s.perm.tempNoDefender = true;
        }
        break;

      case "winGame":
        state.winner = ctx.controller;
        events.push({ type: "gameWon", player: ctx.controller });
        break;

      case "bounceOwn": {
        const mine = state.players[ctx.controller].battlefield.filter((p) => isCreature(state, p) && !(effect.other && p.card.iid === ctx.sourceId));
        if (mine.length === 0 || state.pendingPick) break;
        startPick({
          player: ctx.controller,
          prompt: `${ctx.sourceName}: choose ${effect.other ? "another creature" : "a creature"} you control to return to its owner's hand`,
          kind: "bounceOwn",
          options: mine.map((p) => p.card.iid),
          optional: false,
          owner: ctx.controller,
          remaining: 1,
          ordered: [],
        });
        break;
      }

      case "mayPay": {
        // "You may pay {1}. If you do, ...": nothing to ask when the cost can't be paid.
        const cost = parseManaCost(effect.cost);
        if (!cost || state.pendingPick || !payMana(state, ctx.controller, cost).ok) break;
        startPick({
          player: ctx.controller,
          prompt: `${ctx.sourceName}: pay ${effect.cost}?`,
          kind: "mayPay",
          options: ["pay"],
          optional: true,
          owner: ctx.controller,
          remaining: 1,
          ordered: [],
          wardCost: effect.cost,
          thenEffects: effect.then,
          thenCtx: ctx,
          ...(effect.thenSpecs ? { thenSpecs: effect.thenSpecs } : {}),
        });
        break;
      }

      case "drawUnlessPay": {
        // The opponent who cast the spell may pay; otherwise the controller draws.
        const payer = OPPONENT[ctx.controller];
        const cost = parseManaCost(effect.cost);
        if (!cost || state.pendingPick) break;
        if (!payMana(state, payer, cost).ok) {
          drawCards(state, ctx.controller, 1, events);
          say(`${playerLabel(payer)} can't pay ${effect.cost}: ${playerLabel(ctx.controller)} draws a card.`);
          break;
        }
        startPick({
          player: payer,
          prompt: `${ctx.sourceName}: pay ${effect.cost}, or ${playerLabel(ctx.controller)} draws a card`,
          kind: "tax",
          options: ["pay"],
          optional: true,
          owner: payer,
          remaining: 1,
          ordered: [],
          wardCost: effect.cost,
          taxFor: ctx.controller,
        });
        break;
      }

      case "tapOrUntap": {
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm" || state.pendingPick) continue;
          startPick({
            player: ctx.controller,
            prompt: `${nameOf(state, s.perm)}: tap it or untap it?`,
            kind: "toggle",
            options: ["tap", "untap"],
            optional: true,
            owner: ctx.controller,
            remaining: 1,
            ordered: [],
            toggleIid: s.perm.card.iid,
          });
        }
        break;
      }

      case "sacrifice":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          say(`${nameOf(state, s.perm)} is sacrificed.`);
          putIntoGraveyard(state, s.perm, s.owner, events);
        }
        break;

      case "stun":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.stun = (s.perm.stun ?? 0) + 1;
          say(`${nameOf(state, s.perm)} gets a stun counter: its next untap is skipped.`);
        }
        break;

      case "unblockable":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.unblockableTurn = true;
          say(`${nameOf(state, s.perm)} can't be blocked this turn.`);
        }
        break;

      case "exileUntilLeaves": {
        // The source must still be on the battlefield: otherwise nothing is exiled (rule 610.3c).
        const holder = findPermanentOrNull(state, ctx.sourceId)?.perm;
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm" || !holder) continue;
          const card = removeFromBattlefield(state, s.perm, s.owner);
          if (!card) continue;
          state.players[card.owner].exile.push(card);
          holder.held = [...(holder.held ?? []), card];
          say(`${getCard(state, card.defId).name} is exiled until ${nameOf(state, holder)} leaves the battlefield.`);
        }
        break;
      }

      case "fog":
        state.preventCombat = true;
        say("All combat damage this turn is prevented.");
        break;

      case "rummage": {
        const hand = state.players[ctx.controller].hand;
        if (hand.length === 0 || state.pendingPick) break;
        startPick({
          player: ctx.controller,
          prompt: effect.toBottom ? "You may put a card from your hand on the bottom of your library. If you do, draw a card." : "You may discard a card. If you do, draw a card.",
          kind: "rummage",
          options: hand.map((c) => c.iid),
          optional: true,
          owner: ctx.controller,
          remaining: 1,
          ordered: [],
          ...(effect.toBottom ? { restToGraveyard: false, randomBottom: false, bottomIids: ["bottom"] } : {}),
        });
        break;
      }

      case "returnFromYard": {
        // "When this dies, return it to its owner's hand": the card is in its owner's graveyard by now.
        for (const p of Object.values(state.players)) {
          const at = p.graveyard.findIndex((c) => c.iid === ctx.sourceId);
          if (at < 0) continue;
          const [card] = p.graveyard.splice(at, 1);
          p.hand.push(card);
          say(`${getCard(state, card.defId).name} returns to its owner's hand.`);
        }
        break;
      }

      case "wardCheck": {
        const item = state.stack.find((i) => i.id === effect.itemId);
        const cost = parseManaCost(effect.cost);
        if (!item || !cost) break;
        const name = item.kind === "spell" ? getCard(state, item.card.defId).name : item.sourceName;
        if (!payMana(state, item.controller, cost).ok) {
          say(`${playerLabel(item.controller)} can't pay ${effect.cost}: ${name} is countered.`);
          counterStackItem(state, item, events);
          break;
        }
        startPick({
          player: item.controller,
          prompt: `Ward ${effect.cost}: pay it, or ${name} is countered`,
          kind: "ward",
          options: ["pay"],
          optional: true,
          owner: item.controller,
          remaining: 1,
          ordered: [],
          wardItem: item.id,
          wardCost: effect.cost,
        });
        break;
      }

      case "ifKicked":
        runEffects(state, ctx.kicked ? effect.then : (effect.otherwise ?? []), ctx, events);
        break;

      case "surveil": {
        const top = state.players[ctx.controller].library.slice(0, effect.n);
        if (top.length === 0) break;
        startPick({
          player: ctx.controller,
          prompt: `Surveil ${top.length}: choose a card to put into your graveyard, or keep the rest on top`,
          kind: "surveil",
          options: top.map((c) => c.iid),
          optional: true,
          owner: ctx.controller,
          remaining: top.length,
          ordered: [],
        });
        break;
      }

      case "attach":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          const source = findPermanentOrNull(state, ctx.sourceId)?.perm;
          if (s.k !== "perm" || !source) continue;
          source.attachedTo = s.perm.card.iid;
          say(`${nameOf(state, source)} is attached to ${nameOf(state, s.perm)}.`);
        }
        break;

      case "createToken": {
        const n = value(effect.amount);
        // "Its controller creates a 1/1 token": the player is not always the one who cast the spell.
        const who = effect.who ? (subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") as { k: "player"; id: PlayerId } | undefined)?.id : ctx.controller;
        if (!who) break;
        for (let i = 0; i < n; i++) makeToken(state, effect.token, who, events);
        if (n > 0) say(`${playerLabel(who)} creates ${plural(n, `${effect.token.name} token`)}.`);
        break;
      }

      case "mill":
        for (const s of subjectsOf(state, effect.who, ctx)) {
          if (s.k !== "player") continue;
          const library = state.players[s.id].library;
          const milled = library.splice(0, Math.min(value(effect.amount), library.length));
          state.players[s.id].graveyard.push(...milled);
          say(`${playerLabel(s.id)} mills ${plural(milled.length, "card")}.`);
        }
        break;

      case "scry": {
        const top = state.players[ctx.controller].library.slice(0, effect.n);
        if (top.length === 0 || state.pendingPick) break;
        startPick({
          player: ctx.controller,
          prompt: `Scry ${top.length}: choose a card to put on the bottom of your library, or keep the rest on top`,
          kind: "scry",
          options: top.map((c) => c.iid),
          optional: true,
          owner: ctx.controller,
          remaining: top.length,
          ordered: [],
        });
        break;
      }

      case "discard":
        for (const s of subjectsOf(state, effect.who, ctx)) {
          if (s.k !== "player" || state.pendingPick) continue;
          const hand = state.players[s.id].hand;
          const count = Math.min(effect.amount, hand.length);
          if (count === 0) continue;
          if (effect.chooser === "random") {
            // "Discard three cards at random": no choice to make.
            const iids: string[] = [];
            for (let i = 0; i < count; i++) {
              const at = Math.floor(rngNext(state) * hand.length);
              iids.push(hand[at].iid);
              state.players[s.id].graveyard.push(...hand.splice(at, 1));
            }
            events.push({ type: "cardsDiscarded", player: s.id, iids });
            continue;
          }
          if (effect.chooser === "victim" && count >= hand.length) {
            // Nothing to choose: the whole hand goes.
            const iids = hand.map((c) => c.iid);
            state.players[s.id].graveyard.push(...hand.splice(0));
            events.push({ type: "cardsDiscarded", player: s.id, iids });
            continue;
          }
          startPick({
            player: effect.chooser === "you" ? ctx.controller : s.id,
            prompt: effect.chooser === "you" ? `${playerLabel(s.id)}'s hand: choose a card for them to discard` : `Discard ${plural(count, "card")}`,
            kind: "discard",
            options: hand.map((c) => c.iid),
            optional: false,
            owner: s.id,
            remaining: count,
            ordered: [],
          });
        }
        break;

      case "lookPick": {
        const target = effect.who ? subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") : undefined;
        const owner = target?.k === "player" ? target.id : ctx.controller;
        const top = state.players[owner].library.slice(0, effect.n);
        if (top.length === 0 || (effect.mode === "arrange" && top.length < 2) || state.pendingPick) break;
        const prompts = {
          toHand: "Choose the card to put into your hand. The other goes to the bottom of your library.",
          toGraveyard: `Put the top card of ${playerLabel(owner)}'s library into their graveyard?`,
          arrange: `Choose the card to put on top of your library (${plural(top.length, "card")} to arrange).`,
        };
        startPick({
          player: ctx.controller,
          prompt: prompts[effect.mode],
          kind: effect.mode,
          options: top.map((c) => c.iid),
          optional: effect.mode === "toGraveyard",
          owner,
          remaining: 1,
          ordered: [],
        });
        break;
      }

      case "revealToHand": {
        const library = state.players[ctx.controller].library;
        const top = library.slice(0, effect.n);
        if (top.length === 0 || state.pendingPick) break;
        const matches = (c: CardInstance) => cardMatches(getCard(state, c.defId), effect.filter);
        const options = top.filter(matches).map((c) => c.iid);
        const bottom = (iids: string[]) => {
          const cards = iids.map((id) => library.splice(library.findIndex((c) => c.iid === id), 1)[0]);
          if (effect.restTo === "graveyard") {
            state.players[ctx.controller].graveyard.push(...cards);
            return;
          }
          const [ordered, rng] = effect.random ? shuffle(cards, state.rng) : [cards, state.rng];
          state.rng = rng;
          library.push(...ordered);
        };
        if (options.length === 0) {
          say(`${playerLabel(ctx.controller)} looks at the top ${plural(top.length, "card")}: nothing to take. They go to the bottom of the library.`);
          bottom(top.map((c) => c.iid));
          break;
        }
        startPick({
          player: ctx.controller,
          prompt: `Look at the top ${plural(top.length, "card")}: ${effect.required ? "choose one to put" : "you may take one of these"} into your hand. The rest go ${effect.restTo === "graveyard" ? "to your graveyard" : "to the bottom of your library"}.`,
          kind: "revealToHand",
          options,
          optional: effect.required !== true,
          owner: ctx.controller,
          remaining: 1,
          ordered: [],
          bottomIids: top.map((c) => c.iid),
          randomBottom: effect.random,
          restToGraveyard: effect.restTo === "graveyard",
        });
        break;
      }

      case "search": {
        if (state.pendingPick) break;
        // "Its controller may search": usually the player of the effect, sometimes another one (Path to Exile).
        const searcher = effect.who ? ((subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") as { k: "player"; id: PlayerId } | undefined)?.id ?? ctx.controller) : ctx.controller;
        const library = state.players[searcher].library;
        const any = effect.for === "any";
        const seen = new Set<string>();
        const options = library.filter((c) => (any || isBasicLand(getCard(state, c.defId))) && (any || (!seen.has(c.defId) && seen.add(c.defId)))).map((c) => c.iid);
        if (options.length === 0) {
          [state.players[searcher].library, state.rng] = shuffle(library, state.rng);
          break;
        }
        const toHand = effect.to === "hand";
        startPick({
          player: searcher,
          prompt: toHand ? `Search your library: choose a ${any ? "card" : "basic land"} to put into your hand` : `Search your library: choose a basic land to put onto the battlefield${effect.tapped === false ? "" : " tapped"}`,
          kind: toHand ? "searchAny" : "searchLand",
          entersTapped: effect.tapped !== false,
          options,
          optional: true,
          owner: searcher,
          remaining: 1,
          ordered: [],
        });
        break;
      }

      case "topOfLibrary":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          const card = removeFromBattlefield(state, s.perm, s.owner);
          if (card) {
            state.players[card.owner].library.unshift(card);
            say(`${getCard(state, card.defId).name} is put on top of its owner's library.`);
          }
        }
        break;

      case "reanimate":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "card") continue;
          const yard = state.players[s.owner].graveyard;
          yard.splice(yard.indexOf(s.card), 1);
          const name = getCard(state, s.card.defId).name;
          if (effect.to === "hand") {
            state.players[s.card.owner].hand.push(s.card);
            say(`${name} returns to its owner's hand.`);
          } else {
            // It comes back under the control of the player who used the effect.
            state.players[ctx.controller].battlefield.push({ card: s.card, tapped: effect.tapped === true, summoningSick: true, damage: 0 });
            events.push({ type: "permanentEntered", player: ctx.controller, iid: s.card.iid });
            queueTriggers(state, s.card, ctx.controller, "enters");
            if (getCard(state, s.card.defId).type === "creature") creatureEntered(state, s.card, ctx.controller);
          }
        }
        break;

      case "tap":
      case "untap":
        for (const s of subjectsOf(state, effect.what, ctx)) if (s.k === "perm") s.perm.tapped = effect.type === "tap";
        break;

      case "pump": {
        // "gets +1/+0 for each other attacking Goblin": the amount is multiplied by a count
        const times = effect.per ? value({ count: effect.per }) : 1;
        const dp = effect.power * times;
        const dt = effect.toughness * times;
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          noteTempSource(s.perm, ctx);
          s.perm.powerBonus = (s.perm.powerBonus ?? 0) + dp;
          s.perm.toughnessBonus = (s.perm.toughnessBonus ?? 0) + dt;
          const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
          say(`${nameOf(state, s.perm)} gets ${sign(dp)}/${sign(dt)} until end of turn.`);
        }
        break;
      }

      case "assignByToughness":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          s.perm.damageByToughness = true;
          say(`${nameOf(state, s.perm)} assigns combat damage equal to its toughness this turn.`);
        }
        break;

      case "ifSubtypeGrant":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          const types = ((getCard(state, s.perm.card.defId).typeLine ?? "").split("—")[1] ?? "").toLowerCase().split(/\s+/);
          if (!types.includes(effect.subtype)) continue;
          s.perm.tempKeywords = [...(s.perm.tempKeywords ?? []), effect.keyword];
          say(`${nameOf(state, s.perm)} gains ${effect.keyword} until end of turn.`);
        }
        break;

      case "tapForBonus": {
        const source = findPermanentOrNull(state, ctx.sourceId);
        const options = state.players[ctx.controller].battlefield.filter((p) => isCreature(state, p) && !p.tapped && p.card.iid !== ctx.sourceId).map((p) => p.card.iid);
        if (!source || options.length === 0 || state.pendingPick) break;
        startPick({
          player: ctx.controller,
          prompt: `${ctx.sourceName}: tap any number of your untapped creatures. It gets +1/+1 for each one (click "Done" when you have enough).`,
          kind: "tapSome",
          options,
          optional: true,
          owner: ctx.controller,
          remaining: options.length,
          ordered: [],
          toggleIid: ctx.sourceId,
        });
        break;
      }

      case "libraryChoice":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm" || state.pendingPick) continue;
          startPick({
            player: s.owner,
            prompt: `${nameOf(state, s.perm)}: put it on the top or the bottom of its owner's library?`,
            kind: "topBottom",
            options: ["top", "bottom"],
            optional: false,
            owner: s.owner,
            remaining: 1,
            ordered: [],
            toggleIid: s.perm.card.iid,
          });
        }
        break;

      case "grant":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "perm") continue;
          noteTempSource(s.perm, ctx);
          s.perm.tempKeywords = [...(s.perm.tempKeywords ?? []), effect.keyword];
          say(`${nameOf(state, s.perm)} gains ${effect.keyword} until end of turn.`);
        }
        break;

      case "counter":
        for (const s of subjectsOf(state, effect.what, ctx)) {
          if (s.k !== "stack") continue;
          const shielded = s.item.kind === "spell" && state.players[s.item.controller].battlefield.some((p) => {
            const min = parseCard(getCard(state, p.card.defId)).uncounterableMinMV;
            return min !== undefined && getCard(state, (s.item as { card: CardInstance }).card.defId).cost >= min;
          });
          if (s.item.kind === "spell" && (shielded || parseCard(getCard(state, s.item.card.defId)).cantBeCountered)) {
            say(`${getCard(state, s.item.card.defId).name} can't be countered.`);
            continue;
          }
          state.stack.splice(state.stack.indexOf(s.item), 1);
          if (s.item.kind === "spell") {
            state.players[s.item.card.owner][s.item.flashback ? "exile" : "graveyard"].push(s.item.card);
            events.push({ type: "countered", name: getCard(state, s.item.card.defId).name });
          }
        }
        break;
    }
  }
}

/** Remembers which spell or ability put an "until end of turn" effect on a permanent. */
function noteTempSource(perm: Permanent, ctx: { sourceName: string; sourceDefId?: string }): void {
  const list = (perm.tempFrom ??= []);
  if (!list.some((x) => x.name === ctx.sourceName)) list.push({ name: ctx.sourceName, ...(ctx.sourceDefId ? { defId: ctx.sourceDefId } : {}) });
}

// ───────── state-based actions ─────────

/** Rule 704.5: 0 life (or drawing from an empty library) loses; creatures with lethal damage or deathtouch die. */
export function checkStateBasedActions(state: GameState, events: GameEvent[]): void {
  // Rule 704.3: keep checking until nothing changes. A creature dying can shrink another one ("power and toughness equal to the
  // number of creatures you control") or leave an Aura without a host.
  for (let round = 0; round < 50; round++) {
    const before = events.length;
    stateBasedActionsOnce(state, events);
    if (events.length === before) return;
  }
}

function stateBasedActionsOnce(state: GameState, events: GameEvent[]): void {
  for (const p of Object.values(state.players)) {
    // Zero toughness kills even an indestructible creature; lethal damage or deathtouch doesn't.
    const dead = p.battlefield.filter(
      (perm) =>
        isCreature(state, perm) &&
        (toughnessOf(state, perm) <= 0 ||
          (!kw(state, perm, "indestructible") && (perm.damage >= toughnessOf(state, perm) || perm.deathtouched === true))),
    );
    for (const perm of dead) {
      // Lethal damage or deathtouch can be regenerated away; zero toughness cannot.
      if (toughnessOf(state, perm) > 0 && regenerateInstead(state, perm)) continue;
      putIntoGraveyard(state, perm, p.id, events);
    }
  }
  // Rule 704.5q: a +1/+1 counter and a -1/-1 counter on the same permanent are removed as a pair.
  for (const p of Object.values(state.players)) {
    for (const perm of p.battlefield) {
      const pairs = Math.min(perm.counters ?? 0, perm.minusCounters ?? 0);
      if (pairs > 0) {
        perm.counters = (perm.counters ?? 0) - pairs;
        perm.minusCounters = (perm.minusCounters ?? 0) - pairs;
      }
    }
  }
  // Rule 704.5i: a planeswalker with no loyalty is put into its owner's graveyard.
  for (const p of Object.values(state.players)) {
    for (const walker of p.battlefield.filter((perm) => isPlaneswalker(state, perm) && (perm.loyalty ?? 0) <= 0)) putIntoGraveyard(state, walker, p.id, events);
  }
  // Rule 704.5m: an Aura attached to something that is no longer on the battlefield goes to its owner's graveyard.
  for (const p of Object.values(state.players)) {
    const hostGone = (perm: Permanent) => {
      if (perm.attachedTo === undefined) return false;
      const host = findPermanentOrNull(state, perm.attachedTo);
      // A host with protection from the Aura's (or Equipment's) quality can't keep it.
      return !host || isProtectedFrom(state, host.perm, qualityOfDef(getCard(state, perm.card.defId)));
    };
    for (const aura of p.battlefield.filter(hostGone)) {
      // Equipment stays on the battlefield, unattached. An Aura without something to enchant goes to the graveyard.
      if ((getCard(state, aura.card.defId).typeLine ?? "").includes("Equipment")) delete aura.attachedTo;
      else putIntoGraveyard(state, aura, p.id, events);
    }
  }
  const losers = Object.values(state.players).filter((p) => p.life <= 0 || p.drewFromEmpty);
  if (losers.length === 2 && !state.winner) {
    // Rule 104.4a: if both players lose at the same time, the game is a draw.
    state.winner = "draw";
    events.push({ type: "gameDrawn" });
  } else if (losers.length === 1 && !state.winner) {
    state.winner = OPPONENT[losers[0].id];
    events.push({ type: "gameWon", player: state.winner });
  }
}
