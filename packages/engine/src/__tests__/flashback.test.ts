import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  missile: { id: "missile", name: "Missile", type: "sorcery", cost: 1, manaCost: "{R}", keywords: ["flashback"], text: "Missile deals 2 damage to any target.\nFlashback {2}{R}" },
  flash2: { id: "flash2", name: "Quick", type: "instant", cost: 1, manaCost: "{R}", keywords: ["flashback"], text: "You gain 3 life.\nFlashback {R}" },
  stopper: { id: "stopper", name: "Stopper", type: "instant", cost: 1, manaCost: "{R}", text: "Counter target spell." },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], graveyard: string[], lands: number, opponentHand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain"));
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.graveyard = graveyard.map((d, i) => ({ iid: `g${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = opponentHand.map((d, i) => ({ iid: `o${i}`, defId: d, owner: "p2" }));
  g.players.p2.battlefield = Array.from({ length: 2 }, (_, i) => perm(`q${i}`, "mountain", "p2"));
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

test("flashback cards are understood", () => {
  for (const id of ["missile", "flash2"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("a card in the graveyard can be cast with flashback, and is exiled afterwards", () => {
  let g = setup([], ["missile"], 3);
  const castable = getCastable(g, "p1");
  assert.deepEqual(castable.map((c) => [c.iid, c.zone]), [["g0", "graveyard"]]);
  g = act(g, "p1", { type: "castSpell", iid: "g0", from: "graveyard", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p2.life, 18);
  assert.equal(g.players.p1.graveyard.length, 0);
  assert.deepEqual(g.players.p1.exile.map((c) => c.iid), ["g0"]);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 3); // {2}{R}, the flashback cost
});

test("flashback needs its own cost, not the card's mana cost", () => {
  const g = setup([], ["missile"], 2);
  assert.equal(getCastable(g, "p1").length, 0); // {2}{R} needs three lands
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "g0", from: "graveyard", targets: [{ kind: "player", id: "p2" }] }).ok, false);
});

test("a card from hand goes to the graveyard as usual, and can then be flashed back", () => {
  let g = setup(["flash2"], [], 3);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.graveyard.length, 1);
  assert.equal(g.players.p1.life, 23);
  g = act(g, "p1", { type: "castSpell", iid: "g0".replace("g0", "h0"), from: "graveyard", targets: [] });
  assert.equal(g.players.p1.life, 26);
  assert.equal(g.players.p1.exile.length, 1);
  assert.equal(g.players.p1.graveyard.length, 0);
});

test("a countered flashback spell is exiled, not put back in the graveyard", () => {
  let g = setup([], ["missile"], 3, ["stopper"]);
  g = act(g, "p1", { type: "castSpell", iid: "g0", from: "graveyard", targets: [{ kind: "player", id: "p2" }] });
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: g.stack[0].id }] });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p2.life, 20);
  assert.equal(g.players.p1.exile.length, 1);
  assert.equal(g.players.p1.graveyard.length, 0);
});

test("a card without flashback can't be cast from the graveyard", () => {
  const g = setup([], ["stopper"], 3);
  assert.equal(getCastable(g, "p1").length, 0);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "g0", from: "graveyard", targets: [] }).ok, false);
});
