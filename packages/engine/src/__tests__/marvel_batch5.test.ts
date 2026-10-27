import { test } from "node:test";
import assert from "node:assert/strict";
import { act, choose, find, hand, named, on, plain, setup, settle, toNextTurn, yard } from "./marvelKit.js";

test("Ant-Man's Army: choose a Food or a Treasure token", () => {
  let g = setup({ hand: ["Ant-Man's Army"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mode");
  g = settle(act(g, "p1", { type: "pick", iid: "1" }));
  assert.equal(named(g, "p1", "Treasure").length, 1);
  assert.equal(named(g, "p1", "Food").length, 0);
});

test("Panther Pounce: a Clue for the player, +1/+0 flying and untap for the creature", () => {
  let g = setup({ hand: ["Panther Pounce"], mine: ["bear"] });
  find(g, "m0")!.tapped = true;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p1" }, ...on("m0")] }));
  assert.equal(named(g, "p1", "Clue").length, 1);
  assert.equal(find(g, "m0")!.tapped, false);
  assert.ok(find(g, "m0")!.tempKeywords?.includes("flying"));
});

test("Thirst for Knowledge: discarding an artifact is enough, otherwise two cards", () => {
  const rock = { id: "rock", name: "Gold Rock", type: "artifact" as const, cost: 3, manaCost: "{3}", typeLine: "Artifact", text: "" };
  let g = setup({ hand: ["Thirst for Knowledge"], extra: { rock }, library: ["rock", "plains", "plains", "plains"] });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.pendingPick?.kind, "discard");
  g = settle(act(g, "p1", { type: "pick", iid: g.players.p1.hand.find((c) => g.cards[c.defId].name === "Gold Rock")!.iid }));
  assert.equal(g.pendingPick, null);
  assert.deepEqual(yard(g).filter((n) => n === "Gold Rock"), ["Gold Rock"]);
  assert.equal(hand(g).length, 2, "drew three, discarded one");
});

test("Super Intelligence: the enchanted creature's controller draws at their upkeep", () => {
  let g = setup({ mine: ["Super Intelligence"], theirs: ["bear"], library: ["plains", "plains"] });
  g.players.p1.battlefield[g.players.p1.battlefield.findIndex((p) => p.card.iid === "m0")].attachedTo = "t0";
  g.players.p2.library = [{ iid: "x1", defId: "plains", owner: "p2" }, { iid: "x2", defId: "plains", owner: "p2" }, { iid: "x3", defId: "plains", owner: "p2" }];
  g = settle(toNextTurn(g, "p2"));
  assert.equal(g.players.p2.hand.length, 2 + 2, "their draw step and the Aura");
});

test("Black Panther, Vanguard: a Soldier or +1/+1 when another nontoken Hero enters", () => {
  const h = plain("hh", "Hero Two", "{1}", 1, 1, "", "Creature — Human Hero", ["W"]);
  let g = setup({ hand: ["hh"], mine: ["Black Panther, Vanguard"], extra: { hh: h } });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mode");
  g = settle(act(g, "p1", { type: "pick", iid: "0" }));
  assert.equal(named(g, "p1", "Soldier").length, 1);
});

test("Alien Invasion: an Alien at the start of combat, counters grow with each invasion counter", () => {
  let g = setup({ mine: ["Alien Invasion"] });
  g = act(g, "p1", { type: "passPhase" }); // to combat: the trigger happens
  g = settle(g);
  assert.equal(named(g, "p1", "Alien").length, 1);
  assert.equal(find(g, "m0")!.invasion, 1);
});

test("Spider-Man, To the Rescue: tap him to make another creature indestructible", () => {
  let g = setup({ hand: ["Spider-Man, To the Rescue"], mine: ["bear"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mayPay");
  g = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  if (g.pendingChoice) g = choose(g, "p1", on("m0"));
  assert.ok(find(g, "m0")!.tempKeywords?.includes("indestructible"));
});
