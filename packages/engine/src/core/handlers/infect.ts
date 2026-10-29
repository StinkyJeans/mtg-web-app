import { getCard } from "../../cards.js";
import type { EdictType } from "../../effects.js";
import type { GameState, Permanent, PlayerId } from "../../types.js";
import { isArtifactDef, isCreature, isPlaneswalker, nameOf, playerLabel } from "../permanents.js";
import { addPoison, putCounters, sacrificePermanent } from "../zones.js";
import { subjectsOf } from "../targets.js";
import type { EffectHandlers } from "./shared.js";

/** Effects that came with the Mono-Black Infect deck: proliferate and edicts. */
export const INFECT_EFFECTS = {
  proliferate({ state, ctx, events, say }) {
    // Every counter it adds is chosen for the player: more poison on opponents, more +1/+1 and loyalty on their own
    // permanents, more -1/-1 and stun on their opponents'. Lore counters are left alone (a chapter would go off).
    const me = ctx.controller;
    const poisoned = Object.values(state.players).filter((p) => p.id !== me && (p.poison ?? 0) > 0).map((p) => p.id);
    const perms = Object.values(state.players).flatMap((p) => p.battlefield.map((perm) => ({ perm, controller: p.id, kinds: proliferated(state, perm, p.id === me) })));
    const added = [...poisoned.map((id) => `a poison counter on ${playerLabel(id)}`), ...perms.flatMap(({ perm, kinds }) => kinds.map((kind) => `a ${kind} counter on ${nameOf(state, perm)}`))];
    say(added.length > 0 ? `${playerLabel(me)} proliferates: ${added.join(", ")}.` : `${playerLabel(me)} proliferates, but nothing has a counter to add to.`);
    for (const id of poisoned) addPoison(state, id, 1, events);
    for (const { perm, controller, kinds } of perms) addOneOfEach(state, perm, controller, kinds);
  },
  edict({ state, ctx, events, say, startPick }, effect) {
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player" || state.pendingPick) continue;
      const options = state.players[s.id].battlefield.filter((p) => fitsEdict(state, p, effect.types));
      const kinds = effect.types.join(" or ");
      if (options.length === 0) {
        say(`${playerLabel(s.id)} has no ${kinds} to sacrifice.`);
        continue;
      }
      if (options.length === 1) {
        sacrificePermanent(state, options[0], s.id, events);
        continue;
      }
      startPick({ player: s.id, prompt: `Choose a ${kinds} you control to sacrifice`, kind: "sacrificeOwn", options: options.map((p) => p.card.iid), optional: false, owner: s.id, remaining: 1, ordered: [] });
    }
  },
} satisfies EffectHandlers;

type CounterKind = "+1/+1" | "loyalty" | "-1/-1" | "stun";

/** The counters proliferate adds to a permanent: the helpful ones its controller's side already has. */
function proliferated(state: GameState, perm: Permanent, mine: boolean): CounterKind[] {
  if (mine) return [...((perm.counters ?? 0) > 0 ? ["+1/+1" as const] : []), ...(isPlaneswalker(state, perm) && (perm.loyalty ?? 0) > 0 ? ["loyalty" as const] : [])];
  return [...((perm.minusCounters ?? 0) > 0 ? ["-1/-1" as const] : []), ...((perm.stun ?? 0) > 0 ? ["stun" as const] : [])];
}

function addOneOfEach(state: GameState, perm: Permanent, controller: PlayerId, kinds: CounterKind[]): void {
  for (const kind of kinds) {
    if (kind === "+1/+1") putCounters(state, perm, controller, 1);
    if (kind === "loyalty") perm.loyalty = (perm.loyalty ?? 0) + 1;
    if (kind === "-1/-1") perm.minusCounters = (perm.minusCounters ?? 0) + 1;
    if (kind === "stun") perm.stun = (perm.stun ?? 0) + 1;
  }
}

function fitsEdict(state: GameState, perm: Permanent, types: EdictType[]): boolean {
  const def = getCard(state, perm.card.defId);
  return types.some((t) => {
    if (t === "creature") return isCreature(state, perm);
    if (t === "planeswalker") return isPlaneswalker(state, perm);
    if (t === "artifact") return isArtifactDef(def);
    return /\bEnchantment\b/.test(def.typeLine ?? def.type) || def.type === "enchantment";
  });
}
