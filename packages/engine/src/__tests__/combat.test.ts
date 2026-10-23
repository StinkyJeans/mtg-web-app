import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getPossibleAttackers, getPossibleBlockers } from "../index.js";
import type { Action, CardInstance, GameState, PlayerId } from "../index.js";

const deck = Array(40).fill("mountain");

function act(state: GameState, player: PlayerId, action: Action): GameState {
  const r = applyAction(state, player, action);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

const creature = (iid: string, defId: string, owner: PlayerId, sick = false) => ({
  card: { iid, defId, owner } as CardInstance,
  tapped: false,
  summoningSick: sick,
  damage: 0,
});

/** p1's attackers phase with the given boards. */
function setup(p1: ReturnType<typeof creature>[], p2: ReturnType<typeof creature>[]): GameState {
  const g = createGame({ p1: deck, p2: deck }, 1);
  g.cards = { ...CARDS }; // creatures are placed on the board by hand, so register every card
  g.players.p1.battlefield = p1;
  g.players.p2.battlefield = p2;
  g.phase = "attackers";
  return g;
}

test("unblocked attacker hits the player", () => {
  let g = setup([creature("a", "hill-giant", "p1")], []);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  assert.equal(g.phase, "blockers");
  assert.equal(g.players.p1.battlefield[0].tapped, true);
  g = act(g, "p2", { type: "declareBlockers", blocks: [] });
  assert.equal(g.players.p2.life, 17);
  assert.equal(g.phase, "main2");
  assert.equal(g.combat, null);
});

test("blocker trade: both die when damage is lethal to both", () => {
  let g = setup([creature("a", "grizzly-bears", "p1")], [creature("b", "grizzly-bears", "p2")]);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "a", blocker: "b" }] });
  assert.equal(g.players.p1.battlefield.length, 0);
  assert.equal(g.players.p2.battlefield.length, 0);
  assert.equal(g.players.p1.graveyard.length, 1);
  assert.equal(g.players.p2.graveyard.length, 1);
  assert.equal(g.players.p2.life, 20); // blocked: no damage to player
});

test("bigger creature survives with damage marked, which heals at end of turn", () => {
  let g = setup([creature("a", "rumbling-baloth", "p1")], [creature("b", "mons-s-goblin-raiders", "p2")]);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "a", blocker: "b" }] });
  assert.equal(g.players.p2.battlefield.length, 0);
  assert.equal(g.players.p1.battlefield[0].damage, 1);
  g = act(g, "p1", { type: "passPhase" }); // main2 -> end
  g = act(g, "p1", { type: "passPhase" }); // next turn
  assert.equal(g.players.p1.battlefield[0].damage, 0);
});

test("passing the attackers step skips combat entirely", () => {
  let g = setup([creature("a", "hill-giant", "p1")], []);
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(g.phase, "main2");
  g = setup([creature("a", "hill-giant", "p1")], []);
  g = act(g, "p1", { type: "declareAttackers", attackers: [] });
  assert.equal(g.phase, "main2");
});

test("summoning-sick and tapped creatures can't attack; defender can't pass blockers", () => {
  const g = setup([creature("a", "hill-giant", "p1", true)], []);
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["a"] }).ok, false);
  assert.deepEqual(getPossibleAttackers(g), []);

  const g2 = setup([creature("a", "hill-giant", "p1")], [creature("b", "mons-s-goblin-raiders", "p2")]);
  const blocking = act(g2, "p1", { type: "declareAttackers", attackers: ["a"] });
  assert.deepEqual(getPossibleBlockers(blocking), ["b"]);
  assert.equal(applyAction(blocking, "p1", { type: "declareBlockers", blocks: [] }).ok, false); // wrong player
  assert.equal(applyAction(blocking, "p2", { type: "passPhase" }).ok, false);
});

test("invalid blocks are rejected", () => {
  let g = setup(
    [creature("a", "hill-giant", "p1"), creature("c", "hill-giant", "p1")],
    [creature("b", "mons-s-goblin-raiders", "p2")],
  );
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a", "c"] });
  const two = applyAction(g, "p2", {
    type: "declareBlockers",
    blocks: [{ attacker: "a", blocker: "b" }, { attacker: "c", blocker: "b" }],
  });
  assert.equal(two.ok, false); // one creature can't block twice
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "zzz", blocker: "b" }] }).ok, false);
});

test("lethal damage ends the game", () => {
  let g = setup([creature("a", "rumbling-baloth", "p1")], []);
  g.players.p2.life = 4;
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [] });
  assert.equal(g.winner, "p1");
  assert.equal(applyAction(g, "p1", { type: "passPhase" }).ok, false);
});
