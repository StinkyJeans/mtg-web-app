import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getLegalActions, isSupportedCard, playerToAct } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// Cards that ask a player to choose cards. Texts are the real ones; costs are all {R}.
const card = (id: string, name: string, type: "instant" | "sorcery", text: string): CardDef => ({ id, name, type, cost: 1, manaCost: "{R}", text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  coercion: card("coercion", "Coercion", "sorcery", "Target opponent reveals their hand. You choose a card from it. That player discards that card."),
  mindrot: card("mindrot", "Mind Rot", "sorcery", "Target player discards two cards."),
  sleight: card("sleight", "Sleight of Hand", "sorcery", "Look at the top two cards of your library. Put one of them into your hand and the other on the bottom of your library."),
  eyespy: card("eyespy", "Eye Spy", "sorcery", "Look at the top card of target player's library. You may put that card into their graveyard."),
  growth: card("growth", "Rampant Growth", "sorcery", "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle."),
  index: card("index", "Index", "sorcery", "Look at the top five cards of your library, then put them back in any order."),
  plague: card("plague", "Dakmor Plague", "sorcery", "Dakmor Plague deals 3 damage to each creature and each player."),
  rats: { id: "rats", name: "Ravenous Rats", type: "creature", cost: 1, manaCost: "{R}", power: 1, toughness: 1, text: "When this creature enters, target opponent discards a card." },
};

const lib = (owner: PlayerId, ids: string[]): CardInstance[] => ids.map((d, i) => ({ iid: `${owner}-lib${i}`, defId: d, owner }));

function setup(hand: string[], opponentHand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = opponentHand.map((d, i) => ({ iid: `o${i}`, defId: d, owner: "p2" }));
  g.players.p1.battlefield = Array.from({ length: 4 }, (_, i) => ({ card: { iid: `l${i}`, defId: "mountain", owner: "p1" } as CardInstance, tapped: false, summoningSick: false, damage: 0 }));
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const refused = (s: GameState, p: PlayerId, a: Action) => assert.equal(applyAction(s, p, a).ok, false);

test("every choice card is understood", () => {
  for (const id of ["coercion", "mindrot", "sleight", "eyespy", "growth", "index", "plague", "rats"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Coercion: you look at their hand and choose what they discard", () => {
  let g = setup(["coercion"], ["mountain", "forest", "hill-giant"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(playerToAct(g), "p1");
  assert.deepEqual(g.pendingPick!.options, ["o0", "o1", "o2"]);
  refused(g, "p1", { type: "passPhase" }); // nothing else is allowed until the choice is made
  refused(g, "p1", { type: "pick", iid: "nope" });
  g = act(g, "p1", { type: "pick", iid: "o2" });
  assert.equal(g.pendingPick, null);
  assert.deepEqual(g.players.p2.hand.map((c) => c.iid), ["o0", "o1"]);
  assert.equal(g.players.p2.graveyard[0].iid, "o2");
  assert.deepEqual(getLegalActions(g, "p1").some((a) => a.type === "passPhase"), true); // the game goes on
});

test("Mind Rot: the player who discards chooses two cards; a small hand is discarded without asking", () => {
  let g = setup(["mindrot"], ["mountain", "forest", "hill-giant"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(playerToAct(g), "p2");
  g = act(g, "p2", { type: "pick", iid: "o0" });
  assert.equal(playerToAct(g), "p2"); // one more
  g = act(g, "p2", { type: "pick", iid: "o2" });
  assert.deepEqual(g.players.p2.hand.map((c) => c.iid), ["o1"]);

  let small = setup(["mindrot"], ["mountain", "forest"]);
  small = act(small, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(small.pendingPick, null);
  assert.equal(small.players.p2.hand.length, 0);
});

test("Ravenous Rats makes the opponent discard when it enters; the opponent chooses", () => {
  let g = setup(["rats"], ["mountain", "forest", "hill-giant"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(playerToAct(g), "p2");
  g = act(g, "p2", { type: "pick", iid: "o1" });
  assert.deepEqual(g.players.p2.hand.map((c) => c.iid), ["o0", "o2"]);
  assert.equal(g.pendingPick, null);
});

test("Sleight of Hand: keep one of the top two, the other goes to the bottom", () => {
  let g = setup(["sleight"]);
  g.players.p1.library = lib("p1", ["bear-a", "mountain", "forest", "forest"]);
  g.cards = { ...g.cards, "bear-a": { id: "bear-a", name: "A", type: "creature", cost: 1, power: 1, toughness: 1 } };
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.deepEqual(g.pendingPick!.options, ["p1-lib0", "p1-lib1"]);
  g = act(g, "p1", { type: "pick", iid: "p1-lib1" });
  assert.equal(g.players.p1.hand.some((c) => c.iid === "p1-lib1"), true);
  assert.equal(g.players.p1.library[g.players.p1.library.length - 1].iid, "p1-lib0");
  assert.equal(g.players.p1.library.length, 3);
});

test("Eye Spy: you may put the top card into their graveyard, or leave it", () => {
  let g = setup(["eyespy", "eyespy"]);
  g.players.p2.library = lib("p2", ["mountain", "forest"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  g = act(g, "p1", { type: "pick" }); // decline
  assert.equal(g.players.p2.library.length, 2);
  g = act(g, "p1", { type: "castSpell", iid: "h1", targets: [{ kind: "player", id: "p2" }] });
  g = act(g, "p1", { type: "pick", iid: "p2-lib0" });
  assert.equal(g.players.p2.graveyard[0].iid, "p2-lib0");
  assert.equal(g.players.p2.library.length, 1);
});

test("Rampant Growth: search for a basic land and put it onto the battlefield tapped", () => {
  let g = setup(["growth"]);
  g.players.p1.library = lib("p1", ["forest", "forest", "mountain", "hill-giant"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.pendingPick!.options.length, 2); // one forest and one mountain: a choice of land, not of copies
  const forest = g.pendingPick!.options[0];
  g = act(g, "p1", { type: "pick", iid: forest });
  const land = g.players.p1.battlefield.find((p) => p.card.iid === forest)!;
  assert.equal(land.tapped, true);
  assert.equal(g.players.p1.library.length, 3);
});

test("Index: put the top five back in an order you choose", () => {
  let g = setup(["index"]);
  g.players.p1.library = lib("p1", ["mountain", "forest", "mountain", "forest", "mountain", "forest"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  for (const iid of ["p1-lib4", "p1-lib3", "p1-lib2", "p1-lib1"]) g = act(g, "p1", { type: "pick", iid });
  assert.equal(g.pendingPick, null);
  assert.deepEqual(g.players.p1.library.slice(0, 5).map((c) => c.iid), ["p1-lib4", "p1-lib3", "p1-lib2", "p1-lib1", "p1-lib0"]);
  assert.equal(g.players.p1.library[5].iid, "p1-lib5");
});

test("Dakmor Plague hits every creature and both players", () => {
  let g = setup(["plague"]);
  g.cards = { ...g.cards, hulk: { id: "hulk", name: "Hulk", type: "creature", cost: 1, power: 5, toughness: 5 }, mite: { id: "mite", name: "Mite", type: "creature", cost: 1, power: 1, toughness: 1 } };
  g.players.p1.battlefield.push({ card: { iid: "hulk", defId: "hulk", owner: "p1" }, tapped: false, summoningSick: false, damage: 0 });
  g.players.p2.battlefield.push({ card: { iid: "mite", defId: "mite", owner: "p2" }, tapped: false, summoningSick: false, damage: 0 });
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.life, 17);
  assert.equal(g.players.p2.life, 17);
  assert.equal(g.players.p2.battlefield.length, 0); // the mite died
  assert.equal(g.players.p1.battlefield.find((p) => p.card.iid === "hulk")!.damage, 3);
});
