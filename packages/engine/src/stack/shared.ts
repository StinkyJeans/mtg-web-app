import type { GameEvent } from "../actions.js";
import { getCard } from "../cards.js";
import { changeLife, findPermanentOrNull, isLegalTarget, isPermanentCard, isToken, playerToAct, tapPerm, toughnessOf } from "../core.js";
import type { TargetChoice, TargetSpec } from "../effects.js";
import { hasKeyword } from "../keywords.js";
import { manaAbilitySacrifices, manaCostOf, parseManaCost } from "../mana.js";
import type { ManaCost } from "../mana.js";
import { parseCard } from "../oracle.js";
import type { CardDef, GameState, PlayerId } from "../types.js";

// Timing, payment and target checks shared by casting, activating and resolving.

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
  // "Your opponents can't cast spells during your turn."
  if (state.active !== player && state.players[state.active].battlefield.some((p) => parseCard(getCard(state, p.card.defId)).noOppSpellsOnYourTurn)) return false;
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

export function timingError(state: GameState, def: CardDef): string {
  if (isInstantSpeed(def)) return "You can only cast that when you have priority.";
  if (state.priority || state.stack.length > 0) return "Wait until the stack is empty to cast that.";
  return isPermanentCard(def) ? `${def.type === "creature" ? "Creatures" : "Artifacts"} can only be cast in a main phase.` : "Sorceries can only be cast in a main phase.";
}

/**
 * The player who just cast or activated something has implicitly passed (otherwise anyone holding a second instant
 * would be asked "pass?" after every spell), so `holder` is the opponent with one pass already counted.
 */
export function openRound(state: GameState, holder: PlayerId): void {
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
    tapPerm(state, perm, player);
    // A Treasure is sacrificed when it is tapped for mana; a token simply ceases to exist.
    if (manaAbilitySacrifices(getCard(state, perm.card.defId))) {
      battlefield.splice(battlefield.indexOf(perm), 1);
      if (!isToken(perm.card)) state.players[perm.card.owner].graveyard.push(perm.card);
    }
  }
};

/** Pays a cost worked out by payMana: taps (or sacrifices) the sources and pays any life for Phyrexian mana. */
export function applyPayment(state: GameState, player: PlayerId, paid: { tap: string[]; life: number }, events: GameEvent[]): void {
  tapPermanents(state, player, paid.tap);
  if (paid.life > 0) changeLife(state, player, -paid.life, events);
}

/** Sorcery timing: your own main phase with nothing on the stack. */
export const sorceryTiming = (state: GameState, player: PlayerId) =>
  !state.priority && !state.pendingChoice && !state.pendingPick && state.stack.length === 0 && player === state.active && playerToAct(state) === player && (state.phase === "main1" || state.phase === "main2");

/** Checks a list of chosen targets against what a spell or ability needs. Returns an error message, or null. */
export function checkTargets(state: GameState, specs: TargetSpec[], targets: TargetChoice[], controller: PlayerId, name: string): string | null {
  if (targets.length !== specs.length) {
    return specs.length === 0 ? `${name} doesn't target anything.` : `${name} needs ${specs.length} target${specs.length === 1 ? "" : "s"}: ${specs.map((s) => s.label).join(", ")}.`;
  }
  for (let i = 0; i < specs.length; i++) {
    if (!isLegalTarget(state, specs[i], targets[i], controller)) return `That isn't a legal target for "${specs[i].label}".`;
    // "Exile up to one target Equipment attached to that creature"
    const host = specs[i].attachedToTarget !== undefined ? targets[specs[i].attachedToTarget!] : undefined;
    const t = targets[i];
    if (host && t.kind === "permanent" && (host.kind !== "permanent" || findPermanentOrNull(state, t.iid)?.perm.attachedTo !== host.iid)) return `"${specs[i].label}": it must be attached to the creature you chose.`;
  }
  const distinct = targets.filter((t, i) => specs[i].distinct && t.kind !== "none").map((t) => JSON.stringify(t));
  if (new Set(distinct).size < distinct.length) return `${name}: choose a different target for each.`;
  return null;
}

/** "Choose one that hasn't been chosen": the permanent remembers the modes chosen for it. */
export function rememberMode(state: GameState, source: string, mode: number): void {
  const perm = findPermanentOrNull(state, source)?.perm;
  if (perm) perm.chosenModes = [...(perm.chosenModes ?? []), mode];
}

/**
 * The mana an activated ability costs right now. Power-up: "reduce the cost by its mana cost if it entered this turn".
 */
export function abilityManaCost(state: GameState, perm: { card: { defId: string }; enteredTurn?: number }, ability: { mana: string; powerUp?: boolean }): ManaCost | null {
  const cost = parseManaCost(ability.mana);
  if (!cost || !ability.powerUp || perm.enteredTurn !== state.turn) return cost;
  const printed = manaCostOf(getCard(state, perm.card.defId));
  if (!printed) return cost;
  const colored = { ...cost.colored };
  let generic = cost.generic;
  for (const [color, n] of Object.entries(printed.colored) as [keyof ManaCost["colored"], number][]) {
    const taken = Math.min(colored[color] ?? 0, n);
    colored[color] = (colored[color] ?? 0) - taken;
  }
  generic = Math.max(0, generic - printed.generic);
  return { ...cost, generic, colored };
}

/** "You may activate abilities of creatures you control as though those creatures had haste" (Shang-Chi). */
export const abilityHaste = (state: GameState, player: PlayerId): boolean => state.players[player].battlefield.some((p) => parseCard(getCard(state, p.card.defId)).hasteForAbilities);

/** "Activate only if there are two or more creature cards in your graveyard" / "...if you control a creature with toughness 4 or greater": why the ability can't be used now (null: it can). */
export function abilityNeed(state: GameState, player: PlayerId, ability: { needYardCreatures?: number; needToughness?: number }): string | null {
  const me = state.players[player];
  if (ability.needYardCreatures !== undefined && me.graveyard.filter((c) => getCard(state, c.defId).type === "creature").length < ability.needYardCreatures) {
    return `it needs ${ability.needYardCreatures} creature cards in your graveyard`;
  }
  if (ability.needToughness !== undefined && !me.battlefield.some((p) => getCard(state, p.card.defId).type === "creature" && toughnessOf(state, p) >= ability.needToughness!)) {
    return `it needs a creature with toughness ${ability.needToughness} or greater`;
  }
  return null;
}
