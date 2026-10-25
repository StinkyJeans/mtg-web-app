import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCrewable, getPossibleAttackers, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  cart: { id: "cart", name: "Cart", type: "artifact", cost: 2, manaCost: "{2}", typeLine: "Artifact — Vehicle", power: 4, toughness: 4, keywords: ["crew"], text: "Crew 3" },
  tank: { id: "tank", name: "Tank", type: "artifact", cost: 2, manaCost: "{2}", typeLine: "Artifact — Vehicle", power: 3, toughness: 3, keywords: ["crew", "flying"], text: "Flying\nCrew 2" },
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
  mouse: { id: "mouse", name: "Mouse", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1 },
  bolt: { id: "bolt", name: "Bolt", type: "instant", cost: 1, manaCost: "{R}", text: "Bolt deals 3 damage to target creature." },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1", sick = false) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: sick, damage: 0 });

function setup(mine: string[], theirs: string[] = [], hand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = [perm("l0", "mountain"), perm("l1", "mountain"), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid)!;
const settle = (g: GameState) => {
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};

test("vehicles are understood", () => {
  for (const id of ["cart", "tank"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("crew: tap creatures with enough power and the Vehicle becomes a creature that can attack", () => {
  let g = setup(["cart", "bear", "mouse"]);
  assert.deepEqual(getCrewable(g, "p1").map((c) => [c.iid, c.crew]), [["m0", 3]]);
  g.phase = "attackers";
  assert.deepEqual(getPossibleAttackers(g).sort(), ["m1", "m2"]); // the Vehicle is not a creature yet
  g.phase = "main1";
  g = act(g, "p1", { type: "crew", iid: "m0" });
  assert.equal(g.pendingPick?.kind, "crew");
  g = act(g, "p1", { type: "pick", iid: "m1" }); // power 2: not enough yet
  assert.equal(g.pendingPick?.kind, "crew");
  g = act(g, "p1", { type: "pick", iid: "m2" }); // power 1 more: 3
  assert.equal(g.pendingPick, null);
  g = settle(g);
  assert.equal(find(g, "m1").tapped, true);
  assert.equal(find(g, "m2").tapped, true);
  assert.equal(find(g, "m0").crewed, true);
  g.phase = "attackers";
  assert.deepEqual(getPossibleAttackers(g), ["m0"]);
  assert.equal(powerOf(g, find(g, "m0")), 4);
});

test("crew can be cancelled, and nothing is tapped", () => {
  let g = setup(["cart", "bear", "mouse"]);
  g = act(g, "p1", { type: "crew", iid: "m0" });
  g = act(g, "p1", { type: "pick", iid: "m1" });
  g = act(g, "p1", { type: "pick" });
  assert.equal(find(g, "m1").tapped, false);
  assert.equal(find(g, "m0").crewed, undefined);
});

test("you need enough power among your untapped creatures", () => {
  const g = setup(["cart", "mouse"]);
  assert.deepEqual(getCrewable(g, "p1"), []);
  assert.equal(applyAction(g, "p1", { type: "crew", iid: "m0" }).ok, false);
});

test("a summoning-sick creature can crew, but a Vehicle that just arrived can't attack", () => {
  let g = setup(["tank", "bear"]);
  find(g, "m1").summoningSick = true;
  find(g, "m0").summoningSick = true; // the Vehicle came this turn
  g = act(g, "p1", { type: "crew", iid: "m0" });
  g = act(g, "p1", { type: "pick", iid: "m1" });
  g = settle(g);
  assert.equal(find(g, "m0").crewed, true);
  g.phase = "attackers";
  assert.deepEqual(getPossibleAttackers(g), []);
});

test("a crewed Vehicle is a creature: spells that target creatures can hit it; an uncrewed one can't be targeted that way", () => {
  const g = setup([], ["cart", "bear"], ["bolt"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "t0" }] }).ok, false);
  find(g, "t0").crewed = true;
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "t0" }] });
  assert.equal(find(s, "t0").damage, 3);
});

test("a Vehicle stops being a creature at the end of the turn", () => {
  let g = setup(["cart", "bear", "mouse"]);
  g = act(g, "p1", { type: "crew", iid: "m0" });
  g = act(g, "p1", { type: "pick", iid: "m1" });
  g = act(g, "p1", { type: "pick", iid: "m2" });
  g = settle(g);
  g.phase = "end";
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(find(g, "m0").crewed, false);
});

test("a crewed Vehicle fights like any creature (blocked, damaged)", () => {
  let g = setup(["cart", "bear", "mouse"], ["bear"]);
  g = act(g, "p1", { type: "crew", iid: "m0" });
  g = act(g, "p1", { type: "pick", iid: "m1" });
  g = act(g, "p1", { type: "pick", iid: "m2" });
  g = settle(g);
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] });
  g = settle(g);
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "t0"), false); // the 2/2 blocker died
  assert.equal(find(g, "m0").damage, 2);
});
