import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getLegalActions, HIDDEN_CARD_ID, viewFor } from "../index.js";
import type { GameState } from "../index.js";

const DEFS = { ...CARDS, island: { id: "island", name: "Island", type: "land" as const, cost: 0, typeLine: "Basic Land — Island" } };
const game = (): GameState => createGame({ p1: Array(20).fill("mountain").concat(Array(20).fill("forest")), p2: Array(40).fill("island") }, 7, DEFS);

test("the opponent's hand and both libraries are face down; your own hand is not", () => {
  const g = game();
  const v = viewFor(g, "p1");
  assert.equal(v.players.p1.hand.every((c) => c.defId !== HIDDEN_CARD_ID), true, "own hand visible");
  assert.equal(v.players.p2.hand.every((c) => c.defId === HIDDEN_CARD_ID), true, "opponent hand hidden");
  assert.equal(v.players.p1.library.every((c) => c.defId === HIDDEN_CARD_ID), true, "own library hidden");
  assert.equal(v.players.p2.library.every((c) => c.defId === HIDDEN_CARD_ID), true, "opponent library hidden");
  assert.equal(v.players.p2.hand.length, g.players.p2.hand.length, "still countable");
  assert.equal(v.players.p2.library.length, g.players.p2.library.length);
});

test("the shuffle seed is gone and the original state is untouched", () => {
  const g = game();
  const before = JSON.stringify(g);
  const v = viewFor(g, "p2");
  assert.equal(v.rng, 0);
  assert.equal(JSON.stringify(g), before);
});

test("definitions of cards the viewer cannot see are removed", () => {
  const g = game(); // p1 has Mountains and Forests, p2 only Islands
  const v = viewFor(g, "p1");
  assert.equal(v.cards["island"], undefined, "the opponent's deck is not listed");
  assert.ok(v.cards[HIDDEN_CARD_ID]);
  const own = new Set(v.players.p1.hand.map((c) => c.defId));
  for (const id of own) assert.ok(v.cards[id], `${id} is known to its owner`);
});

test("a played card is public", () => {
  let g = game();
  g.phase = "main1";
  g.active = "p2";
  const land = g.players.p2.hand.find((c) => c.defId === "island")!;
  const r = applyAction(g, "p2", { type: "playLand", iid: land.iid });
  assert.ok(r.ok);
  g = r.state;
  const v = viewFor(g, "p1");
  assert.ok(v.cards["island"], "its definition is now visible");
  assert.equal(v.players.p2.battlefield.length, 1);
});

test("cards a pick shows to its chooser stay visible to them, and only to them", () => {
  const g = game();
  const top = g.players.p1.library.slice(0, 3).map((c) => c.iid);
  g.pendingPick = { player: "p1", prompt: "Look at the top three", kind: "scry", options: top, optional: false, owner: "p1", remaining: 1 } as GameState["pendingPick"];
  const mine = viewFor(g, "p1");
  assert.equal(mine.players.p1.library.slice(0, 3).every((c) => c.defId !== HIDDEN_CARD_ID), true);
  assert.equal(mine.players.p1.library.slice(3).every((c) => c.defId === HIDDEN_CARD_ID), true);
  const theirs = viewFor(g, "p2");
  assert.equal(theirs.players.p1.library.every((c) => c.defId === HIDDEN_CARD_ID), true);
});

test("the engine still works on a view: the viewer's legal actions are the same", () => {
  const g = game();
  g.phase = "main1";
  g.active = "p1";
  const v = viewFor(g, "p1");
  assert.deepEqual(getLegalActions(v, "p1"), getLegalActions(g, "p1"));
});
