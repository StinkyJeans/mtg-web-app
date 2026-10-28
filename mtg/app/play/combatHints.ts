// Plain-language advice for the combat steps, so a new player can see which creatures are worth attacking or blocking with.
// These are simple rules of thumb (damage against toughness, flying, deathtouch, first strike), not a full simulation.
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
  return powerOf(state, a) > 0 && !has(state, b, "indestructible") && (has(state, a, "deathtouch") || powerOf(state, a) >= lifeLeft(state, b));
}

const strikesFirst = (state: GameState, perm: Permanent) => has(state, perm, "first strike") || has(state, perm, "double strike");

/**
 * Can `blocker` block `attacker`? Asked of the real rules as if blockers were being declared now: while players may still respond
 * to the attack the engine refuses any declaration, which says nothing about the blocker. "Needs two or more blockers" (menace)
 * counts as yes: a second one can join.
 */
export function canBlock(state: GameState, me: PlayerId, blocker: string, attacker: string): { ok: boolean; reason?: string } {
  const r = applyAction(state.priority ? { ...state, priority: null } : state, me, { type: "declareBlockers", blocks: [{ blocker, attacker }] });
  if (r.ok || /two or more|more than one/i.test(r.error)) return { ok: true };
  return { ok: false, reason: r.error.replace(/^.*?: /, "") };
}

/** What a block is likely to lead to: who dies. */
export function blockOutcome(state: GameState, attacker: Permanent, blockers: Permanent[]): CombatHint {
  if (blockers.length === 1) {
    const [b] = blockers;
    let attackerDies = kills(state, b, attacker);
    let blockerDies = kills(state, attacker, b);
    if (blockerDies && strikesFirst(state, attacker) && !strikesFirst(state, b)) attackerDies = false; // it dies before it can strike back
    else if (attackerDies && strikesFirst(state, b) && !strikesFirst(state, attacker)) blockerDies = false;
    if (attackerDies && blockerDies) return { tone: "trade", label: "⚔ Both die", why: `${name(state, b)} and ${name(state, attacker)} kill each other.` };
    if (attackerDies) return { tone: "best", label: `★ ${name(state, attacker)} dies`, why: `${name(state, b)} kills it and survives.` };
    if (blockerDies) return { tone: "chump", label: `💔 ${name(state, b)} dies`, why: `It stops the damage, but dies without killing ${name(state, attacker)}.` };
    return { tone: "good", label: "🛡 Stopped, nobody dies", why: "No damage gets through, and both creatures survive." };
  }
  // Several blockers: their damage adds up, and the attacker splits its own damage among them, smallest first.
  const attackerDies =
    !has(state, attacker, "indestructible") &&
    (blockers.some((b) => has(state, b, "deathtouch") && powerOf(state, b) > 0) || blockers.reduce((n, b) => n + Math.max(0, powerOf(state, b)), 0) >= lifeLeft(state, attacker));
  let damage = powerOf(state, attacker);
  let killed = 0;
  for (const b of [...blockers].sort((x, y) => lifeLeft(state, x) - lifeLeft(state, y))) {
    const need = has(state, attacker, "deathtouch") ? 1 : lifeLeft(state, b);
    if (has(state, b, "indestructible") || damage < need) continue;
    damage -= need;
    killed++;
  }
  const lost = `${killed} of your blockers`;
  if (attackerDies && killed > 0) return { tone: "trade", label: `⚔ It dies, and takes ${lost}`, why: `Together they kill ${name(state, attacker)}, but it can split its damage to kill ${lost}.` };
  if (attackerDies) return { tone: "best", label: `★ ${name(state, attacker)} dies`, why: "Together they kill it, and none of them dies." };
  if (killed > 0) return { tone: "chump", label: `💔 It survives, and can kill ${lost}`, why: `Together they don't deal enough to kill ${name(state, attacker)}.` };
  return { tone: "good", label: "🛡 Stopped, nobody dies", why: "No damage gets through, and nobody dies." };
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
  const legal = attackers.filter((a) => canBlock(state, me, blocker.card.iid, a.card.iid).ok);
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
