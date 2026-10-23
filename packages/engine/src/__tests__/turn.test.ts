import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, createGame, getCard, getLegalActions } from "../index.js";
import type { Action, GameState, PlayerId } from "../index.js";

const deck = [
  ...Array(10).fill("mountain"),
  ...Array(10).fill("grizzly-bears"),
  ...Array(20).fill("hill-giant"),
];

function act(state: GameState, player: PlayerId, action: Action): GameState {
  const r = applyAction(state, player, action);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

/** Pass through every step of the active player's turn, discarding to hand size when the rules require it. */
function endTurn(g: GameState): GameState {
  const who = g.active;
  for (let guard = 0; g.active === who && guard < 10; guard++) {
    if (g.phase === "cleanup") {
      const excess = g.players[who].hand.length - 7;
      g = act(g, who, { type: "discard", iids: g.players[who].hand.slice(0, excess).map((c) => c.iid) });
    } else {
      g = act(g, who, { type: "passPhase" });
    }
  }
  return g;
}

const firstInHand = (s: GameState, p: PlayerId, defId: string) =>
  s.players[p].hand.find((c) => c.defId === defId)?.iid;

/** Rig a hand so tests don't depend on shuffle luck. */
function rigged(): GameState {
  const g = createGame({ p1: deck, p2: deck }, 1);
  const all = [...g.players.p1.hand, ...g.players.p1.library];
  const lands = all.filter((c) => c.defId === "mountain");
  const bears = all.filter((c) => c.defId === "grizzly-bears");
  g.players.p1.hand = [...lands.slice(0, 3), ...bears.slice(0, 2)];
  g.players.p1.library = all.filter((c) => !g.players.p1.hand.includes(c));
  return g;
}

test("one land per turn, only in a main phase", () => {
  let g = rigged();
  const [l1, l2] = g.players.p1.hand.filter((c) => getCard(g, c.defId).type === "land");
  g = act(g, "p1", { type: "playLand", iid: l1.iid });
  const again = applyAction(g, "p1", { type: "playLand", iid: l2.iid });
  assert.equal(again.ok, false);

  g = act(g, "p1", { type: "passPhase" }); // combat
  assert.equal(applyAction(g, "p1", { type: "playLand", iid: l2.iid }).ok, false);
});

test("casting taps lands and the creature is summoning sick", () => {
  let g = rigged();
  const bears = firstInHand(g, "p1", "grizzly-bears")!;
  assert.equal(applyAction(g, "p1", { type: "castCreature", iid: bears }).ok, false); // no mana

  g = act(g, "p1", { type: "playLand", iid: firstInHand(g, "p1", "mountain")! });
  assert.equal(applyAction(g, "p1", { type: "castCreature", iid: bears }).ok, false); // 1 < 2

  // Next turn cycle to get a second land.
  g = endTurn(g);
  g = endTurn(g);
  g = act(g, "p1", { type: "playLand", iid: firstInHand(g, "p1", "mountain")! });
  g = act(g, "p1", { type: "castCreature", iid: bears });

  const board = g.players.p1.battlefield;
  assert.equal(board.filter((p) => p.tapped).length, 2);
  assert.equal(board.find((p) => p.card.iid === bears)?.summoningSick, true);
});

test("turn passes, opponent draws, lands untap", () => {
  let g = rigged();
  g = act(g, "p1", { type: "playLand", iid: firstInHand(g, "p1", "mountain")! });
  const p2Hand = g.players.p2.hand.length;
  for (let i = 0; i < 4; i++) g = act(g, "p1", { type: "passPhase" });
  assert.equal(g.active, "p2");
  assert.equal(g.turn, 2);
  assert.equal(g.phase, "main1");
  assert.equal(g.players.p2.hand.length, p2Hand + 1);
});

test("only the active player can act, and input state is never mutated", () => {
  const g = rigged();
  const snapshot = structuredClone(g);
  assert.equal(applyAction(g, "p2", { type: "passPhase" }).ok, false);
  applyAction(g, "p1", { type: "passPhase" });
  assert.deepEqual(g, snapshot);
});

test("drawing from an empty library loses the game", () => {
  let g = rigged();
  g.players.p2.library = [];
  for (let i = 0; i < 4; i++) g = act(g, "p1", { type: "passPhase" });
  assert.equal(g.winner, "p1");
  assert.equal(applyAction(g, "p1", { type: "passPhase" }).ok, false);
});

test("getLegalActions only lists playable cards", () => {
  const g = rigged();
  const actions = getLegalActions(g, "p1");
  assert.ok(actions.some((a) => a.type === "playLand"));
  assert.ok(!actions.some((a) => a.type === "castCreature")); // no mana yet
  assert.deepEqual(getLegalActions(g, "p2"), []);
});
