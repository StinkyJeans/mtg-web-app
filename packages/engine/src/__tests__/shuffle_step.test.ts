import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, botAction, createGame, getLegalActions, playerToAct, viewFor } from "../index.js";
import type { Action, GameState, PlayerId } from "../index.js";

// The shuffle step before keeping or mulliganing: each player shuffles the OTHER player's library, the starting player first.

const deck = (prefix: string) => Array.from({ length: 40 }, (_, i) => (i % 2 ? "mountain" : "forest") + (prefix === "x" ? "" : ""));
const start = (): GameState => createGame({ p1: deck("a"), p2: deck("b") }, 7, undefined, { startingPlayer: "p2", mulligan: true, shuffleStep: true });
const act = (s: GameState, p: PlayerId, a: Action): GameState => {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
};
const order = (s: GameState, p: PlayerId) => s.players[p].library.map((c) => c.iid).join(",");

test("without the shuffle step the opening works as before", () => {
  const g = createGame({ p1: deck("a"), p2: deck("b") }, 7, undefined, { startingPlayer: "p1", mulligan: true });
  assert.equal(g.opening?.shuffled, undefined);
  assert.equal(act(g, "p1", { type: "keepHand", bottom: [] }).opening?.kept.p1, true);
});

test("keeping and mulliganing wait until both libraries are shuffled, starting player first", () => {
  let g = start();
  assert.equal(playerToAct(g), "p2", "the starting player shuffles first");
  assert.deepEqual(getLegalActions(g, "p2"), [{ type: "shuffleDeck" }]);
  assert.equal(applyAction(g, "p2", { type: "keepHand", bottom: [] }).ok, false, "no keeping before the shuffle");
  assert.equal(applyAction(g, "p2", { type: "mulligan" }).ok, false, "nor a mulligan");
  assert.equal(applyAction(g, "p1", { type: "shuffleDeck" }).ok, false, "p1 is not up yet");

  const before = { p1: order(g, "p1"), p2: order(g, "p2") };
  const r = applyAction(g, "p2", { type: "shuffleDeck" });
  assert.ok(r.ok);
  assert.deepEqual(r.events, [{ type: "deckShuffled", player: "p2", owner: "p1" }]);
  g = r.state;
  assert.notEqual(order(g, "p1"), before.p1, "p2 shuffled p1's library");
  assert.equal(order(g, "p2"), before.p2, "and left their own alone");
  assert.equal(applyAction(g, "p2", { type: "shuffleDeck" }).ok, false, "only once");
  assert.equal(playerToAct(g), "p1");
  assert.equal(applyAction(g, "p1", { type: "keepHand", bottom: [] }).ok, false, "still waiting for the other deck");

  g = act(g, "p1", { type: "shuffleDeck" });
  assert.notEqual(order(g, "p2"), before.p2, "p1 shuffled p2's library");
  assert.equal(playerToAct(g), "p2", "now the keep decision, starting player first");
  assert.deepEqual(getLegalActions(g, "p2").map((a) => a.type), ["mulligan", "keepHand"]);
  g = act(g, "p2", { type: "keepHand", bottom: [] });
  g = act(g, "p1", { type: "keepHand", bottom: [] });
  assert.equal(g.phase, "main1");
});

test("the hands do not change, only the libraries; a spectator view hides the order", () => {
  let g = start();
  const hands = { p1: g.players.p1.hand.map((c) => c.iid), p2: g.players.p2.hand.map((c) => c.iid) };
  g = act(act(g, "p2", { type: "shuffleDeck" }), "p1", { type: "shuffleDeck" });
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid), hands.p1);
  assert.deepEqual(g.players.p2.hand.map((c) => c.iid), hands.p2);
  assert.deepEqual(viewFor(g, "p1").opening?.shuffled, { p1: true, p2: true }, "both players can see who has shuffled");
});

test("the bot shuffles your deck first, then decides on its hand", () => {
  const g = start();
  const first = botAction(viewFor(g, "p2"), "p2");
  assert.deepEqual(first, { type: "shuffleDeck" });
  const g2 = act(g, "p2", { type: "shuffleDeck" });
  assert.deepEqual(botAction(viewFor(g2, "p1"), "p1"), { type: "shuffleDeck" });
});
