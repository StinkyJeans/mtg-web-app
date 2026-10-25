import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import { checkStateBasedActions } from "../core.js";
import type { CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const star = (id: string, name: string, what: string): CardDef => ({
  id,
  name,
  type: "creature",
  cost: 2,
  manaCost: "{1}{R}",
  typeLine: "Creature — Test",
  text: `${name}'s power and toughness are each equal to the number of ${what}.`,
});
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  swarm: star("swarm", "Swarm", "creatures you control"),
  colossus: star("colossus", "Colossus", "lands you control"),
  crawler: star("crawler", "Crawler", "cards in your hand"),
  ghoul: star("ghoul", "Ghoul", "creature cards in your graveyard"),
  elder: star("elder", "Elder", "forests you control"),
  nonsense: star("nonsense", "Nonsense", "birds you have ever seen"),
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
  trinket: { id: "trinket", name: "Trinket", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "" },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(mine: string[], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = mine.map((d, i) => perm(`m${i}`, d));
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
  return g;
}
const stats = (g: GameState, iid: string) => {
  const p = g.players.p1.battlefield.find((x) => x.card.iid === iid)!;
  return [powerOf(g, p), toughnessOf(g, p)];
};

test("a * creature is playable only when its text says what to count", () => {
  for (const id of ["swarm", "colossus", "crawler", "ghoul", "elder"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
  assert.equal(isSupportedCard(DEFS.nonsense), false);
});

test("power and toughness follow the number of creatures you control, including itself", () => {
  let g = setup(["swarm"]);
  assert.deepEqual(stats(g, "m0"), [1, 1]);
  g = setup(["swarm", "bear", "bear"], ["bear"]);
  assert.deepEqual(stats(g, "m0"), [3, 3]); // the opponent's creature doesn't count
});

test("lands you control, cards in hand, creature cards in the graveyard", () => {
  const g = setup(["colossus", "forest", "forest", "trinket"]);
  assert.deepEqual(stats(g, "m0"), [2, 2]);
  const h = setup(["crawler"]);
  h.players.p1.hand = Array.from({ length: 4 }, (_, i) => ({ iid: `c${i}`, defId: "bear", owner: "p1" as const }));
  assert.deepEqual(stats(h, "m0"), [4, 4]);
  const k = setup(["ghoul"]);
  k.players.p1.graveyard = [{ iid: "g1", defId: "bear", owner: "p1" }, { iid: "g2", defId: "mountain", owner: "p1" }, { iid: "g3", defId: "bear", owner: "p1" }];
  assert.deepEqual(stats(k, "m0"), [2, 2]); // only creature cards
});

test("land types count only that type", () => {
  const g = setup(["elder", "forest", "forest", "mountain"]);
  assert.deepEqual(stats(g, "m0"), [2, 2]);
});

test("a * creature with nothing to count has toughness 0 and dies as soon as it enters", () => {
  const g = setup([]);
  g.players.p1.battlefield = [perm("l0", "mountain"), perm("l1", "mountain")];
  g.players.p1.hand = [{ iid: "c", defId: "crawler", owner: "p1" }]; // the only card: hand is empty once it is cast
  g.phase = "main1";
  const r = applyAction(g, "p1", { type: "castSpell", iid: "c", targets: [] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.state.players.p1.battlefield.some((p) => p.card.iid === "c"), false);
    assert.equal(r.state.players.p1.graveyard.some((c) => c.iid === "c"), true);
  }
});

test("state-based actions repeat: when others die, a smaller creature with lethal damage dies too", () => {
  const g = setup(["swarm", "bear", "bear", "bear"]); // swarm is 4/4 for now
  g.players.p1.battlefield[0].damage = 3; // fine at toughness 4
  g.players.p1.battlefield[1].damage = 2; // lethal: dies
  g.players.p1.battlefield[2].damage = 2;
  checkStateBasedActions(g, []);
  // Two bears died, so the swarm is 2/2 with 3 damage and dies as well: the second check is needed.
  assert.deepEqual(g.players.p1.battlefield.map((p) => p.card.iid), ["m3"]);
});
