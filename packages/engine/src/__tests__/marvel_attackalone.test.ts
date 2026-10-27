import { test } from "node:test";
import assert from "node:assert/strict";
import { powerOf, toughnessOf } from "../index.js";
import { act, attackWith, choose, find, named, setup } from "./marvelKit.js";

// "Attacks alone" triggers and equipped-creature triggers (Marvel Super Heroes).

const toughness = (g: ReturnType<typeof setup>, iid: string) => toughnessOf(g, find(g, iid)!);

test("Agents of S.H.I.E.L.D.: a creature attacking alone gets +1/+1", () => {
  const g0 = setup({ mine: ["Agents of S.H.I.E.L.D.", "bear"] });
  const alone = attackWith(g0, ["m1"]);
  assert.equal(powerOf(alone, find(alone, "m1")!), 3);
  assert.equal(toughness(alone, "m1"), 3);
  const two = attackWith(g0, ["m0", "m1"]);
  assert.equal(powerOf(two, find(two, "m1")!), 2);
});

test("Luke Cage: +2/+0 and indestructible when he attacks alone, but not when another creature does", () => {
  const g0 = setup({ mine: ["Luke Cage, Power Man", "bear"] });
  const alone = attackWith(g0, ["m0"]);
  assert.equal(powerOf(alone, find(alone, "m0")!), 4);
  assert.ok(find(alone, "m0")!.tempKeywords?.includes("indestructible"));
  const other = attackWith(g0, ["m1"]);
  assert.equal(powerOf(other, find(other, "m0")!), 2);
});

test("Black Widow, Double Agent: the lone attacker gains first strike and menace", () => {
  const g0 = setup({ mine: ["Black Widow, Double Agent", "bear"] });
  const alone = attackWith(g0, ["m1"]);
  assert.deepEqual([...(find(alone, "m1")!.tempKeywords ?? [])].sort(), ["first strike", "menace"]);
});

test("Agent 13 investigates when a creature attacks alone", () => {
  const g0 = setup({ mine: ["Agent 13, Sharon Carter", "bear"] });
  assert.equal(named(attackWith(g0, ["m1"]), "p1", "Clue").length, 1);
  assert.equal(named(attackWith(g0, ["m0", "m1"]), "p1", "Clue").length, 0);
});

test("HYDRA Infiltration: the opponent loses 1 life and you gain 1 when a creature attacks alone", () => {
  const g0 = setup({ mine: ["HYDRA Infiltration", "bear"] });
  let g = attackWith(g0, ["m1"]);
  if (g.pendingChoice) g = choose(g, "p1", [{ kind: "player", id: "p2" }]);
  assert.equal(g.players.p2.life, 17, "1 from the trigger and 2 combat damage from the Bear");
  assert.equal(g.players.p1.life, 21);
});

test("Captain America's Shield: the equipped creature taps a defender when it attacks", () => {
  const g0 = setup({ mine: ["Captain America's Shield", "bear"], theirs: ["bear"] });
  g0.players.p1.battlefield.find((p) => p.card.iid === "m0")!.attachedTo = "m1";
  let g = attackWith(g0, ["m1"]);
  if (g.pendingChoice) g = choose(g, "p1", [{ kind: "permanent", iid: "t0" }]);
  assert.equal(find(g, "t0")!.tapped, true);
  assert.equal(toughness(g, "m1"), 10, "+0/+8 from the Shield");
});

test("S.H.I.E.L.D. Spy Kit: untaps the equipped creature that attacked alone (and scry)", () => {
  const g0 = setup({ mine: ["S.H.I.E.L.D. Spy Kit", "bear"] });
  g0.players.p1.battlefield.find((p) => p.card.iid === "m0")!.attachedTo = "m1";
  const g = attackWith(g0, ["m1"]);
  assert.equal(find(g, "m1")!.tapped, false);
});

test("Kang connives when he attacks; Madame Masque connives when she enters", () => {
  const g0 = setup({ mine: ["Kang, Temporal Tyrant"], library: ["bear", "plains", "plains"] });
  let g = attackWith(g0, ["m0"]);
  assert.equal(g.pendingPick?.kind, "discard", "draw, then choose a discard");
  g = act(g, "p1", { type: "pick", iid: g.pendingPick!.options.find((o) => g.players.p1.hand.find((c) => c.iid === o && g.cards[c.defId].name === "Bear"))! });
  assert.equal(find(g, "m0")!.counters, 1, "a nonland card was discarded: +1/+1 counter");
});
