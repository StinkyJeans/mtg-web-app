import { test } from "node:test";
import assert from "node:assert/strict";
import { deckColors, deckStatus, expandDeck, mixEntries, setName } from "@/lib/decks";
import { DEFS } from "./fixtures";

test("a deck becomes one card id per copy", () => {
  assert.deepEqual(expandDeck({ bears: 2, mountain: 1 }), ["bears", "bears", "mountain"]);
  assert.deepEqual(expandDeck({}), []);
});

test("a legal deck of playable cards is ready", () => {
  const status = deckStatus(DEFS, { mountain: 16, bears: 4 });
  assert.equal(status.count, 20);
  assert.deepEqual(status.errors, []);
  assert.deepEqual(status.unplayable, []);
  assert.equal(status.ready, true);
});

test("a deck under 20 cards is not ready", () => {
  const status = deckStatus(DEFS, { mountain: 10, bears: 4 });
  assert.equal(status.ready, false);
  assert.match(status.errors.join(" "), /at least 20 cards \(has 14\)/);
});

test("more than four copies is only allowed for basic lands", () => {
  const status = deckStatus(DEFS, { mountain: 14, bears: 6 });
  assert.deepEqual(status.errors, ["Grizzly Bears: 6 copies (max 4)."]);
  assert.equal(status.ready, false);
});

test("cards the game can't play keep the deck from being ready, and are named", () => {
  const defs = { ...DEFS, odd: { id: "odd", name: "Odd Card", type: "creature" as const, cost: 1, power: 1, toughness: 1, playable: false } };
  const status = deckStatus(defs, { mountain: 16, odd: 4 });
  assert.deepEqual(status.errors, []);
  assert.deepEqual(status.unplayable.map((c) => c.name), ["Odd Card"]);
  assert.equal(status.ready, false);
});

test("an unknown card is an error", () => {
  assert.match(deckStatus(DEFS, { mountain: 20, ghost: 1 }).errors.join(" "), /Unknown card: ghost/);
});

test("deck colors come in WUBRG order and ignore colorless cards", () => {
  assert.deepEqual(deckColors(DEFS, { giant: 1, drake: 1, bears: 2, mountain: 10 }), ["U", "R", "G"]);
  assert.deepEqual(deckColors(DEFS, { mountain: 20 }), []);
  assert.deepEqual(deckColors(DEFS, { missing: 1 }), []);
});

test("set codes read as set names", () => {
  assert.equal(setName("FDN"), "Foundations");
  assert.equal(setName("SOS"), "Secrets of Strixhaven");
  assert.equal(setName("XYZ"), "XYZ");
  assert.equal(setName(null), null);
});

test("mixing two packs adds up the copies of each card", () => {
  assert.deepEqual(mixEntries({ bears: 2, mountain: 8 }, { mountain: 9, shock: 1 }), { bears: 2, mountain: 17, shock: 1 });
  assert.deepEqual(mixEntries(), {});
});
