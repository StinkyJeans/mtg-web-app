import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getPossibleBlockers, isSupportedCard, payMana, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, text, keywords, typeLine: "Creature — Test", ...extra });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  thriving: { id: "thriving", name: "Thriving Isle", type: "land", cost: 0, typeLine: "Land", text: "This land enters tapped. As it enters, choose a color other than blue.\n{T}: Add {U} or one mana of the chosen color." },
  haven: { id: "haven", name: "Uncharted Haven", type: "land", cost: 0, typeLine: "Land", text: "This land enters tapped. As it enters, choose a color.\n{T}: Add one mana of the chosen color." },
  memorial: { id: "memorial", name: "Memorial to Genius", type: "land", cost: 0, typeLine: "Land", text: "This land enters tapped.\n{T}: Add {U}.\n{4}{U}, {T}, Sacrifice this land: Draw two cards." },
  fetters: { id: "fetters", name: "Fetters", type: "enchantment", cost: 4, manaCost: "{3}{R}", typeLine: "Enchantment — Aura", keywords: ["enchant"], text: "Enchant permanent\nWhen this Aura enters, you gain 4 life.\nEnchanted permanent can't attack or block, and its activated abilities can't be activated unless they're mana abilities." },
  treason: { id: "treason", name: "Treason", type: "sorcery", cost: 3, manaCost: "{2}{R}", text: "Gain control of target creature until end of turn. Untap that creature. It gains haste until end of turn." },
  snare: { id: "snare", name: "Snare", type: "sorcery", cost: 1, manaCost: "{R}", text: "Target creature can't block this turn." },
  boar: creature("boar", 2, 2, "This creature can't be blocked by more than one creature."),
  wraith: creature("wraith", 2, 2, "Swampwalk (This creature can't be blocked as long as defending player controls a Swamp.)", ["landwalk", "swampwalk"]),
  skeleton: creature("skeleton", 1, 1, "{B}: Regenerate this creature.", ["heal", "regenerate"]),
  bear: creature("bear", 2, 2),
  bear2: creature("bear2", 2, 2),
  pinger: creature("pinger", 1, 1, "{T}: Pinger deals 1 damage to any target."),
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1", extra: object = {}) => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0, ...extra });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], lands = 5): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
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
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const settle = (g: GameState) => {
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};

test("the new texts are understood", () => {
  for (const id of ["thriving", "haven", "memorial", "fetters", "treason", "snare", "boar", "wraith", "skeleton"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

// ───────── choose a color ─────────

test("a Thriving land asks for a color, enters tapped, and then taps for blue or the chosen color", () => {
  let g = setup(["thriving"], [], [], 0);
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  assert.equal(g.pendingPick?.kind, "color");
  assert.deepEqual(g.pendingPick?.options, ["W", "B", "R", "G"]); // not blue
  assert.match(applyAction(g, "p1", { type: "passPhase" }).ok ? "" : "blocked", /blocked/); // the choice comes first
  g = act(g, "p1", { type: "pick", iid: "R" });
  const land = find(g, "h0")!;
  assert.equal(land.chosenColor, "R");
  assert.equal(land.tapped, true);
  land.tapped = false;
  assert.equal(payMana(g, "p1", { generic: 0, colored: { R: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { G: 1 } }).ok, false); // only blue and red
});

test("a land that only taps for the chosen color", () => {
  let g = setup(["haven"], [], [], 0);
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  assert.deepEqual(g.pendingPick?.options, ["W", "U", "B", "R", "G"]);
  g = act(g, "p1", { type: "pick", iid: "G" });
  find(g, "h0")!.tapped = false;
  assert.equal(payMana(g, "p1", { generic: 0, colored: { G: 1 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { R: 1 } }).ok, false);
  assert.equal(payMana(g, "p1", { generic: 1, colored: {} }).ok, true);
});

test("before a color is chosen the land makes no mana", () => {
  const g = setup(["haven"], [], [], 0);
  g.players.p1.battlefield.push(perm("hv", "haven"));
  assert.equal(payMana(g, "p1", { generic: 1, colored: {} }).ok, false);
});

// ───────── sacrifice as a cost ─────────

test("'{4}{U}, {T}, Sacrifice this land: Draw two cards' sacrifices as part of the cost", () => {
  let g = setup([], ["memorial"], [], 5);
  g.cards = { ...g.cards, mountain: { ...g.cards.mountain } };
  // pay {4}{U}: five Mountains can't make blue, so give the player blue sources
  g.players.p1.battlefield = g.players.p1.battlefield.filter((p) => p.card.iid.startsWith("m"));
  g.players.p1.battlefield.push(...[0, 1, 2, 3, 4].map((i) => perm(`isl${i}`, "island")));
  g.cards.island = { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" };
  const library = g.players.p1.library.length;
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.equal(find(g, "m0"), undefined); // sacrificed immediately
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "m0"), true);
  g = settle(g);
  assert.equal(g.players.p1.library.length, library - 2);
});

// ───────── enchant permanent, and locking abilities ─────────

test("'Enchant permanent' can go on a creature, land or artifact; the enchanted permanent can't attack, block or use abilities", () => {
  let g = setup(["fetters"], [], ["pinger"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  g = settle(g);
  assert.equal(g.players.p1.life, 24); // "When this Aura enters, you gain 4 life."
  assert.equal(find(g, "h0")!.attachedTo, "t0");
  // the locked creature can't use its tap ability
  const h = { ...g, active: "p2" as const, phase: "main1" as const };
  h.players = { ...g.players, p2: { ...g.players.p2, hand: [] } };
  assert.equal(applyAction(h, "p2", { type: "activateAbility", iid: "t0", index: 0, targets: [{ kind: "player", id: "p1" }] }).ok, false);
  // and it can't block
  const attack = setup([], ["bear"], ["pinger"]);
  attack.players.p2.battlefield[0] = { ...attack.players.p2.battlefield[0] };
  let a = act(setup(["fetters"], ["bear"], ["pinger"]), "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  a = settle(a);
  a.phase = "blockers";
  a.combat = { attackers: [{ attacker: "m0", blockers: [] }] };
  assert.deepEqual(getPossibleBlockers(a), []);
  // a land can be enchanted too
  const land = setup(["fetters"], [], []);
  land.players.p2.battlefield.push(perm("t9", "mountain", "p2"));
  assert.equal(applyAction(land, "p1", { type: "castSpell", iid: "h0", targets: on("t9") }).ok, true);
});

// ───────── gain control until end of turn ─────────

test("Act of Treason: you gain control, untap it, it has haste, and it goes back at the end of the turn", () => {
  let g = setup(["treason"], [], ["bear"]);
  find(g, "t0")!.tapped = true;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  g = settle(g);
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === "t0"), true);
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "t0"), false);
  const stolen = find(g, "t0")!;
  assert.equal(stolen.tapped, false);
  assert.ok(stolen.tempKeywords?.includes("haste"));
  assert.equal(stolen.card.owner, "p2");
  // it can attack right away
  g.phase = "attackers";
  const attack = act(g, "p1", { type: "declareAttackers", attackers: ["t0"] });
  assert.equal(attack.phase, "blockers");
  // at the end of the turn it returns
  const back = { ...g, phase: "end" as const };
  const next = act(back, "p1", { type: "passPhase" });
  assert.equal(next.players.p2.battlefield.some((p) => p.card.iid === "t0"), true);
  assert.equal(next.players.p1.battlefield.some((p) => p.card.iid === "t0"), false);
});

// ───────── combat restrictions ─────────

test("'Target creature can't block this turn'", () => {
  let g = setup(["snare"], ["bear"], ["bear2"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.deepEqual(getPossibleBlockers(g), []);
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);
});

test("'This creature can't be blocked by more than one creature'", () => {
  let g = setup([], ["boar"], ["bear", "bear2"]);
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  const double = applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }, { blocker: "t1", attacker: "m0" }] });
  assert.equal(double.ok, false);
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, true);
});

test("swampwalk and the Heal label no longer stop a card from being played", () => {
  let g = setup([], ["wraith"], ["bear"]);
  g.players.p2.battlefield.push(perm("sw", "swamp", "p2"));
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);
  assert.equal(powerOf(g, find(g, "m0")!), 2);
});
