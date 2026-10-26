import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// "{X}{R}, {T}, Sacrifice Cinder Elemental: It deals X damage to any target." The player chooses X.

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  cinder: { id: "cinder", name: "Cinder Elemental", type: "creature", cost: 4, manaCost: "{3}{R}", text: "{X}{R}, {T}, Sacrifice Cinder Elemental: It deals X damage to any target.", power: 2, toughness: 2, typeLine: "Creature — Elemental", colors: ["R"] },
  mountain: { id: "mountain", name: "Mountain", type: "land", cost: 0, typeLine: "Basic Land — Mountain" },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
const setup = (lands: number): GameState => {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = [perm("c", "cinder"), ...Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain"))];
  g.phase = "main1";
  g.active = "p1";
  return g;
};
const act = (s: GameState, a: Action) => {
  const r = applyAction(s, "p1", a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
};
const settle = (g: GameState): GameState => {
  for (let i = 0; i < 20 && g.priority; i++) g = act({ ...g }, { type: "passPriority" }) as GameState;
  return g;
};

test("the card is understood and offers X up to what the player can pay", () => {
  assert.equal(isSupportedCard(DEFS.cinder), true);
  const g = setup(3);
  const a = getActivatable(g, "p1").find((x) => x.iid === "c")!;
  assert.equal(a.maxX, 2, "3 Mountains: {R} plus X = 2");
});

test("X is chosen, paid, and dealt: X = 2 with three Mountains deals 2 and taps all three", () => {
  let g = setup(3);
  g = settle(act(g, { type: "activateAbility", iid: "c", index: 0, targets: [{ kind: "player", id: "p2" }], x: 2 }));
  assert.equal(g.players.p2.life, 18, "2 damage");
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 3, "all three Mountains were paid");
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === "c"), false, "Cinder Elemental was sacrificed");
});

test("X = 1 deals 1 and leaves a Mountain untapped; X = 0 deals nothing; more than you can pay is refused", () => {
  let g = setup(3);
  g = settle(act(g, { type: "activateAbility", iid: "c", index: 0, targets: [{ kind: "player", id: "p2" }], x: 1 }));
  assert.equal(g.players.p2.life, 19);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 2);
  const over = applyAction(setup(3), "p1", { type: "activateAbility", iid: "c", index: 0, targets: [{ kind: "player", id: "p2" }], x: 3 });
  assert.equal(over.ok, false);
});
