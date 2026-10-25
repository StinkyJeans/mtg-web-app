import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, availableMana, CARDS, createGame, getCastable, isSupportedCard, payMana } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const land = (id: string, text: string, typeLine = "Land"): CardDef => ({ id, name: id, type: "land", cost: 0, typeLine, text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  tropical: land("tropical", "({T}: Add {U} or {G}.)", "Land — Island Forest"),
  taplands: land("taplands", "This land enters tapped.\n{T}: Add {W} or {U}."),
  gainland: land("gainland", "This land enters tapped.\nWhen this land enters, you gain 1 life.\n{T}: Add {W} or {B}."),
  tower: land("tower", "{T}: Add one mana of any color."),
  triome: land("triome", "{T}: Add {B}, {R}, or {G}."),
  wastes: { id: "wastes", name: "Wastes", type: "land", cost: 0, typeLine: "Basic Land" },
  pain: land("pain", "{T}: Add {C}.\n{T}: Add {W} or {U}. This land deals 1 damage to you."),
  fetch: land("fetch", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Forest card."),
  wd: land("wd", "{T}: Add {W}"),
  ud: land("ud", "{T}: Add {W} or {B}"),
  millspell: { id: "millspell", name: "Mill Spell", type: "sorcery", cost: 1, manaCost: "{R}", text: "Target player mills three cards." },
  scryspell: { id: "scryspell", name: "Scry Spell", type: "sorcery", cost: 1, manaCost: "{R}", text: "Scry 2." },
  ghost: { id: "ghost", name: "Ghost", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2, text: "This creature can't be blocked." },
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
};

test("lands with several colors, any color, and enters-tapped are understood; risky ones are not", () => {
  for (const id of ["tropical", "taplands", "gainland", "tower", "triome", "wastes"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
  assert.equal(isSupportedCard(DEFS.pain), false); // deals damage to you
  assert.equal(isSupportedCard(DEFS.fetch), false);
});

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(lands: string[], hand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = lands.map((d, i) => perm(`l${i}`, d));
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

test("a dual land pays for either of its colors, but only one at a time", () => {
  const g = setup(["taplands", "wd"]);
  const w = payMana(g, "p1", { generic: 0, colored: { W: 1, U: 1 } });
  assert.equal(w.ok, true); // the dual pays {U}, the Plains pays {W}
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 2 } }).ok, false); // only one source can make blue
});

test("matching moves earlier choices when needed (a dual is not wasted on the wrong color)", () => {
  // Sources: W/U and W/B. Paying {W}{U}: W goes to the second land so the first can make U.
  const g = setup(["taplands", "ud"]);
  const r = payMana(g, "p1", { generic: 0, colored: { W: 1, U: 1 } });
  assert.equal(r.ok, true);
  // And {W}{B} works too, using the other assignment.
  assert.equal(payMana(g, "p1", { generic: 0, colored: { W: 1, B: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 1, B: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 1, B: 1, W: 1 } }).ok, false); // three colors from two lands
});

test("a land that taps for any color can pay anything", () => {
  const g = setup(["tower"]);
  for (const color of ["W", "U", "B", "R", "G"] as const) assert.equal(payMana(g, "p1", { generic: 0, colored: { [color]: 1 } }).ok, true, color);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { C: 1 } }).ok, false); // "any color" doesn't include colorless
});

test("a land with basic land types taps for them even when its text is only reminder text", () => {
  const g = setup(["tropical"]);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { G: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 1 } }).ok, true);
  assert.equal(availableMana(g, "p1").U, 1);
});

test("a land that enters tapped can't be used the turn it comes in, and its enter trigger gains life", () => {
  let g = setup([], ["gainland"]);
  g.phase = "main1";
  g.active = "p1";
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  assert.equal(g.players.p1.battlefield[0].tapped, true);
  assert.equal(g.players.p1.life, 21);
  assert.equal(getCastable(g, "p1").length, 0);
});

test("mill puts the top cards of a library into its graveyard", () => {
  let g = setup(["l"], ["millspell"]);
  g.players.p1.battlefield = Array.from({ length: 2 }, (_, i) => perm(`m${i}`, "mountain"));
  const before = g.players.p2.library.length;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p2.library.length, before - 3);
  assert.equal(g.players.p2.graveyard.length, 3);
});

test("scry: put chosen cards on the bottom, or keep them", () => {
  let g = setup([], ["scryspell"]);
  g.players.p1.battlefield = [perm("m0", "mountain")];
  g.players.p1.library = ["a", "b", "c", "d"].map((x, i) => ({ iid: `lib${i}`, defId: "mountain", owner: "p1" }));
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.deepEqual(g.pendingPick!.options, ["lib0", "lib1"]);
  g = act(g, "p1", { type: "pick", iid: "lib0" }); // bottom
  assert.equal(g.pendingPick!.options.length, 1); // lib1 may still go
  g = act(g, "p1", { type: "pick" }); // keep the rest
  assert.equal(g.pendingPick, null);
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["lib1", "lib2", "lib3", "lib0"]);
});

test("a creature that can't be blocked can't be blocked", () => {
  const g = setup([]);
  g.players.p1.battlefield = [perm("a", "ghost")];
  g.players.p2.battlefield = [perm("b", "bear", "p2")];
  g.phase = "attackers";
  let r = applyAction(g, "p1", { type: "declareAttackers", attackers: ["a"] });
  assert.ok(r.ok);
  if (!r.ok) return;
  const blocked = applyAction(r.state, "p2", { type: "declareBlockers", blocks: [{ blocker: "b", attacker: "a" }] });
  assert.equal(blocked.ok, false);
  r = applyAction(r.state, "p2", { type: "declareBlockers", blocks: [] });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.state.players.p2.life, 18);
});
