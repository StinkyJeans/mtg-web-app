import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getDamageAssignments, getPossibleAttackers, playerToAct, suggestDamageAssignment } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const def = (id: string, power: number, toughness: number, keywords: string[] = []): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost: 1,
  power,
  toughness,
  keywords,
});

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  ...Object.fromEntries(
    [
      def("vanilla22", 2, 2),
      def("vanilla44", 4, 4),
      def("big55", 5, 5),
      def("flier22", 2, 2, ["flying"]),
      def("reach13", 1, 3, ["reach"]),
      def("haste21", 2, 1, ["haste"]),
      def("vigil22", 2, 2, ["vigilance"]),
      def("wall05", 0, 5, ["defender"]),
      def("menace22", 2, 2, ["menace"]),
      def("fs22", 2, 2, ["first strike"]),
      def("fs33", 3, 3, ["first strike"]),
      def("ds22", 2, 2, ["double strike"]),
      def("dt11", 1, 1, ["deathtouch"]),
      def("life22", 2, 2, ["lifelink"]),
      def("tr44", 4, 4, ["trample"]),
      def("ind22", 2, 2, ["indestructible"]),
    ].map((d) => [d.id, d]),
  ),
};

const creature = (iid: string, defId: string, owner: PlayerId, sick = false) => ({
  card: { iid, defId, owner } as CardInstance,
  tapped: false,
  summoningSick: sick,
  damage: 0,
});

type Spec = [iid: string, defId: string];

/** p1 has `mine` and p2 has `theirs` on the battlefield, at the start of p1's attackers step. */
function board(mine: Spec[], theirs: Spec[], sick: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = mine.map(([iid, d]) => creature(iid, d, "p1", sick.includes(iid)));
  g.players.p2.battlefield = theirs.map(([iid, d]) => creature(iid, d, "p2"));
  g.phase = "attackers";
  return g;
}

function act(state: GameState, player: PlayerId, action: Action): GameState {
  const r = applyAction(state, player, action);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const error = (state: GameState, player: PlayerId, action: Action) => {
  const r = applyAction(state, player, action);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};

/** p1 attacks with `attackers`, p2 blocks as given. */
function fight(state: GameState, attackers: string[], blocks: [attacker: string, blocker: string][]): GameState {
  let g = act(state, "p1", { type: "declareAttackers", attackers });
  g = act(g, "p2", { type: "declareBlockers", blocks: blocks.map(([attacker, blocker]) => ({ attacker, blocker })) });
  return g;
}
const onBoard = (g: GameState, iid: string) => Object.values(g.players).some((p) => p.battlefield.some((x) => x.card.iid === iid));
const damageOn = (g: GameState, iid: string) => Object.values(g.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === iid)?.damage;

// ───────── attacking: defender, haste, vigilance ─────────

test("defender can't attack", () => {
  const g = board([["w", "wall05"], ["v", "vanilla22"]], []);
  assert.deepEqual(getPossibleAttackers(g), ["v"]);
  assert.match(error(g, "p1", { type: "declareAttackers", attackers: ["w"] }), /defender/);
});

test("haste lets a creature attack the turn it arrives; others can't", () => {
  const g = board([["h", "haste21"], ["v", "vanilla22"]], [], ["h", "v"]);
  assert.deepEqual(getPossibleAttackers(g), ["h"]);
  assert.match(error(g, "p1", { type: "declareAttackers", attackers: ["v"] }), /just arrived/);
  assert.ok(applyAction(g, "p1", { type: "declareAttackers", attackers: ["h"] }).ok);
});

test("vigilance: attacking doesn't tap the creature", () => {
  const g = board([["a", "vigil22"], ["b", "vanilla22"]], []);
  const after = act(g, "p1", { type: "declareAttackers", attackers: ["a", "b"] });
  const tapped = (iid: string) => after.players.p1.battlefield.find((p) => p.card.iid === iid)!.tapped;
  assert.equal(tapped("a"), false);
  assert.equal(tapped("b"), true);
});

// ───────── blocking: flying, reach, menace ─────────

test("only flying or reach creatures can block a flier", () => {
  const g = board([["f", "flier22"]], [["v", "vanilla22"], ["r", "reach13"], ["f2", "flier22"]]);
  const attacked = act(g, "p1", { type: "declareAttackers", attackers: ["f"] });
  assert.match(error(attacked, "p2", { type: "declareBlockers", blocks: [{ attacker: "f", blocker: "v" }] }), /flying/);
  assert.ok(applyAction(attacked, "p2", { type: "declareBlockers", blocks: [{ attacker: "f", blocker: "r" }] }).ok);
  assert.ok(applyAction(attacked, "p2", { type: "declareBlockers", blocks: [{ attacker: "f", blocker: "f2" }] }).ok);
});

test("menace: one blocker is not enough, two or none are fine", () => {
  const g = board([["m", "menace22"]], [["a", "vanilla22"], ["b", "vanilla22"]]);
  const attacked = act(g, "p1", { type: "declareAttackers", attackers: ["m"] });
  assert.match(error(attacked, "p2", { type: "declareBlockers", blocks: [{ attacker: "m", blocker: "a" }] }), /menace/);
  assert.ok(applyAction(attacked, "p2", { type: "declareBlockers", blocks: [{ attacker: "m", blocker: "a" }, { attacker: "m", blocker: "b" }] }).ok);
  assert.ok(applyAction(attacked, "p2", { type: "declareBlockers", blocks: [] }).ok);
});

// ───────── first strike and double strike ─────────

test("first strike kills the blocker before it can hit back", () => {
  const g = fight(board([["a", "fs22"]], [["b", "vanilla22"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(g, "b"), false);
  assert.equal(onBoard(g, "a"), true);
  assert.equal(damageOn(g, "a"), 0); // the blocker never got to deal damage
});

test("first strike doesn't save a creature that can't kill its blocker", () => {
  const g = fight(board([["a", "fs22"]], [["b", "vanilla44"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(g, "a"), false); // survives the first step, then takes 4 in the regular step
  assert.equal(damageOn(g, "b"), 2);
});

test("two first strikers hit each other at the same time", () => {
  const g = fight(board([["a", "fs22"]], [["b", "fs22"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(g, "a"), false);
  assert.equal(onBoard(g, "b"), false);
});

test("double strike deals its damage twice, to a player", () => {
  const g = fight(board([["a", "ds22"]], []), ["a"], []);
  assert.equal(g.players.p2.life, 16);
});

test("double strike against a big blocker: hits twice, then takes the blocker's damage", () => {
  const g = fight(board([["a", "ds22"]], [["b", "big55"]]), ["a"], [["a", "b"]]);
  assert.equal(damageOn(g, "b"), 4); // 2 first strike + 2 regular
  assert.equal(onBoard(g, "a"), false); // the 5/5 hit back in the regular step
});

// ───────── deathtouch, lifelink, indestructible ─────────

test("deathtouch destroys any creature it damages, whether attacking or blocking", () => {
  const attacking = fight(board([["a", "dt11"]], [["b", "big55"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(attacking, "b"), false);
  assert.equal(onBoard(attacking, "a"), false); // the 5/5 killed it too

  const blocking = fight(board([["a", "big55"]], [["b", "dt11"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(blocking, "a"), false);
});

test("lifelink gains life equal to the damage dealt, to a player or a creature", () => {
  const unblocked = fight(board([["a", "life22"]], []), ["a"], []);
  assert.equal(unblocked.players.p1.life, 22);
  assert.equal(unblocked.players.p2.life, 18);

  const blocked = fight(board([["a", "life22"]], [["b", "vanilla44"]]), ["a"], [["a", "b"]]);
  assert.equal(blocked.players.p1.life, 22);
  assert.equal(blocked.players.p2.life, 20); // nothing reached the player
});

test("a lifelink blocker gains its controller life too", () => {
  const g = fight(board([["a", "vanilla22"]], [["b", "life22"]]), ["a"], [["a", "b"]]);
  assert.equal(g.players.p2.life, 22);
});

test("indestructible survives lethal damage and deathtouch", () => {
  const big = fight(board([["a", "ind22"]], [["b", "big55"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(big, "a"), true);
  assert.equal(damageOn(big, "a"), 5);

  const dt = fight(board([["a", "dt11"]], [["b", "ind22"]]), ["a"], [["a", "b"]]);
  assert.equal(onBoard(dt, "b"), true);
});

// ───────── trample ─────────

test("trample: with one blocker the attacker chooses the split, and the suggested one is lethal on the blocker, the rest to the player", () => {
  let g = fight(board([["a", "tr44"]], [["b", "vanilla22"]]), ["a"], [["a", "b"]]);
  assert.equal(g.phase, "damage"); // a trampler decides how much goes past its blocker (rule 702.19b)
  const plan = suggestDamageAssignment(g, "a");
  assert.deepEqual(plan, { b: 2, p2: 2 });
  g = act(g, "p1", { type: "assignDamage", assignments: Object.entries(plan).map(([blocker, amount]) => ({ attacker: "a", blocker, amount })) });
  assert.equal(g.phase, "main2");
  assert.equal(onBoard(g, "b"), false);
  assert.equal(g.players.p2.life, 18);
});

test("trample with one blocker: the attacker may put extra damage on the blocker instead, but not less than lethal", () => {
  const g = fight(board([["a", "tr44"]], [["b", "vanilla22"]]), ["a"], [["a", "b"]]);
  const split = (b: number, p: number): Action => ({ type: "assignDamage", assignments: [{ attacker: "a", blocker: "b", amount: b }, { attacker: "a", blocker: "p2", amount: p }] });
  assert.match(error(g, "p1", split(1, 3)), /lethal damage to every blocker/);
  const all = act(g, "p1", split(4, 0));
  assert.equal(all.players.p2.life, 20);
  assert.equal(onBoard(all, "b"), false);
});

test("trample with deathtouch needs only 1 damage on the blocker", () => {
  const defs = { ...DEFS, dtTramp: def("dtTramp", 3, 3, ["trample", "deathtouch"]) };
  const state = board([["a", "dtTramp"]], [["b", "big55"]]);
  state.cards = defs;
  let g = fight(state, ["a"], [["a", "b"]]);
  assert.equal(g.phase, "damage");
  assert.deepEqual(suggestDamageAssignment(g, "a"), { b: 1, p2: 2 });
  g = act(g, "p1", { type: "assignDamage", assignments: [{ attacker: "a", blocker: "b", amount: 1 }, { attacker: "a", blocker: "p2", amount: 2 }] });
  assert.equal(onBoard(g, "b"), false);
  assert.equal(g.players.p2.life, 18); // 1 to the blocker, 2 tramples over
});

test("trample over several blockers: the attacker may assign to the player, but only after lethal on each blocker", () => {
  const state = board([["a", "tr44"]], [["b1", "vanilla22"], ["b2", "vanilla22"]]);
  let g = fight(state, ["a"], [["a", "b1"], ["a", "b2"]]);
  assert.equal(g.phase, "damage");
  const [entry] = getDamageAssignments(g);
  assert.equal(entry.trampleTo, "p2");
  assert.deepEqual(suggestDamageAssignment(g, "a"), { b1: 2, b2: 2 }); // 4 power, 4 lethal: nothing left over

  const bad = error(g, "p1", {
    type: "assignDamage",
    assignments: [{ attacker: "a", blocker: "b1", amount: 1 }, { attacker: "a", blocker: "b2", amount: 1 }, { attacker: "a", blocker: "p2", amount: 2 }],
  });
  assert.match(bad, /lethal damage to every blocker/);
  assert.equal(playerToAct(g), "p1");

  const big = board([["a", "big55"]], [["b1", "vanilla22"], ["b2", "vanilla22"]]);
  big.cards = { ...DEFS, trample55: def("trample55", 5, 5, ["trample"]) };
  big.players.p1.battlefield[0].card.defId = "trample55";
  g = fight(big, ["a"], [["a", "b1"], ["a", "b2"]]);
  assert.deepEqual(suggestDamageAssignment(g, "a"), { b1: 2, b2: 2, p2: 1 });
  g = act(g, "p1", {
    type: "assignDamage",
    assignments: [{ attacker: "a", blocker: "b1", amount: 2 }, { attacker: "a", blocker: "b2", amount: 2 }, { attacker: "a", blocker: "p2", amount: 1 }],
  });
  assert.equal(g.players.p2.life, 19);
  assert.equal(g.phase, "main2");
});

test("without trample the attacker can't assign damage to the player", () => {
  const g = fight(board([["a", "vanilla44"]], [["b1", "vanilla22"], ["b2", "vanilla22"]]), ["a"], [["a", "b1"], ["a", "b2"]]);
  assert.match(
    error(g, "p1", { type: "assignDamage", assignments: [{ attacker: "a", blocker: "b1", amount: 2 }, { attacker: "a", blocker: "p2", amount: 2 }] }),
    /can't be assigned there/,
  );
});

// ───────── cards with other keywords stay unplayable ─────────

test("a creature with an unsupported keyword can't be put in a game", () => {
  const defs = { ...CARDS, flash: def("flash", 2, 2, ["morph"]), flyer: def("flyer", 2, 2, ["Flying"]) };
  assert.throws(() => createGame({ p1: ["flash"], p2: ["mountain"] }, 1, defs), /can't be played yet/);
  assert.doesNotThrow(() => createGame({ p1: ["flyer"], p2: ["mountain"] }, 1, defs)); // keyword names are case-insensitive
});
