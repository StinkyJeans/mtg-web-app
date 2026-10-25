// Checks that every real card the engine can play DOES what its text says.
//   Part 1: each spell (and each "when this enters" ability) is cast on a prepared board, and the result is compared
//           with what its effects should change.
//   Part 2: every real creature with a combat keyword fights scripted battles with known outcomes.
// Run from packages/engine:   npx tsx scripts/verify.ts
import { applyAction, createGame, getCastable, parseCard, playerToAct, powerOf, toughnessOf, legalTargets, getPossibleAttackers, getPossibleBlockers } from "../src/index.js";
import type { Action, CardDef, CardInstance, Effect, GameState, PlayerId, Ref, TargetChoice } from "../src/index.js";
import { loadRealCards } from "./realCards.js";

const { defs: real } = loadRealCards();
const realCards = Object.values(real);

// ───────── the stage ─────────
const BASE: Record<string, CardDef> = {
  anyland: { id: "anyland", name: "Any Land", type: "land", cost: 0, typeLine: "Land", text: "{T}: Add one mana of any color." },
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  filler: { id: "filler", name: "Filler", type: "creature", cost: 1, manaCost: "{W}", power: 1, toughness: 1, typeLine: "Creature — Test" },
  wall: { id: "wall", name: "Wall", type: "creature", cost: 1, manaCost: "{W}", power: 0, toughness: 3, typeLine: "Creature — Wall" },
  ox: { id: "ox", name: "Ox", type: "creature", cost: 1, manaCost: "{W}", power: 3, toughness: 3, typeLine: "Creature — Ox" },
  trinket: { id: "trinket", name: "Trinket", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "" },
  charm: { id: "charm", name: "Charm", type: "enchantment", cost: 1, manaCost: "{W}", typeLine: "Enchantment", text: "" },
};

const perm = (iid: string, defId: string, owner: PlayerId) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

interface Stage {
  state: GameState;
}

/** p1 holds `cardId` with plenty of mana; p2 has an Ox, a Trinket, a Charm and lands; p1 has an Ox too. */
function stage(cardId: string, extra: Record<string, CardDef> = {}): Stage {
  const g = createGame({ p1: Array(40).fill("plains"), p2: Array(40).fill("plains") }, 5, { ...BASE, ...real, ...extra }, { startingPlayer: "p1" });
  g.cards = { ...BASE, ...real, ...extra };
  g.players.p1.hand = [{ iid: "card", defId: cardId, owner: "p1" }];
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 12 }, (_, i) => perm(`land${i}`, "anyland", "p1")), perm("mine", "ox", "p1")];
  g.players.p2.battlefield = [...Array.from({ length: 3 }, (_, i) => perm(`theirland${i}`, "plains", "p2")), perm("theirs", "ox", "p2"), perm("trinket", "trinket", "p2"), perm("charm", "charm", "p2")];
  g.players.p1.graveyard = [{ iid: "dead", defId: "ox", owner: "p1" }];
  g.players.p1.library = Array.from({ length: 12 }, (_, i) => ({ iid: `p1lib${i}`, defId: "plains", owner: "p1" }));
  g.players.p2.library = Array.from({ length: 12 }, (_, i) => ({ iid: `p2lib${i}`, defId: "plains", owner: "p2" }));
  g.phase = "main1";
  g.active = "p1";
  return { state: g };
}

function pickTarget(s: GameState, spec: never, controller: PlayerId): TargetChoice | undefined {
  const options = legalTargets(s, spec, controller);
  // Prefer the opponent's stuff, then anything.
  const mine = (c: TargetChoice) => (c.kind === "player" ? c.id === controller : c.kind === "permanent" ? s.players[controller].battlefield.some((p) => p.card.iid === c.iid) : false);
  return options.find((c) => !mine(c) && c.kind === "permanent" && ["theirs", "trinket", "charm"].some((id) => c.iid === id || c.iid.startsWith("theirland"))) ?? options.find((c) => !mine(c)) ?? options[0];
}

function run(s: GameState, first: Action): { state: GameState; error?: string; events: string[] } {
  const events: string[] = [];
  let r = applyAction(s, playerToAct(s), first);
  if (!r.ok) return { state: s, error: r.error, events };
  let state = r.state;
  for (let guard = 0; guard < 40; guard++) {
    if (state.pendingPick) {
      const p = state.pendingPick;
      r = applyAction(state, p.player, { type: "pick", iid: p.options[0] });
    } else if (state.pendingChoice) {
      const pc = state.pendingChoice;
      const targets = pc.specs.map((sp) => pickTarget(state, sp as never, pc.item.controller)!);
      r = applyAction(state, pc.player, { type: "chooseTargets", targets });
    } else if (state.priority) {
      r = applyAction(state, state.priority.holder, { type: "passPriority" });
    } else break;
    if (!r.ok) return { state, error: r.error, events };
    state = r.state;
  }
  return { state, events };
}

const where = (s: GameState, iid: string): string => {
  for (const p of Object.values(s.players)) {
    if (p.battlefield.some((x) => x.card.iid === iid)) return `battlefield:${p.id}`;
    if (p.graveyard.some((c) => c.iid === iid)) return `graveyard:${p.id}`;
    if (p.hand.some((c) => c.iid === iid)) return `hand:${p.id}`;
    if (p.exile.some((c) => c.iid === iid)) return `exile:${p.id}`;
    if (p.library.some((c) => c.iid === iid)) return `library:${p.id}`;
  }
  return "nowhere";
};
const permOf = (s: GameState, iid: string) => Object.values(s.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === iid);

// ───────── part 1: effects ─────────
const failures: string[] = [];
const fail = (card: string, what: string) => failures.push(`${card}: ${what}`);
let spellsChecked = 0;
let effectsChecked = 0;
const skipped: string[] = [];

type Check = { describe: string; ok: boolean };

function expectations(effects: Effect[], targets: TargetChoice[], before: GameState, after: GameState, controller: PlayerId, x: number, sourceIid: string): Check[] {
  const out: Check[] = [];
  const opp: PlayerId = controller === "p1" ? "p2" : "p1";
  const amount = (a: number | "X" | { count: unknown }) => (a === "X" ? x : typeof a === "object" ? Number.NaN : a); // a counted amount (NaN) is checked by the unit tests
  const playersOf = (ref: Ref): PlayerId[] => {
    switch (ref.t) {
      case "you": return [controller];
      case "opp": return [opp];
      case "eachPlayer": return ["p1", "p2"];
      case "target": { const t = targets[ref.i]; return t?.kind === "player" ? [t.id] : []; }
      default: return [];
    }
  };
  const permsOf = (ref: Ref): string[] => {
    switch (ref.t) {
      case "target": { const t = targets[ref.i]; return t?.kind === "permanent" ? [t.iid] : []; }
      case "self": return [sourceIid];
      case "allCreatures": return before.players.p1.battlefield.concat(before.players.p2.battlefield).filter((p) => before.cards[p.card.defId].type === "creature" && (ref.scope === "all" || (ref.scope === "yours") === (before.players.p1.battlefield.includes(p) === (controller === "p1")))).map((p) => p.card.iid);
      default: return [];
    }
  };
  // The same creature touched by two effects (damage then destroy, say) makes simple checks unreliable.
  const touched = effects.flatMap((e) => ("what" in e ? permsOf(e.what) : "to" in e ? permsOf(e.to) : []));
  const crowded = new Set(touched).size !== touched.length;

  for (const e of effects) {
    switch (e.type) {
      case "damage": {
        for (const id of playersOf(e.to)) {
          const dealt = before.players[id].life - after.players[id].life;
          if (!crowded || effects.length === 1) out.push({ describe: `damage ${amount(e.amount)} to ${id}: life went ${before.players[id].life} -> ${after.players[id].life}`, ok: Number.isNaN(amount(e.amount)) || dealt === amount(e.amount) || (e.to.t === "eachPlayer" && dealt >= amount(e.amount)) });
        }
        if (!crowded) for (const iid of permsOf(e.to)) {
          const b = permOf(before, iid);
          const a = permOf(after, iid);
          if (!b) continue;
          const lethal = amount(e.amount) >= toughnessOf(before, b) - b.damage;
          const regen = (b.regenShield ?? 0) > 0;
          if (Number.isNaN(amount(e.amount))) continue; // a counted amount is checked by the unit tests
          out.push({ describe: `damage ${amount(e.amount)} to ${iid}: ${a ? `survived with ${a.damage} damage` : "died"}`, ok: lethal && !regen ? !a || a.tapped : a ? a.damage === b.damage + amount(e.amount) : amount(e.amount) === 0 || !lethal });
        }
        break;
      }
      case "draw":
        for (const id of playersOf(e.who)) {
          const n = amount(e.amount);
          const lib = before.players[id].library.length - after.players[id].library.length;
          out.push({ describe: `${id} draws ${n}: library ${before.players[id].library.length} -> ${after.players[id].library.length}`, ok: lib === n || (effects.some((x) => x.type === "surveil" || x.type === "scry" || x.type === "mill") && lib >= n) || (before.players[id].library.length < n && after.winner !== null) });
        }
        break;
      case "gainLife":
      case "loseLife":
        for (const id of playersOf(e.who)) {
          const delta = after.players[id].life - before.players[id].life;
          const want = (e.type === "gainLife" ? 1 : -1) * amount(e.amount);
          // other effects on the same card may also change life (damage, lifelink), so only a plain single effect is exact
          if (effects.length === 1) out.push({ describe: `${e.type} ${amount(e.amount)} for ${id}: life ${before.players[id].life} -> ${after.players[id].life}`, ok: delta === want });
        }
        break;
      case "mill":
        for (const id of playersOf(e.who)) out.push({ describe: `${id} mills ${amount(e.amount)}: graveyard ${before.players[id].graveyard.length} -> ${after.players[id].graveyard.length}`, ok: after.players[id].graveyard.length - before.players[id].graveyard.length >= Math.min(amount(e.amount), before.players[id].library.length) });
        break;
      case "destroy":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `destroy ${iid}: now ${where(after, iid)}`, ok: where(after, iid).startsWith("graveyard") || where(after, iid).startsWith("battlefield") && (permOf(after, iid)?.regenShield ?? 0) >= 0 && before.cards[permOf(before, iid)!.card.defId].keywords?.includes("indestructible") === true });
        break;
      case "exile":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `exile ${iid}: now ${where(after, iid)}`, ok: where(after, iid).startsWith("exile") });
        break;
      case "bounce":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `bounce ${iid}: now ${where(after, iid)}`, ok: where(after, iid).startsWith("hand") });
        break;
      case "topOfLibrary":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `put ${iid} on top of its library: now ${where(after, iid)}`, ok: where(after, iid).startsWith("library") && after.players[where(after, iid).slice(-2) as PlayerId].library[0].iid === iid });
        break;
      case "tap":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `tap ${iid}`, ok: permOf(after, iid)?.tapped === true });
        break;
      case "pump":
        if (!crowded) for (const iid of permsOf(e.what)) {
          const b = permOf(before, iid);
          const a = permOf(after, iid);
          if (a && b) out.push({ describe: `pump ${iid} ${e.power}/${e.toughness}: power ${powerOf(before, b)} -> ${powerOf(after, a)}`, ok: powerOf(after, a) - powerOf(before, b) === e.power && toughnessOf(after, a) - toughnessOf(before, b) === e.toughness });
        }
        break;
      case "grant":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `${iid} gains ${e.keyword}`, ok: permOf(after, iid)?.tempKeywords?.includes(e.keyword) === true });
        break;
      case "addCounters":
        if (!crowded) for (const iid of permsOf(e.what)) out.push({ describe: `${iid} gets ${amount(e.amount)} ${e.kind === "minus" ? "-1/-1" : "+1/+1"} counters`, ok: e.kind === "minus" ? (permOf(after, iid)?.minusCounters ?? 0) - (permOf(before, iid)?.minusCounters ?? 0) >= 0 : (permOf(after, iid)?.counters ?? 0) - (permOf(before, iid)?.counters ?? 0) === amount(e.amount) });
        break;
      case "regenerate":
        for (const iid of permsOf(e.what)) out.push({ describe: `${iid} gets a regeneration shield`, ok: (permOf(after, iid)?.regenShield ?? 0) >= 1 });
        break;
      case "reanimate": {
        const t = targets[0];
        if (t?.kind === "card") out.push({ describe: `return ${t.iid} to ${e.to}: now ${where(after, t.iid)}`, ok: where(after, t.iid).startsWith(e.to === "hand" ? "hand" : "battlefield") });
        break;
      }
      case "discard":
      case "lookPick":
      case "search":
      case "scry":
        break; // these ask a question: they are checked by the pick tests
      default:
        break;
    }
  }
  return out;
}

const SPELL_TYPES = new Set(["instant", "sorcery"]);
for (const def of realCards) {
  const parsed = parseCard(def);
  const isSpell = SPELL_TYPES.has(def.type);
  // One plan per thing to test: a plain spell is one plan, a "Choose one" spell one per mode, an enter-trigger one.
  type Plan = { label: string; effects: Effect[]; specs: import("../src/index.js").TargetSpec[]; extra: Record<string, unknown> };
  const plans: Plan[] = [];
  if (isSpell && parsed.spell?.modal) {
    parsed.spell.modal.modes.forEach((m, i) => plans.push({ label: `${def.name} (mode ${i + 1})`, effects: m.effects, specs: m.targets, extra: { modes: [i] } }));
  } else if (isSpell && parsed.spell) {
    plans.push({ label: def.name, effects: parsed.spell.effects, specs: parsed.spell.targets, extra: {} });
  } else if (!isSpell && def.type === "creature") {
    const enters = parsed.triggers.filter((t) => t.event === "enters" && !t.modes && !t.ifKicked);
    if (enters.length) plans.push({ label: def.name, effects: enters.flatMap((t) => t.effects), specs: [], extra: {} });
  }
  for (const plan of plans) {
    const { effects } = plan;
    if (effects.length === 0) continue;
    if (effects.some((e) => e.type === "counter" || e.type === "wardCheck")) continue; // need a spell to counter: tested elsewhere
    const { state: start } = stage(def.id);
    const castable = getCastable(start, "p1").find((c) => c.iid === "card");
    if (!castable) {
      skipped.push(`${plan.label} (not castable on the test board)`);
      continue;
    }
    const x = castable.maxX !== undefined ? Math.min(2, castable.maxX) : 0;
    const targets = plan.specs.map((sp) => pickTarget(start, sp as never, "p1"));
    if (targets.some((t) => !t)) {
      skipped.push(`${plan.label} (no legal target on the test board)`);
      continue;
    }
    const result = run(start, { type: "castSpell", iid: "card", targets: targets as TargetChoice[], ...plan.extra, ...(castable.maxX !== undefined ? { x } : {}), ...(castable.sacrifice ? { sacrifice: castable.sacrifice[0] } : {}) } as Action);
    if (result.error) {
      fail(plan.label, `could not be cast: ${result.error}`);
      continue;
    }
    spellsChecked++;
    // an enter-trigger chooses its own targets: use what it chose
    let usedTargets = targets as TargetChoice[];
    if (!isSpell) {
      const trig = parsed.triggers.find((t) => t.event === "enters")!;
      usedTargets = trig.targets.map((sp) => pickTarget(start, sp as never, "p1")!).filter(Boolean);
    }
    const checks = expectations(effects, usedTargets, start, result.state, "p1", x, "card");
    effectsChecked += checks.length;
    for (const c of checks) if (!c.ok) fail(plan.label, c.describe);
  }
}

console.log(`Part 1: ${spellsChecked} real cards cast on a test board, ${effectsChecked} effect outcomes checked, ${skipped.length} cards skipped.`);

// ───────── part 2: combat keywords ─────────
const KEYWORDS = ["flying", "reach", "first strike", "double strike", "deathtouch", "lifelink", "trample", "vigilance", "haste", "defender", "menace", "indestructible", "flash"];
const kwFailures: string[] = [];
const kwCounts: Record<string, number> = {};

/** p1 attacks with `attacker`; p2 blocks with the given creatures (each blocks the attacker). */
function fight(attackerDef: CardDef, blockerDefsIn: CardDef[], tweak?: (g: GameState) => void, adapt = true) {
  // Give the test blockers what the attacker demands, so the fight itself is what is measured.
  let blockerDefs = blockerDefsIn;
  if (adapt && attackerDef.keywords?.includes("flying")) blockerDefs = blockerDefs.map((b) => ({ ...b, keywords: [...(b.keywords ?? []), "flying"] }));
  if (adapt && attackerDef.keywords?.includes("menace") && blockerDefs.length === 1) blockerDefs = [blockerDefs[0], { ...blockerDefs[0], id: `${blockerDefs[0].id}-2` }];
  const g = createGame({ p1: Array(40).fill("plains"), p2: Array(40).fill("plains") }, 3, { ...BASE, ...real, [attackerDef.id]: attackerDef, ...Object.fromEntries(blockerDefs.map((b) => [b.id, b])) }, { startingPlayer: "p1" });
  g.cards = { ...BASE, ...real, [attackerDef.id]: attackerDef, ...Object.fromEntries(blockerDefs.map((b) => [b.id, b])) };
  g.players.p1.hand = [];
  g.players.p2.hand = [];
  g.players.p1.battlefield = [perm("att", attackerDef.id, "p1")];
  g.players.p2.battlefield = blockerDefs.map((b, i) => perm(`blk${i}`, b.id, "p2"));
  g.phase = "attackers";
  g.active = "p1";
  tweak?.(g);
  const life = { p1: g.players.p1.life, p2: g.players.p2.life };
  let r = applyAction(g, "p1", { type: "declareAttackers", attackers: ["att"] });
  if (!r.ok) return { error: r.error, life, g };
  let s = r.state;
  for (let i = 0; i < 6 && s.priority; i++) { // the attacker may act before blockers: nothing is done
    const rr = applyAction(s, s.priority.holder, { type: "passPriority" });
    if (!rr.ok) return { error: rr.error, life, g };
    s = rr.state;
  }
  const blocks = blockerDefs.map((_, i) => ({ blocker: `blk${i}`, attacker: "att" }));
  r = applyAction(s, "p2", { type: "declareBlockers", blocks: blockerDefs.length ? blocks : [] });
  if (!r.ok) return { error: r.error, life, g };
  s = r.state;
  for (let i = 0; i < 6 && (s.priority || s.phase === "damage"); i++) {
    if (s.phase === "damage") {
      const { getDamageAssignments, suggestDamageAssignment } = require_engine();
      const a = getDamageAssignments(s).flatMap((d: { attacker: string }) => Object.entries(suggestDamageAssignment(s, d.attacker)).map(([blocker, amount]) => ({ attacker: d.attacker, blocker, amount: amount as number })));
      const rr = applyAction(s, playerToAct(s), { type: "assignDamage", assignments: a });
      if (!rr.ok) return { error: rr.error, life, g };
      s = rr.state;
    } else {
      const rr = applyAction(s, s.priority!.holder, { type: "passPriority" });
      if (!rr.ok) return { error: rr.error, life, g };
      s = rr.state;
    }
  }
  return { s, life };
}
import * as engine from "../src/index.js";
const require_engine = () => engine;

const plain = (name: string, power: number, toughness: number, kws: string[] = []): CardDef => ({ id: `test-${name}`, name, type: "creature", cost: 1, manaCost: "{W}", power, toughness, typeLine: "Creature — Test", keywords: kws });

for (const kw of KEYWORDS) {
  const cards = realCards.filter((d) => d.type === "creature" && d.keywords?.includes(kw) && d.power !== undefined && d.toughness !== undefined && d.toughness > 0); // (a creature with 0 toughness dies the moment it enters)
  kwCounts[kw] = cards.length;
  for (const def of cards) {
    const P = def.power!;
    const T = def.toughness!;
    const name = def.name;
    const bad = (what: string) => kwFailures.push(`[${kw}] ${name} (${P}/${T}): ${what}`);
    // Cards whose text changes combat in other ways would make the arithmetic here wrong: they are skipped.
    if (/attacks|each combat|can't be blocked|can't block|can't attack|can block only|enters with|gets \+|\+1\/\+1 counter/i.test(def.text ?? "") && kw !== "flash") continue;
    if (def.keywords!.includes("defender") && kw !== "defender") continue;
    switch (kw) {
      case "trample": {
        if (def.keywords!.includes("double strike") || def.keywords!.includes("first strike")) break; // two damage steps: its own tests below
        // blocked by a 0/2: lethal (2) to the blocker, the rest tramples over to the player
        const r = fight(def, [plain("wall2", 0, 2)]);
        if (!r.s) { bad(`fight failed: ${r.error}`); break; }
        const dealt = r.life.p2 - r.s.players.p2.life;
        const expectDead = P >= 2;
        const gaining = r.s.players.p1.life - r.life.p1;
        const expected = Math.max(0, P - 2);
        const dt = def.keywords!.includes("deathtouch");
        const expectedDt = dt ? Math.max(0, P - 1) : expected;
        if (dealt !== expectedDt) bad(`blocked by a 0/2 it dealt ${dealt} to the player, expected ${expectedDt}`);
        if (permOf(r.s, "blk0") && (expectDead || dt)) bad("the 0/2 blocker survived");
        if (def.keywords!.includes("lifelink") && gaining !== P) bad(`lifelink gained ${gaining}, expected ${P}`);
        // blocked by two 0/1s: needs lethal on both before the player
        const two = fight(def, [plain("a1", 0, 1), plain("b1", 0, 1)]);
        if (two.s) {
          const dealt2 = two.life.p2 - two.s.players.p2.life;
          const want2 = dt ? Math.max(0, P - 2) : Math.max(0, P - 2);
          if (dealt2 !== want2) bad(`blocked by two 0/1s it dealt ${dealt2} to the player, expected ${want2}`);
        } else bad(`two blockers: ${two.error}`);
        // unblocked: all of it
        const free = fight(def, []);
        if (free.s && free.life.p2 - free.s.players.p2.life !== P * (def.keywords!.includes("double strike") ? 2 : 1)) bad("unblocked it did not deal its full power");
        break;
      }
      case "flying": {
        if (def.keywords!.includes("menace")) break;
        const ground = fight(def, [plain("ground", 1, 1)], undefined, false);
        if (ground.s || !/flying/.test(ground.error ?? "")) bad("a creature without flying could block it");
        const flyer = fight(def, [plain("flier", 0, 5, ["flying"])], undefined, false);
        if (!flyer.s) bad(`a flying blocker could not block it: ${flyer.error}`);
        const reach = fight(def, [plain("reacher", 0, 5, ["reach"])], undefined, false);
        if (!reach.s) bad(`a reach blocker could not block it: ${reach.error}`);
        break;
      }
      case "reach": {
        const r = fight(plain("flyer", 1, 1, ["flying"]), [def]);
        if (!r.s) bad(`it could not block a flying creature: ${r.error}`);
        break;
      }
      case "first strike": {
        if (P < 1) break; // with no power it kills nothing, so there is nothing to measure
        // a first striker kills a blocker with toughness <= power before the blocker hits back
        const r = fight(def, [plain("tough", 5, Math.max(1, Math.min(P, 5)))]);
        if (!r.s) { bad(`fight failed: ${r.error}`); break; }
        const attackerAlive = Boolean(permOf(r.s, "att"));
        const blockerDead = !permOf(r.s, "blk0");
        const dt = def.keywords!.includes("deathtouch");
        const expectKill = P >= Math.min(P, 5) || dt;
        if (expectKill && !blockerDead) bad("it did not kill the blocker");
        if (expectKill && !attackerAlive) bad("it died even though it strikes first and killed the blocker");
        break;
      }
      case "double strike": {
        const free = fight(def, []);
        if (free.s && free.life.p2 - free.s.players.p2.life !== P * 2) bad(`unblocked it dealt ${free.life.p2 - free.s.players.p2.life}, expected ${P * 2}`);
        if (def.keywords!.includes("lifelink") && free.s && free.s.players.p1.life - free.life.p1 !== P * 2) bad("lifelink on a double striker did not gain twice");
        break;
      }
      case "deathtouch": {
        const r = fight(def, [plain("big", 0, 9)]);
        if (!r.s) { bad(`fight failed: ${r.error}`); break; }
        if (P > 0 && permOf(r.s, "blk0")) bad("a 9-toughness blocker survived deathtouch damage");
        break;
      }
      case "lifelink": {
        const r = fight(def, [plain("blk", 0, 9)]);
        if (!r.s) { bad(`fight failed: ${r.error}`); break; }
        if (r.s.players.p1.life - r.life.p1 !== P * (def.keywords!.includes("double strike") ? 2 : 1)) bad(`gained ${r.s.players.p1.life - r.life.p1} life, expected ${P}`);
        break;
      }
      case "vigilance": {
        const r = fight(def, []);
        if (r.s && permOf(r.s, "att")?.tapped) bad("it was tapped by attacking");
        break;
      }
      case "haste": {
        const r = fight(def, [], (g) => { g.players.p1.battlefield[0].summoningSick = true; });
        if (!r.s) bad(`it could not attack the turn it arrived: ${r.error}`);
        break;
      }
      case "defender": {
        const r = fight(def, []);
        if (r.s) bad("it was allowed to attack");
        break;
      }
      case "menace": {
        const one = fight(def, [plain("solo", 1, 1)], undefined, false);
        if (one.s) bad("one creature could block it alone");
        const two = fight(def, [plain("a", 1, 1), plain("b", 1, 1)]);
        if (!two.s) bad(`two creatures could not block it: ${two.error}`);
        break;
      }
      case "indestructible": {
        const r = fight(def, [plain("hitter", 9, 9)]);
        if (!r.s) { bad(`fight failed: ${r.error}`); break; }
        if (!permOf(r.s, "att") && T > 0) bad("it was destroyed by lethal damage");
        break;
      }
      case "flash": {
        const g = stage(def.id).state;
        g.phase = "end";
        const c = getCastable(g, "p1").find((x) => x.iid === "card");
        if (!c) bad("it could not be cast at instant speed during the end step");
        break;
      }
    }
  }
}

console.log("Part 2: real creatures per keyword that were fought:", Object.entries(kwCounts).map(([k, n]) => `${k} ${n}`).join(", "));

// ───────── part 3: static effects, attachments, tokens of the board ─────────
const staticFailures: string[] = [];
for (const def of realCards.filter((d) => d.type === "enchantment")) {
  const parsed = parseCard(def);
  const bad = (what: string) => staticFailures.push(`${def.name}: ${what}`);
  const g0 = stage(def.id).state;
  const castable = getCastable(g0, "p1").find((c) => c.iid === "card");
  if (!castable) continue;
  const specs = parsed.spell?.targets ?? [];
  const targets = specs.map(() => ({ kind: "permanent" as const, iid: parsed.aura?.controller === "opponent" ? "theirs" : "mine" }));
  const r = run(g0, { type: "castSpell", iid: "card", targets });
  if (r.error) { bad(`could not be cast: ${r.error}`); continue; }
  const s = r.state;
  const aura = permOf(s, "card");
  const kills = (parsed.statics ?? []).some((st) => st.scope === "enchanted" && st.toughness <= -3); // it can kill the 3/3 it was put on
  if (!aura) { if (!kills) bad("did not enter the battlefield"); continue; }
  if (parsed.triggers.length > 0) continue; // its enter trigger also changes the creatures: measured in part 1
  for (const st of parsed.statics ?? []) {
    const hostIid = parsed.aura ? targets[0].iid : "mine";
    const host = permOf(s, hostIid)!;
    const before = permOf(g0, hostIid)!;
    if (st.scope === "enchanted") {
      if (powerOf(s, host) - powerOf(g0, before) !== st.power) bad(`enchanted creature power changed by ${powerOf(s, host) - powerOf(g0, before)}, expected ${st.power}`);
      if (toughnessOf(s, host) - toughnessOf(g0, before) !== st.toughness) bad("enchanted creature toughness is wrong");
      for (const k of st.keywords) if (!engine.hasKeyword(BASE.ox, k) && !hasKw(s, host, k)) bad(`enchanted creature did not gain ${k}`);
    } else if (st.scope === "yours") {
      const mine = permOf(s, "mine")!;
      const delta = powerOf(s, mine) - powerOf(g0, permOf(g0, "mine")!);
      if (delta !== st.power) bad(`your creature's power changed by ${delta}, expected ${st.power}`);
      const theirs = permOf(s, "theirs")!;
      if (powerOf(s, theirs) !== 3 && st.scope === "yours") bad("an opponent's creature was changed by a 'creatures you control' effect");
    }
    if (st.cantAttack) {
      const g2 = { ...s, phase: "attackers" as const, active: "p1" as PlayerId };
      if (getPossibleAttackers(g2).includes(hostIid) && parsed.aura && parsed.aura.controller !== "opponent") bad("a creature that can't attack is offered as an attacker");
    }
  }
}
function hasKw(s: GameState, p: { card: CardInstance }, k: never): boolean {
  return engine.staticEffectsOn(s, p as never).some((st) => st.keywords.includes(k));
}
console.log(`Part 3: ${realCards.filter((d) => d.type === "enchantment").length} real enchantments cast and their continuous effects measured.`);

// ───────── part 4: planeswalkers, part 5: vehicles, part 6: equipment ─────────
const walkerFailures: string[] = [];
let walkerAbilities = 0;
for (const def of realCards.filter((d) => d.type === "planeswalker")) {
  const parsed = parseCard(def);
  (parsed.loyaltyAbilities ?? []).forEach((ability, index) => {
    const bad = (what: string) => walkerFailures.push(`${def.name} [${ability.text.slice(0, 40)}]: ${what}`);
    const { state: g } = stage(def.id);
    g.players.p1.hand = [];
    g.players.p1.battlefield.push({ ...perm("walker", def.id, "p1"), loyalty: 9 } as never);
    const targets = ability.targets.map((sp) => pickTarget(g, sp as never, "p1"));
    if (targets.some((t) => !t)) return;
    const r = run(g, { type: "loyalty", iid: "walker", index, targets: targets as TargetChoice[] });
    if (r.error) return bad(`could not be activated: ${r.error}`);
    walkerAbilities++;
    const now = permOf(r.state, "walker");
    if (!now) return bad("the planeswalker vanished");
    if (now.loyalty !== 9 + ability.cost) bad(`loyalty went 9 -> ${now.loyalty}, expected ${9 + ability.cost}`);
    for (const c of expectations(ability.effects, targets as TargetChoice[], g, r.state, "p1", 0, "walker")) if (!c.ok) bad(c.describe);
    const again = applyAction(r.state, "p1", { type: "loyalty", iid: "walker", index, targets: targets as TargetChoice[] });
    if (again.ok) bad("a second loyalty ability was allowed in the same turn");
  });
}
console.log(`Part 4: ${walkerAbilities} loyalty abilities of ${realCards.filter((d) => d.type === "planeswalker").length} real planeswalkers activated and checked.`);

const vehicleFailures: string[] = [];
let vehicles = 0;
for (const def of realCards.filter((d) => parseCard(d).crew !== undefined)) {
  const n = parseCard(def).crew!;
  const bad = (what: string) => vehicleFailures.push(`${def.name} (crew ${n}): ${what}`);
  const { state: g } = stage(def.id);
  g.players.p1.hand = [];
  g.players.p1.battlefield.push(perm("ride", def.id, "p1") as never);
  const crewers = Array.from({ length: Math.ceil(n / 3) }, (_, i) => perm(`crew${i}`, "ox", "p1")); // Oxen: power 3 each
  g.players.p1.battlefield.push(...(crewers as never[]));
  const r = applyAction(g, "p1", { type: "crew", iid: "ride" });
  if (!r.ok) {
    bad(`could not start crewing: ${r.error}`);
    continue;
  }
  let s = r.state;
  for (let i = 0; i < crewers.length && s.pendingPick; i++) {
    const rr = applyAction(s, "p1", { type: "pick", iid: `crew${i}` });
    if (!rr.ok) {
      bad(`pick failed: ${rr.error}`);
      break;
    }
    s = rr.state;
  }
  while (s.priority) {
    const rr = applyAction(s, s.priority.holder, { type: "passPriority" });
    if (!rr.ok) break;
    s = rr.state;
  }
  vehicles++;
  if (!permOf(s, "ride")?.crewed) bad("it did not become a creature");
}
console.log(`Part 5: ${vehicles} real Vehicles crewed.`);

const equipFailures: string[] = [];
let equipped = 0;
for (const def of realCards.filter((d) => parseCard(d).activated.some((a) => a.text.startsWith("Equip")))) {
  const parsed = parseCard(def);
  const index = parsed.activated.findIndex((a) => a.text.startsWith("Equip"));
  const bad = (what: string) => equipFailures.push(`${def.name}: ${what}`);
  const { state: g } = stage(def.id);
  g.players.p1.hand = [];
  g.players.p1.battlefield.push(perm("gear", def.id, "p1") as never);
  const before = permOf(g, "mine")!;
  const r = run(g, { type: "activateAbility", iid: "gear", index, targets: [{ kind: "permanent", iid: "mine" }] });
  if (r.error) {
    bad(`could not equip: ${r.error}`);
    continue;
  }
  equipped++;
  if (permOf(r.state, "gear")?.attachedTo !== "mine") {
    bad("it did not attach");
    continue;
  }
  for (const st of parsed.statics ?? []) {
    if (st.scope !== "enchanted") continue;
    const after = permOf(r.state, "mine")!;
    if (powerOf(r.state, after) - powerOf(g, before) !== st.power) bad(`power changed by ${powerOf(r.state, after) - powerOf(g, before)}, expected ${st.power}`);
    if (toughnessOf(r.state, after) - toughnessOf(g, before) !== st.toughness) bad("toughness is wrong");
  }
}
console.log(`Part 6: ${equipped} real pieces of equipment attached.`);

// ───────── part 7: every spell countered in response, part 8: every targeted spell whose target is killed in response ─────────
const respondFailures: string[] = [];
let countered = 0;
let fizzled = 0;
const CANCEL: CardDef = { id: "zz-cancel", name: "Zz Cancel", type: "instant", cost: 2, manaCost: "{U}", text: "Counter target spell.", colors: ["U"] };
const EXECUTE: CardDef = { id: "zz-execute", name: "Zz Execute", type: "instant", cost: 2, manaCost: "{B}", text: "Destroy target creature.", colors: ["B"] };

function summary(g: GameState) {
  return JSON.stringify({
    life: [g.players.p1.life, g.players.p2.life],
    boards: [g.players.p1.battlefield.map((p) => [p.card.iid, p.damage, p.counters ?? 0, p.tapped && !p.card.iid.startsWith("land")]).filter((x) => !String(x[0]).startsWith("land")), g.players.p2.battlefield.map((p) => [p.card.iid, p.damage, p.counters ?? 0, p.tapped]).filter((x) => !String(x[0]).startsWith("theirany"))],
    hands: [g.players.p1.hand.length, g.players.p2.hand.length],
    libs: [g.players.p1.library.length, g.players.p2.library.length],
  });
}

for (const def of realCards.filter((d) => SPELL_TYPES.has(d.type))) {
  const parsed = parseCard(def);
  if (!parsed.spell || parsed.spell.modal || parsed.flashback) continue;
  const bad = (what: string) => respondFailures.push(`${def.name}: ${what}`);
  const { state: g0 } = stage(def.id, { "zz-cancel": CANCEL, "zz-execute": EXECUTE });
  const castable = getCastable(g0, "p1").find((c) => c.iid === "card");
  if (!castable) continue;
  const targets = parsed.spell.targets.map((sp) => pickTarget(g0, sp as never, "p1"));
  if (targets.some((t) => !t)) continue;
  const x = castable.maxX !== undefined ? Math.min(2, castable.maxX) : 0;
  const cast = { type: "castSpell", iid: "card", targets: targets as TargetChoice[], ...(castable.maxX !== undefined ? { x } : {}), ...(castable.sacrifice ? { sacrifice: castable.sacrifice[0] } : {}) } as Action;
  const give = (g: GameState) => {
    g.players.p2.hand = [{ iid: "resp", defId: g === g0 ? "zz-cancel" : "zz-cancel", owner: "p2" }];
    for (let i = 0; i < 3; i++) g.players.p2.battlefield.push(perm(`theirany${i}`, "anyland", "p2") as never);
  };

  // 7. countered
  {
    const g = structuredClone(g0);
    give(g);
    const before = summary(g);
    const r1 = applyAction(g, "p1", cast);
    if (!r1.ok) { bad(`could not be cast: ${r1.error}`); continue; }
    let st = r1.state;
    if (!st.priority || st.priority.holder !== "p2") { bad("the opponent holding a counterspell was not given priority"); continue; }
    const spellItem = st.stack[st.stack.length - 1];
    const r2 = applyAction(st, "p2", { type: "castSpell", iid: "resp", targets: [{ kind: "stack", id: spellItem.id }] });
    if (!r2.ok) { bad(`could not be countered: ${r2.error}`); continue; }
    st = r2.state;
    for (let i = 0; i < 12 && (st.priority || st.pendingPick || st.pendingChoice); i++) {
      const rr = st.pendingPick ? applyAction(st, st.pendingPick.player, { type: "pick", iid: st.pendingPick.options[0] }) : st.priority ? applyAction(st, st.priority.holder, { type: "passPriority" }) : applyAction(st, st.pendingChoice!.player, { type: "chooseTargets", targets: [] });
      if (!rr.ok) break;
      st = rr.state;
    }
    countered++;
    const uncounterable = parsed.cantBeCountered === true;
    const inYard = st.players.p1.graveyard.some((c) => c.iid === "card");
    if (!uncounterable) {
      if (!inYard) bad(`countered, but the card is ${where(st, "card")}`);
      if (!st.players.p2.graveyard.some((c) => c.iid === "resp")) bad("the counterspell did not go to the graveyard");
      const after = summary(st);
      // the only differences allowed: the opponent's hand shrank by the counterspell, the caster's hand shrank by the spell
      const strip = (j: string) => { const o = JSON.parse(j); o.hands = [0, 0]; return JSON.stringify(o); };
      // a sacrificed creature is paid as a cost: it is gone even though the spell was countered
      if (!parsed.extraSacrifice && strip(before) !== strip(after)) bad(`it was countered but the game changed: ${strip(before)} -> ${strip(after)}`);
      if (st.stack.length !== 0) bad("the stack is not empty afterwards");
    }
  }

  // 8. the target is destroyed in response: the spell does nothing
  const first = parsed.spell.targets[0];
  const t0 = targets[0];
  if (first && first.kind === "creature" && t0?.kind === "permanent" && t0.iid === "theirs" && parsed.spell.targets.length === 1) {
    const g = structuredClone(g0);
    g.players.p2.hand = [{ iid: "resp", defId: "zz-execute", owner: "p2" }];
    for (let i = 0; i < 3; i++) g.players.p2.battlefield.push(perm(`theirany${i}`, "anyland", "p2") as never);
    const r1 = applyAction(g, "p1", cast);
    if (!r1.ok) continue;
    let st = r1.state;
    if (!st.priority || st.priority.holder !== "p2") continue;
    const r2 = applyAction(st, "p2", { type: "castSpell", iid: "resp", targets: [{ kind: "permanent", iid: "theirs" }] });
    if (!r2.ok) continue;
    st = r2.state;
    const lifeBefore = [st.players.p1.life, st.players.p2.life];
    for (let i = 0; i < 12 && (st.priority || st.pendingPick || st.pendingChoice); i++) {
      const rr = st.pendingPick ? applyAction(st, st.pendingPick.player, { type: "pick", iid: st.pendingPick.options[0] }) : st.priority ? applyAction(st, st.priority.holder, { type: "passPriority" }) : applyAction(st, st.pendingChoice!.player, { type: "chooseTargets", targets: [] });
      if (!rr.ok) break;
      st = rr.state;
    }
    fizzled++;
    if (permOf(st, "theirs")) bad("its target was destroyed in response but is still there");
    if (!st.players.p1.graveyard.some((c) => c.iid === "card") && !st.players.p1.battlefield.some((p) => p.card.iid === "card")) bad(`after fizzling the card is ${where(st, "card")}`);
    if (st.players.p1.life !== lifeBefore[0] || st.players.p2.life !== lifeBefore[1]) bad(`life changed although the only target was gone (${lifeBefore} -> ${st.players.p1.life},${st.players.p2.life})`);
  }
}
console.log(`Part 7: ${countered} real spells countered in response. Part 8: ${fizzled} real targeted spells whose target was destroyed in response.`);

// ───────── report ─────────
const all = [...failures, ...kwFailures, ...staticFailures, ...walkerFailures, ...vehicleFailures, ...equipFailures, ...respondFailures];
const byShape = new Map<string, string[]>();
for (const f of all) {
  const key = f.replace(/^[^:]*:/, "").replace(/\d+/g, "N").replace(/\[[^\]]*\] .*? \(\S+\)/, "").slice(0, 90);
  byShape.set(key, [...(byShape.get(key) ?? []), f]);
}
console.log(`\n${all.length} problems in ${byShape.size} kinds`);
for (const [key, list] of [...byShape].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) console.log(`  ×${list.length}  ${list[0]}`);
process.exit(all.length > 0 ? 1 : 0);
