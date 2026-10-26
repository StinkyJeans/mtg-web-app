import { getCard } from "../cards.js";
import type { LastKnown, StackItem, TriggeredAbility } from "../effects.js";
import { parseCard } from "../oracle.js";
import { OPPONENT } from "../types.js";
import type { CardInstance, GameState, Permanent, PlayerId } from "../types.js";
import {
  bindSpecs,
  findPermanentOrNull,
  isArtifactDef,
  isCreature,
  isEnchantmentDef,
  nameOf,
  newId,
  powerOf,
  shiftTargets,
  staticEffectsOn,
  subtypesOf,
} from "./permanents.js";
import { ignoresHexproof } from "./targets.js";
import { isToken, putCounters } from "./zones.js";

// Entering the battlefield and triggered abilities: which triggers fire, and putting them in the queue.

/** Does an "intervening if" (and a spell-cast trigger's timing rules) hold right now? */
function triggerCondHolds(state: GameState, controller: PlayerId, trigger: TriggeredAbility, extra?: { castCount?: number; byOpponent?: boolean; attackers?: string[] }, sourceIid?: string): boolean {
  const p = state.players[controller];
  const c = trigger.cond;
  if (c?.opponentLostLife && (state.players[OPPONENT[controller]].lifeLostThisTurn ?? 0) === 0) return false;
  if (c?.attackedThisTurn && !p.attackedThisTurn) return false;
  if (c?.controlsOther && !p.battlefield.some((perm) => perm.card.iid !== sourceIid && subtypesOf(state, perm).includes(c.controlsOther!))) return false;
  if (c?.creaturesAtLeast !== undefined && p.battlefield.filter((perm) => isCreature(state, perm)).length < c.creaturesAtLeast) return false;
  if (c?.lifeGainedAtLeast !== undefined && (p.lifeGainedThisTurn ?? 0) < c.lifeGainedAtLeast) return false;
  if (c?.lifeAtLeast !== undefined && p.life < c.lifeAtLeast) return false;
  if (c?.unsolved && (!sourceIid || findPermanentOrNull(state, sourceIid)?.perm.solved)) return false;
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
      return perm ? subtypesOf(state, perm) : [];
    };
    if (!(extra?.attackers ?? []).some((iid) => trigger.attackerSubtypes!.some((t) => line(iid).includes(t)))) return false;
  }
  return true;
}

/** "Whenever another creature you control enters": the controller's other permanents with such a trigger. */
export function creatureEntered(state: GameState, card: CardInstance, controller: PlayerId): void {
  const entering = state.players[controller].battlefield.find((p) => p.card.iid === card.iid);
  if (entering) addEnteringCounters(state, entering, controller);
  if (entering) creatureMoved(state, entering, controller, "enters");
  for (const perm of state.players[controller].battlefield) {
    const def = getCard(state, perm.card.defId);
    for (const [n, trigger] of parseCard(def).triggers.entries()) {
      if (trigger.event !== "allyEnters") continue;
      if (trigger.other && perm.card.iid === card.iid) continue;
      if (trigger.enchantments) {
        if (!isEnchantmentDef(getCard(state, card.defId))) continue; // eerie: "whenever an enchantment you control enters"
      } else if (trigger.artifacts) {
        if (!(entering && isCreature(state, entering)) && !isArtifactDef(getCard(state, card.defId))) continue; // "another creature or artifact you control"
      } else if (!trigger.subtypes && !(entering && isCreature(state, entering))) continue; // plain "another creature enters" is about creatures
      if (trigger.nontoken && isToken(card)) continue;
      if (trigger.subtypes && !trigger.subtypes.some((t) => (entering ? subtypesOf(state, entering) : []).includes(t))) continue;
      if (trigger.maxPower !== undefined && entering && powerOf(state, entering) > trigger.maxPower) continue;
      if (trigger.oncePerTurn && !claimOncePerTurn(perm, n)) continue;
      state.triggerQueue.push({
        specs: bindSpecs(trigger.targets, perm.card.iid),
        item: { kind: "ability", id: newId(state), controller, source: perm.card.iid, sourceName: def.name, effects: trigger.effects, targets: [], specs: bindSpecs(trigger.targets, perm.card.iid), text: trigger.text, other: card.iid },
      });
    }
  }
}

/** Giada: "Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control." */
function addEnteringCounters(state: GameState, perm: Permanent, controller: PlayerId): void {
  const others = state.players[controller].battlefield.filter((p) => p !== perm);
  const types = subtypesOf(state, perm);
  for (const source of others) {
    const type = parseCard(getCard(state, source.card.defId)).othersEnterWithCounters;
    if (!type || !types.includes(type)) continue;
    putCounters(state, perm, controller, others.filter((p) => subtypesOf(state, p).includes(type)).length);
  }
}

/** "Whenever another creature enters" (any controller) and "whenever another creature you control leaves the battlefield". */
export function creatureMoved(state: GameState, perm: Permanent, controller: PlayerId, kind: "enters" | "leaves"): void {
  if (!isCreature(state, perm)) return;
  if (kind === "enters") {
    for (const owner of Object.values(state.players)) {
      for (const other of owner.battlefield) if (other.card.iid !== perm.card.iid) queueTriggers(state, other.card, owner.id, "anyCreatureEnters");
    }
  } else {
    for (const other of state.players[controller].battlefield) if (other.card.iid !== perm.card.iid) queueTriggers(state, other.card, controller, "allyLeaves");
  }
}

/** "This ability triggers only once each turn": remembered like an ability used this turn (keys above 1000 are triggers). False when it already triggered. */
function claimOncePerTurn(perm: Permanent | undefined, n: number): boolean {
  if (perm?.usedAbilities?.includes(1000 + n)) return false;
  if (perm) perm.usedAbilities = [...(perm.usedAbilities ?? []), 1000 + n];
  return true;
}

/**
 * Queues the card's triggered abilities for `event`. They go on the stack when the game next settles.
 * `subtypes`: the creature types of what the event is about (a creature spell cast, a creature that died or got counters); `self`: it is this card.
 */
export function queueTriggers(state: GameState, card: CardInstance, controller: PlayerId, event: TriggeredAbility["event"], extra?: { castCount?: number; other?: string; onlyOther?: boolean; byOpponent?: boolean; attackers?: string[]; subtypes?: string[]; self?: boolean; died?: LastKnown }): void {
  const def = getCard(state, card.defId);
  const triggers = parseCard(def).triggers;
  for (let n = 0; n < triggers.length; n++) {
    const trigger = triggers[n];
    if (trigger.event !== event) continue;
    // A creature spell only counts for "a noncreature or Dragon spell" when it is a Dragon.
    if (event === "noncreatureSpell" && extra?.subtypes && !(trigger.orSpellSubtype && extra.subtypes.includes(trigger.orSpellSubtype))) continue;
    if (trigger.other && extra?.self) continue;
    if (trigger.selfOnly && !extra?.self) continue;
    if ((event === "allyDies" || event === "allyAttacks") && trigger.subtypes && !trigger.subtypes.some((t) => extra?.subtypes?.includes(t))) continue;
    if (trigger.notSubtype && extra?.subtypes?.includes(trigger.notSubtype)) continue;
    if (trigger.ifKicked && !findPermanentOrNull(state, card.iid)?.perm.kicked) continue;
    if (trigger.cond?.wasCreature && def.type !== "creature") continue; // "if it was a creature": as it last was on the battlefield
    if (!triggerCondHolds(state, controller, trigger, extra, card.iid)) continue;
    if (extra?.onlyOther && !trigger.usesOther) continue;
    if (trigger.oncePerTurn && !claimOncePerTurn(findPermanentOrNull(state, card.iid)?.perm, n)) continue;
    let { effects, targets } = trigger;
    if (trigger.xTargets) {
      // "Tap X target creatures": X copies of the target, and of the effects for each.
      const x = findPermanentOrNull(state, card.iid)?.perm.xPaid ?? 0;
      if (x === 0) continue;
      targets = Array.from({ length: x }, (_, i) => ({ ...trigger.targets[0], label: `${trigger.targets[0].label} (${i + 1} of ${x})` }));
      effects = Array.from({ length: x }, (_, i) => shiftTargets(trigger.effects, i)).flat();
    }
    // "With mana value less than or equal to this creature's power": its power as it died.
    // "With mana value less than or equal to this creature's power": its power now, or as it died.
    const died = extra?.died;
    if (targets.some((t) => t.mvAtMostPower)) {
      const self = findPermanentOrNull(state, card.iid)?.perm;
      const power = died?.power ?? (self ? powerOf(state, self) : 0);
      targets = targets.map((t) => (t.mvAtMostPower ? { ...t, mv: { n: power, op: "max" as const } } : t));
    }
    if (extra?.other && targets.some((t) => t.notOther)) targets = targets.map((t) => (t.notOther ? { ...t, except: extra.other } : t));
    state.triggerQueue.push({
      specs: bindSpecs(targets, card.iid),
      ...(trigger.modes ? { modes: trigger.modes } : {}),
      ...(trigger.unchosenOnly ? { unchosen: true } : {}),
      item: {
        kind: "ability",
        id: newId(state),
        controller,
        source: card.iid,
        sourceName: def.name,
        effects,
        targets: [],
        specs: bindSpecs(targets, card.iid),
        text: trigger.text,
        ...(extra?.other ? { other: extra.other } : {}),
        ...(died ? { died } : {}),
      },
    });
  }
}

/** "As this enters, choose a color" / "choose a creature type": starts the choice (nothing to ask when only one color is allowed). */
export function askAsEnters(state: GameState, perm: Permanent, controller: PlayerId): void {
  const parsed = parseCard(getCard(state, perm.card.defId));
  if (parsed.chooseType && !state.pendingPick) return askCreatureType(state, perm, controller);
  const choose = parsed.chooseColor;
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
    source: { iid: perm.card.iid, name: nameOf(state, perm), defId: perm.card.defId },
  };
}

/**
 * "As this land enters, choose a creature type": the types among the player's own cards, most common first
 * (choosing a type none of their cards have would do nothing).
 */
function askCreatureType(state: GameState, perm: Permanent, controller: PlayerId): void {
  const p = state.players[controller];
  const counts = new Map<string, number>();
  for (const card of [...p.library, ...p.hand, ...p.graveyard, ...p.exile, ...p.battlefield.map((b) => b.card)]) {
    const def = getCard(state, card.defId);
    if (!/\bcreature\b/i.test(def.typeLine ?? def.type)) continue;
    // the printed types only: a changeling would count as every type
    for (const t of ((def.typeLine ?? "").split(" // ")[0].split("—")[1] ?? "").toLowerCase().split(/\s+/).filter(Boolean)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const options = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  if (options.length <= 1) {
    perm.chosenType = options[0] ?? "human";
    return;
  }
  state.pendingPick = {
    player: controller,
    prompt: `${nameOf(state, perm)}: choose a creature type`,
    kind: "creatureType",
    options,
    optional: false,
    owner: controller,
    remaining: 1,
    ordered: [],
    colorFor: perm.card.iid,
    source: { iid: perm.card.iid, name: nameOf(state, perm), defId: perm.card.defId },
  };
}

/** Landfall: a land entered under `player`'s control, so their permanents with "whenever a land you control enters" trigger. */
export function landEntered(state: GameState, player: PlayerId): void {
  for (const perm of state.players[player].battlefield) queueTriggers(state, perm.card, player, "landfall");
}

/** Ward: after a spell or ability is put on the stack, each opposing permanent with ward that it targets gets a trigger. */
export function queueWard(state: GameState, item: StackItem): void {
  const wardsOff = ignoresHexproof(state, item.controller); // "Ward abilities of those creatures don't trigger."
  item.targets.forEach((target) => {
    if (target.kind !== "permanent") return;
    const found = findPermanentOrNull(state, target.iid);
    // "When this becomes the target of a spell or ability, ...": a trigger for the permanent's controller.
    if (found) queueTriggers(state, found.perm.card, found.owner.id, "becomesTarget", { byOpponent: item.controller !== found.owner.id });
    // "Whenever a creature you control becomes the target of a spell or ability an opponent controls, ...": every permanent of its controller.
    if (found && isCreature(state, found.perm)) {
      for (const p of state.players[found.owner.id].battlefield) queueTriggers(state, p.card, found.owner.id, "allyTargeted", { byOpponent: item.controller !== found.owner.id, other: found.perm.card.iid });
    }
    const parsed = found ? parseCard(getCard(state, found.perm.card.defId)) : undefined;
    const ward = found ? (parsed?.ward ?? staticEffectsOn(state, found.perm).find((st) => st.ward)?.ward) : undefined;
    if (!found || ward === undefined || found.owner.id === item.controller || (wardsOff && isCreature(state, found.perm))) return;
    const name = getCard(state, found.perm.card.defId).name;
    const life = parsed?.wardLife;
    state.triggerQueue.push({
      specs: [],
      item: { kind: "ability", id: newId(state), controller: found.owner.id, source: found.perm.card.iid, sourceName: name, effects: [{ type: "wardCheck", cost: ward, itemId: item.id, ...(life ? { life } : {}) }], targets: [], specs: [], text: life ? `Ward—Pay ${life} life` : `Ward ${ward}` },
    });
  });
}
