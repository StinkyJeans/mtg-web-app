import { getCard } from "./cards.js";
import {
  checkStateBasedActions,
  findPermanent,
  findPermanentOrNull,
  forbidden,
  staticEffectsOn,
  isCreature,
  askColor,
  drawCards,
  putIntoGraveyard,
  entersTappedNow,
  exilePlayable,
  isProtectedFrom,
  onLifeGained,
  landEntered,
  qualityOfDef,
  kw,
  lethalFor,
  nameOf,
  onBoard,
  playerToAct,
  powerOf,
  queueTriggers,
  toughnessOf,
} from "./core.js";
import type { TargetChoice } from "./effects.js";
import { parseCard } from "./oracle.js";
import { shuffle, STARTING_HAND } from "./state.js";
import { activateAbility, activateLoyalty, castSpell, chooseTargets, crewVehicle, cycleCard, getCastable, openWindow, passPriority, pickCard, settle } from "./stack.js";
import { OPPONENT } from "./types.js";
import type { GameState, Permanent, PlayerId, PlayerState } from "./types.js";

export { playerToAct };

export type Block = { attacker: string; blocker: string };
/** `blocker` is a blocking creature, or the defending player's id when a trampler assigns excess damage to them. */
export type DamageAssignment = { attacker: string; blocker: string; amount: number };

export type Action =
  | { type: "mulligan" }
  | { type: "keepHand"; bottom: string[] }
  | { type: "playLand"; iid: string }
  | { type: "castCreature"; iid: string }
  | { type: "castSpell"; iid: string; targets?: TargetChoice[]; x?: number; kicked?: boolean; from?: "graveyard" | "exile"; modes?: number[]; sacrifice?: string }
  | { type: "activateAbility"; iid: string; index: number; targets?: TargetChoice[]; payWith?: string }
  | { type: "crew"; iid: string } // crew a Vehicle: then choose the creatures to tap
  | { type: "cycle"; iid: string } // cycle a card from hand (pay its cycling cost, discard it, draw a card)
  | { type: "passPriority" }
  | { type: "chooseTargets"; targets: TargetChoice[] }
  | { type: "pick"; iid?: string } // answer a choice among cards (iid missing = decline)
  | { type: "passPhase" }
  | { type: "declareAttackers"; attackers: string[]; targets?: Record<string, string> } // `targets`: attacker iid -> planeswalker iid (default: the player)
  | { type: "loyalty"; iid: string; index: number; targets?: TargetChoice[] }
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
  | { type: "lifeGained"; player: PlayerId; amount: number }
  | { type: "lifeLost"; player: PlayerId; amount: number }
  | { type: "spellCast"; player: PlayerId; iid: string; tapped: string[]; targets: TargetChoice[] }
  | { type: "abilityActivated"; player: PlayerId; iid: string; name: string; text: string }
  | { type: "permanentEntered"; player: PlayerId; iid: string }
  | { type: "damage"; source: string; target: string | PlayerId; amount: number }
  | { type: "effect"; text: string }
  | { type: "countered"; name: string }
  | { type: "creatureDied"; player: PlayerId; iid: string }
  | { type: "cardsDiscarded"; player: PlayerId; iids: string[] }
  | { type: "conceded"; player: PlayerId }
  | { type: "gameWon"; player: PlayerId }
  | { type: "gameDrawn" };

export type Result =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string };

const MAIN_PHASES = ["main1", "main2"];
export const MAX_LANDS_PER_TURN = 1;
/** Rule 402.2: normally seven. */
export const MAX_HAND_SIZE = 7;
export const MAX_MULLIGANS = 7;

const fail = (error: string): Result => ({ ok: false, error });

const power = (s: GameState, p: Permanent) => (p.damageByToughness ? Math.max(0, toughnessOf(s, p)) : powerOf(s, p)); // "assigns combat damage equal to its toughness"
/** "Attacks each combat if able": printed on the creature, or given by another permanent ("Other Goblins you control attack each combat if able"). */
const mustAttack = (state: GameState, perm: Permanent): boolean => parseCard(getCard(state, perm.card.defId)).mustAttack === true || staticEffectsOn(state, perm).some((st) => st.mustAttack === true);

/** True while a lure check is trying a single block, so that trial does not demand more blocks itself. */
let lureProbe = false;
const toughness = toughnessOf;

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
  if (state.pendingPick && action.type !== "pick") return fail("Make your choice first.");
  if (action.type === "pick" && !state.pendingPick) return fail("There is nothing to choose.");
  if (state.pendingChoice && action.type !== "chooseTargets") return fail("Choose a target for the ability first.");
  if (state.priority && !state.pendingChoice && !state.pendingPick && !["castSpell", "castCreature", "activateAbility", "passPriority", "cycle", "crew"].includes(action.type)) {
    return fail("Respond to what is on the stack, or pass priority.");
  }

  const next = structuredClone(state);
  const events: GameEvent[] = [];
  const me = next.players[player];
  /** Called when a round of priority ends and the game should carry on with combat damage. */
  const onContinue = (then: "afterBlockers" | "afterAttackers") => {
    if (then === "afterBlockers") continueAfterBlockers(next, events);
  };

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
      let idx = me.hand.findIndex((c) => c.iid === action.iid);
      let zone = me.hand;
      if (idx < 0 && exilePlayable(next, player).some((c) => c.iid === action.iid)) {
        zone = me.exile; // "you may play that card" from exile
        idx = me.exile.findIndex((c) => c.iid === action.iid);
        me.mayPlay = (me.mayPlay ?? []).filter((e) => e.iid !== action.iid);
      }
      if (idx < 0) return fail("That card is not in your hand.");
      if (getCard(next, zone[idx].defId).type !== "land") return fail("That card is not a land.");
      const [card] = zone.splice(idx, 1);
      me.battlefield.push({ card, tapped: entersTappedNow(next, player, getCard(next, card.defId)), summoningSick: false, damage: 0 });
      me.landsPlayedThisTurn++;
      events.push({ type: "landPlayed", player, iid: card.iid });
      queueTriggers(next, card, player, "enters"); // "When this land enters, you gain 1 life."
      landEntered(next, player); // landfall
      askColor(next, me.battlefield[me.battlefield.length - 1], player); // "As this enters, choose a color"
      break;
    }

    case "castCreature":
    case "castSpell": {
      const error = castSpell(next, player, action.iid, action.type === "castSpell" ? (action.targets ?? []) : [], events, action.type === "castSpell" ? action.x : 0, action.type === "castSpell" ? action.kicked === true : false, action.type === "castSpell" ? (action.from ?? "hand") : me.hand.some((c) => c.iid === action.iid) ? "hand" : "exile", action.type === "castSpell" ? action.modes : undefined, action.type === "castSpell" ? action.sacrifice : undefined);
      if (error) return fail(error);
      break;
    }

    case "activateAbility": {
      const error = activateAbility(next, player, action.iid, action.index, action.targets ?? [], events, action.payWith);
      if (error) return fail(error);
      break;
    }

    case "loyalty": {
      const error = activateLoyalty(next, player, action.iid, action.index, action.targets ?? [], events);
      if (error) return fail(error);
      break;
    }

    case "crew": {
      const error = crewVehicle(next, player, action.iid);
      if (error) return fail(error);
      break;
    }

    case "cycle": {
      const error = cycleCard(next, player, action.iid, events);
      if (error) return fail(error);
      break;
    }

    case "passPriority": {
      const error = passPriority(next, player, events, onContinue);
      if (error) return fail(error);
      break;
    }

    case "pick": {
      const error = pickCard(next, player, action.iid, events);
      if (error) return fail(error);
      break;
    }

    case "chooseTargets": {
      const error = chooseTargets(next, player, action.targets);
      if (error) return fail(error);
      break;
    }

    case "passPhase": {
      if (next.phase === "attackers") {
        const forced = getPossibleAttackers(next).filter((id) => mustAttack(next, findPermanent(next, id).perm));
        if (forced.length > 0) return fail(`${nameOf(next, findPermanent(next, forced[0]).perm)} attacks each combat if able.`);
      }
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
        if (kw(next, perm, "defender")) return fail(`${nameOf(next, perm)} has defender and can't attack.`);
        if (forbidden(next, perm, "cantAttack")) return fail(`${nameOf(next, perm)} can't attack.`);
        if (perm.tapped) return fail("A tapped creature can't attack.");
        if (perm.summoningSick && !kw(next, perm, "haste")) return fail("A creature that just arrived can't attack.");
        chosen.push(perm);
      }
      for (const perm of chosen) {
        if (parseCard(getCard(next, perm.card.defId)).attackIfMoreCreatures && me.battlefield.filter((p) => isCreature(next, p)).length <= next.players[OPPONENT[player]].battlefield.filter((p) => isCreature(next, p)).length) {
          return fail(`${nameOf(next, perm)} can't attack unless you control more creatures than the defending player.`);
        }
        const land = parseCard(getCard(next, perm.card.defId)).attackOnlyIfDefenderControls;
        if (land && !next.players[OPPONENT[player]].battlefield.some((p) => (getCard(next, p.card.defId).typeLine ?? "").includes(land))) {
          return fail(`${nameOf(next, perm)} can't attack unless the defending player controls an ${land}.`);
        }
        if (parseCard(getCard(next, perm.card.defId)).cantAttackAlone && chosen.length < 2) return fail(`${nameOf(next, perm)} can't attack alone.`);
      }
      // "Attacks each combat if able."
      const forced = getPossibleAttackers(next).filter((id) => !ids.has(id) && mustAttack(next, findPermanent(next, id).perm));
      if (forced.length > 0) return fail(`${nameOf(next, findPermanent(next, forced[0]).perm)} attacks each combat if able.`);
      if (chosen.length === 0) {
        advancePhase(next, events); // no attack: straight to main2
        break;
      }
      chosen.forEach((p) => {
        p.attackedThisTurn = true;
        if (!kw(next, p, "vigilance")) p.tapped = true; // vigilance: attacking doesn't tap it
      });
      for (const [attacker, walker] of Object.entries(action.targets ?? {})) {
        const found = findPermanentOrNull(next, walker);
        if (!ids.has(attacker) || !found || found.owner.id !== OPPONENT[player] || getCard(next, found.perm.card.defId).type !== "planeswalker") return fail("An attacker can only attack the opponent or one of their planeswalkers.");
      }
      next.combat = { attackers: chosen.map((p) => ({ attacker: p.card.iid, blockers: [], ...(action.targets?.[p.card.iid] ? { target: action.targets[p.card.iid] } : {}) })) };
      next.phase = "blockers";
      chosen.forEach((p) => queueTriggers(next, p.card, player, "attacks", { attackers: chosen.map((c) => c.card.iid) }));
      if (chosen.length >= 3) chosen.forEach((p) => queueTriggers(next, p.card, player, "battalion")); // "Battalion — whenever this and at least two other creatures attack"
      if (chosen.length >= 2) for (const p of me.battlefield) queueTriggers(next, p.card, player, "attackTwo");
      for (const p of me.battlefield) queueTriggers(next, p.card, player, "youAttack", { attackers: chosen.map((c) => c.card.iid) }); // "Whenever one or more creatures you control attack" // "Whenever you attack with two or more creatures"
      events.push({ type: "attackersDeclared", player, attackers: [...ids] });
      events.push({ type: "phaseChanged", phase: "blockers" });
      // The attacking player gets priority first, so a trick like "attacking creatures get +2/+0" can be cast now that there are attackers.
      // If neither player can respond, this passes straight through to the blockers.
      openWindow(next, player, "afterAttackers");
      break;
    }

    case "declareBlockers": {
      if (next.phase !== "blockers" || !next.combat) return fail("Blockers are declared in the blockers step.");
      // An attacker may have left the battlefield since it was declared (a trigger, a sacrifice): it is no longer in combat.
      next.combat.attackers = next.combat.attackers.filter((a) => onBoard(next, a.attacker));
      // Rule 509.1a: each creature blocks at most one attacker, but several may block the same one.
      const usedBlockers = new Set<string>();
      for (const { attacker, blocker } of action.blocks) {
        if (!next.combat.attackers.some((a) => a.attacker === attacker)) return fail("That creature isn't attacking.");
        if (usedBlockers.has(blocker)) return fail("A creature can only block one attacker.");
        const perm = me.battlefield.find((p) => p.card.iid === blocker);
        if (!perm || !isCreature(next, perm)) return fail("Only your creatures can block.");
        if (perm.tapped) return fail("A tapped creature can't block.");
        if (parseCard(getCard(next, perm.card.defId)).cantBlock || forbidden(next, perm, "cantBlock")) return fail(`${nameOf(next, perm)} can't block.`);
        const attackerPerm = findPermanent(next, attacker).perm;
        if (parseCard(getCard(next, attackerPerm.card.defId)).cantBeBlocked || attackerPerm.unblockableTurn || staticEffectsOn(next, attackerPerm).some((st) => st.unblockable)) return fail(`${nameOf(next, attackerPerm)} can't be blocked${attackerPerm.unblockableTurn ? " this turn" : ""}.`);
        const attackerDef = getCard(next, attackerPerm.card.defId);
        const blockerDef = getCard(next, perm.card.defId);
        const isArtifact = (blockerDef.typeLine ?? "").split("—")[0].includes("Artifact") || blockerDef.type === "artifact";
        if (kw(next, attackerPerm, "fear") && !isArtifact && !(blockerDef.colors ?? []).includes("B")) {
          return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it has fear (only artifact and black creatures can block it).`);
        }
        if (kw(next, attackerPerm, "intimidate") && !isArtifact && !(blockerDef.colors ?? []).some((c) => (attackerDef.colors ?? []).includes(c))) {
          return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it has intimidate (only artifact creatures and creatures sharing a color can block it).`);
        }
        if (isProtectedFrom(next, attackerPerm, qualityOfDef(blockerDef))) {
          return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it has protection from it.`);
        }
        const only = parseCard(attackerDef).blockedOnlyBy;
        if (only) {
          const allowed =
            only.subtypes.some((t) => (blockerDef.typeLine ?? "").includes(t)) ||
            only.keywords.some((k) => kw(next, perm, k)) ||
            only.colors.some((c) => (blockerDef.colors ?? []).includes(c)) ||
            (only.artifact && isArtifact);
          if (!allowed) return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it can only be blocked by certain creatures.`);
        }
        for (const walk of parseCard(attackerDef).landwalk ?? []) {
          const land = walk.charAt(0).toUpperCase() + walk.slice(1);
          if (me.battlefield.some((p) => getCard(next, p.card.defId).type === "land" && (getCard(next, p.card.defId).typeLine ?? "").includes(land))) {
            return fail(`${nameOf(next, attackerPerm)} has ${walk}walk and can't be blocked: you control a ${land}.`);
          }
        }
        if (kw(next, attackerPerm, "flying") && !kw(next, perm, "flying") && !kw(next, perm, "reach")) {
          return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it has flying (only creatures with flying or reach can block it).`);
        }
        const power = parseCard(attackerDef).cantBeBlockedByPower;
        if (power && (power.op === "max" ? powerOf(next, perm) <= power.n : powerOf(next, perm) >= power.n)) {
          return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: creatures with power ${power.n} or ${power.op === "max" ? "less" : "greater"} can't block it.`);
        }
        if (next.noGroundBlock && !kw(next, perm, "flying")) return fail(`${nameOf(next, perm)} can't block: creatures without flying can't block this turn.`);
        const colorsBar = parseCard(attackerDef).cantBeBlockedByColors;
        if (colorsBar?.some((c) => (blockerDef.colors ?? []).includes(c))) return fail(`${nameOf(next, perm)} can't block ${nameOf(next, attackerPerm)}: it can't be blocked by creatures of that color.`);
        if (parseCard(blockerDef).blockIfMoreCreatures && me.battlefield.filter((p) => isCreature(next, p)).length <= next.players[next.active].battlefield.filter((p) => isCreature(next, p)).length) {
          return fail(`${nameOf(next, perm)} can't block unless you control more creatures than the attacking player.`);
        }
        if (parseCard(blockerDef).blocksOnlyFlying && !kw(next, attackerPerm, "flying")) {
          return fail(`${nameOf(next, perm)} can block only creatures with flying.`);
        }
        usedBlockers.add(blocker);
      }
      // "All creatures able to block it do so": every creature that could block it must. A one-block trial of the same rules tells who is able.
      if (!lureProbe) {
        for (const a of next.combat.attackers) {
          if (!parseCard(getCard(next, findPermanent(next, a.attacker).perm.card.defId)).lureAll) continue;
          for (const b of me.battlefield) {
            if (b.tapped || !isCreature(next, b) || action.blocks.some((x) => x.blocker === b.card.iid && x.attacker === a.attacker)) continue;
            lureProbe = true;
            let able = false;
            try {
              able = applyAction(state, player, { type: "declareBlockers", blocks: [{ blocker: b.card.iid, attacker: a.attacker }] }).ok;
            } finally {
              lureProbe = false;
            }
            if (able) return fail(`${nameOf(next, b)} must block ${nameOf(next, findPermanent(next, a.attacker).perm)}: all creatures able to block it do so.`);
          }
        }
      }
      for (const blocker of usedBlockers) {
        const perm = me.battlefield.find((p) => p.card.iid === blocker)!;
        if (parseCard(getCard(next, perm.card.defId)).cantAttackAlone && usedBlockers.size < 2) return fail(`${nameOf(next, perm)} can't block alone.`);
      }
      for (const a of next.combat.attackers) {
        const blockedBy = action.blocks.filter((b) => b.attacker === a.attacker).length;
        const attackerPerm = findPermanent(next, a.attacker).perm;
        if (blockedBy === 1 && kw(next, attackerPerm, "menace")) {
          return fail(`${nameOf(next, attackerPerm)} has menace: it can't be blocked except by two or more creatures.`);
        }
      }
      for (const { attacker, blocker } of action.blocks) {
        next.combat.attackers.find((a) => a.attacker === attacker)!.blockers.push(blocker);
      }
      for (const a of next.combat.attackers) {
        const limit = parseCard(getCard(next, findPermanent(next, a.attacker).perm.card.defId)).maxBlockers;
        if (limit !== undefined && a.blockers.length > limit) return fail(`${nameOf(next, findPermanent(next, a.attacker).perm)} can't be blocked by more than ${limit} creature${limit === 1 ? "" : "s"}.`);
      }
      events.push({ type: "blockersDeclared", player, blocks: action.blocks });
      const announced = new Set<string>();
      for (const { blocker, attacker } of action.blocks) {
        queueTriggers(next, me.battlefield.find((p) => p.card.iid === blocker)!.card, player, "blocks", { other: attacker });
        // "Becomes blocked" happens once per attacker; "becomes blocked by a creature, ... that creature" once for each blocker.
        queueTriggers(next, findPermanent(next, attacker).perm.card, next.active, "blocked", { other: blocker, onlyOther: announced.has(attacker) });
        announced.add(attacker);
      }
      // Both players may cast instants before damage. If neither can, this passes straight through.
      openWindow(next, next.active, "afterBlockers");
      break;
    }

    case "assignDamage": {
      if (next.phase !== "damage" || !next.combat) return fail("There is no combat damage to assign right now.");
      const needed = getDamageAssignments(next);
      const assigned: Record<string, Record<string, number>> = {};
      for (const { attacker, blocker, amount } of action.assignments) {
        const entry = needed.find((n) => n.attacker === attacker);
        const targets = entry ? [...entry.blockers, ...(entry.trampleTo ? [entry.trampleTo] : [])] : [];
        if (!entry || !targets.includes(blocker)) return fail("That damage can't be assigned there.");
        if (!Number.isInteger(amount) || amount < 0) return fail("Damage must be a whole number.");
        assigned[attacker] ??= {};
        assigned[attacker][blocker] = (assigned[attacker][blocker] ?? 0) + amount;
      }
      for (const entry of needed) {
        const split = assigned[entry.attacker] ?? {};
        const sum = Object.values(split).reduce((a, b) => a + b, 0);
        const attackerPerm = findPermanent(next, entry.attacker).perm;
        if (sum !== entry.power) return fail(`${nameOf(next, attackerPerm)} must assign exactly ${entry.power} damage.`);
        // Trample (rule 702.19b): every blocker must be assigned lethal damage before any goes to the player.
        if (entry.trampleTo && (split[entry.trampleTo] ?? 0) > 0) {
          for (const id of entry.blockers) {
            if ((split[id] ?? 0) < lethalFor(next, attackerPerm, findPermanent(next, id).perm)) {
              return fail(`${nameOf(next, attackerPerm)} must assign lethal damage to every blocker before trampling over to the player.`);
            }
          }
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

  // Rule 704.3: state-based actions are checked whenever a player would get priority, so a creature whose size depends on the board
  // (power and toughness equal to the cards in your hand) dies as soon as that count drops, not at some later point.
  if (!next.winner) checkStateBasedActions(next, events);
  settle(next, events, onContinue);
  return { ok: true, state: next, events };
}

/** After the blockers are declared and anyone has responded: assign damage, or deal it. */
function continueAfterBlockers(state: GameState, events: GameEvent[]): void {
  const combat = state.combat;
  if (!combat) return;
  // Spells cast before damage can have removed creatures from the fight.
  combat.attackers = combat.attackers.filter((a) => onBoard(state, a.attacker));
  if (combat.attackers.length === 0) {
    state.combat = null;
    state.phase = "main2";
    events.push({ type: "phaseChanged", phase: "main2" });
    return;
  }
  if (getDamageAssignments(state).length > 0) {
    state.phase = "damage"; // the attacker's controller must divide damage (rule 510.1c)
    events.push({ type: "phaseChanged", phase: "damage" });
  } else {
    resolveCombat(state, events, {});
  }
}

export interface DamageEntry {
  attacker: string;
  blockers: string[];
  power: number;
  /** Set when the attacker has trample: it may also assign damage to this (the defending) player. */
  trampleTo?: PlayerId;
}

/** Attackers blocked by two or more creatures: their controller divides the damage (rule 510.1c). */
export function getDamageAssignments(state: GameState): DamageEntry[] {
  if (!state.combat) return [];
  return state.combat.attackers
    // Several blockers need a split (rule 510.1c). A trampler with even one blocker chooses how much goes past it (702.19b).
    .filter((a) => {
      if (!onBoard(state, a.attacker)) return false;
      const alive = a.blockers.filter((b) => onBoard(state, b)).length;
      return alive >= 2 || (alive === 1 && kw(state, findPermanent(state, a.attacker).perm, "trample"));
    })
    .map((a) => {
      const perm = findPermanent(state, a.attacker).perm;
      const entry: DamageEntry = { attacker: a.attacker, blockers: a.blockers.filter((b) => onBoard(state, b)), power: power(state, perm) };
      if (kw(state, perm, "trample")) entry.trampleTo = OPPONENT[state.active];
      return entry;
    })
    .filter((a) => a.power > 0);
}

/**
 * Lethal damage to each blocker in turn. Without trample the leftover goes on the last blocker; with
 * trample it goes to the defending player. Always totals the attacker's full power.
 */
function planDamage(state: GameState, attacker: Permanent, blockers: string[], defender: PlayerId): Record<string, number> {
  let left = power(state, attacker);
  const trample = kw(state, attacker, "trample");
  const out: Record<string, number> = {};
  blockers.forEach((id, i) => {
    const lethal = lethalFor(state, attacker, findPermanent(state, id).perm);
    const give = i === blockers.length - 1 && !trample ? left : Math.min(left, lethal);
    out[id] = give;
    left -= give;
  });
  if (trample && left > 0) out[defender] = left;
  return out;
}

/** A sensible default split for the UI (see planDamage). */
export function suggestDamageAssignment(state: GameState, attacker: string): Record<string, number> {
  const entry = getDamageAssignments(state).find((a) => a.attacker === attacker);
  if (!entry) return {};
  return planDamage(state, findPermanent(state, attacker).perm, entry.blockers, OPPONENT[state.active]);
}

/**
 * Combat damage (rule 510). With first strike or double strike in the fight there are two damage steps:
 * first strikers and double strikers deal damage first, creatures that died deal none, and then everyone
 * else (and the double strikers again) deals damage. Each step's damage is dealt at once, then state-based
 * actions run. `assigned` holds the split the player chose for multiple blockers (used for the first
 * damage a creature deals; a second strike is split automatically among the blockers still alive).
 */
function resolveCombat(state: GameState, events: GameEvent[], assigned: Record<string, Record<string, number>>): void {
  const combat = state.combat!;
  const defenderId = OPPONENT[state.active];
  const onBoard = (iid: string) => Object.values(state.players).some((p) => p.battlefield.some((x) => x.card.iid === iid));
  const find = (iid: string) => findPermanent(state, iid).perm;

  const everyone = [...combat.attackers.map((a) => a.attacker), ...combat.attackers.flatMap((a) => a.blockers)].filter((id) => onBoard(id)); // (this function's own onBoard takes just the id)
  const anyFirstStrike = everyone.some((id) => kw(state, find(id), "first strike") || kw(state, find(id), "double strike"));
  const dealsIn = (p: Permanent, step: "first" | "regular") => {
    const first = kw(state, p, "first strike") || kw(state, p, "double strike");
    return step === "first" ? first : kw(state, p, "double strike") || !first;
  };

  const split = new Set<string>(); // attackers that already used the split the player chose

  const runStep = (step: "first" | "regular") => {
    // Work out every hit first, so the damage of a step really is simultaneous.
    const hits: { source: Permanent; target: Permanent | PlayerState; amount: number }[] = [];
    for (const { attacker, blockers, target: walkerId } of combat.attackers) {
      if (!onBoard(attacker)) continue;
      const a = find(attacker);
      const alive = blockers.filter(onBoard);
      // Who the attacker is really hitting: the player, or the planeswalker it attacked (if that is gone, nothing).
      const defendingTarget = (): Permanent | PlayerState | null => (walkerId ? (onBoard(walkerId) ? find(walkerId) : null) : state.players[defenderId]);

      if (dealsIn(a, step)) {
        const p = power(state, a);
        if (blockers.length === 0) {
          const hitTarget = defendingTarget();
          if (hitTarget) hits.push({ source: a, target: hitTarget, amount: p });
        } else if (alive.length === 0) {
          // Blocked, but every blocker is gone: only a trampler still hurts the player (rule 702.19e).
          const hitTarget = defendingTarget();
          if (kw(state, a, "trample") && hitTarget) hits.push({ source: a, target: hitTarget, amount: p });
        } else {
          const chosen = split.has(attacker) ? undefined : assigned[attacker];
          const usable = chosen && Object.keys(chosen).every((k) => k === defenderId || alive.includes(k));
          const plan = usable ? chosen : planDamage(state, a, alive, defenderId);
          split.add(attacker);
          for (const [targetId, amount] of Object.entries(plan)) {
            const hitTarget = targetId === defenderId ? defendingTarget() : find(targetId);
            if (hitTarget) hits.push({ source: a, target: hitTarget, amount });
          }
        }
      }
      for (const id of alive) {
        const b = find(id);
        if (dealsIn(b, step)) hits.push({ source: b, target: a, amount: power(state, b) }); // blockers hit back
      }
    }

    const gains = new Map<PlayerId, number>();
    const sacrifice = new Set<Permanent>(); // "When this creature deals combat damage, sacrifice it"
    for (const hit of state.preventCombat ? [] : hits) {
      const { source, target } = hit;
      let { amount } = hit;
      // Protection: damage from a source with the quality it is protected from is prevented.
      if (!("battlefield" in target) && isProtectedFrom(state, target, qualityOfDef(getCard(state, source.card.defId)))) amount = 0;
      if (amount <= 0) continue; // rule 510.1a: 0 or less damage isn't dealt
      const toPlayer = "battlefield" in target;
      if (toPlayer && state.players[source.card.owner].doubleDamage && target.id !== source.card.owner) amount *= 2;
      if (toPlayer) {
        target.life -= amount;
      } else if (getCard(state, target.card.defId).type === "planeswalker") {
        target.loyalty = (target.loyalty ?? 0) - amount; // damage to a planeswalker removes loyalty
      } else {
        target.damage += amount;
        (target.damagedBy ??= []).push(source.card.iid);
        if (kw(state, source, "deathtouch")) target.deathtouched = true;
      }
      if (kw(state, source, "lifelink")) gains.set(source.card.owner, (gains.get(source.card.owner) ?? 0) + amount);
      events.push({ type: "combatDamage", source: source.card.iid, target: toPlayer ? target.id : target.card.iid, amount });
      if (source.sacOnDamage) sacrifice.add(source);
      if (toPlayer && onBoard(source.card.iid)) {
        queueTriggers(state, source.card, source.card.owner, "combatDamagePlayer");
        // Auras on the creature: "Whenever enchanted creature deals damage to an opponent, ..."
        for (const owner of Object.values(state.players)) {
          for (const aura of owner.battlefield) if (aura.attachedTo === source.card.iid) queueTriggers(state, aura.card, owner.id, "hostDamagesPlayer");
        }
      }
    }
    for (const doomed of sacrifice) {
      const owner = Object.values(state.players).find((p) => p.battlefield.includes(doomed));
      if (owner) putIntoGraveyard(state, doomed, owner.id, events);
    }
    for (const [player, amount] of gains) {
      state.players[player].life += amount;
      events.push({ type: "lifeGained", player, amount });
      onLifeGained(state, player);
    }
  };

  for (const step of anyFirstStrike ? (["first", "regular"] as const) : (["regular"] as const)) {
    runStep(step);
    checkStateBasedActions(state, events);
    if (state.winner) {
      state.combat = null;
      return;
    }
  }

  state.combat = null;
  state.phase = "main2";
  events.push({ type: "phaseChanged", phase: "main2" });
}

/** Untap, upkeep and draw are automatic, so a player only stops in main1, attackers, blockers, damage, main2, end or cleanup. */
function advancePhase(state: GameState, events: GameEvent[]): void {
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
  state.preventCombat = undefined;
  state.noGroundBlock = undefined;
  // Rule 514.2: damage wears off for everyone at end of turn.
  for (const p of Object.values(state.players)) {
    p.drawnThisTurn = 0;
    p.doubleDamage = undefined;
    p.lifeGainedThisTurn = 0;
    p.spellsCastThisTurn = 0;
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
      perm.loyaltyUsed = false;
      perm.cantBlockTurn = false;
      perm.noRegen = false;
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

  if (p.library.length === 0) {
    state.winner = OPPONENT[state.active];
    events.push({ type: "gameWon", player: state.winner });
    return;
  }
  drawCards(state, state.active, 1, events, true); // (the draw step's card counts as the first card drawn this turn)

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

/** iids of creatures the active player could attack with right now. */
export function getPossibleAttackers(state: GameState): string[] {
  if (state.winner || state.phase !== "attackers") return [];
  return state.players[state.active].battlefield
    .filter((p) => isCreature(state, p) && !p.tapped && (!p.summoningSick || kw(state, p, "haste")) && !kw(state, p, "defender") && !forbidden(state, p, "cantAttack"))
    .map((p) => p.card.iid);
}

/**
 * Blocks the rules demand right now: every creature able to block an attacker with "all creatures able to block it do so" must.
 * The UI fills these in, so a player is never left guessing why their blocks were refused.
 */
export function getForcedBlocks(state: GameState): { blocker: string; attacker: string }[] {
  if (state.winner || state.phase !== "blockers" || !state.combat) return [];
  const defender = OPPONENT[state.active];
  const out: { blocker: string; attacker: string }[] = [];
  lureProbe = true;
  try {
    for (const a of state.combat.attackers) {
      if (!parseCard(getCard(state, findPermanent(state, a.attacker).perm.card.defId)).lureAll) continue;
      for (const b of state.players[defender].battlefield) {
        if (b.tapped || !isCreature(state, b) || out.some((o) => o.blocker === b.card.iid)) continue;
        if (applyAction(state, defender, { type: "declareBlockers", blocks: [{ blocker: b.card.iid, attacker: a.attacker }] }).ok) out.push({ blocker: b.card.iid, attacker: a.attacker });
      }
    }
  } finally {
    lureProbe = false;
  }
  return out;
}

/** iids of creatures the defending player could block with right now. */
export function getPossibleBlockers(state: GameState): string[] {
  if (state.winner || state.phase !== "blockers") return [];
  return state.players[OPPONENT[state.active]].battlefield
    .filter((p) => isCreature(state, p) && !p.tapped && !parseCard(getCard(state, p.card.defId)).cantBlock && !forbidden(state, p, "cantBlock"))
    .map((p) => p.card.iid);
}

/**
 * Simple actions the UI can offer the given player right now. Attacks, blocks, damage splits,
 * discards and bottoming cards are free-form choices, so the UI builds those itself.
 */
export function getLegalActions(state: GameState, player: PlayerId): Action[] {
  if (state.winner || player !== playerToAct(state)) return [];
  if (state.pendingChoice || state.pendingPick) return []; // the screen asks for the targets or the card
  if (state.priority) {
    // Respond with a spell or ability (the screen builds those, they need targets), or pass.
    return [{ type: "passPriority" }, ...getCastable(state, player).map((c): Action => ({ type: "castSpell", iid: c.iid, targets: [] }))];
  }
  if (state.phase === "mulligan") {
    const taken = state.opening?.taken[player] ?? 0;
    return [
      ...(taken < MAX_MULLIGANS ? [{ type: "mulligan" } as Action] : []),
      ...(taken === 0 ? [{ type: "keepHand", bottom: [] } as Action] : []),
    ];
  }
  const castable = getCastable(state, player).map((c): Action => ({ type: "castSpell", iid: c.iid, targets: [] }));
  if (state.phase === "blockers") return [{ type: "declareBlockers", blocks: [] }, ...castable];
  if (state.phase === "damage" || state.phase === "cleanup") return [];
  const actions: Action[] = [{ type: "passPhase" }, ...castable];
  if (state.phase === "attackers") {
    const attackers = getPossibleAttackers(state);
    if (attackers.length) actions.push({ type: "declareAttackers", attackers });
  }
  if (!MAIN_PHASES.includes(state.phase)) return actions;
  for (const card of [...state.players[player].hand, ...exilePlayable(state, player)]) {
    if (getCard(state, card.defId).type !== "land") continue;
    const action: Action = { type: "playLand", iid: card.iid };
    if (applyAction(state, player, action).ok) actions.push(action);
  }
  return actions;
}
