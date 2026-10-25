import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, isSupportedCard, playerToAct, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string, manaCost = "{R}"): CardDef => ({ id, name: id, type, cost: 1, manaCost, text });
const ench = (id: string, text: string): CardDef => ({ id, name: id, type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment", text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  acolyte: creature("acolyte", 2, 2, "When this creature enters, put a +1/+1 counter on each of up to two other target creatures you control."),
  hippo: creature("hippo", 2, 2, "When this creature enters, untap another target creature you control."),
  edict: spell("edict", "sorcery", "Exile target creature or enchantment."),
  enforcer: creature("enforcer", 1, 1, "{1}, {T}: Tap target creature with mana value 2 or greater."),
  stance: spell("stance", "instant", "Choose one —\n• Target creature gains indestructible until end of turn.\n• Destroy target creature with toughness 4 or greater."),
  bliss: ench("bliss", "At the beginning of your upkeep, you gain 3 life."),
  aerie: ench("aerie", "At the beginning of your end step, if you gained 3 or more life this turn, create a 2/2 white Griffin creature token with flying."),
  shaman: creature("shaman", 1, 1, "At the beginning of combat on your turn, you may have target creature get +2/+0 until end of turn."),
  patrol: creature("patrol", 1, 1, "Whenever another creature you control leaves the battlefield, put a +1/+1 counter on this creature."),
  guard: creature("guard", 1, 1, "Whenever another creature enters, untap this creature."),
  study: ench("study", "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}."),
  cutthroat: creature("cutthroat", 1, 1, "Whenever you cast a spell during an opponent's turn, put a +1/+1 counter on this creature.", { keywords: ["flash"] }),
  mentor: creature("mentor", 1, 1, "Whenever another creature you control with power 2 or less enters, you may pay {1}. If you do, draw a card."),
  angel: creature("angel", 2, 2, "If you would gain life, you gain that much life plus 1 instead.\nThis creature gets +2/+2 as long as you have 25 or more life."),
  rhox: creature("rhox", 3, 3, "If you would gain life, you gain twice that much life instead."),
  rager: creature("rager", 2, 2, "Other Minotaur creatures you control get +1/+1 and have trample.", { typeLine: "Creature — Minotaur Shaman" }),
  mino: creature("mino", 2, 2, "", { typeLine: "Creature — Minotaur Warrior" }),
  hound: creature("hound", 1, 1, "Whenever this creature blocks or becomes blocked by a creature, this creature deals 1 damage to that creature."),
  heal: spell("heal", "sorcery", "You gain 4 life."),
  bear: creature("bear", 2, 2),
  giant: creature("giant", 5, 5),
  big: creature("big", 4, 4),
  wow: spell("wow", "instant", "Draw a card."),
  bolt: spell("bolt", "instant", "Bolt deals 1 damage to any target."),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 5 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 5 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
const none = { kind: "none" as const };
const stat = (g: GameState, iid: string) => {
  const p = find(g, iid)!;
  return [powerOf(g, p), toughnessOf(g, p)];
};
/** Pass phases until it is `who`'s turn, in the given phase. */
const toTurn = (g: GameState, who: PlayerId): GameState => {
  for (let i = 0; i < 40 && g.active !== who; i++) g = settle(act(g, playerToAct(g), g.phase === "blockers" ? { type: "declareBlockers", blocks: [] } : { type: "passPhase" }));
  return g;
};

test("the round 1 and 2 texts are understood", () => {
  for (const id of ["acolyte", "hippo", "edict", "enforcer", "stance", "bliss", "aerie", "shaman", "patrol", "guard", "study", "cutthroat", "mentor", "angel", "rhox", "rager", "hound"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("up to two other target creatures: choose 2, 1 or none", () => {
  let g = setup(["acolyte"], ["bear", "bear", "bear"]);
  g = act(g, "p1", { type: "castCreature", iid: "h0" });
  g = settle(g);
  assert.ok(g.pendingChoice, "the trigger asks for targets");
  assert.equal(g.pendingChoice!.specs.length, 2);
  assert.equal(g.pendingChoice!.specs.every((s) => s.optional), true);
  g = settle(act(g, "p1", { type: "chooseTargets", targets: [{ kind: "permanent", iid: "m0" }, none] }));
  assert.equal(find(g, "m0")?.counters, 1);
  assert.equal(find(g, "m1")?.counters, undefined);
  // two different targets
  let h = setup(["acolyte"], ["bear", "bear", "bear"]);
  h = settle(act(h, "p1", { type: "castCreature", iid: "h0" }));
  h = settle(act(h, "p1", { type: "chooseTargets", targets: [{ kind: "permanent", iid: "m0" }, { kind: "permanent", iid: "m1" }] }));
  assert.equal(find(h, "m0")?.counters, 1);
  assert.equal(find(h, "m1")?.counters, 1);
  // "other": the Acolyte itself is not a legal target
  let k = setup(["acolyte"], ["bear"]);
  k = settle(act(k, "p1", { type: "castCreature", iid: "h0" }));
  const r = applyAction(k, "p1", { type: "chooseTargets", targets: [{ kind: "permanent", iid: "h0" }, none] });
  assert.equal(r.ok, false);
});

test("another target creature you control", () => {
  let g = setup(["hippo"], ["bear"]);
  g.players.p1.battlefield.find((p) => p.card.iid === "m0")!.tapped = true;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(find(g, "m0")?.tapped, false, "the only other creature was untapped (no choice needed)");
});

test("exile target creature or enchantment; creature with mana value; creature with toughness 4 or greater", () => {
  let g = setup(["edict"], [], ["bear"]);
  g.players.p2.battlefield.push(perm("en", "bliss", "p2"));
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("q0") }).ok, false, "a land is not allowed");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("en") }));
  assert.equal(g.players.p2.exile.some((c) => c.iid === "en"), true);

  let h = setup([], ["enforcer"], []);
  h.cards.one = creature("one", 1, 1);
  h.cards.mid = creature("mid", 2, 2, "", { cost: 3 });
  h.players.p2.battlefield.push(perm("mid", "mid", "p2"));
  h.players.p2.battlefield.push(perm("small", "one", "p2"));
  const a = getActivatable(h, "p1").find((x) => x.iid === "m0")!;
  assert.equal(applyAction(h, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: on("small") }).ok, false, "mana value 1 is too low");
  assert.equal(applyAction(h, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: on("mid") }).ok, true, "mana value 3 is fine");

  const s = setup(["stance"], [], ["bear", "giant"]);
  assert.equal(applyAction(s, "p1", { type: "castSpell", iid: "h0", targets: on("t0"), modes: [1] }).ok, false, "toughness 2 is too small");
  assert.equal(applyAction(s, "p1", { type: "castSpell", iid: "h0", targets: on("t1"), modes: [1] }).ok, true, "toughness 5 is fine");
});

test("upkeep, end step with a condition, and beginning of combat triggers", () => {
  let g = setup(["heal"], ["bliss"]);
  g.cards.bliss = DEFS.bliss;
  g.players.p1.battlefield.push(perm("ae", "aerie"));
  g.players.p1.life = 10;
  // an upkeep gain only happens on my own turn
  g = toTurn(g, "p2");
  const before = g.players.p1.life;
  g = toTurn(g, "p1");
  g = settle(g);
  assert.equal(g.players.p1.life, before + 3, "gained 3 at my upkeep");
  // the Griffin appears at the end step only if 3 or more life was gained this turn
  const tokens = () => g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Griffin").length;
  assert.equal(tokens(), 0);
  g.phase = "main2";
  g = settle(act(g, "p1", { type: "passPhase" })); // to the end step
  assert.equal(tokens(), 1, "gained 3 life this turn: a Griffin");
});

test("at the beginning of combat on your turn: an optional target", () => {
  let g = setup([], ["shaman", "bear"]);
  g = settle(act(g, "p1", { type: "passPhase" })); // main1 to combat
  assert.ok(g.pendingChoice, "asks for a target");
  g = settle(act(g, "p1", { type: "chooseTargets", targets: on("m1") }));
  assert.deepEqual(stat(g, "m1"), [4, 2]);
});

test("whenever another creature leaves / enters", () => {
  let g = setup(["bolt"], ["patrol", "bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m1") })); // 1 damage: no
  let h = setup(["heal"], ["patrol", "bear"]);
  h.cards.slay = spell("slay", "instant", "Destroy target creature.");
  h.players.p1.hand = [{ iid: "s0", defId: "slay", owner: "p1" }];
  h = settle(act(h, "p1", { type: "castSpell", iid: "s0", targets: on("m1") }));
  assert.equal(find(h, "m0")?.counters, 1, "a creature of mine died");
  let k = setup(["bear"], [], ["guard"]);
  k.players.p2.battlefield.find((p) => p.card.iid === "t0")!.tapped = true;
  k = settle(act(k, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(find(k, "t0")?.tapped, false, "any creature entering untaps the Guard");
  assert.ok(g);
});

test("an opponent's spell: draw unless they pay; your spell on their turn", () => {
  let g = setup([], ["study"]);
  g.active = "p2";
  g.players.p2.hand = [{ iid: "w0", defId: "wow", owner: "p2" }];
  const library = g.players.p1.library.length;
  g = act(g, "p2", { type: "castSpell", iid: "w0", targets: [] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "tax");
  assert.equal(g.pendingPick?.player, "p2");
  const paid = settle(act(g, "p2", { type: "pick", iid: "pay" }));
  assert.equal(paid.players.p1.library.length, library, "paid: no card");
  const refused = settle(act(g, "p2", { type: "pick" }));
  assert.equal(refused.players.p1.library.length, library - 1, "not paid: drew a card");

  let c = setup([], ["cutthroat"]);
  c.active = "p2";
  c.players.p2.hand = [{ iid: "w0", defId: "wow", owner: "p2" }];
  c.players.p1.hand = [{ iid: "w1", defId: "wow", owner: "p1" }];
  c = act(c, "p2", { type: "castSpell", iid: "w0", targets: [] });
  c = settle(act(c, "p1", { type: "castSpell", iid: "w1", targets: [] })); // in response, on their turn
  assert.equal(find(c, "m0")?.counters, 1, "cast during the opponent's turn");
});

test("you may pay {1}; if you do, draw a card", () => {
  let g = setup(["bear"], ["mentor"]);
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "mayPay");
  const paid = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  assert.equal(paid.players.p1.library.length, library - 1);
  const declined = settle(act(g, "p1", { type: "pick" }));
  assert.equal(declined.players.p1.library.length, library);
});

test("life gain replacement and life thresholds", () => {
  let g = setup(["heal"], ["angel"]);
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.players.p1.life, 15, "4 + 1");
  let r = setup(["heal"], ["rhox"]);
  r.players.p1.life = 10;
  r = settle(act(r, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(r.players.p1.life, 18, "twice 4");
  let t = setup([], ["angel"]);
  assert.deepEqual(stat(t, "m0"), [2, 2]);
  t.players.p1.life = 25;
  assert.deepEqual(stat(t, "m0"), [4, 4]);
});

test("other creatures of a type get a bonus", () => {
  const g = setup([], ["rager", "mino", "bear"]);
  assert.deepEqual(stat(g, "m1"), [3, 3]);
  assert.deepEqual(stat(g, "m2"), [2, 2]);
  assert.deepEqual(stat(g, "m0"), [2, 2], "not itself");
});

test("whenever this blocks or becomes blocked by a creature: damage to that creature", () => {
  let g = setup([], ["hound"], ["bear"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }));
  // the Bear (2/2) took 1 damage from the trigger and 1 more in combat: it died, which one point of combat damage alone would not do
  assert.equal(find(g, "t0"), undefined);
});
