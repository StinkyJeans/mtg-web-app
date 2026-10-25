import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string, manaCost = "{R}"): CardDef => ({ id, name: id, type, cost: 1, manaCost, text });
const goblin = (id: string, text = "") => creature(id, 1, 1, text, { typeLine: "Creature — Goblin" });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  flicker: spell("flicker", "instant", "Exile target creature or enchantment, then return it to the battlefield under its owner's control."),
  resto: creature("resto", 3, 4, "When this creature enters, you may exile target non-Angel creature you control, then return that card to the battlefield under your control.", { typeLine: "Creature — Angel" }),
  lasher: creature("lasher", 1, 1, "When this creature enters, put a +1/+1 counter on it."),
  lava: creature("lava", 1, 1, "{R}, {T}, Exile two cards from your graveyard: This creature deals 2 damage to any target."),
  striker: creature("striker", 2, 2, "Whenever this creature attacks, you may tap any number of untapped creatures you control. This creature gets +1/+1 until end of turn for each creature tapped this way."),
  plagon: creature("plagon", 1, 3, "When this creature enters, draw a card for each creature you control with toughness greater than its power.\n{R}: Target creature you control assigns combat damage equal to its toughness rather than its power this turn."),
  leonin: creature("leonin", 3, 3, "{R}: Put a +1/+1 counter on another target attacking creature you control. If that creature is a Cat, it gains first strike until end of turn."),
  curiosity: { id: "curiosity", name: "curiosity", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment — Aura", text: "Enchant creature\nWhenever enchanted creature deals damage to an opponent, you may draw a card." },
  bcg: goblin("bcg", "{R}: Goblins you control get +1/+0 and gain haste until end of turn."),
  elenora: creature("elenora", 0, 4, "Syr Elenora's power is equal to the number of cards in your hand.\nSpells your opponents cast that target Syr Elenora cost {2} more to cast.", { name: "Syr Elenora, the Discerning", power: undefined }),
  runashore: spell("runashore", "instant", "Choose one or both —\n• The owner of target nonland permanent puts it on their choice of the top or bottom of their library.\n• Return target nonland permanent to its owner's hand."),
  venser: creature("venser", 2, 2, "When this creature enters, return target spell or permanent to its owner's hand."),
  rabble: goblin("rabble", "Other Goblin creatures you control attack each combat if able.\nAt the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.\nWhenever this creature attacks, it gets +1/+0 until end of turn for each other attacking Goblin."),
  gob2: goblin("gob2"),
  cat: creature("cat", 2, 2, "", { typeLine: "Creature — Cat" }),
  bear: creature("bear", 2, 2),
  big: creature("big", 1, 5),
  bolt: spell("bolt", "instant", "This spell deals 1 damage to any target."),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 6 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 6 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  g.phase = "main1";
  g.active = "p1";
  return g;
}
const act = (s: GameState, p: PlayerId, a: Action): GameState => {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
};
const settle = (g: GameState): GameState => {
  for (let i = 0; i < 40 && g.priority && !g.pendingPick && !g.pendingChoice; i++) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const stat = (g: GameState, iid: string) => [powerOf(g, find(g, iid)!), toughnessOf(g, find(g, iid)!)];

test("the round 3b texts are understood", () => {
  for (const id of ["flicker", "resto", "lava", "striker", "plagon", "leonin", "curiosity", "bcg", "elenora", "runashore", "venser", "rabble"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("blink a creature or an enchantment; Restoration Angel may blink a non-Angel creature", () => {
  let g = setup(["flicker"], ["lasher"]);
  g.players.p1.battlefield.find((p) => p.card.iid === "m0")!.counters = 4;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  assert.equal(find(g, "m0")?.counters, 1);
  let r = setup(["resto"], ["lasher", "resto"]);
  r.players.p1.battlefield.find((p) => p.card.iid === "m0")!.counters = 4;
  r = settle(act(r, "p1", { type: "castCreature", iid: "h0" }));
  r = settle(r);
  assert.ok(r.pendingChoice, "asks which creature to blink");
  assert.equal(r.pendingChoice!.specs[0].optional, true);
  assert.equal(applyAction(r, "p1", { type: "chooseTargets", targets: on("m1") }).ok, false, "an Angel can not be chosen");
  r = settle(act(r, "p1", { type: "chooseTargets", targets: on("m0") }));
  assert.equal(find(r, "m0")?.counters, 1);
});

test("exile two cards from your graveyard as a cost", () => {
  let g = setup([], ["lava"]);
  assert.equal(getActivatable(g, "p1").find((x) => x.iid === "m0"), undefined, "an empty graveyard can not pay");
  g.players.p1.graveyard = [{ iid: "g1", defId: "bear", owner: "p1" }, { iid: "g2", defId: "bear", owner: "p1" }, { iid: "g3", defId: "bear", owner: "p1" }];
  const b = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: b.index, targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(g.players.p2.life, 18);
  assert.equal(g.players.p1.graveyard.length, 1);
  assert.equal(g.players.p1.exile.length, 2);
});

test("tap any number of creatures: +1/+1 for each", () => {
  let g = setup([], ["striker", "bear", "bear"]);
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "tapSome");
  g = act(g, "p1", { type: "pick", iid: "m1" });
  assert.equal(find(g, "m1")?.tapped, true);
  g = act(g, "p1", { type: "pick" }); // done: only one tapped
  assert.deepEqual(stat(g, "m0"), [3, 3]);
});

test("draw for each creature with toughness greater than power; assign damage by toughness", () => {
  let g = setup(["plagon"], ["big", "bear"]);
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.library.length, library - 2, "the 1/5 and the 1/3 both qualify");
  let t = setup([], ["plagon", "big"], ["bear"]);
  const a = getActivatable(t, "p1").find((x) => x.iid === "m0")!;
  t = settle(act(t, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: on("m1") }));
  t.phase = "attackers";
  t = settle(act(t, "p1", { type: "declareAttackers", attackers: ["m1"] }));
  t = settle(act(t, "p2", { type: "declareBlockers", blocks: [] }));
  assert.equal(t.players.p2.life, 15, "the 1/5 dealt 5 damage");
});

test("put a counter on an attacker; a Cat also gains first strike", () => {
  let g = setup([], ["leonin", "cat", "bear"]);
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m1", "m2"] }); // (the attacker has priority first)
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: on("m1") }));
  assert.equal(find(g, "m1")?.counters, 1);
  assert.equal(find(g, "m1")?.tempKeywords?.includes("first strike"), true);
});

test("an aura: whenever enchanted creature deals damage to an opponent, draw", () => {
  let g = setup([], ["bear"]);
  g.players.p1.battlefield.push({ ...perm("cu", "curiosity"), attachedTo: "m0" });
  g.phase = "attackers";
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [] }));
  assert.equal(g.players.p1.library.length, library - 1);
});

test("group pump with haste; power equal to cards in hand; targeting tax", () => {
  let g = setup([], ["bcg", "bcg"]);
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] }));
  assert.deepEqual(stat(g, "m0"), [2, 1]);
  assert.deepEqual(stat(g, "m1"), [2, 1]);
  const e = setup(["bear", "bear", "bear"], ["elenora"]);
  assert.equal(stat(e, "m0")[0], 3, "three cards in hand");
  e.players.p2.hand = [{ iid: "z", defId: "bolt", owner: "p2" }];
  e.active = "p2";
  e.players.p2.battlefield = e.players.p2.battlefield.slice(0, 2); // only two lands: {R} plus the {2} tax is too much
  assert.equal(applyAction(e, "p2", { type: "castSpell", iid: "z", targets: on("m0") }).ok, false, "costs 2 more");
  e.players.p2.battlefield = [...e.players.p2.battlefield, perm("x1", "mountain", "p2")];
  assert.equal(applyAction(e, "p2", { type: "castSpell", iid: "z", targets: on("m0") }).ok, true);
});

test("the owner chooses top or bottom; return a spell or a permanent", () => {
  let g = setup(["runashore"], [], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")[0]], modes: [0] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "topBottom");
  assert.equal(g.pendingPick?.player, "p2", "the owner chooses");
  g = act(g, "p2", { type: "pick", iid: "top" });
  assert.equal(g.players.p2.library[0].iid, "t0");

  let v = setup(["venser"], [], ["bear"]);
  v = settle(act(v, "p1", { type: "castCreature", iid: "h0" }));
  assert.ok(v.pendingChoice);
  v = settle(act(v, "p1", { type: "chooseTargets", targets: on("t0") }));
  assert.equal(v.players.p2.hand.some((c) => c.iid === "t0"), true);
});

test("a Goblin lord forces other Goblins to attack and makes a hasty token each combat", () => {
  let g = setup([], ["rabble", "gob2"]);
  g = settle(act(g, "p1", { type: "passPhase" })); // to combat: a Goblin token with haste appears
  assert.equal(g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Goblin").length, 1);
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, false, "the other Goblins must attack too");
  const others = g.players.p1.battlefield.filter((p) => (g.cards[p.card.defId].typeLine ?? "").includes("Goblin") && p.card.iid !== "m0").map((p) => p.card.iid);
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0", ...others] }));
  assert.equal(stat(g, "m0")[0], 1 + others.length, "+1/+0 for each other attacking Goblin");
});
