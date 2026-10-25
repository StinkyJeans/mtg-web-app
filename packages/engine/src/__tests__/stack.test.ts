import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getLegalActions, playerToAct } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bolt: { id: "bolt", name: "Bolt", type: "instant", cost: 1, manaCost: "{R}", text: "Bolt deals 3 damage to any target." },
  cancel: { id: "cancel", name: "Cancel", type: "instant", cost: 1, manaCost: "{R}", text: "Counter target spell." },
  divination: { id: "divination", name: "Divination", type: "sorcery", cost: 1, manaCost: "{R}", text: "Draw two cards." },
  elder: { id: "elder", name: "Elder", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1, text: "When Elder enters, you gain 2 life." },
  pinger: { id: "pinger", name: "Pinger", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1, text: "{T}: Pinger deals 1 damage to any target." },
};

const perm = (iid: string, defId: string, owner: PlayerId) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
const card = (iid: string, defId: string, owner: PlayerId): CardInstance => ({ iid, defId, owner });

function setup(hand: string[], opponentHand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => card(`h${i}`, d, "p1"));
  g.players.p2.hand = opponentHand.map((d, i) => card(`o${i}`, d, "p2"));
  g.players.p1.battlefield = Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain", "p1"));
  g.players.p2.battlefield = Array.from({ length: 4 }, (_, i) => perm(`m${i}`, "mountain", "p2"));
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

test("a spell goes on the stack, the opponent gets priority, and it resolves when both pass", () => {
  let g = setup(["bolt"], ["bolt"]); // the opponent holds an instant, so they get to decide
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.stack.length, 1);
  assert.equal(g.players.p2.life, 20);
  g = act(g, "p2", { type: "passPriority" });
  assert.equal(g.stack.length, 0);
  assert.equal(g.players.p2.life, 17);
  assert.equal(g.players.p1.graveyard.length, 1);
});

test("a sorcery can't be cast outside your own main phase", () => {
  const g = setup(["divination"]);
  g.phase = "attackers";
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(r.ok, false);
});

test("with no possible response the spell resolves at once; a sorcery draws cards", () => {
  let g = setup(["divination"]);
  const lib = g.players.p1.library.length;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.library.length, lib - 2);
});

test("the opponent can respond with a counterspell", () => {
  let g = setup(["bolt"], ["cancel"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  const spellId = g.stack[0].id;
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: spellId }] });
  // p1 has no answer, so Cancel resolves and then the countered Bolt does nothing.
  assert.equal(g.stack.length, 0);
  assert.equal(g.players.p2.life, 20);
  assert.equal(g.players.p1.graveyard.length, 1);
  assert.equal(g.players.p2.graveyard.length, 1);
});

test("a spell needs a legal target", () => {
  const g = setup(["bolt"]);
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(r.ok, false);
});

test("an enters-the-battlefield trigger goes on the stack and resolves", () => {
  let g = setup(["elder"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.battlefield.some((p) => p.card.defId === "elder"), true);
  assert.equal(g.stack.length, 0);
  assert.equal(g.players.p1.life, 22);
});

test("an activated ability taps the creature and deals its damage", () => {
  let g = setup([]);
  g.players.p1.battlefield.push(perm("pg", "pinger", "p1"));
  g = act(g, "p1", { type: "activateAbility", iid: "pg", index: 0, targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p1.battlefield.find((p) => p.card.iid === "pg")!.tapped, true);
  assert.equal(g.players.p2.life, 19);
});

test("while the stack is open only responses are allowed", () => {
  let g = setup(["bolt", "divination"], ["bolt"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(playerToAct(g), "p2");
  assert.equal(applyAction(g, "p2", { type: "passPhase" }).ok, false);
  assert.ok(getLegalActions(g, "p2").some((a) => a.type === "passPriority"));
});
