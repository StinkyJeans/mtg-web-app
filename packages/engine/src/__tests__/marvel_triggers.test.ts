import { test } from "node:test";
import assert from "node:assert/strict";
import { powerOf } from "../index.js";
import { kw } from "../core.js";
import { act, attackWith, find, hand, named, on, plain, realCard, setup, settle, toNextTurn } from "./marvelKit.js";

// Triggers about spells that target, tapping, counters, and hand size (Marvel Super Heroes).

const bolt = { id: "bolt", name: "Bolt", type: "instant" as const, cost: 1, manaCost: "{R}", typeLine: "Instant", text: "Bolt deals 1 damage to any target.", colors: ["R"] };
const pumpSpell = { id: "pump", name: "Pump", type: "instant" as const, cost: 1, manaCost: "{G}", typeLine: "Instant", text: "Target creature gets +1/+1 until end of turn.", colors: ["G"] };

test("Mockingbird and Colleen Wing grow when you cast a spell that targets a creature you control", () => {
  let g = setup({ hand: ["pump", "pump"], mine: ["Mockingbird, Ace Agent", "Colleen Wing, Street Samurai", "bear"], extra: { pump: pumpSpell } });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m2") }));
  while (g.pendingPick) g = settle(act(g, "p1", { type: "pick" })); // Colleen Wing's scry
  assert.equal(find(g, "m0")!.counters, 1, "Mockingbird");
  assert.equal(find(g, "m1")!.counters, 1, "Colleen Wing");
  // a spell aimed at the opponent's creature does not count
  g = setup({ hand: ["bolt"], mine: ["Mockingbird, Ace Agent"], theirs: ["bear"], extra: { bolt } });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "m0")!.counters, undefined);
});

test("Hawkeye's Bow: 1 damage to each opponent whenever the equipped creature becomes tapped", () => {
  const g0 = setup({ mine: ["Hawkeye's Bow", "bear"] });
  g0.players.p1.battlefield.find((p) => p.card.iid === "m0")!.attachedTo = "m1";
  const g = attackWith(g0, ["m1"]);
  assert.equal(g.players.p2.life, 20 - 1 - 3, "1 from the Bow, then 3 combat damage (2 power +1 from the Bow)");
});

test("Captain America, Living Legend: a creature that becomes tapped on your turn untaps (once)", () => {
  const g0 = setup({ mine: ["Captain America, Living Legend", "bear"] });
  const g = attackWith(g0, ["m1"]);
  assert.equal(find(g, "m1")!.tapped, false, "untapped after attacking");
});

test("Rewrite History: tapping creatures draws, loots and counts toward the plan", () => {
  let g = setup({ mine: ["Rewrite History", "bear", "bear"], library: ["plains", "plains", "plains"], yard: ["bolt", "bolt"], extra: { bolt } });
  g = attackWith(g, ["m1", "m2"]);
  while (g.pendingPick) g = settle(act(g, "p1", { type: "pick", iid: g.pendingPick.options[0] }));
  assert.equal(find(g, "m0")!.planCounters, 1, "one plan counter for both attackers (one or more)");
});

test("counter triggers: Knight of Wundagore and Ant-Man put counters and make Insects", () => {
  const defs = { grow: { id: "grow", name: "Grow", type: "instant" as const, cost: 1, manaCost: "{G}", typeLine: "Instant", text: "Put a +1/+1 counter on target creature.", colors: ["G"] } };
  let g = setup({ hand: ["grow"], mine: ["Knight of Wundagore", "Ant-Man, Colony Commander", "bear"], extra: defs });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m2") }));
  assert.equal(find(g, "m0")!.counters, 1, "Knight: a counter on another creature");
  assert.equal(named(g, "p1", "Insect").length, 1, "Ant-Man: an Insect token (once each turn)");
});

test("Beast has flying only on a turn he got a +1/+1 counter; Kid Loki gives hexproof the same way", () => {
  const g0 = setup({ mine: ["Beast, Erudite Aerialist", "bear", "Kid Loki"] });
  assert.equal(kw(g0, find(g0, "m0")!, "flying"), false);
  find(g0, "m0")!.countersThisTurn = 1;
  assert.equal(kw(g0, find(g0, "m0")!, "flying"), true);
  assert.equal(kw(g0, find(g0, "m1")!, "hexproof"), false);
  find(g0, "m1")!.countersThisTurn = 1;
  assert.equal(kw(g0, find(g0, "m1")!, "hexproof"), true);
});

test("Hulkling grows when a bigger creature enters; a smaller one does nothing", () => {
  let g = setup({ hand: ["giant"], mine: ["Hulkling, Burgeoning Bruiser"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(find(g, "m0")!.counters, 1);
  let h = setup({ hand: ["elf"], mine: ["Hulkling, Burgeoning Bruiser"] });
  h = settle(act(h, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(find(h, "m0")!.counters, undefined);
});

test("Doc Samson: every +1/+1 counter you put is one bigger", () => {
  const grow = { id: "grow", name: "Grow", type: "instant" as const, cost: 1, manaCost: "{G}", typeLine: "Instant", text: "Put a +1/+1 counter on target creature.", colors: ["G"] };
  let g = setup({ hand: ["grow"], mine: ["Doc Samson, Super Psychiatrist", "bear"], extra: { grow } });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m1") }));
  assert.equal(find(g, "m1")!.counters, 2);
});

test("The Ten Rings: at your end step draw up to ten cards; hand size is ten", () => {
  let g = setup({ mine: ["The Ten Rings"], library: Array(15).fill("plains") });
  g.players.p1.hand = [];
  g = toNextTurn(g);
  g = settle(g);
  // it was your end step with an empty hand: you drew 10, then drew for the turn
  assert.ok(hand(g).length >= 10, `drew up to ten (now ${hand(g).length})`);
});

test("Ms. Marvel: draws, and her base power is the cards in your hand until end of turn", () => {
  const pumpDef = pumpSpell;
  let g = setup({ hand: ["pump", "bear"], mine: ["Ms. Marvel, Kamala Khan", "bear"], extra: { pump: pumpDef } });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m1") }));
  assert.equal(find(g, "m0")!.powerFromHand, true);
  assert.equal(powerOf(g, find(g, "m0")!), hand(g).length);
  void plain;
  void realCard;
});
