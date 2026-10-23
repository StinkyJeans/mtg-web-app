import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, availableMana, createGame, landColor, manaCostOf, parseManaCost, unplayableCards } from "../index.js";
import type { CardDef, GameState } from "../index.js";

const land = (id: string, name: string, sub: string): CardDef => ({ id, name, type: "land", cost: 0, typeLine: `Basic Land — ${sub}` });
const creature = (id: string, manaCost: string, cost: number): CardDef => ({ id, name: id, type: "creature", cost, power: 2, toughness: 2, manaCost });

const DEFS: Record<string, CardDef> = {
  mountain: land("mountain", "Mountain", "Mountain"),
  forest: land("forest", "Forest", "Forest"),
  bears: creature("bears", "{1}{G}", 2),
  giant: creature("giant", "{3}{R}", 4),
  twins: creature("twins", "{G}{G}", 2),
  hybrid: creature("hybrid", "{W/U}{W/U}", 2),
};

/** p1 has the given lands in play and the given spell in hand, in main1. */
function setup(lands: string[], spell: string): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1, DEFS);
  g.cards = { ...DEFS };
  const mk = (defId: string, i: number) => ({ iid: `t${i}`, defId, owner: "p1" as const });
  g.players.p1.battlefield = lands.map((defId, i) => ({ card: mk(defId, i), tapped: false, summoningSick: false, damage: 0 }));
  g.players.p1.hand = [mk(spell, 99)];
  return g;
}

const cast = (g: GameState) => applyAction(g, "p1", { type: "castCreature", iid: "t99" });
const tappedNames = (g: GameState) => g.players.p1.battlefield.filter((p) => p.tapped).map((p) => g.cards[p.card.defId].id);

test("parses printed costs", () => {
  assert.deepEqual(parseManaCost("{2}{G}{G}"), { generic: 2, colored: { G: 2 } });
  assert.deepEqual(parseManaCost("{R}"), { generic: 0, colored: { R: 1 } });
  assert.equal(parseManaCost("{W/U}"), null); // hybrid not supported yet
  assert.equal(parseManaCost("{X}{R}"), null);
  assert.equal(parseManaCost("{2/W}"), null);
  assert.deepEqual(manaCostOf({ id: "x", name: "X", type: "creature", cost: 3 }), { generic: 3, colored: {} }); // hand-made card
});

test("a basic land produces its own color", () => {
  assert.equal(landColor(DEFS.mountain), "R");
  assert.equal(landColor(DEFS.forest), "G");
  assert.equal(landColor({ id: "w", name: "Wastes", type: "land", cost: 0 }), "C");
  assert.equal(landColor({ id: "s", name: "Snow-Covered Forest", type: "land", cost: 0, typeLine: "Basic Snow Land — Forest" }), "G");
  assert.equal(landColor(DEFS.bears), undefined);
});

test("Grizzly Bears can't be cast with only Mountains", () => {
  const r = cast(setup(["mountain", "mountain", "mountain"], "bears"));
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /Not enough green mana/);
});

test("Grizzly Bears needs a Forest plus any other land, and taps exactly those", () => {
  const r = cast(setup(["mountain", "forest"], "bears"));
  assert.ok(r.ok);
  assert.deepEqual(tappedNames(r.state).sort(), ["forest", "mountain"]);
  assert.equal(availableMana(r.state, "p1").G, 0);
});

test("one Forest can't pay for {G}{G}", () => {
  assert.equal(cast(setup(["forest", "mountain"], "twins")).ok, false);
  assert.equal(cast(setup(["forest", "forest"], "twins")).ok, true);
});

test("colored requirements are paid first; generic mana is not wasted on scarce colors", () => {
  // {3}{R} with 1 Mountain + 3 Forests: Mountain pays R, the three Forests pay generic.
  const r = cast(setup(["mountain", "forest", "forest", "forest"], "giant"));
  assert.ok(r.ok);
  assert.equal(r.state.players.p1.battlefield.filter((p) => p.tapped).length, 4);
  // {1}{G} with Forest + Mountain + Mountain: generic is paid with a Mountain, keeping nothing scarce lost.
  const r2 = cast(setup(["forest", "mountain", "mountain"], "bears"));
  assert.ok(r2.ok);
  assert.deepEqual(tappedNames(r2.state).sort(), ["forest", "mountain"]);
  assert.equal(availableMana(r2.state, "p1").R, 1);
});

test("not enough lands gives a generic-mana error", () => {
  const r = cast(setup(["forest"], "bears"));
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /Not enough mana/);
});

test("cards with unsupported costs can't start a game and are reported as unplayable", () => {
  assert.throws(() => createGame({ p1: ["hybrid"], p2: ["mountain"] }, 1, DEFS), /can't be played yet/);
  assert.deepEqual(unplayableCards(DEFS, ["bears", "hybrid"]).map((c) => c.id), ["hybrid"]);
});

test("lands the engine can't get mana from are unplayable", () => {
  const odd: Record<string, CardDef> = { ...DEFS, barry: { id: "barry", name: "Barry's Land", type: "land", cost: 0, typeLine: "Basic Land — Barry" } };
  assert.throws(() => createGame({ p1: ["barry"], p2: ["mountain"] }, 1, odd), /can't be played yet/);
});
