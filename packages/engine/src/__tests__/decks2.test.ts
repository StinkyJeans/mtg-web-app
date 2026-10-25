import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, text, keywords, typeLine: "Creature — Test", ...extra });
const spell = (id: string, name: string, type: "instant" | "sorcery", text: string, keywords: string[] = []): CardDef => ({ id, name, type, cost: 1, manaCost: "{R}", text, keywords });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 4, 4),
  titan: creature("titan", 6, 6),
  drake: creature("drake", 2, 2, "Flying", ["flying"]),
  robot: creature("robot", 2, 2, "", [], { typeLine: "Artifact Creature — Robot" }),
  zombie: creature("zombie", 2, 2, "", [], { colors: ["B"] }),
  vampire: creature("vampire", 1, 1, "Whenever you gain life, put a +1/+1 counter on this creature."),
  healer: spell("healer", "Healer", "instant", "You gain 3 life."),
  rampage: spell("rampage", "Rampage", "sorcery", "Target creature you control fights target creature you don't control.", ["fight"]),
  bite: spell("bite", "Bite", "sorcery", "Target creature you control deals damage equal to its power to target creature you don't control."),
  plummet: spell("plummet", "Plummet", "instant", "Destroy target creature with flying."),
  terror: spell("terror", "Terror", "instant", "Destroy target nonartifact, nonblack creature."),
  wilds: spell("wilds", "Wilds", "sorcery", "Search your library for a basic land card, put that card onto the battlefield, then shuffle."),
  recall: spell("recall", "Recall", "sorcery", "Return target instant or sorcery card from your graveyard to your hand."),
  quake: spell("quake", "Quake", "sorcery", "Quake deals damage to target creature equal to the number of Mountains you control."),
  conclusion: spell("conclusion", "Conclusion", "instant", "As an additional cost to cast this spell, sacrifice a creature.\nConclusion deals 5 damage to target creature."),
  bolt: spell("bolt", "Bolt", "instant", "Bolt deals 3 damage to any target."),
  mountain: { id: "mountain", name: "Mountain", type: "land", cost: 0, typeLine: "Basic Land — Mountain" },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: 5 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => ({ kind: "permanent" as const, iid });
const settle = (g: GameState) => {
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};

test("the new texts are understood", () => {
  for (const id of ["vampire", "rampage", "bite", "plummet", "terror", "wilds", "recall", "quake", "conclusion"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("'Whenever you gain life': any way of gaining life triggers it", () => {
  let g = setup(["healer"], ["vampire"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = settle(g);
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(g.players.p1.life, 23);
  // lifelink in combat counts too
  const l = setup([], ["vampire"], []);
  l.cards = { ...l.cards, linker: creature("linker", 2, 2, "Lifelink", ["lifelink"]) };
  l.players.p1.battlefield.push(perm("m1", "linker"));
  l.phase = "attackers";
  let c = act(l, "p1", { type: "declareAttackers", attackers: ["m1"] });
  c = act(c, "p2", { type: "declareBlockers", blocks: [] });
  c = settle(c);
  assert.equal(find(c, "m0")!.counters, 1);
});

test("fight: each creature deals damage equal to its power to the other", () => {
  let g = setup(["rampage"], ["ogre"], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0"), on("t0")] });
  assert.equal(find(g, "t0"), undefined); // 4 damage kills the 2/2
  assert.equal(find(g, "m0")!.damage, 2); // and it hits back for 2
  assert.equal(applyAction(setup(["rampage"], ["ogre", "bear"], []), "p1", { type: "castSpell", iid: "h0", targets: [on("m0"), on("m1")] }).ok, false); // "you don't control"
});

test("'deals damage equal to its power' is one-sided", () => {
  let g = setup(["bite"], ["ogre"], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0"), on("t0")] });
  assert.equal(find(g, "t0"), undefined);
  assert.equal(find(g, "m0")!.damage, 0); // no damage back
});

test("fight and bite respect protection, and do nothing when a target is gone", () => {
  const g = setup(["bite"], ["ogre"], ["bear"]);
  g.cards = { ...g.cards, bear: creature("bear", 2, 2, "Protection from red", ["protection"], { colors: ["W"] }), ogre: creature("ogre", 4, 4, "", [], { colors: ["R"] }) };
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0"), on("t0")] });
  assert.equal(find(s, "t0")!.damage, 0); // the red creature's damage is prevented
});

test("target filters: 'creature with flying', 'nonartifact, nonblack creature'", () => {
  const flying = setup(["plummet"], [], ["bear", "drake"]);
  assert.equal(applyAction(flying, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false);
  const s = act(flying, "p1", { type: "castSpell", iid: "h0", targets: [on("t1")] });
  assert.equal(find(s, "t1"), undefined);

  const g = setup(["terror"], [], ["robot", "zombie", "bear"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false); // artifact
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t1")] }).ok, false); // black
  const ok = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t2")] });
  assert.equal(find(ok, "t2"), undefined);
});

test("a basic land onto the battlefield untapped, or tapped", () => {
  let g = setup(["wilds"]);
  g.players.p1.library = [{ iid: "lib0", defId: "mountain", owner: "p1" }];
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = act(g, "p1", { type: "pick", iid: "lib0" });
  assert.equal(find(g, "lib0")!.tapped, false);
});

test("'Return target instant or sorcery card from your graveyard to your hand'", () => {
  let g = setup(["recall"]);
  g.players.p1.graveyard = [{ iid: "g0", defId: "bolt", owner: "p1" }, { iid: "g1", defId: "bear", owner: "p1" }];
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "card", iid: "g1" }] }).ok, false); // a creature card
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "card", iid: "g0" }] });
  assert.equal(g.players.p1.hand.some((c) => c.iid === "g0"), true);
});

test("damage equal to the number of Mountains you control", () => {
  let g = setup(["quake"], [], ["titan"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] });
  assert.equal(find(g, "t0")!.damage, 5); // five Mountains
  assert.equal(find(g, "t0")!.tapped, false);
});

test("'As an additional cost, sacrifice a creature'", () => {
  const g = setup(["conclusion"], ["bear", "ogre"], ["ogre"]);
  const castable = getCastable(g, "p1")[0];
  assert.deepEqual(castable.sacrifice, ["m0", "m1"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false); // nothing chosen to sacrifice
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")], sacrifice: "t0" }).ok, false); // not yours
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")], sacrifice: "m0" });
  assert.equal(find(s, "m0"), undefined);
  assert.equal(s.players.p1.graveyard.some((c) => c.iid === "m0"), true);
  assert.equal(find(s, "t0"), undefined); // 5 damage kills the 4/4
  // without a creature to sacrifice it isn't castable at all
  assert.equal(getCastable(setup(["conclusion"], [], ["ogre"]), "p1").length, 0);
  assert.equal(powerOf(s, find(s, "m1")!), 4);
});

test("when both players are at 0 life or less at the same moment, the game is a draw", () => {
  const plague = { id: "plague", name: "Plague", type: "sorcery", cost: 1, manaCost: "{R}", text: "Plague deals 3 damage to each creature and each player." } as CardDef;
  let g = setup(["plague"]);
  g.cards = { ...g.cards, plague };
  g.players.p1.life = 3;
  g.players.p2.life = 2;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.winner, "draw");
  const one = setup(["plague"]);
  one.cards = { ...one.cards, plague };
  one.players.p1.life = 10;
  one.players.p2.life = 3;
  const s = act(one, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(s.winner, "p1");
});

// ───────── batch 3: evasion lists, power filters, "its owner" ─────────

test("'Can't be blocked except by walls and/or creatures with flying', and by black creatures", () => {
  const defs = {
    riders: creature("riders", 2, 2, "Elven Riders can't be blocked except by Walls and/or creatures with flying.".replace("Elven Riders", "This creature")),
    stalker: creature("stalker", 2, 2, "This creature can't be blocked except by black creatures."),
    wall: creature("wall", 0, 4, "", [], { typeLine: "Creature — Wall" }),
    flyer: creature("flyer", 2, 2, "Flying", ["flying"]),
  } as Record<string, CardDef>;
  const attack = (attacker: string, blocker: string) => {
    const g = setup([], [attacker], [blocker]);
    g.cards = { ...g.cards, ...defs };
    g.phase = "attackers";
    const s = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
    return applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok;
  };
  assert.equal(isSupportedCard(defs.riders), true);
  assert.equal(attack("riders", "bear"), false);
  assert.equal(attack("riders", "wall"), true);
  assert.equal(attack("riders", "flyer"), true);
  assert.equal(attack("stalker", "bear"), false);
  assert.equal(attack("stalker", "zombie"), true);
});

test("target creature with power N or greater / N or less", () => {
  const judgment = spell("judgment", "Judgment", "instant", "Destroy target creature with power 4 or greater.");
  const g = setup(["judgment"], [], ["bear", "ogre"]);
  g.cards = { ...g.cards, judgment };
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false); // power 2
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t1")] });
  assert.equal(find(s, "t1"), undefined);
  const wrangle = spell("wrangle", "Wrangle", "sorcery", "Gain control of target creature with power 3 or less until end of turn. Untap that creature. It gains haste until end of turn.");
  const w = setup(["wrangle"], [], ["ogre", "bear"]);
  w.cards = { ...w.cards, wrangle };
  assert.equal(applyAction(w, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false); // power 4
  const taken = act(w, "p1", { type: "castSpell", iid: "h0", targets: [on("t1")] });
  assert.ok(taken.players.p1.battlefield.some((p) => p.card.iid === "t1"));
});

test("'Its owner gains 4 life' after the creature was destroyed", () => {
  const path = spell("path", "Path", "instant", "Destroy target creature. Its owner gains 4 life.");
  const g = setup(["path"], [], ["bear"]);
  g.cards = { ...g.cards, path };
  assert.equal(isSupportedCard(path), true);
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] });
  assert.equal(find(s, "t0"), undefined);
  assert.equal(s.players.p2.life, 24);
  assert.equal(s.players.p1.life, 20);
  // "its controller" is the player who controlled it when the spell resolved, even if they don't own it
  const certain = spell("certain", "Certain", "instant", "Destroy target creature. Its controller loses 2 life and you gain 2 life.");
  const stolen = setup(["certain"], [], []);
  stolen.cards = { ...stolen.cards, certain };
  stolen.players.p1.battlefield.push({ ...perm("t0", "bear", "p2") }); // p2's creature, controlled by p1
  const r = act(stolen, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] });
  assert.equal(r.players.p1.life, 18 + 2); // p1 controlled it: loses 2, then gains 2
});
