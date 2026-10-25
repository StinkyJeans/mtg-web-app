import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS, isBasicLand, STARTER_DECK, unplayableCards, validateDeck } from "../index.js";

test("the starter deck is legal", () => {
  assert.deepEqual(validateDeck(CARDS, STARTER_DECK), []);
});

test("too few cards and too many copies are reported", () => {
  const errors = validateDeck(CARDS, [...Array(5).fill("hill-giant"), "mountain"]);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /at least 20/);
  assert.match(errors[1], /Hill Giant: 5 copies/);
});

test("basic lands are unlimited, other lands are not", () => {
  assert.equal(isBasicLand(CARDS.mountain), true);
  const nonBasic = { id: "x", name: "Strip Mine", type: "land" as const, cost: 0, typeLine: "Land" };
  assert.equal(isBasicLand(nonBasic), false);
  const deck = [...Array(36).fill("mountain"), ...Array(5).fill("x")];
  assert.equal(validateDeck({ ...CARDS, x: nonBasic }, deck).length, 1);
});

test("unknown cards are reported and unplayable ones are listed", () => {
  assert.match(validateDeck(CARDS, [...STARTER_DECK, "ghost"]).join(), /Unknown card: ghost/);
  const bolt = { id: "bolt", name: "Lightning Bolt", type: "instant" as const, cost: 1, playable: false };
  assert.deepEqual(unplayableCards({ ...CARDS, bolt }, ["mountain", "bolt", "bolt"]).map((c) => c.id), ["bolt"]);
});

test("a game deck size must match exactly when one is given", () => {
  assert.deepEqual(validateDeck(CARDS, STARTER_DECK, 40), []);
  assert.match(validateDeck(CARDS, STARTER_DECK, 60)[0], /exactly 60/);
});
