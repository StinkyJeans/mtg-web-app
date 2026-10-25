// Plain-language advice for the combat steps, so a new player can see which creatures are worth attacking or blocking with.
// These are simple rules of thumb (damage against toughness, flying, deathtouch), not a full simulation.
import { applyAction, powerOf, toughnessOf } from "@mtg/engine";
import type { GameState, Permanent, PlayerId } from "@mtg/engine";

export type CombatTone = "free" | "safe" | "risky" | "best" | "good" | "trade" | "chump" | "block" | "threat" | "blocked";

export interface CombatHint {
  tone: CombatTone;
  label: string;
  /** One sentence explaining the label, used as the card's tooltip. */
  why: string;
}

const kws = (state: GameState, perm: Permanent): string[] => [...(state.cards[perm.card.defId].keywords ?? []), ...(perm.tempKeywords ?? [])];
const has = (state: GameState, perm: Permanent, k: string) => kws(state, perm).includes(k);
const isCreature = (state: GameState, perm: Permanent) => state.cards[perm.card.defId].type === "creature" || perm.crewed === true;
const lifeLeft = (state: GameState, perm: Permanent) => toughnessOf(state, perm) - perm.damage;
const name = (state: GameState, perm: Permanent) => state.cards[perm.card.defId].name;

/** Could `blocker` stand in front of `attacker`? Flying and reach are the usual limits. */
function canStopFlying(state: GameState, attacker: Permanent, blocker: Permanent): boolean {
  return !has(state, attacker, "flying") || has(state, blocker, "flying") || has(state, blocker, "reach");
}

/** Does `a` kill `b` in a fight (damage, or deathtouch)? */
function kills(state: GameState, a: Permanent, b: Permanent): boolean {
  return powerOf(state, a) > 0 && (has(state, a, "deathtouch") || powerOf(state, a) >= lifeLeft(state, b));
}

/** Advice for one of your creatures that can attack: is it safe, risky, or free to hit? */
export function attackHint(state: GameState, me: PlayerId, attacker: Permanent): CombatHint {
  const foe = state.players[me === "p1" ? "p2" : "p1"];
  const blockers = foe.battlefield.filter((p) => isCreature(state, p) && !p.tapped && canStopFlying(state, attacker, p));
  if (blockers.length === 0) return { tone: "free", label: "★ Free hit", why: "Nothing of theirs can block it, so all its damage goes through." };
  const deadly = blockers.filter((b) => kills(state, b, attacker));
  if (deadly.length === 0) return { tone: "safe", label: "✓ Safe", why: "None of their creatures could kill it if they block." };
  const trade = deadly.some((b) => kills(state, attacker, b));
  return {
    tone: "risky",
    label: trade ? "⚠ Trade" : "⚠ Risky",
    why: `${name(state, deadly[0])} could block and kill it${trade ? ", but it would die too" : " without dying"}.`,
  };
}

/** Advice for one of your creatures that can block: is there an attacker it can stop well? */
export function blockHint(state: GameState, me: PlayerId, blocker: Permanent): CombatHint {
  const attackers = (state.combat?.attackers ?? []).flatMap((a) => {
    const perm = Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === a.attacker);
    return perm && !a.target ? [perm] : []; // (attacks on planeswalkers are chosen in the block panel)
  });
  const legal = attackers.filter((a) => {
    const r = applyAction(state, me, { type: "declareBlockers", blocks: [{ blocker: blocker.card.iid, attacker: a.card.iid }] });
    return r.ok || /two or more|more than one/i.test(r.error);
  });
  if (legal.length === 0) return { tone: "block", label: "Can't block these", why: "It can't legally block any of the attackers." };
  const rated = legal.map((a) => ({ a, survives: !kills(state, a, blocker), wins: kills(state, blocker, a) }));
  const best = rated.find((r) => r.survives && r.wins);
  if (best) return { tone: "best", label: "★ Great block", why: `It would kill ${name(state, best.a)} and survive.` };
  const safe = rated.find((r) => r.survives);
  if (safe) return { tone: "good", label: "✓ Safe block", why: `It would stop ${name(state, safe.a)} and survive, but not kill it.` };
  const trade = rated.find((r) => r.wins);
  if (trade) return { tone: "trade", label: "⚔ Trade", why: `It would kill ${name(state, trade.a)}, but it would die too.` };
  return { tone: "chump", label: "💔 Chump block", why: "It would die without killing anything. Only block with it to save life." };
}
