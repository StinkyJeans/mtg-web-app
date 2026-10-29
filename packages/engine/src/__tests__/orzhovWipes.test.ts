import { test } from "node:test";
import assert from "node:assert/strict";
import { hasKeywordNow, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { GameState } from "../index.js";
import { act, find, named, settle, setup } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { WIPE } from "./wipeCards.js";

// The Orzhov Board Wipes deck (and its sideboard), card by card.

const game = (s: Setup = {}) => setup({ ...s, extra: { ...WIPE, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string) => settle(act(g, "p1", { type: "castSpell", iid, targets: [] }));
const loyalty = (g: GameState, iid: string, index: number) => settle(act(g, "p1", { type: "loyalty", iid, index }));

test("every card of the deck and its sideboard is playable", () => {
  for (const def of Object.values(WIPE)) assert.ok(isSupportedCard(def), def.name);
});

test("Kaya's Wrath: destroys every creature, and you gain a life for each of yours", () => {
  let g = game({ hand: ["kaya-s-wrath"], mine: ["bear", "bear"], theirs: ["bear", "bear", "giant"] });
  g = cast(g, "h0");
  assert.equal(g.players.p1.battlefield.filter((p) => p.card.defId === "bear").length, 0);
  assert.equal(g.players.p2.battlefield.filter((p) => g.cards[p.card.defId].type === "creature").length, 0);
  assert.equal(g.players.p1.life, 22);
});

test("Fumigate: you gain a life for each creature destroyed, yours and theirs", () => {
  let g = game({ hand: ["fumigate"], mine: ["bear"], theirs: ["bear", "giant"] });
  g = cast(g, "h0");
  assert.equal(g.players.p1.life, 23);
});

test("Ritual of Soot: only creatures with mana value 3 or less", () => {
  let g = game({ hand: ["ritual-of-soot"], mine: ["bear"], theirs: ["bear", "giant"] });
  g = cast(g, "h0");
  assert.equal(find(g, "m0"), undefined);
  assert.equal(find(g, "t0"), undefined);
  assert.ok(find(g, "t1"), "the Giant costs five");
});

test("Elspeth, Sun's Champion: three Soldiers, then her -3 destroys only creatures with power 4 or greater", () => {
  let g = game({ mine: ["elspeth-sun-s-champion"], theirs: ["giant", "bear"] });
  find(g, "m0")!.loyalty = 4;
  g = loyalty(g, "m0", 0);
  assert.equal(named(g, "p1", "Soldier").length, 3);
  find(g, "m0")!.loyaltyUsed = false;
  g = loyalty(g, "m0", 1);
  assert.equal(find(g, "t0"), undefined, "the 6/6 Giant is destroyed");
  assert.ok(find(g, "t1"), "the Bear stays");
  assert.equal(named(g, "p1", "Soldier").length, 3, "the 1/1 Soldiers stay");
  assert.equal(find(g, "m0")!.loyalty, 2);
});

test("Elspeth, Sun's Champion: her emblem makes your creatures +2/+2 with flying, and only yours", () => {
  let g = game({ mine: ["elspeth-sun-s-champion", "bear"], theirs: ["bear"] });
  find(g, "m0")!.loyalty = 7;
  g = loyalty(g, "m0", 2);
  const mine = find(g, "m1")!;
  assert.equal(powerOf(g, mine), 4);
  assert.equal(toughnessOf(g, mine), 4);
  assert.ok(hasKeywordNow(g, mine, "flying"));
  assert.equal(powerOf(g, find(g, "t0")!), 2);
  assert.deepEqual(g.players.p1.emblems?.map((e) => e.text), ["Creatures you control get +2/+2 and have flying."]);
  assert.equal(find(g, "m0"), undefined, "Elspeth had no loyalty left");
});

test("Massacre Wurm: their creatures get -2/-2, and they lose 2 life for each one that dies", () => {
  let g = game({ hand: ["massacre-wurm"], mine: ["bear"], theirs: ["bear", "bear", "giant"], lands: 4 });
  g = cast(g, "h0");
  assert.ok(find(g, "m0"), "yours are left alone");
  assert.equal(find(g, "t0"), undefined);
  assert.equal(find(g, "t1"), undefined);
  assert.ok(find(g, "t2"));
  assert.equal(g.players.p2.life, 16);
});
