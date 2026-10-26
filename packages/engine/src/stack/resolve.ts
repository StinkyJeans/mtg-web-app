import type { GameEvent } from "../actions.js";
import { getCard } from "../cards.js";
import {
  askAsEnters,
  bindSpecs,
  checkStateBasedActions,
  creatureEntered,
  entersTappedNow,
  findPermanentOrNull,
  isLegalTarget,
  isPermanentCard,
  legalTargets,
  putCounters,
  queueTriggers,
  runEffects,
  spellLeavesStack,
} from "../core.js";
import type { TargetChoice } from "../effects.js";
import { parseCard } from "../oracle.js";
import { OPPONENT } from "../types.js";
import type { CardInstance, GameState, PlayerId } from "../types.js";
import { checkTargets, openRound, rememberMode } from "./shared.js";
import { hasResponse } from "./options.js";

// Resolving the top of the stack, and the rounds of priority around it.

function enterBattlefield(state: GameState, card: CardInstance, controller: PlayerId, events: GameEvent[], attachedTo?: string, x = 0, kicked = false, haste = false, warped = false): void {
  const parsed = parseCard(getCard(state, card.defId));
  const printed = getCard(state, card.defId);
  const loyalty = printed.type === "planeswalker" ? (printed.loyalty ?? printed.toughness ?? 0) : undefined;
  const entering = parsed.entersWithCounters;
  const counters = (entering === "X" ? x : (entering ?? 0)) + (kicked ? (parsed.kickedCounters ?? 0) : 0);
  const minus = parsed.entersWithMinus ?? 0;
  const remembered = {
    ...(parsed.statics?.some((st) => st.cond?.enteredThisTurn) || parsed.activated.some((a) => a.powerUp) ? { enteredTurn: state.turn } : {}),
    ...(x > 0 && parsed.triggers.some((t) => t.xTargets) ? { xPaid: x } : {}),
    ...(parsed.entersPrepared && parsed.prepare ? { prepared: parsed.prepare.id } : {}),
  };
  if (remembered.prepared) state.cards[remembered.prepared] ??= parsed.prepare!; // the copy of its spell, waiting to be cast
  state.players[controller].battlefield.push({ ...(attachedTo ? { attachedTo } : {}), ...(loyalty !== undefined ? { loyalty } : {}), ...(minus > 0 ? { minusCounters: minus } : {}), ...(kicked ? { kicked } : {}), ...(haste ? { tempKeywords: ["haste" as const] } : {}), ...(warped ? { warped } : {}), ...remembered, card, tapped: entersTappedNow(state, controller, getCard(state, card.defId)), summoningSick: getCard(state, card.defId).type === "creature" || parsed.crew !== undefined, damage: 0 });
  events.push({ type: "permanentEntered", player: controller, iid: card.iid });
  const entered = state.players[controller].battlefield[state.players[controller].battlefield.length - 1];
  if (counters > 0) putCounters(state, entered, controller, counters);
  askAsEnters(state, entered, controller);
  queueTriggers(state, card, controller, "enters");
  creatureEntered(state, card, controller); // (for other permanents only triggers about their type apply, e.g. "a Cartouche you control enters")
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
        enterBattlefield(state, item.card, item.controller, events, undefined, item.x, item.kicked === true, item.haste === true, item.warped === true);
      }
    } else {
      // If every target became illegal the spell is removed without doing anything (rule 608.2b).
      const allIllegal = item.specs.length > 0 && item.targets.every((t, i) => !isLegalTarget(state, item.specs[i], t, item.controller, item.id));
      if (allIllegal) events.push({ type: "effect", text: `${def.name} fizzles: its target is gone.` });
      else runEffects(state, item.effects, { controller: item.controller, sourceId: item.card.iid, sourceName: def.name, sourceDefId: item.card.defId, targets: item.targets, specs: item.specs, stackId: item.id, x: item.x, kicked: item.kicked }, events);
      spellLeavesStack(state, item); // flashback: exiled afterwards; a copy ceases to exist
    }
  } else {
    const allIllegal = item.specs.length > 0 && item.targets.every((t, i) => !isLegalTarget(state, item.specs[i], t, item.controller));
    if (!allIllegal) {
      runEffects(state, item.effects, { controller: item.controller, sourceId: item.source, sourceName: item.sourceName, sourceDefId: findPermanentOrNull(state, item.source)?.perm.card.defId, targets: item.targets, specs: item.specs, stackId: item.id, ...(item.other ? { other: item.other } : {}), ...(item.x !== undefined ? { x: item.x } : {}), ...(item.died ? { died: item.died } : {}) }, events);
    }
  }
  checkStateBasedActions(state, events);
  // An attacker that left the battlefield is no longer attacking (a blocked creature stays "blocked" even if its blocker is gone).
  if (state.combat) state.combat.attackers = state.combat.attackers.filter((a) => findPermanentOrNull(state, a.attacker) !== null);
}

/** Moves queued triggers onto the stack. One that needs a target waits for its controller to choose it. */
function flushTriggers(state: GameState): void {
  while (state.triggerQueue.length > 0 && !state.pendingChoice && !state.pendingPick && !state.winner) {
    const { item, specs, modes, unchosen } = state.triggerQueue.shift()!;
    if (modes) {
      // "When this enters, choose one —": only modes that have what they need to target can be chosen ("that hasn't been chosen": and haven't been before).
      const used = unchosen ? (findPermanentOrNull(state, item.source)?.perm.chosenModes ?? []) : [];
      const available = modes.map((m, i) => (!used.includes(i) && m.targets.every((spec) => legalTargets(state, bindSpecs([spec], item.source)[0], item.controller).length > 0) ? i : -1)).filter((i) => i >= 0);
      if (available.length === 0) continue; // nothing to do
      const choose = (m: number) => {
        if (unchosen) rememberMode(state, item.source, m);
        const targets = bindSpecs(modes[m].targets, item.source);
        state.triggerQueue.unshift({ specs: targets, item: { ...item, effects: modes[m].effects, specs: targets, text: `${item.text}: ${modes[m].text}` } });
      };
      if (available.length === 1) {
        choose(available[0]);
        continue;
      }
      const sourceDefId = findPermanentOrNull(state, item.source)?.perm.card.defId;
      state.pendingPick = { player: item.controller, prompt: `${item.sourceName}: choose one${unchosen ? " that hasn't been chosen" : ""}`, kind: "mode", options: available.map(String), optional: false, owner: item.controller, remaining: 1, ordered: [], modes, modeItem: item, source: { iid: item.source, name: item.sourceName, defId: sourceDefId }, ...(unchosen ? { modeUnchosen: true } : {}) };
      return;
    }
    if (specs.length === 0) {
      state.stack.push(item);
      continue;
    }
    const options = specs.map((spec) => legalTargets(state, spec, item.controller));
    if (options.some((o) => o.length === 0)) continue; // no legal target: the trigger is removed
    // "X target creatures" needs X different ones: with fewer, the trigger can't be put on the stack.
    const distinct = specs.filter((spec) => spec.distinct).length;
    if (distinct > 1 && new Set(options.flatMap((o, i) => (specs[i].distinct ? o.map((c) => JSON.stringify(c)) : []))).size < distinct) continue;
    if (options.every((o) => o.length === 1) && distinct < 2) {
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


/** After something resolved: the round goes on while the stack isn't empty, and the active player gets priority first. */
export function afterResolution(state: GameState): void {
  const round = state.priority;
  if (!round) return;
  if (state.stack.length === 0 && !round.then) {
    state.priority = null; // everything is resolved: back to normal play
    return;
  }
  round.holder = state.active;
  round.passes = 0;
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
