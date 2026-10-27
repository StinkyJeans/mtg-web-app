import { test } from "node:test";
import assert from "node:assert/strict";
import { act, named, setup, settle, yard } from "./marvelKit.js";

const giada = { id: "giada", name: "Giada, Font of Hope", type: "creature" as const, cost: 2, manaCost: "{1}{W}", typeLine: "Legendary Creature — Angel", text: "Flying, vigilance", power: 2, toughness: 2, colors: ["W"], keywords: ["flying", "vigilance"] };

test("a legendary creature alone stays", () => {
  const g = settle(act(setup({ hand: ["giada"], extra: { giada } }), "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(named(g, "p1", "Giada, Font of Hope").length, 1);
  assert.equal(g.pendingPick, null);
});

test("legend rule: with a second copy the player chooses which one stays, and the log says why", () => {
  let g = settle(act(setup({ hand: ["giada"], mine: ["giada"], extra: { giada } }), "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "legend");
  assert.equal(g.pendingPick?.options.length, 2);
  assert.equal(named(g, "p1", "Giada, Font of Hope").length, 2, "nothing is lost before the player chooses");
  const keep = g.pendingPick!.options.find((o) => o.startsWith("m"))!; // keep the old one
  g = settle(act(g, "p1", { type: "pick", iid: keep }));
  assert.equal(named(g, "p1", "Giada, Font of Hope").length, 1);
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === keep), true);
  assert.deepEqual(yard(g), ["Giada, Font of Hope"]);
});

test("the other player's copy is not affected", () => {
  const g = settle(act(setup({ hand: ["giada"], theirs: ["giada"], extra: { giada } }), "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick, null);
  assert.equal(named(g, "p1", "Giada, Font of Hope").length, 1);
  assert.equal(named(g, "p2", "Giada, Font of Hope").length, 1);
});
