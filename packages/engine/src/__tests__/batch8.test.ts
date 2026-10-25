import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string, manaCost = "{R}"): CardDef => ({ id, name: id, type, cost: 1, manaCost, text });
const goblin = (id: string, text = "") => creature(id, 1, 1, text, { typeLine: "Creature — Goblin" });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  kraken: creature("kraken", 3, 3, "Whenever you draw a card, you may pay {1}. When you do, you may tap or untap target creature."),
  qala: creature("qala", 2, 2, "Whenever Qala attacks, other attacking creatures you control get +X/+0 until end of turn, where X is the number of counters on Qala.\nWhenever you gain life, put a +1/+1 counter on Qala.", { name: "Qala, Ajani's Pridemate" }),
  trial: { id: "trial", name: "trial", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment", text: "When this enchantment enters, draw three cards, then discard a card.\nWhen a Cartouche you control enters, return this enchantment to its owner's hand." },
  cartouche: { id: "cartouche", name: "cartouche", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment — Aura Cartouche", text: "Enchant creature" },
  alandra: creature("alandra", 2, 2, "Whenever you draw your second card each turn, create a 2/2 blue Drake creature token with flying.\nWhenever you draw your fifth card each turn, Alandra and Drakes you control each get +X/+X until end of turn, where X is the number of cards in your hand.", { name: "Alandra, Sky Dreamer" }),
  teferi: { id: "teferi", name: "teferi", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Legendary Enchantment", text: "If you would draw a card except the first one you draw in each of your draw steps, draw two cards instead." },
  draw1: spell("draw1", "sorcery", "Draw a card."),
  tides: spell("tides", "sorcery", "Choose one —\n• Draw three cards.\n• Return up to two target creatures to their owners' hands.", "{R}"),
  emiel: creature("emiel", 2, 2, "Whenever another creature you control enters, you may pay {G/W}. If you do, put a +1/+1 counter on it. If it's a Unicorn, put two +1/+1 counters on it instead.", { typeLine: "Creature — Unicorn" }),
  unicorn: creature("unicorn", 1, 1, "", { typeLine: "Creature — Unicorn" }),
  bomber: goblin("bomber", "Other Goblins you control get +1/+1.\n{R}: Until end of turn, another target Goblin you control gains flying and \"When this creature deals combat damage, sacrifice it.\""),
  gob: goblin("gob"),
  weight: { id: "weight", name: "weight", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment — Aura", text: "Enchant creature\nEnchanted creature can't attack.\nTap two untapped creatures you control that share a creature type: Exile enchanted creature." },
  light: { id: "light", name: "light", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment — Aura", text: "Enchant creature\nEnchanted creature has \"Whenever you gain life, put that many +1/+1 counters on this creature.\"" },
  heal: spell("heal", "sorcery", "You gain 3 life."),
  bear: creature("bear", 2, 2),
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
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

test("the round 3c texts are understood", () => {
  for (const id of ["kraken", "qala", "trial", "alandra", "teferi", "tides", "emiel", "bomber", "weight", "light"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("you may pay {1}; when you do, choose a target (the target comes after paying)", () => {
  let g = setup(["draw1"], ["kraken"], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "mayPay", "asked before any target");
  g = act(g, "p1", { type: "pick", iid: "pay" });
  g = settle(g);
  assert.ok(g.pendingChoice, "now asks for the target");
  g = settle(act(g, "p1", { type: "chooseTargets", targets: on("t0") }));
  assert.equal(g.pendingPick?.kind, "toggle");
  g = act(g, "p1", { type: "pick", iid: "tap" });
  assert.equal(find(g, "t0")?.tapped, true);
});

test("the second draw card makes a token; the fifth pumps the team by the hand size", () => {
  let g = setup(["draw1"], ["alandra"]);
  g.cards.draw5 = spell("draw5", "sorcery", "Draw five cards.");
  g.players.p1.hand = [{ iid: "d", defId: "draw5", owner: "p1" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "d", targets: [] }));
  assert.equal(g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Drake").length, 1, "second card: a Drake");
  assert.deepEqual(stat(g, "m0"), [2 + 5, 2 + 5], "fifth card: +X/+X where X is five cards in hand");
});

test("draw twice as many cards except the draw step's", () => {
  let g = setup(["draw1"], ["teferi"]);
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.players.p1.library.length, library - 2, "one card became two");
});

test("a Cartouche entering returns Trial of Knowledge to its owner's hand", () => {
  let g = setup(["cartouche"], ["trial", "bear"]);
  g.cards.trial = DEFS.trial;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m1") });
  g = settle(g);
  assert.equal(g.players.p1.hand.some((c) => c.iid === "m0"), true, "Trial of Knowledge is back in hand");
});

test("choose one: return up to two creatures", () => {
  let g = setup(["tides"], [], ["bear", "bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")[0], on("t1")[0]], modes: [1] }));
  assert.equal(g.players.p2.hand.length, 2);
});

test("pay to put a counter on the entering creature, two if it is a Unicorn", () => {
  let g = setup(["unicorn"], ["emiel"]);
  g.players.p1.battlefield.push(perm("g1", "forest"));
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mayPay");
  g = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  assert.equal(find(g, "h0")?.counters, 2);
  let b = setup(["bear"], ["emiel"]);
  b.players.p1.battlefield.push(perm("g1", "forest"));
  b = settle(act(b, "p1", { type: "castCreature", iid: "h0" }));
  b = settle(act(b, "p1", { type: "pick", iid: "pay" }));
  assert.equal(find(b, "h0")?.counters, 1);
});

test("other attackers get +X/+0 where X is the counters on this creature; gain life makes a counter", () => {
  let g = setup(["heal"], ["qala", "bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(find(g, "m0")?.counters, 1);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1"] }));
  assert.equal(stat(g, "m1")[0], 3, "the Bear got +1/+0");
  assert.equal(stat(g, "m0")[0], 3, "Qala itself did not");
});

test("give another Goblin flying; it is sacrificed when it deals combat damage", () => {
  let g = setup([], ["bomber", "gob"]);
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: on("m1") }));
  assert.equal(find(g, "m1")?.tempKeywords?.includes("flying"), true);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m1"] }));
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [] }));
  assert.equal(find(g, "m1"), undefined, "sacrificed after dealing damage");
});

test("tap two creatures that share a type to exile the enchanted creature", () => {
  let g = setup([], ["gob", "gob"], ["bear"]);
  g.players.p1.battlefield.push({ ...perm("w", "weight"), attachedTo: "t0" });
  const a = getActivatable(g, "p1").find((x) => x.iid === "w");
  assert.ok(a, "two Goblins share a type");
  g = settle(act(g, "p1", { type: "activateAbility", iid: "w", index: a.index, targets: [] }));
  assert.equal(find(g, "t0"), undefined, "exiled");
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped && g.cards[p.card.defId].name === "gob").length, 2);
  let n = setup([], ["gob", "bear"], ["bear"]);
  n.players.p1.battlefield.push({ ...perm("w", "weight"), attachedTo: "t0" });
  assert.equal(getActivatable(n, "p1").some((x) => x.iid === "w"), false, "a Goblin and a Bear share nothing");
});

test("an aura that turns life gained into counters on the creature", () => {
  let g = setup(["heal"], ["bear"]);
  g.players.p1.battlefield.push({ ...perm("li", "light"), attachedTo: "m0" });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(find(g, "m0")?.counters, 3);
});
