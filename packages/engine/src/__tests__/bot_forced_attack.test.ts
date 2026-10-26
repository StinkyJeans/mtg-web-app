import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, botAction, createGame, getPossibleAttackers, viewFor } from "../index.js";
import type { CardDef, CardInstance, GameState } from "../index.js";

// A creature can be forced to attack by ANOTHER card ("Creatures you control attack each combat if able"). The computer
// opponent only looked at the creature's own text, so its attack was refused every time and it got stuck for good.

const card = (id: string, name: string, type: CardDef["type"], text: string, extra: Partial<CardDef> = {}): CardDef => ({ id, name, type, cost: 0, manaCost: "", text, ...extra });
const DEFS: Record<string, CardDef> = {
  mountain: { id: "mountain", name: "Mountain", type: "land", cost: 0, typeLine: "Basic Land — Mountain" },
  lord: card("lord", "Rallying Lord", "creature", "Creatures you control attack each combat if able.", { power: 2, toughness: 2, typeLine: "Creature — Human" }),
  wall: card("wall", "Big Wall", "creature", "", { power: 5, toughness: 5, typeLine: "Creature — Wall" }),
  bear: card("bear", "Bear", "creature", "", { power: 1, toughness: 1, typeLine: "Creature — Bear" }),
};
const perm = (iid: string, defId: string) => ({ card: { iid, defId, owner: "p2" } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

test("the computer attacks with a creature that another card forces to attack", () => {
  const g: GameState = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.phase = "attackers";
  g.active = "p2";
  g.players.p2.battlefield = [perm("lord", "lord"), perm("b1", "bear")];
  g.players.p1.battlefield = [{ ...perm("big", "wall"), card: { iid: "big", defId: "wall", owner: "p1" } as CardInstance }];
  const forced = getPossibleAttackers(g);
  assert.ok(forced.includes("b1"), "the bear can attack");
  assert.equal(applyAction(g, "p2", { type: "passPhase" }).ok, false, "not attacking is refused: the lord forces it");
  const move = botAction(viewFor(g, "p2"), "p2");
  assert.ok(move, "the computer finds a move");
  const r = applyAction(g, "p2", move!);
  assert.ok(r.ok, r.ok ? "" : `the computer's own move was refused: ${r.error}`);
});
