import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCard, powerOf } from "../index.js";
import { act, choose, find, hand, named, on, plain, realCard, setup, settle, toNextTurn } from "./marvelKit.js";

// Sagas: lore counters, one chapter per turn, sacrificed after the last one.

const cast = (g: ReturnType<typeof setup>, iid: string) => settle(act(g, "p1", { type: "castSpell", iid, targets: [] }));

test("a Saga is read as chapters", () => {
  const p = parseCard(realCard("Avengers: Under Siege"));
  assert.equal(p.ok, true);
  assert.equal(p.saga?.final, 3);
  assert.equal(p.saga?.chapters.length, 3);
});

test("Avengers: Under Siege: chapter I now, II next turn, III the turn after, then it is sacrificed", () => {
  let g = setup({ hand: ["Avengers: Under Siege"], theirs: ["bear"], lands: 4 });
  g = cast(g, "h0");
  assert.equal(named(g, "p1", "Villain").length, 2, "chapter I: two Villain tokens");
  assert.equal(find(g, "m0") === undefined, true);
  const saga = () => g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Avengers: Under Siege");
  assert.equal(saga()?.lore, 1);
  g = toNextTurn(g);
  assert.equal(saga()?.lore, 2);
  g = settle(g);
  assert.equal(find(g, "t0"), undefined, "chapter II: 2 damage to each non-Villain creature killed their Bear");
  assert.equal(named(g, "p1", "Villain").length, 2, "the Villain tokens are not hurt");
  assert.equal(g.players.p2.life, 18, "and 2 damage to each opponent");
  g = toNextTurn(g);
  g = settle(g);
  assert.equal(named(g, "p1", "Treasure").length, 2, "chapter III: a Treasure for each Villain");
  assert.equal(saga(), undefined, "sacrificed after chapter III");
});

test("Origin of the Avengers: scry, then a Hero from hand or a card, then +1/+1 counters", () => {
  const hero = plain("hero3", "Cheap Hero", "{1}{W}", 2, 2, "", "Creature — Human Hero", ["W"]);
  let g = setup({ hand: ["Origin of the Avengers"], extra: { hero3: hero }, library: ["plains", "plains", "plains", "plains"] });
  g.players.p1.hand.push({ iid: "hh", defId: "hero3", owner: "p1" });
  g = cast(g, "h0");
  while (g.pendingPick) g = settle(act(g, "p1", { type: "pick" })); // chapter I: scry 2, keep
  g = toNextTurn(g);
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "handToField");
  g = settle(act(g, "p1", { type: "pick", iid: "hh" }));
  assert.equal(named(g, "p1", "Cheap Hero").length, 1);
  g = toNextTurn(g);
  g = settle(g);
  assert.equal(find(g, "hh")!.counters, 1, "chapter III");
});

test("Origin of the Avengers II: with no Hero to put in, you draw a card instead", () => {
  let g = setup({ hand: ["Origin of the Avengers"], library: ["plains", "plains", "plains", "plains", "plains"] });
  g = cast(g, "h0");
  while (g.pendingPick) g = settle(act(g, "p1", { type: "pick" }));
  const before = hand(g).length;
  g = settle(toNextTurn(g));
  assert.equal(hand(g).length, before + 2, "the draw step, and chapter II");
});

test("Armor Wars: draw for each artifact (and they draw too), artifact discount, damage by the greatest artifact", () => {
  const rock = { id: "rock", name: "Gold Rock", type: "artifact" as const, cost: 3, manaCost: "{3}", typeLine: "Artifact", text: "" };
  let g = setup({ hand: ["Armor Wars"], mine: ["rock"], extra: { rock }, lands: 4 });
  g = cast(g, "h0");
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "mayPay");
  const mine = hand(g).length;
  const theirs = hand(g, "p2").length;
  g = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  assert.equal(hand(g).length, mine + 1, "one artifact: one card");
  assert.equal(hand(g, "p2").length, theirs + 1);
  g = toNextTurn(g);
  g = settle(g);
  assert.deepEqual(g.players.p1.costLessThisTurn, [{ n: 1, spell: "artifact" }]);
  g = toNextTurn(g);
  g = settle(g);
  assert.equal(g.players.p2.life, 17, "X = 3, the Gold Rock");
});

test("World War Hulk: a free red or green creature spell, +3 counters, then double power and toughness and trample", () => {
  const big = plain("bigred", "Big Red", "{6}{R}", 4, 4, "", "Creature — Giant", ["R"]);
  let g = setup({ hand: ["World War Hulk", "bigred"], mine: ["bear"], extra: { bigred: big }, lands: 3 });
  g = cast(g, "h0");
  assert.deepEqual(g.players.p1.freeNext, { colors: ["R", "G"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h1" }));
  assert.equal(named(g, "p1", "Big Red").length, 1, "cast for free");
  assert.equal(g.players.p1.freeNext, undefined);
  g = toNextTurn(g);
  if (g.pendingChoice) g = choose(g, "p1", on("m0")); // chapter II: three +1/+1 counters on the Bear
  g = settle(g);
  assert.equal(find(g, "m0")!.counters, 3);
  g = toNextTurn(g);
  if (g.pendingChoice) g = choose(g, "p1", on("m0")); // chapter III
  g = settle(g);
  const bear = find(g, "m0")!;
  assert.equal(powerOf(g, bear), 10, "(2+3) doubled");
  assert.ok(bear.tempKeywords?.includes("trample"));
});

test("The Coming of Galactus: a 16/16 flyer with an ability of its own", () => {
  const p = parseCard(realCard("The Coming of Galactus"));
  assert.equal(p.ok, true);
  const chapter4 = p.saga!.chapters.find((c) => c.numbers.includes(4))!;
  const effect = chapter4.effects[0];
  assert.equal(effect.type, "createToken");
  if (effect.type === "createToken") {
    assert.equal(effect.token.name, "Galactus");
    assert.equal(effect.token.power, 16);
    assert.deepEqual(effect.token.keywords, ["flying", "trample"]);
    assert.match(effect.token.text, /Whenever Galactus attacks, destroy target land/);
  }
});
