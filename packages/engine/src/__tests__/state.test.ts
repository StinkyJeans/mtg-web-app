import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, STARTER_DECK, STARTING_HAND, STARTING_LIFE } from "../index.js";

const decks = { p1: STARTER_DECK, p2: STARTER_DECK };

test("createGame deals 7 cards and keeps the rest in the library", () => {
  const g = createGame(decks, 42);
  for (const id of ["p1", "p2"] as const) {
    const p = g.players[id];
    assert.equal(p.hand.length, STARTING_HAND);
    assert.equal(p.library.length, STARTER_DECK.length - STARTING_HAND);
    assert.equal(p.life, STARTING_LIFE);
  }
  assert.equal(g.active, "p1");
  assert.equal(g.winner, null);
});

test("same seed gives the same game, different seed differs", () => {
  const a = createGame(decks, 1);
  const b = createGame(decks, 1);
  const c = createGame(decks, 2);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.players.p1.hand, c.players.p1.hand);
});

test("every card instance id is unique", () => {
  const g = createGame(decks, 7);
  const ids = [...g.players.p1.hand, ...g.players.p1.library, ...g.players.p2.hand, ...g.players.p2.library].map((c) => c.iid);
  assert.equal(new Set(ids).size, ids.length);
});

test("unknown card in a deck throws", () => {
  assert.throws(() => createGame({ p1: ["nope"], p2: STARTER_DECK }, 1));
});

test("game state carries only the card definitions its decks use", () => {
  const g = createGame({ p1: ["mountain", "hill-giant"], p2: ["mountain"] }, 1);
  assert.deepEqual(Object.keys(g.cards).sort(), ["hill-giant", "mountain"]);
});

test("createGame accepts custom card definitions (e.g. loaded from the database)", () => {
  const custom = { dragon: { id: "dragon", name: "Dragon", type: "creature" as const, cost: 5, power: 5, toughness: 5 } };
  const g = createGame({ p1: ["dragon"], p2: ["dragon"] }, 1, custom);
  assert.equal(g.cards.dragon.name, "Dragon");
  assert.throws(() => createGame({ p1: ["mountain"], p2: ["mountain"] }, 1, custom));
});

test("cards flagged playable: false are rejected", () => {
  const defs = {
    ...{ mountain: { id: "mountain", name: "Mountain", type: "land" as const, cost: 0 } },
    bolt: { id: "bolt", name: "Lightning Bolt", type: "instant" as const, cost: 1, playable: false },
  };
  assert.throws(() => createGame({ p1: ["mountain", "bolt"], p2: ["mountain"] }, 1, defs), /can't be played yet/);
});
