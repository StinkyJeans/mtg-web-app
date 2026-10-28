import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, payMana } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, manaCost: string): CardDef => ({ id, name: id, type: "creature", cost: 2, manaCost, power: 2, toughness: 2 });
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
  azorius: creature("azorius", "{W/U}{W/U}"),
  gitaxian: creature("gitaxian", "{1}{U/P}"),
  twobrid: creature("twobrid", "{2/W}{2/W}"),
  fiend: creature("fiend", "{B/P}{B/P}{B/P}"),
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(lands: string[], hand: string[], life = 20): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = lands.map((d, i) => perm(`l${i}`, d));
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.life = life;
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

test("hybrid and Phyrexian costs are understood", () => {
  for (const id of ["azorius", "gitaxian", "twobrid", "fiend"].filter((x) => x !== "fiend")) assert.equal(isSupportedCard(DEFS[id]), true, id);
  assert.equal(isSupportedCard(DEFS.fiend), true);
});

test("a hybrid symbol is paid with either of its colors", () => {
  assert.equal(payMana(setup(["plains", "plains"], []), "p1", { generic: 0, colored: {}, hybrid: [["W", "U"], ["W", "U"]] }).ok, true);
  assert.equal(payMana(setup(["plains", "island"], []), "p1", { generic: 0, colored: {}, hybrid: [["W", "U"], ["W", "U"]] }).ok, true);
  assert.equal(payMana(setup(["island", "island"], []), "p1", { generic: 0, colored: {}, hybrid: [["W", "U"], ["W", "U"]] }).ok, true);
  assert.equal(payMana(setup(["swamp", "island"], []), "p1", { generic: 0, colored: {}, hybrid: [["W", "U"], ["W", "U"]] }).ok, false);
});

test("a hybrid symbol shares the lands fairly with the other colored needs", () => {
  // {W}{W/U}: with a Plains and an Island the Plains must pay {W} and the Island the hybrid
  const g = setup(["island", "plains"], []);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { W: 1 }, hybrid: [["W", "U"]] }).ok, true);
});

test("Phyrexian mana is paid with mana when you have it, and with 2 life when you don't", () => {
  let g = setup(["island", "mountain"], ["gitaxian"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.life, 20); // paid {U} with the Island

  let h = setup(["mountain", "mountain"], ["gitaxian"]);
  assert.equal(getCastable(h, "p1").length, 1);
  h = act(h, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(h.players.p1.life, 18); // no blue mana: 2 life instead
});

test("Phyrexian mana can't be paid with life you don't have", () => {
  const g = setup(["mountain", "mountain"], ["gitaxian"], 1);
  assert.equal(getCastable(g, "p1").length, 0);
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /life/);
});

test("three Phyrexian symbols cost 6 life with no black mana", () => {
  let g = setup([], ["fiend"], 20);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.life, 14);
  assert.ok(g.players.p1.battlefield.some((p) => p.card.iid === "h0"));
});

test("the player may pay life for Phyrexian mana even with the mana to pay it", () => {
  const swamps = ["swamp", "swamp", "swamp"];
  let g = setup(swamps, ["fiend"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], phyrexianLife: 2 });
  assert.equal(g.players.p1.life, 16);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 1, "a Swamp pays the third symbol");

  let h = setup(["swamp"], ["fiend"]);
  h = act(h, "p1", { type: "castSpell", iid: "h0", targets: [], phyrexianLife: 1 });
  assert.equal(h.players.p1.life, 16, "a symbol with no mana to pay it still costs life");

  const r = applyAction(setup(swamps, ["fiend"]), "p1", { type: "castSpell", iid: "h0", targets: [], phyrexianLife: 4 });
  assert.equal(r.ok, false, "it has only three");
});

test("{2/W} is paid with white mana or with two generic mana", () => {
  const g = setup(["plains", "mountain", "mountain", "mountain"], []);
  // {2/W}{2/W}: one paid with the Plains, the other with two Mountains
  const r = payMana(g, "p1", { generic: 0, colored: {}, twoOrColor: ["W", "W"] });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.tap.length, 3);
  assert.equal(payMana(setup(["mountain", "mountain"], []), "p1", { generic: 0, colored: {}, twoOrColor: ["W", "W"] }).ok, false); // needs 4 generic
  assert.equal(payMana(setup(["mountain", "mountain", "mountain", "mountain"], []), "p1", { generic: 0, colored: {}, twoOrColor: ["W", "W"] }).ok, true);
});
