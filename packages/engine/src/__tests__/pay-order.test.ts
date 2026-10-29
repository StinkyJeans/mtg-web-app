import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame } from "../index.js";
import type { CardDef, GameState } from "../index.js";

// Paying: a colored cost uses the least flexible land that can pay it, so a land that makes either color stays untapped for later.

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  elves: { id: "elves", name: "Llanowar Elves", type: "creature", cost: 1, manaCost: "{G}", power: 1, toughness: 1, text: "{T}: Add {G}.", typeLine: "Creature — Elf Druid", colors: ["G"], keywords: [] },
  pair: { id: "pair", name: "Pair Test", type: "creature", cost: 2, manaCost: "{G}{W}", power: 2, toughness: 2, text: "", typeLine: "Creature — Test", colors: ["G", "W"], keywords: [] },
  sands: { id: "sands", name: "Blossoming Sands", type: "land", cost: 0, typeLine: "Land", text: "Blossoming Sands enters tapped.\nWhen Blossoming Sands enters, you gain 1 life.\n{T}: Add {G} or {W}." },
  plains2: { id: "plains2", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains", text: "({T}: Add {W}.)" },
};
const perm = (iid: string, defId: string) => ({ card: { iid, defId, owner: "p1" as const }, tapped: false, summoningSick: false, damage: 0 });
function cast(hand: string, lands: string[]): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = DEFS;
  g.phase = "main1";
  g.active = "p1";
  g.opening = null;
  g.players.p1.hand = [{ iid: "h1", defId: hand, owner: "p1" }];
  g.players.p1.battlefield = lands.map((d, i) => perm(`L${i}`, d));
  const r = applyAction(g, "p1", { type: "castCreature", iid: "h1" });
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const tappedDefs = (s: GameState) => s.players.p1.battlefield.filter((p) => p.tapped).map((p) => p.card.defId);

test("{G} is paid by the Forest, not by the {G}/{W} land, whichever comes first", () => {
  assert.deepEqual(tappedDefs(cast("elves", ["sands", "forest"])), ["forest"]);
  assert.deepEqual(tappedDefs(cast("elves", ["forest", "sands"])), ["forest"]);
  assert.deepEqual(tappedDefs(cast("elves", ["plains2", "sands", "forest"])), ["forest"]);
});

test("the flexible land is still used when it has to be: {G}{W} with a Forest and the dual land", () => {
  assert.deepEqual(tappedDefs(cast("pair", ["forest", "sands"])).sort(), ["forest", "sands"]);
  assert.deepEqual(tappedDefs(cast("pair", ["sands", "forest"])).sort(), ["forest", "sands"]);
});
