import { checkStateBasedActions, drawCards, forbidden, handLimit, newId, queueChapters, queueTriggers } from "../core.js";
import { getCard } from "../cards.js";
import { parseCard } from "../oracle.js";
import { OPPONENT } from "../types.js";
import type { GameState, PlayerState } from "../types.js";
import type { GameEvent } from "../actions.js";

// Moving through the turn: the next phase, the end of the turn and the start of the next one.

/** Untap, upkeep and draw are automatic, so a player only stops in main1, attackers, blockers, damage, main2, end or cleanup. */
export function advancePhase(state: GameState, events: GameEvent[]): void {
  switch (state.phase) {
    case "main1":
      state.phase = "attackers";
      // "At the beginning of combat on your turn"
      for (const perm of state.players[state.active].battlefield) queueTriggers(state, perm.card, state.active, "beginCombat");
      break;
    case "attackers":
      state.phase = "main2"; // reached only when nobody attacks
      break;
    case "main2":
      state.phase = "end";
      // "At the beginning of your end step" / "of each end step"
      for (const owner of Object.values(state.players)) {
        for (const perm of owner.battlefield) queueTriggers(state, perm.card, owner.id, owner.id === state.active ? "endStep" : "endStepEach");
      }
      for (const perm of state.players[state.active].battlefield) queueTriggers(state, perm.card, state.active, "endStepEach");
      queueWarpExiles(state);
      break;
    case "end":
      // Cleanup step (rule 514.1): discard down to the maximum hand size.
      if (state.players[state.active].hand.length > handLimit(state, state.active)) {
        state.phase = "cleanup";
        break;
      }
      startNextTurn(state, events);
      return;
    default:
      return;
  }
  events.push({ type: "phaseChanged", phase: state.phase });
}

/** Warp: "exile this creature at the beginning of the next end step". */
function queueWarpExiles(state: GameState): void {
  for (const owner of Object.values(state.players)) {
    for (const perm of owner.battlefield) {
      if (!perm.warped) continue;
      const name = state.cards[perm.card.defId].name;
      const text = "Warp: exile this at the beginning of the next end step. You may cast it from exile on a later turn.";
      state.triggerQueue.push({ specs: [], item: { kind: "ability", id: newId(state), controller: owner.id, source: perm.card.iid, sourceName: name, effects: [{ type: "warpExile" }], targets: [], specs: [], text } });
    }
  }
}

export function startNextTurn(state: GameState, events: GameEvent[]): void {
  state.preventCombat = undefined;
  state.noPrevention = undefined;
  state.noGroundBlock = undefined;
  state.extraCombats = undefined;
  // Rule 514.2: damage wears off for everyone at end of turn.
  for (const p of Object.values(state.players)) {
    p.drawnThisTurn = 0;
    p.costLessThisTurn = undefined;
    p.discardedThisTurn = undefined;
    p.freeNext = undefined;
    p.doubleDamage = undefined;
    p.lifeGainedThisTurn = 0;
    p.lifeLostThisTurn = 0;
    p.landsEnteredThisTurn = undefined;
    p.attackedThisTurn = undefined;
    p.spellsCastThisTurn = 0;
    p.yardCastable = undefined;
    p.battlefield.forEach((perm) => {
      perm.damage = 0;
      perm.unblockableTurn = undefined;
      perm.tempBase = undefined;
      perm.attackedThisTurn = undefined;
      perm.sacOnDamage = undefined;
      perm.tempNoDefender = undefined;
      perm.damagedBy = undefined;
      perm.deathtouched = false;
      perm.powerBonus = 0;
      perm.tempFrom = undefined;
      perm.toughnessBonus = 0;
      perm.tempKeywords = [];
      perm.regenShield = 0; // "until end of turn"
      perm.usedAbilities = [];
      perm.crewed = false; // a Vehicle stops being a creature at end of turn
      perm.crewedBy = undefined;
      perm.tempSubtypes = undefined;
      perm.untargetableBy = undefined;
      perm.loyaltyUsed = false;
      perm.cantBlockTurn = false;
      perm.noRegen = false;
      perm.exileOnDeath = undefined;
      perm.mustBeBlocked = undefined;
      perm.diesReturn = undefined;
      perm.damageDraws = undefined;
      perm.countersThisTurn = undefined;
      perm.powerFromHand = undefined;
      perm.tappedThisTurn = undefined;
    });
  }
  // "Gain control of target creature until end of turn": it goes back to its controller.
  for (const p of Object.values(state.players)) {
    for (const perm of [...p.battlefield]) {
      if (!perm.controlReturn) continue;
      const back = perm.controlReturn;
      delete perm.controlReturn;
      if (back === p.id) continue;
      p.battlefield.splice(p.battlefield.indexOf(perm), 1);
      state.players[back].battlefield.push(perm);
    }
  }
  // The "until end of turn" effects just ended: a creature that was only alive because of one (toughness 0 now) dies (rule 704.3).
  checkStateBasedActions(state, events);
  if (state.winner) return;

  state.active = OPPONENT[state.active];
  state.turn++;
  events.push({ type: "turnStarted", player: state.active, turn: state.turn });

  const p = state.players[state.active];
  untap(state, p);
  // Upkeep: "at the beginning of your upkeep" / "of each upkeep"
  for (const owner of Object.values(state.players)) {
    for (const perm of owner.battlefield) queueTriggers(state, perm.card, owner.id, owner.id === state.active ? "upkeep" : "upkeepEach");
  }
  for (const perm of p.battlefield) queueTriggers(state, perm.card, state.active, "upkeepEach");
  // "Draw a card at the beginning of the next turn's upkeep."
  for (const owner of Object.values(state.players)) {
    for (const d of owner.upkeepDraws ?? []) {
      state.triggerQueue.push({ specs: [], item: { kind: "ability", id: newId(state), controller: owner.id, source: d.source, sourceName: d.name, effects: [{ type: "draw", amount: 1, who: { t: "you" } }], targets: [], specs: [], text: "At the beginning of the next turn's upkeep, draw a card." } });
    }
    owner.upkeepDraws = undefined;
  }
  // "At the beginning of the upkeep of enchanted creature's controller, that player draws a card."
  for (const owner of Object.values(state.players)) {
    for (const perm of owner.battlefield) {
      if (!perm.attachedTo || !parseCard(getCard(state, perm.card.defId)).triggers.some((t) => t.event === "hostUpkeep")) continue;
      if (p.battlefield.some((host) => host.card.iid === perm.attachedTo)) queueTriggers(state, perm.card, state.active, "hostUpkeep");
    }
  }

  if (p.library.length === 0) {
    state.winner = OPPONENT[state.active];
    events.push({ type: "gameWon", player: state.winner });
    return;
  }
  drawCards(state, state.active, 1, events, true); // (the draw step's card counts as the first card drawn this turn)
  // Sagas: a lore counter after the draw step, then that chapter's ability.
  for (const perm of p.battlefield) {
    if (!parseCard(getCard(state, perm.card.defId)).saga) continue;
    perm.lore = (perm.lore ?? 0) + 1;
    queueChapters(state, perm, state.active);
  }

  state.phase = "main1";
  events.push({ type: "phaseChanged", phase: "main1" });
}

function untap(state: GameState, p: PlayerState): void {
  p.landsPlayedThisTurn = 0;
  p.spareMana = undefined;
  for (const perm of p.battlefield) {
    if (perm.stun && perm.tapped) perm.stun -= 1; // a stun counter: instead of untapping, remove one
    else if (!forbidden(state, perm, "noUntap")) perm.tapped = false; // "doesn't untap during its controller's untap step"
    perm.summoningSick = false;
  }
}
