import { test } from "node:test";
import assert from "node:assert/strict";
import { castCostOf, powerOf, toughnessOf } from "../index.js";
import { subtypesOf } from "../core.js";
import { act, choose, find, hand, named, on, plain, realCard, setup, settle, yard } from "./marvelKit.js";

// "Two or more creature cards in your graveyard" conditions, and "you may sacrifice an artifact or discard a card" costs.

test("Undercover Skrull: 3/3 and every creature type with two creature cards in the graveyard", () => {
  const g0 = setup({ mine: ["Undercover Skrull"] });
  const skrull = () => find(g0, "m0")!;
  assert.equal(powerOf(g0, skrull()), 1);
  assert.equal(subtypesOf(g0, skrull()).includes("hero"), false);
  const g1 = setup({ mine: ["Undercover Skrull"], yard: ["bear", "bear"] });
  assert.equal(powerOf(g1, find(g1, "m0")!), 3);
  assert.equal(toughnessOf(g1, find(g1, "m0")!), 3);
  assert.ok(subtypesOf(g1, find(g1, "m0")!).includes("hero"));
  assert.ok(subtypesOf(g1, find(g1, "m0")!).includes("villain"));
});

test("HYDRA Troopers: a tapped Villain token with two creature cards in the graveyard, otherwise mill two", () => {
  const rich = settle(act(setup({ hand: ["HYDRA Troopers"], yard: ["bear", "bear"] }), "p1", { type: "castCreature", iid: "h0" }));
  const token = named(rich, "p1", "Villain")[0];
  assert.ok(token, "token made");
  assert.equal(token.tapped, true);
  assert.equal(rich.players.p1.library.length, 5, "nothing milled");
  const poor = settle(act(setup({ hand: ["HYDRA Troopers"] }), "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(named(poor, "p1", "Villain").length, 0);
  assert.equal(poor.players.p1.library.length, 3, "milled two");
});

test("Arnim Zola: the ability needs two creature cards in your graveyard", () => {
  const no = setup({ mine: ["Arnim Zola, Bio-Fanatic"] });
  const r = (g: typeof no) => act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 });
  assert.throws(() => r(no), /creature cards in your graveyard/);
  const yes = settle(r(setup({ mine: ["Arnim Zola, Bio-Fanatic"], yard: ["bear", "bear"] })));
  const token = named(yes, "p1", "Villain")[0];
  assert.ok(token);
  assert.equal(token.tapped, true);
});

test("Punishing Punch: costs {2} less with two creature cards in the graveyard; twice its power in damage", () => {
  const g0 = setup({ hand: ["Punishing Punch"] });
  const g1 = setup({ hand: ["Punishing Punch"], yard: ["bear", "bear"] });
  const printed = castCostOf(g0, "p1", g0.cards[g0.players.p1.hand[0].defId])!;
  assert.equal(castCostOf(g1, "p1", g1.cards[g1.players.p1.hand[0].defId])!.generic, printed.generic - 2);
  const g = setup({ hand: ["Punishing Punch"], mine: ["bear"], theirs: ["giant"] });
  const done = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [...on("m0"), ...on("t0")] }));
  assert.equal(find(done, "t0")!.damage, 4, "twice the Bear's power of 2");
});

test("K'un-Lun Warrior: discard a card (or sacrifice an artifact) to draw", () => {
  let g = setup({ hand: ["K'un-Lun Warrior", "bear"], library: ["plains", "plains", "plains"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mayCost");
  g = settle(act(g, "p1", { type: "pick", iid: "h1" }));
  assert.deepEqual(yard(g), ["Bear"]);
  assert.equal(hand(g).length, 1, "drew a card");
  // declining costs nothing
  let h = setup({ hand: ["K'un-Lun Warrior", "bear"] });
  h = settle(act(h, "p1", { type: "castCreature", iid: "h0" }));
  h = settle(act(h, "p1", { type: "pick" }));
  assert.equal(hand(h).length, 1);
});

test("Vision of Love: sacrifice an artifact or discard a card to draw two", () => {
  const rock = { id: "rock", name: "Gold Rock", type: "artifact" as const, cost: 3, manaCost: "{3}", typeLine: "Artifact", text: "" };
  let g = setup({ hand: ["Vision of Love"], mine: ["rock"], extra: { rock }, library: ["plains", "plains", "plains"] });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  g = settle(act(g, "p1", { type: "pick", iid: "m0" }));
  assert.equal(find(g, "m0"), undefined, "the artifact was sacrificed");
  assert.equal(hand(g).length, 2);
});

test("Bullseye: discard a nonland card when he enters, and he deals 2 damage to any target", () => {
  let g = setup({ hand: ["Bullseye, Death Dealer", "bear"], theirs: ["bear"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  g = settle(act(g, "p1", { type: "pick", iid: "h1" }));
  if (g.pendingChoice) g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "t0"), undefined, "2 damage killed their Bear");
  void plain;
  void realCard;
});
