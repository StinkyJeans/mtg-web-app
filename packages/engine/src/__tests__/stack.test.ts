import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, fizzleReason, getLegalActions, manaSources, playerToAct } from "../index.js";
import type { Action, CardDef, CardInstance, GameEvent, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bolt: { id: "bolt", name: "Bolt", type: "instant", cost: 1, manaCost: "{R}", text: "Bolt deals 3 damage to any target." },
  cancel: { id: "cancel", name: "Cancel", type: "instant", cost: 1, manaCost: "{R}", text: "Counter target spell." },
  divination: { id: "divination", name: "Divination", type: "sorcery", cost: 1, manaCost: "{R}", text: "Draw two cards." },
  elder: { id: "elder", name: "Elder", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1, text: "When Elder enters, you gain 2 life." },
  pinger: { id: "pinger", name: "Pinger", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1, text: "{T}: Pinger deals 1 damage to any target." },
  shield: { id: "shield", name: "Shield", type: "instant", cost: 1, manaCost: "{R}", text: "Target creature you control gains hexproof until end of turn." },
  defense: { id: "defense", name: "Defense", type: "instant", cost: 1, manaCost: "{R}", text: "Target creature you control gets +2/+2 and gains hexproof until end of turn." },
  hierarch: { id: "hierarch", name: "Hierarch", type: "creature", cost: 1, manaCost: "{G}", power: 0, toughness: 1, text: "{T}: Add {G}, {W}, or {U}." },
  growth: { id: "growth", name: "Growth", type: "instant", cost: 2, manaCost: "{1}{G}", text: "Target creature gets +1/+1 until end of turn." },
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

/** Plays `actions` and then passes until the stack is empty, keeping every event. */
function played(g: GameState, actions: [PlayerId, Action][]): { g: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const step = (who: PlayerId, a: Action) => {
    const r = applyAction(g, who, a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    events.push(...r.events);
    g = r.state;
  };
  for (const [who, a] of actions) step(who, a);
  for (let i = 0; i < 10 && g.priority; i++) step(g.priority.holder, { type: "passPriority" });
  return { g, events };
}

test("a countered spell says what countered it, and the counterspell resolves", () => {
  let g = setup(["bolt"], ["cancel"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  const { events } = played(g, [["p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: g.stack[0].id }] }]]);
  assert.deepEqual(events.filter((e) => e.type === "countered" || e.type === "resolved"), [
    { type: "resolved", name: "Cancel", controller: "p2", iid: "o0" },
    { type: "countered", name: "Bolt", controller: "p1", iid: "h0", by: "Cancel" },
  ]);
});

test("a spell whose target gained hexproof in response does nothing, and says why", () => {
  let g = setup(["bolt", "bolt"], ["shield"]);
  g.players.p2.battlefield.push(perm("c0", "elder", "p2"));
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "c0" }] });
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "permanent", iid: "c0" }] });
  g = act(g, "p1", { type: "passPriority" }); // Shield resolves; p1 still holds a Bolt, so the round waits on them
  assert.equal(g.stack.length, 1);
  assert.equal(fizzleReason(g, g.stack[0]), "Elder has hexproof", "the stack shows it won't do anything");
  const { g: after, events } = played(g, []);
  assert.deepEqual(events.find((e) => e.type === "resolved"), { type: "resolved", name: "Bolt", controller: "p1", iid: "h0", fizzled: "Elder has hexproof" });
  assert.ok(after.players.p2.battlefield.some((p) => p.card.iid === "c0"), "the Elder lives");
});

const resolvedOf = (events: GameEvent[], name: string) => events.find((e): e is Extract<GameEvent, { type: "resolved" }> => e.type === "resolved" && e.name === name);

test("a resolved spell says everything it did: the size change and the keyword", () => {
  const g = setup(["defense"]);
  g.players.p1.battlefield.push(perm("c0", "elder", "p1"));
  const { events } = played(g, [["p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "c0" }] }]]);
  assert.deepEqual(resolvedOf(events, "Defense")?.did, [
    { k: "pump", iid: "c0", name: "Elder", dp: 2, dt: 2, power: 3, toughness: 3 },
    { k: "keywords", iid: "c0", name: "Elder", gained: ["hexproof"], lost: [] },
  ]);
});

test("a spell that kills says where the creature went", () => {
  const g = setup(["bolt"]);
  g.players.p2.battlefield.push(perm("c0", "elder", "p2"));
  const { events } = played(g, [["p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "c0" }] }]]);
  assert.deepEqual(resolvedOf(events, "Bolt")?.did, [{ k: "left", iid: "c0", name: "Elder", to: "graveyard" }]);
});

test("a triggered ability is marked as one, with its text, and says what it did", () => {
  const g = setup(["elder"]);
  const { events } = played(g, [["p1", { type: "castSpell", iid: "h0", targets: [] }]]);
  const trigger = resolvedOf(events, "Elder's ability");
  assert.equal(trigger?.trigger, true);
  assert.match(trigger?.text ?? "", /enters/);
  assert.deepEqual(trigger?.did, [{ k: "life", player: "p1", from: 20, to: 22 }]);
  assert.equal(resolvedOf(events, "Elder")?.trigger, undefined, "the creature spell itself is not a trigger");
});

test("paying mana says which permanent made which mana", () => {
  const g = setup(["growth"]);
  g.players.p1.battlefield = [perm("l0", "mountain", "p1"), perm("hi", "hierarch", "p1"), perm("c0", "elder", "p1")];
  const { events } = played(g, [["p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "c0" }] }]]);
  const paid = events.find((e) => e.type === "manaPaid");
  assert.deepEqual(paid, {
    type: "manaPaid",
    player: "p1",
    made: [
      { iid: "hi", name: "Hierarch", color: "G" },
      { iid: "l0", name: "Mountain", color: "R" },
    ],
  });
});

test("damage to a creature that survives is part of what a spell did", () => {
  const g = setup(["bolt"]);
  g.players.p2.battlefield.push({ ...perm("c0", "elder", "p2"), card: card("c0", "giant", "p2") });
  g.cards.giant = { id: "giant", name: "Giant", type: "creature", cost: 1, manaCost: "{R}", power: 4, toughness: 4, text: "" };
  const { events } = played(g, [["p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "c0" }] }]]);
  assert.deepEqual(resolvedOf(events, "Bolt")?.did, [{ k: "damaged", iid: "c0", name: "Giant", n: 3 }]);
});

test("mana sources list what each permanent makes, tapped or not, and a mana creature that just arrived", () => {
  const g = setup([]);
  g.players.p1.battlefield = [{ ...perm("l0", "mountain", "p1"), tapped: true }, perm("hi", "hierarch", "p1"), { ...perm("h2", "hierarch", "p1"), summoningSick: true }, perm("c0", "elder", "p1")];
  assert.deepEqual(
    manaSources(g, "p1").map((m) => [m.iid, m.colors.join(""), m.amount, m.tapped, m.sick]),
    [
      ["l0", "R", 1, true, false],
      ["hi", "GWU", 1, false, false],
      ["h2", "GWU", 1, false, true],
    ],
  );
});
