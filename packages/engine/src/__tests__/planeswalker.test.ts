import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, getLoyaltyAbilities, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  // Like a card from the database: the starting loyalty is in `toughness`
  sage: { id: "sage", name: "Sage", type: "planeswalker", cost: 3, manaCost: "{2}{R}", typeLine: "Legendary Planeswalker — Sage", toughness: 4, text: "+1: You gain 2 life.\n−2: Target creature gets -3/-3 until end of turn.\n−6: Destroy target creature." },
  scorcher: { id: "scorcher", name: "Scorcher", type: "planeswalker", cost: 3, manaCost: "{2}{R}", typeLine: "Legendary Planeswalker — Test", loyalty: 3, text: "0: Scorcher deals 1 damage to any target.\n+1: Draw a card." },
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
  bolt: { id: "bolt", name: "Bolt", type: "instant", cost: 1, manaCost: "{R}", text: "Bolt deals 3 damage to any target." },
  smite: { id: "smite", name: "Smite", type: "instant", cost: 1, manaCost: "{R}", text: "Smite deals 3 damage to target creature." },
  weird: { id: "weird", name: "Weird", type: "planeswalker", cost: 3, manaCost: "{2}{R}", typeLine: "Planeswalker — Weird", toughness: 4, text: "+1: Do something strange." },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1", extra: object = {}) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0, ...extra });

function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: 5 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const settle = (g: GameState) => {
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};

test("planeswalkers with readable loyalty abilities are understood", () => {
  for (const id of ["sage", "scorcher"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
  assert.equal(isSupportedCard(DEFS.weird), false); // an ability it can't read
});

test("a planeswalker is cast at sorcery speed and enters with its loyalty", () => {
  let g = setup(["sage"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(find(g, "h0")!.loyalty, 4);
  const o = setup(["sage"]);
  o.phase = "end";
  assert.equal(getCastable(o, "p1").length, 0);
});

test("loyalty abilities: cost changes loyalty, one per turn, sorcery speed", () => {
  let g = setup([], ["sage"]);
  find(g, "m0")!.loyalty = 4;
  assert.deepEqual(getLoyaltyAbilities(g, "p1").map((a) => [a.index, a.cost]), [[0, 1]]); // -2 and -6 need a target creature
  g = act(g, "p1", { type: "loyalty", iid: "m0", index: 0 });
  g = settle(g);
  assert.equal(find(g, "m0")!.loyalty, 5);
  assert.equal(g.players.p1.life, 22);
  assert.match((applyAction(g, "p1", { type: "loyalty", iid: "m0", index: 0 }) as { error?: string }).error ?? "", /already used/);
  const c = { ...g, phase: "attackers" as const };
  assert.equal(applyAction(c, "p1", { type: "loyalty", iid: "m0", index: 0 }).ok, false);
});

test("a minus ability needs the loyalty, can target, and the walker leaves at 0 loyalty", () => {
  let g = setup([], ["sage"], ["bear"]);
  find(g, "m0")!.loyalty = 1;
  assert.equal(applyAction(g, "p1", { type: "loyalty", iid: "m0", index: 1, targets: [{ kind: "permanent", iid: "t0" }] }).ok, false); // -2 with 1 loyalty
  find(g, "m0")!.loyalty = 2;
  g = act(g, "p1", { type: "loyalty", iid: "m0", index: 1, targets: [{ kind: "permanent", iid: "t0" }] });
  assert.equal(find(g, "m0"), undefined); // 0 loyalty: gone at once
  g = settle(g);
  assert.equal(find(g, "t0"), undefined); // but the ability still resolved: -3/-3 killed the 2/2
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "m0"), true);
});

test("loyalty abilities are available again next turn", () => {
  let g = setup([], ["scorcher"]);
  find(g, "m0")!.loyalty = 3;
  g = act(g, "p1", { type: "loyalty", iid: "m0", index: 1 }); // +1: draw
  g = settle(g);
  assert.equal(getLoyaltyAbilities(g, "p1").length, 0);
  g.phase = "end";
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(find(g, "m0")!.loyaltyUsed, false);
});

test("creatures can attack a planeswalker: unblocked damage removes loyalty", () => {
  let g = setup([], ["bear"], ["scorcher"]);
  find(g, "t0")!.loyalty = 3;
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"], targets: { m0: "t0" } }));
  assert.equal(find(g, "t0")!.loyalty, 1);
  assert.equal(g.players.p2.life, 20); // the player took nothing
});

test("a planeswalker with no loyalty left dies, and a blocked attacker doesn't hurt it", () => {
  let g = setup([], ["bear", "bear"], ["scorcher", "bear"]);
  find(g, "t0")!.loyalty = 2;
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1"], targets: { m0: "t0", m1: "t0" } });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t1", attacker: "m0" }] });
  g = settle(g);
  assert.equal(find(g, "t0"), undefined); // m1 alone dealt 2: dead
  assert.equal(g.players.p2.life, 20);
});

test("you can only attack the opponent's planeswalkers", () => {
  const g = setup([], ["bear", "sage"], []);
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"], targets: { m0: "m1" } }).ok, false);
});

test("'any target' can hit a planeswalker, 'target creature' can't", () => {
  let g = setup(["bolt", "smite"], [], ["scorcher"]);
  find(g, "t0")!.loyalty = 3;
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h1", targets: [{ kind: "permanent", iid: "t0" }] }).ok, false);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "t0" }] });
  assert.equal(find(g, "t0"), undefined); // 3 damage = 3 loyalty
});

test("a planeswalker's own damage ability can target another planeswalker", () => {
  let g = setup([], ["scorcher"], ["scorcher"]);
  find(g, "m0")!.loyalty = 3;
  find(g, "t0")!.loyalty = 3;
  g = act(g, "p1", { type: "loyalty", iid: "m0", index: 0, targets: [{ kind: "permanent", iid: "t0" }] });
  g = settle(g);
  assert.equal(find(g, "t0")!.loyalty, 2);
  assert.equal(powerOf(g, find(g, "m0")!), 0);
});
