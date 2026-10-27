import { getCard } from "../cards.js";
import type { GameEvent } from "../actions.js";
import { parseCard } from "../oracle.js";
import { OPPONENT } from "../types.js";
import type { GameState, Permanent } from "../types.js";
import { findPermanentOrNull, isCreature, isPlaneswalker, isProtectedFrom, kw, nameOf, qualityOfDef, toughnessOf } from "./permanents.js";
import { putIntoGraveyard, regenerateInstead } from "./zones.js";

// State-based actions (rule 704).

/**
 * "Enchanted creature loses all abilities and is a black Skeleton creature with base power and toughness 1/1": while such an Aura is
 * on it, the creature is a card with just that (`<card>@becomes-skeleton`), and its own card again once the Aura is gone.
 */
function applyHostBecomes(state: GameState): void {
  const auras = Object.values(state.players).flatMap((p) => p.battlefield).filter((a) => a.attachedTo && parseCard(getCard(state, a.card.defId)).hostBecomes);
  for (const p of Object.values(state.players)) {
    for (const perm of p.battlefield) {
      const aura = auras.find((a) => a.attachedTo === perm.card.iid);
      const becomes = aura ? parseCard(getCard(state, aura.card.defId)).hostBecomes : undefined;
      const changed = perm.card.defId.includes("@becomes-");
      if (becomes && !changed && isCreature(state, perm)) {
        const printed = getCard(state, perm.card.defId);
        const id = `${perm.card.defId}@becomes-${becomes.subtype}`;
        const subtype = becomes.subtype.charAt(0).toUpperCase() + becomes.subtype.slice(1);
        state.cards[id] ??= { ...printed, id, type: "creature", power: becomes.power, toughness: becomes.toughness, typeLine: `Creature — ${subtype}`, text: "", colors: [becomes.color], keywords: [] };
        perm.card = { ...perm.card, defId: id, printed: perm.card.printed ?? perm.card.defId };
      } else if (!becomes && changed) {
        const defId = perm.card.defId.split("@becomes-")[0];
        perm.card = defId === perm.card.printed ? { iid: perm.card.iid, defId, owner: perm.card.owner } : { ...perm.card, defId };
      }
    }
  }
}

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
  applyHostBecomes(state);
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
      // Say why: the rules kill a creature by themselves, which looks like a bug when you don't know them.
      const tough = toughnessOf(state, perm);
      const why = tough <= 0 ? "its toughness is 0 or less" : perm.damage >= tough ? `it has ${perm.damage} damage, as much as its toughness (${tough})` : "it was damaged by a creature with deathtouch";
      events.push({ type: "effect", text: `Why: ${nameOf(state, perm)} is destroyed because ${why}.` });
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
    for (const walker of p.battlefield.filter((perm) => isPlaneswalker(state, perm) && (perm.loyalty ?? 0) <= 0)) {
      events.push({ type: "effect", text: `Why: ${nameOf(state, walker)} goes to the graveyard because it has no loyalty left.` });
      putIntoGraveyard(state, walker, p.id, events);
    }
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
      else {
        events.push({ type: "effect", text: `Why: ${nameOf(state, aura)} goes to the graveyard because what it was attached to is gone (or can no longer have it).` });
        putIntoGraveyard(state, aura, p.id, events);
      }
    }
  }
  // Rule 704.5s: a Saga with as many lore counters as its last chapter is sacrificed once that chapter's ability has left the stack.
  for (const p of Object.values(state.players)) {
    for (const perm of p.battlefield) {
      const saga = parseCard(getCard(state, perm.card.defId)).saga;
      if (!saga || (perm.lore ?? 0) < saga.final) continue;
      const waiting = state.stack.some((i) => i.kind === "ability" && i.source === perm.card.iid) || state.triggerQueue.some((q) => q.item.source === perm.card.iid) || state.pendingChoice?.item.source === perm.card.iid;
      if (!waiting) {
        events.push({ type: "effect", text: `Why: ${nameOf(state, perm)} is sacrificed because its last chapter has been used.` });
        putIntoGraveyard(state, perm, p.id, events);
      }
    }
  }
  // Rule 704.5j (the legend rule): of two legendary permanents with the same name that a player controls, they choose one to keep and the rest go to the graveyard.
  for (const p of Object.values(state.players)) {
    if (state.pendingPick) break;
    const byName = new Map<string, Permanent[]>();
    for (const perm of p.battlefield) {
      const def = getCard(state, perm.card.defId);
      if (/\bLegendary\b/.test((def.typeLine ?? "").split("—")[0])) byName.set(def.name, [...(byName.get(def.name) ?? []), perm]);
    }
    const twin = [...byName].find(([, perms]) => perms.length > 1);
    if (!twin) continue;
    const [name, perms] = twin;
    events.push({ type: "effect", text: `Legend rule: ${p.id === "p1" ? "Player 1" : "Player 2"} controls more than one ${name}. Why: a legendary permanent can only be controlled once by the same player, so one has to go.` });
    state.pendingPick = {
      player: p.id,
      prompt: `Legend rule: you control more than one ${name}. Choose the one to keep: the other goes to the graveyard`,
      kind: "legend",
      options: perms.map((x) => x.card.iid),
      optional: false,
      owner: p.id,
      remaining: 1,
      ordered: [],
      source: { iid: perms[0].card.iid, name, defId: perms[0].card.defId },
    };
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
