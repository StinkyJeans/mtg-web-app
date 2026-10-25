import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, botAction, CARDS, createGame, playerToAct, STARTER_DECK, viewFor } from "../index.js";
import type { CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 2, manaCost: "{1}{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 3, 3, "", { manaCost: "{2}{R}", cost: 3 }),
  titan: creature("titan", 5, 5, "", { manaCost: "{4}{R}", cost: 5 }),
  mouse: creature("mouse", 1, 1, "", { manaCost: "{R}", cost: 1 }),
  secret: creature("secret", 9, 9, "", { manaCost: "{R}", cost: 1 }),
};
const perm = (iid: string, defId: string, owner: PlayerId) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
const card = (iid: string, defId: string, owner: PlayerId): CardInstance => ({ iid, defId, owner });
function setup(): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 3, DEFS);
  g.cards = { ...DEFS };
  g.players.p1.hand = [];
  g.players.p2.hand = [];
  g.players.p1.battlefield = Array.from({ length: 5 }, (_, i) => perm(`a${i}`, "mountain", "p1"));
  g.players.p2.battlefield = Array.from({ length: 5 }, (_, i) => perm(`b${i}`, "mountain", "p2"));
  g.phase = "main1";
  g.active = "p1";
  return g;
}

test("the bot decides the same whatever is hidden from it: the other hand and both libraries", () => {
  const g = setup();
  g.players.p1.hand = [card("h1", "bear", "p1"), card("h2", "mountain", "p1")];
  g.players.p2.hand = [card("o1", "mouse", "p2"), card("o2", "mouse", "p2")];
  const before = botAction(viewFor(g, "p1"), "p1");
  // swap everything the bot must not know about
  const h = structuredClone(g);
  h.players.p2.hand = [card("o1", "secret", "p2"), card("o2", "titan", "p2")];
  h.players.p1.library = h.players.p1.library.map((c, i) => ({ ...c, defId: i % 2 ? "titan" : "island" }));
  h.players.p2.library = h.players.p2.library.map((c) => ({ ...c, defId: "secret" }));
  const after = botAction(viewFor(h, "p1"), "p1");
  assert.deepEqual(after, before);
  // and the view it plays from really holds no secrets
  const v = viewFor(h, "p1");
  assert.equal(v.cards["secret"], undefined, "the other deck's cards are not even listed");
  assert.equal(v.players.p2.hand.every((c) => c.defId === "__hidden__"), true);
  assert.equal(v.players.p1.library.every((c) => c.defId === "__hidden__"), true);
});

test("opening hands: keeps a balanced hand, mulligans a hand with no land", () => {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 3, DEFS, { mulligan: true });
  const first = playerToAct(g);
  g.players[first].hand = ["bear", "bear", "ogre", "mountain", "mountain", "mountain", "mouse"].map((d, i) => card(`k${i}`, d, first));
  assert.equal(botAction(viewFor(g, first), first)?.type, "keepHand");
  g.players[first].hand = ["bear", "bear", "ogre", "titan", "bear", "ogre", "mouse"].map((d, i) => card(`n${i}`, d, first));
  assert.equal(botAction(viewFor(g, first), first)?.type, "mulligan");
});

test("plays a land first, then casts a creature with the mana", () => {
  let g = setup();
  g.players.p1.battlefield = [];
  g.players.p1.hand = [card("l1", "mountain", "p1"), card("l2", "mountain", "p1"), card("c1", "mouse", "p1")];
  const a1 = botAction(viewFor(g, "p1"), "p1");
  assert.equal(a1?.type, "playLand");
  g = step(g, "p1", a1!);
  const a2 = botAction(viewFor(g, "p1"), "p1");
  assert.equal(a2?.type, "castSpell");
});

function step(g: GameState, who: PlayerId, a: NonNullable<ReturnType<typeof botAction>>): GameState {
  const r = applyAction(g, who, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

test("attacks for lethal when the other player has no blockers", () => {
  const g = setup();
  g.phase = "attackers";
  g.players.p1.battlefield.push(perm("m1", "ogre", "p1"));
  g.players.p2.life = 3;
  const a = botAction(viewFor(g, "p1"), "p1");
  assert.equal(a?.type, "declareAttackers");
  assert.deepEqual(a?.type === "declareAttackers" ? a.attackers : [], ["m1"]);
});

test("does not send a small creature into a bigger one", () => {
  const g = setup();
  g.phase = "attackers";
  g.players.p1.battlefield.push(perm("m1", "mouse", "p1"));
  g.players.p2.battlefield.push(perm("t1", "ogre", "p2"));
  const a = botAction(viewFor(g, "p1"), "p1");
  assert.equal(a?.type, "passPhase");
});

test("blocks with a creature that survives, and chump blocks when it would otherwise die", () => {
  // a big attacker and a creature that can stop it for free
  let g = setup();
  g.active = "p2";
  g.phase = "attackers";
  g.players.p2.battlefield.push(perm("t1", "ogre", "p2"));
  g.players.p1.battlefield.push(perm("t2", "titan", "p1"));
  g = step(g, "p2", { type: "declareAttackers", attackers: ["t1"] });
  while (g.priority) g = step(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.phase, "blockers");
  const good = botAction(viewFor(g, "p1"), "p1");
  assert.deepEqual(good?.type === "declareBlockers" ? good.blocks : null, [{ blocker: "t2", attacker: "t1" }], "the 5/5 stops the 3/3 and lives");

  // at 3 life, a 3/3 attack is lethal: even a 1/1 must chump
  let h = setup();
  h.active = "p2";
  h.phase = "attackers";
  h.players.p1.life = 3;
  h.players.p2.battlefield.push(perm("t1", "ogre", "p2"));
  h.players.p1.battlefield.push(perm("t2", "mouse", "p1"));
  h = step(h, "p2", { type: "declareAttackers", attackers: ["t1"] });
  while (h.priority) h = step(h, h.priority.holder, { type: "passPriority" });
  const chump = botAction(viewFor(h, "p1"), "p1");
  assert.deepEqual(chump?.type === "declareBlockers" ? chump.blocks : null, [{ blocker: "t2", attacker: "t1" }]);
});

test("two bots finish a whole game: never stuck, every move accepted, and each decision is quick", () => {
  let g = createGame({ p1: STARTER_DECK, p2: STARTER_DECK }, 11, undefined, { mulligan: true });
  let slowest = 0;
  for (let i = 0; i < 1500 && !g.winner; i++) {
    const who = playerToAct(g);
    const t0 = performance.now();
    const a = botAction(viewFor(g, who), who);
    slowest = Math.max(slowest, performance.now() - t0);
    assert.ok(a, `no move at step ${i}, phase ${g.phase}`);
    g = step(g, who, a);
  }
  assert.ok(g.winner, "the game ended");
  assert.ok(slowest < 1500, `slowest decision ${slowest.toFixed(0)} ms`);
});
