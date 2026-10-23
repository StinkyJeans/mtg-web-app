import { getCard } from "./cards.js";
import { COLOR_NAMES, manaCostOf, payMana } from "./mana.js";
import { shuffle, STARTING_HAND } from "./state.js";
import { OPPONENT } from "./types.js";
import type { GameState, Permanent, PlayerId, PlayerState } from "./types.js";

export type Block = { attacker: string; blocker: string };
export type DamageAssignment = { attacker: string; blocker: string; amount: number };

export type Action =
  | { type: "mulligan" }
  | { type: "keepHand"; bottom: string[] }
  | { type: "playLand"; iid: string }
  | { type: "castCreature"; iid: string }
  | { type: "passPhase" }
  | { type: "declareAttackers"; attackers: string[] }
  | { type: "declareBlockers"; blocks: Block[] }
  | { type: "assignDamage"; assignments: DamageAssignment[] }
  | { type: "discard"; iids: string[] }
  | { type: "concede" };

export type GameEvent =
  | { type: "mulliganTaken"; player: PlayerId; count: number }
  | { type: "handKept"; player: PlayerId; bottomed: number }
  | { type: "landPlayed"; player: PlayerId; iid: string }
  | { type: "creatureCast"; player: PlayerId; iid: string; tapped: string[] }
  | { type: "phaseChanged"; phase: GameState["phase"] }
  | { type: "turnStarted"; player: PlayerId; turn: number }
  | { type: "cardDrawn"; player: PlayerId; iid: string }
  | { type: "attackersDeclared"; player: PlayerId; attackers: string[] }
  | { type: "blockersDeclared"; player: PlayerId; blocks: Block[] }
  | { type: "combatDamage"; source: string; target: string | PlayerId; amount: number }
  | { type: "creatureDied"; player: PlayerId; iid: string }
  | { type: "cardsDiscarded"; player: PlayerId; iids: string[] }
  | { type: "conceded"; player: PlayerId }
  | { type: "gameWon"; player: PlayerId };

export type Result =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string };

const MAIN_PHASES = ["main1", "main2"];
const MAX_LANDS_PER_TURN = 1;
/** Rule 402.2: normally seven. */
export const MAX_HAND_SIZE = 7;
export const MAX_MULLIGANS = 7;

const fail = (error: string): Result => ({ ok: false, error });

const isCreature = (s: GameState, p: Permanent) => getCard(s, p.card.defId).type === "creature";
const power = (s: GameState, p: Permanent) => getCard(s, p.card.defId).power ?? 0;
const toughness = (s: GameState, p: Permanent) => getCard(s, p.card.defId).toughness ?? 0;

/** The player who must act right now. */
export function playerToAct(state: GameState): PlayerId {
  if (state.phase === "mulligan" && state.opening) {
    // Starting player decides first (rule 103.5), then the other player.
    const order = [state.startingPlayer, OPPONENT[state.startingPlayer]];
    return order.find((p) => !state.opening!.kept[p]) ?? state.active;
  }
  return state.phase === "blockers" ? OPPONENT[state.active] : state.active;
}

/** Pure: never mutates the input state. Illegal actions return `{ ok: false }`. */
export function applyAction(state: GameState, player: PlayerId, action: Action): Result {
  if (state.winner) return fail("The game is over.");

  // Rule 104.3a: a player may concede at any time, even when it isn't their turn.
  if (action.type === "concede") {
    const next = structuredClone(state);
    next.winner = OPPONENT[player];
    return {
      ok: true,
      state: next,
      events: [{ type: "conceded", player }, { type: "gameWon", player: next.winner }],
    };
  }

  if (player !== playerToAct(state)) return fail("It is not your turn.");

  const next = structuredClone(state);
  const events: GameEvent[] = [];
  const me = next.players[player];

  switch (action.type) {
    case "mulligan": {
      if (next.phase !== "mulligan" || !next.opening) return fail("Mulligans are only taken before the game starts.");
      if (next.opening.taken[player] >= MAX_MULLIGANS) return fail("You can't mulligan any more.");
      // Rule 103.5: shuffle your hand back, draw a new seven; you bottom cards when you keep.
      const [shuffled, rng] = shuffle([...me.hand, ...me.library], next.rng);
      next.rng = rng;
      me.hand = shuffled.slice(0, STARTING_HAND);
      me.library = shuffled.slice(STARTING_HAND);
      next.opening.taken[player]++;
      events.push({ type: "mulliganTaken", player, count: next.opening.taken[player] });
      break;
    }

    case "keepHand": {
      if (next.phase !== "mulligan" || !next.opening) return fail("You can only keep your hand before the game starts.");
      const taken = next.opening.taken[player];
      const unique = new Set(action.bottom);
      if (action.bottom.length !== taken || unique.size !== taken) {
        return fail(`Choose ${taken} card${taken === 1 ? "" : "s"} to put on the bottom of your library.`);
      }
      for (const iid of action.bottom) {
        const idx = me.hand.findIndex((c) => c.iid === iid);
        if (idx < 0) return fail("That card is not in your hand.");
        me.library.push(...me.hand.splice(idx, 1));
      }
      next.opening.kept[player] = true;
      events.push({ type: "handKept", player, bottomed: taken });
      if (next.opening.kept.p1 && next.opening.kept.p2) {
        next.opening = null;
        next.phase = "main1"; // the starting player skips their first draw (rule 103.8a)
        next.active = next.startingPlayer;
        events.push({ type: "turnStarted", player: next.active, turn: 1 });
        events.push({ type: "phaseChanged", phase: "main1" });
      }
      break;
    }

    case "playLand": {
      if (!MAIN_PHASES.includes(next.phase)) return fail("Lands can only be played in a main phase.");
      if (me.landsPlayedThisTurn >= MAX_LANDS_PER_TURN) return fail("You already played a land this turn.");
      const idx = me.hand.findIndex((c) => c.iid === action.iid);
      if (idx < 0) return fail("That card is not in your hand.");
      if (getCard(next, me.hand[idx].defId).type !== "land") return fail("That card is not a land.");
      const [card] = me.hand.splice(idx, 1);
      me.battlefield.push({ card, tapped: false, summoningSick: false, damage: 0 });
      me.landsPlayedThisTurn++;
      events.push({ type: "landPlayed", player, iid: card.iid });
      break;
    }

    case "castCreature": {
      if (!MAIN_PHASES.includes(next.phase)) return fail("Creatures can only be cast in a main phase.");
      const idx = me.hand.findIndex((c) => c.iid === action.iid);
      if (idx < 0) return fail("That card is not in your hand.");
      const def = getCard(next, me.hand[idx].defId);
      if (def.type !== "creature") return fail("That card is not a creature.");
      const cost = manaCostOf(def);
      if (!cost) return fail(`${def.name} can't be played yet.`);
      const paid = payMana(next, player, cost);
      if (!paid.ok) {
        const price = def.manaCost ?? String(def.cost);
        return fail(
          paid.missing === "generic"
            ? `Not enough mana: ${def.name} costs ${price}.`
            : `Not enough ${COLOR_NAMES[paid.missing]} mana: ${def.name} costs ${price}.`,
        );
      }
      const tapped = me.battlefield.filter((p) => paid.tap.includes(p.card.iid));
      tapped.forEach((p) => (p.tapped = true));
      const [card] = me.hand.splice(idx, 1);
      me.battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
      events.push({ type: "creatureCast", player, iid: card.iid, tapped: tapped.map((p) => p.card.iid) });
      break;
    }

    case "passPhase": {
      // Passing the attackers step means "no attack". The other special steps need a real choice.
      if (next.phase === "mulligan") return fail("Keep your hand or take a mulligan first.");
      if (next.phase === "blockers") return fail("Declare your blockers (an empty list blocks nothing).");
      if (next.phase === "damage") return fail("Assign combat damage first.");
      if (next.phase === "cleanup") return fail(`Discard down to ${MAX_HAND_SIZE} cards first.`);
      advancePhase(next, events);
      break;
    }

    case "declareAttackers": {
      if (next.phase !== "attackers") return fail("Attackers are declared in the attackers step.");
      const ids = new Set(action.attackers);
      if (ids.size !== action.attackers.length) return fail("A creature can only attack once.");
      const chosen: Permanent[] = [];
      for (const iid of ids) {
        const perm = me.battlefield.find((p) => p.card.iid === iid);
        if (!perm || !isCreature(next, perm)) return fail("Only your creatures can attack.");
        if (perm.tapped) return fail("A tapped creature can't attack.");
        if (perm.summoningSick) return fail("A creature that just arrived can't attack.");
        chosen.push(perm);
      }
      if (chosen.length === 0) {
        advancePhase(next, events); // no attack: straight to main2
        break;
      }
      chosen.forEach((p) => (p.tapped = true));
      next.combat = { attackers: chosen.map((p) => ({ attacker: p.card.iid, blockers: [] })) };
      next.phase = "blockers";
      events.push({ type: "attackersDeclared", player, attackers: [...ids] });
      events.push({ type: "phaseChanged", phase: "blockers" });
      break;
    }

    case "declareBlockers": {
      if (next.phase !== "blockers" || !next.combat) return fail("Blockers are declared in the blockers step.");
      // Rule 509.1a: each creature blocks at most one attacker, but several may block the same one.
      const usedBlockers = new Set<string>();
      for (const { attacker, blocker } of action.blocks) {
        if (!next.combat.attackers.some((a) => a.attacker === attacker)) return fail("That creature isn't attacking.");
        if (usedBlockers.has(blocker)) return fail("A creature can only block one attacker.");
        const perm = me.battlefield.find((p) => p.card.iid === blocker);
        if (!perm || !isCreature(next, perm)) return fail("Only your creatures can block.");
        if (perm.tapped) return fail("A tapped creature can't block.");
        usedBlockers.add(blocker);
      }
      for (const { attacker, blocker } of action.blocks) {
        next.combat.attackers.find((a) => a.attacker === attacker)!.blockers.push(blocker);
      }
      events.push({ type: "blockersDeclared", player, blocks: action.blocks });

      if (getDamageAssignments(next).length > 0) {
        next.phase = "damage"; // the attacker's controller must divide damage (rule 510.1c)
        events.push({ type: "phaseChanged", phase: "damage" });
      } else {
        resolveCombat(next, events, {});
      }
      break;
    }

    case "assignDamage": {
      if (next.phase !== "damage" || !next.combat) return fail("There is no combat damage to assign right now.");
      const needed = getDamageAssignments(next);
      const assigned: Record<string, Record<string, number>> = {};
      for (const { attacker, blocker, amount } of action.assignments) {
        const entry = needed.find((n) => n.attacker === attacker);
        if (!entry || !entry.blockers.includes(blocker)) return fail("That damage can't be assigned there.");
        if (!Number.isInteger(amount) || amount < 0) return fail("Damage must be a whole number.");
        assigned[attacker] ??= {};
        assigned[attacker][blocker] = (assigned[attacker][blocker] ?? 0) + amount;
      }
      for (const { attacker, power: total } of needed) {
        const sum = Object.values(assigned[attacker] ?? {}).reduce((a, b) => a + b, 0);
        if (sum !== total) {
          return fail(`${getCard(next, findPermanent(next, attacker).perm.card.defId).name} must assign exactly ${total} damage.`);
        }
      }
      resolveCombat(next, events, assigned);
      break;
    }

    case "discard": {
      if (next.phase !== "cleanup") return fail("You only discard down to hand size at the end of your turn.");
      const excess = me.hand.length - MAX_HAND_SIZE;
      const unique = new Set(action.iids);
      if (action.iids.length !== excess || unique.size !== excess) {
        return fail(`Discard exactly ${excess} card${excess === 1 ? "" : "s"}.`);
      }
      for (const iid of action.iids) {
        const idx = me.hand.findIndex((c) => c.iid === iid);
        if (idx < 0) return fail("That card is not in your hand.");
        me.graveyard.push(...me.hand.splice(idx, 1));
      }
      events.push({ type: "cardsDiscarded", player, iids: action.iids });
      startNextTurn(next, events);
      break;
    }
  }

  return { ok: true, state: next, events };
}

function findPermanent(state: GameState, iid: string): { owner: PlayerState; perm: Permanent } {
  for (const owner of Object.values(state.players)) {
    const perm = owner.battlefield.find((p) => p.card.iid === iid);
    if (perm) return { owner, perm };
  }
  throw new Error(`No permanent ${iid} on the battlefield`);
}

/** Attackers blocked by two or more creatures: their controller divides the damage (rule 510.1c). */
export function getDamageAssignments(state: GameState): { attacker: string; blockers: string[]; power: number }[] {
  if (!state.combat) return [];
  return state.combat.attackers
    .filter((a) => a.blockers.length >= 2)
    .map((a) => ({ attacker: a.attacker, blockers: a.blockers, power: power(state, findPermanent(state, a.attacker).perm) }))
    .filter((a) => a.power > 0);
}

/**
 * A sensible default split for the UI: lethal damage to each blocker in turn, leftover on the last.
 * Always totals the attacker's full power.
 */
export function suggestDamageAssignment(state: GameState, attacker: string): Record<string, number> {
  const entry = getDamageAssignments(state).find((a) => a.attacker === attacker);
  if (!entry) return {};
  let left = entry.power;
  const out: Record<string, number> = {};
  entry.blockers.forEach((id, i) => {
    const blocker = findPermanent(state, id).perm;
    const lethal = Math.max(0, toughness(state, blocker) - blocker.damage);
    const give = i === entry.blockers.length - 1 ? left : Math.min(left, lethal);
    out[id] = give;
    left -= give;
  });
  return out;
}

/** All combat damage is dealt at once, then state-based actions run. */
function resolveCombat(state: GameState, events: GameEvent[], assigned: Record<string, Record<string, number>>): void {
  const defender = state.players[OPPONENT[state.active]];

  // Collect every hit first so damage really is simultaneous.
  const hits: { source: Permanent; target: Permanent | PlayerState; amount: number }[] = [];
  for (const { attacker, blockers } of state.combat!.attackers) {
    const a = findPermanent(state, attacker).perm;
    if (blockers.length === 0) {
      hits.push({ source: a, target: defender, amount: power(state, a) });
      continue;
    }
    for (const id of blockers) {
      const b = findPermanent(state, id).perm;
      const toBlocker = blockers.length === 1 ? power(state, a) : (assigned[attacker]?.[id] ?? 0);
      hits.push({ source: a, target: b, amount: toBlocker });
      hits.push({ source: b, target: a, amount: power(state, b) }); // every blocker hits the attacker back
    }
  }

  for (const { source, target, amount } of hits) {
    if (amount <= 0) continue; // rule 510.1a: 0 or less damage isn't dealt
    if ("battlefield" in target) target.life -= amount;
    else target.damage += amount;
    events.push({
      type: "combatDamage",
      source: source.card.iid,
      target: "battlefield" in target ? target.id : target.card.iid,
      amount,
    });
  }

  state.combat = null;
  checkStateBasedActions(state, events);
  if (state.winner) return;
  state.phase = "main2";
  events.push({ type: "phaseChanged", phase: "main2" });
}

/** Rule 704.5: 0 life loses; creatures with lethal damage (or 0 toughness) die. */
function checkStateBasedActions(state: GameState, events: GameEvent[]): void {
  for (const p of Object.values(state.players)) {
    const dead = p.battlefield.filter((perm) => isCreature(state, perm) && perm.damage >= toughness(state, perm));
    for (const perm of dead) {
      p.battlefield.splice(p.battlefield.indexOf(perm), 1);
      p.graveyard.push(perm.card);
      events.push({ type: "creatureDied", player: p.id, iid: perm.card.iid });
    }
  }
  const losers = Object.values(state.players).filter((p) => p.life <= 0);
  if (losers.length === 1 && !state.winner) {
    state.winner = OPPONENT[losers[0].id];
    events.push({ type: "gameWon", player: state.winner });
  }
}

/** Untap, upkeep and draw are automatic, so a player only stops in main1, attackers, blockers, damage, main2, end or cleanup. */
function advancePhase(state: GameState, events: GameEvent[]): void {
  switch (state.phase) {
    case "main1":
      state.phase = "attackers";
      break;
    case "attackers":
      state.phase = "main2"; // reached only when nobody attacks
      break;
    case "main2":
      state.phase = "end";
      break;
    case "end":
      // Cleanup step (rule 514.1): discard down to the maximum hand size.
      if (state.players[state.active].hand.length > MAX_HAND_SIZE) {
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

function startNextTurn(state: GameState, events: GameEvent[]): void {
  // Rule 514.2: damage wears off for everyone at end of turn.
  for (const p of Object.values(state.players)) p.battlefield.forEach((perm) => (perm.damage = 0));

  state.active = OPPONENT[state.active];
  state.turn++;
  events.push({ type: "turnStarted", player: state.active, turn: state.turn });

  const p = state.players[state.active];
  untap(p);

  const drawn = p.library.shift();
  if (!drawn) {
    state.winner = OPPONENT[state.active];
    events.push({ type: "gameWon", player: state.winner });
    return;
  }
  p.hand.push(drawn);
  events.push({ type: "cardDrawn", player: state.active, iid: drawn.iid });

  state.phase = "main1";
  events.push({ type: "phaseChanged", phase: "main1" });
}

function untap(p: PlayerState): void {
  p.landsPlayedThisTurn = 0;
  for (const perm of p.battlefield) {
    perm.tapped = false;
    perm.summoningSick = false;
  }
}

/** iids of creatures the active player could attack with right now. */
export function getPossibleAttackers(state: GameState): string[] {
  if (state.winner || state.phase !== "attackers") return [];
  return state.players[state.active].battlefield
    .filter((p) => isCreature(state, p) && !p.tapped && !p.summoningSick)
    .map((p) => p.card.iid);
}

/** iids of creatures the defending player could block with right now. */
export function getPossibleBlockers(state: GameState): string[] {
  if (state.winner || state.phase !== "blockers") return [];
  return state.players[OPPONENT[state.active]].battlefield
    .filter((p) => isCreature(state, p) && !p.tapped)
    .map((p) => p.card.iid);
}

/**
 * Simple actions the UI can offer the given player right now. Attacks, blocks, damage splits,
 * discards and bottoming cards are free-form choices, so the UI builds those itself.
 */
export function getLegalActions(state: GameState, player: PlayerId): Action[] {
  if (state.winner || player !== playerToAct(state)) return [];
  if (state.phase === "mulligan") {
    const taken = state.opening?.taken[player] ?? 0;
    return [
      ...(taken < MAX_MULLIGANS ? [{ type: "mulligan" } as Action] : []),
      ...(taken === 0 ? [{ type: "keepHand", bottom: [] } as Action] : []),
    ];
  }
  if (state.phase === "blockers") return [{ type: "declareBlockers", blocks: [] }];
  if (state.phase === "damage" || state.phase === "cleanup") return [];
  const actions: Action[] = [{ type: "passPhase" }];
  if (state.phase === "attackers") {
    const attackers = getPossibleAttackers(state);
    if (attackers.length) actions.push({ type: "declareAttackers", attackers });
  }
  if (!MAIN_PHASES.includes(state.phase)) return actions;
  for (const card of state.players[player].hand) {
    const land = getCard(state, card.defId).type === "land";
    const action: Action = { type: land ? "playLand" : "castCreature", iid: card.iid };
    if (applyAction(state, player, action).ok) actions.push(action);
  }
  return actions;
}
