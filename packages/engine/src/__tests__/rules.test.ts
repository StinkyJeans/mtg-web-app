import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  CARDS,
  createGame,
  getDamageAssignments,
  playerToAct,
  STARTER_DECK,
  STARTING_HAND,
  suggestDamageAssignment,
} from "../index.js";
import type { Action, CardInstance, GameState, PlayerId } from "../index.js";

const decks = { p1: STARTER_DECK, p2: STARTER_DECK };

function act(state: GameState, player: PlayerId, action: Action): GameState {
  const r = applyAction(state, player, action);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const refused = (state: GameState, player: PlayerId, action: Action) => {
  const r = applyAction(state, player, action);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};

// ───────── starting the game (rules 103.1, 103.5, 103.8a) ─────────

test("the starting player is chosen by the caller and acts first in the mulligan phase", () => {
  const g = createGame(decks, 5, CARDS, { startingPlayer: "p2", mulligan: true });
  assert.equal(g.startingPlayer, "p2");
  assert.equal(g.phase, "mulligan");
  assert.equal(playerToAct(g), "p2");
});

test("keeping a hand with no mulligans starts the game; the starting player skips the first draw", () => {
  let g = createGame(decks, 5, CARDS, { startingPlayer: "p2", mulligan: true });
  const handBefore = g.players.p2.hand.length;
  g = act(g, "p2", { type: "keepHand", bottom: [] });
  assert.equal(g.phase, "mulligan");
  assert.equal(playerToAct(g), "p1"); // now the other player decides
  g = act(g, "p1", { type: "keepHand", bottom: [] });
  assert.equal(g.phase, "main1");
  assert.equal(g.active, "p2");
  assert.equal(g.opening, null);
  assert.equal(g.players.p2.hand.length, handBefore); // no draw on turn 1
});

test("London mulligan: draw a fresh seven, then bottom one card per mulligan", () => {
  let g = createGame(decks, 5, CARDS, { mulligan: true });
  const oldHand = g.players.p1.hand.map((c) => c.iid);
  const libSize = g.players.p1.library.length;
  g = act(g, "p1", { type: "mulligan" });
  assert.equal(g.players.p1.hand.length, STARTING_HAND);
  assert.notDeepEqual(g.players.p1.hand.map((c) => c.iid), oldHand);

  assert.match(refused(g, "p1", { type: "keepHand", bottom: [] }), /Choose 1 card/); // must bottom exactly one
  const bottom = g.players.p1.hand[0].iid;
  g = act(g, "p1", { type: "keepHand", bottom: [bottom] });
  assert.equal(g.players.p1.hand.length, STARTING_HAND - 1);
  assert.equal(g.players.p1.library.length, libSize + 1);
  assert.equal(g.players.p1.library.at(-1)!.iid, bottom); // on the bottom
});

test("nothing but mulligan/keep is allowed during the mulligan phase", () => {
  const g = createGame(decks, 5, CARDS, { mulligan: true });
  assert.ok(refused(g, "p1", { type: "passPhase" }));
  assert.ok(refused(g, "p2", { type: "mulligan" })); // p1 decides first
});

// ───────── multiple blockers (509.1a, 510.1c) ─────────

const creature = (iid: string, defId: string, owner: PlayerId, damage = 0) => ({
  card: { iid, defId, owner } as CardInstance,
  tapped: false,
  summoningSick: false,
  damage,
});

function combat(p1: ReturnType<typeof creature>[], p2: ReturnType<typeof creature>[]): GameState {
  const g = createGame(decks, 1);
  g.cards = { ...CARDS };
  g.players.p1.battlefield = p1;
  g.players.p2.battlefield = p2;
  g.phase = "attackers";
  return g;
}

test("two creatures can block the same attacker, then the attacker divides its damage", () => {
  let g = combat(
    [creature("a", "ogre-brute", "p1")], // 4/4
    [creature("b1", "goblin-scout", "p2"), creature("b2", "grizzly-bears", "p2")], // 1/1 and 2/2
  );
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", {
    type: "declareBlockers",
    blocks: [{ attacker: "a", blocker: "b1" }, { attacker: "a", blocker: "b2" }],
  });
  assert.equal(g.phase, "damage");
  assert.equal(playerToAct(g), "p1"); // the attacker's controller assigns
  assert.deepEqual(getDamageAssignments(g), [{ attacker: "a", blockers: ["b1", "b2"], power: 4 }]);
  assert.deepEqual(suggestDamageAssignment(g, "a"), { b1: 1, b2: 3 }); // lethal to the first, rest on the last

  g = act(g, "p1", {
    type: "assignDamage",
    assignments: [{ attacker: "a", blocker: "b1", amount: 2 }, { attacker: "a", blocker: "b2", amount: 2 }],
  });
  assert.equal(g.phase, "main2");
  assert.equal(g.players.p2.battlefield.length, 0); // both died (1 toughness took 2, 2 toughness took 2)
  assert.equal(g.players.p1.battlefield[0].damage, 3); // 1 + 2 from the blockers
  assert.equal(g.players.p1.battlefield.length, 1); // the 4/4 survives 3 damage
});

test("the attacker must assign exactly its power, only among its blockers", () => {
  let g = combat([creature("a", "hill-giant", "p1")], [creature("b1", "goblin-scout", "p2"), creature("b2", "goblin-scout", "p2")]);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "a", blocker: "b1" }, { attacker: "a", blocker: "b2" }] });
  assert.match(refused(g, "p1", { type: "assignDamage", assignments: [{ attacker: "a", blocker: "b1", amount: 1 }] }), /exactly 3/);
  assert.ok(refused(g, "p1", { type: "assignDamage", assignments: [{ attacker: "a", blocker: "zzz", amount: 3 }] }));
  assert.ok(refused(g, "p1", { type: "assignDamage", assignments: [{ attacker: "a", blocker: "b1", amount: -1 }, { attacker: "a", blocker: "b2", amount: 4 }] }));
  assert.ok(refused(g, "p2", { type: "assignDamage", assignments: [] })); // wrong player
});

test("a single blocker still resolves immediately, with no assignment step", () => {
  let g = combat([creature("a", "hill-giant", "p1")], [creature("b", "goblin-scout", "p2")]);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "a", blocker: "b" }] });
  assert.equal(g.phase, "main2");
});

test("a creature still can't block two different attackers", () => {
  let g = combat([creature("a", "hill-giant", "p1"), creature("c", "hill-giant", "p1")], [creature("b", "goblin-scout", "p2")]);
  g = act(g, "p1", { type: "declareAttackers", attackers: ["a", "c"] });
  refused(g, "p2", { type: "declareBlockers", blocks: [{ attacker: "a", blocker: "b" }, { attacker: "c", blocker: "b" }] });
});

// ───────── cleanup: hand size (514.1) ─────────

test("ending the turn with more than seven cards makes you discard down to seven", () => {
  let g = createGame(decks, 1);
  g.phase = "end";
  g.players.p1.hand.push(...g.players.p1.library.splice(0, 2)); // 9 cards
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(g.phase, "cleanup");
  assert.equal(g.active, "p1"); // the turn hasn't passed yet
  assert.match(refused(g, "p1", { type: "passPhase" }), /Discard down to 7/);
  assert.match(refused(g, "p1", { type: "discard", iids: [g.players.p1.hand[0].iid] }), /exactly 2/);

  const [d1, d2] = g.players.p1.hand;
  g = act(g, "p1", { type: "discard", iids: [d1.iid, d2.iid] });
  assert.equal(g.players.p1.hand.length, 7);
  assert.equal(g.players.p1.graveyard.length, 2);
  assert.equal(g.active, "p2");
  assert.equal(g.phase, "main1");
});

test("a hand of seven or fewer skips the cleanup discard", () => {
  let g = createGame(decks, 1);
  g.phase = "end";
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(g.active, "p2");
});

// ───────── conceding (104.3a) ─────────

test("either player can concede at any time, even out of turn", () => {
  const g = createGame(decks, 1);
  const r = applyAction(g, "p2", { type: "concede" }); // it is p1's turn
  assert.ok(r.ok);
  assert.equal(r.state.winner, "p1");
  assert.ok(r.events.some((e) => e.type === "conceded"));
  assert.equal(applyAction(r.state, "p1", { type: "passPhase" }).ok, false); // game over
});
