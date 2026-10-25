import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string): CardDef => ({ id, name: id, type, cost: 1, manaCost: "{R}", text });
const land = (id: string, text: string, typeLine = "Land"): CardDef => ({ id, name: id, type: "land", cost: 0, typeLine, text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  checkland: land("checkland", "{T}: Add {R}.\nChecker enters tapped unless you control two or more basic lands.".replace("Checker", "checkland")),
  slowland: land("slowland", "{T}: Add {R}.\nslowland enters tapped unless you control two or fewer other lands."),
  fastland: land("fastland", "{T}: Add {R}.\nfastland enters tapped unless a player has 13 or less life."),
  rummager: creature("rummager", 1, 1, "When this creature enters, you may discard a card. If you do, draw a card."),
  fog: spell("fog", "instant", "Prevent all combat damage that would be dealt this turn."),
  censor: spell("censor", "instant", "Counter target spell unless its controller pays {2}."),
  heal: spell("heal", "sorcery", "You gain 1 life."),
  mist: creature("mist", 3, 3, "This creature can't be blocked by creatures with power 2 or less."),
  armada: creature("armada", 3, 3, "This creature can't attack unless defending player controls an Island."),
  isle: land("isle", "{T}: Add {U}.", "Basic Land — Island"),
  tosk: creature("tosk", 2, 2, "Whenever this creature deals combat damage to a player, put a +1/+1 counter on it."),
  shu: creature("shu", 1, 3, "Whenever this creature blocks, it gets +2/+2 until end of turn."),
  charger: creature("charger", 2, 2, "Whenever this creature becomes blocked, it gets +3/+0 until end of turn."),
  champ: creature("champ", 1, 1, "Whenever you cast a noncreature spell, put a +1/+1 counter on this creature."),
  geist: creature("geist", 1, 1, "Whenever you cast an instant or sorcery spell, this creature gets +2/+0 until end of turn."),
  spine: { id: "spine", name: "Spine", type: "artifact", cost: 3, manaCost: "{3}", typeLine: "Artifact", text: "When this artifact is put into a graveyard from the battlefield, return it to its owner's hand." },
  block: { id: "block", name: "Block", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "When this artifact is put into a graveyard from the battlefield, draw a card." },
  vial: { id: "vial", name: "Vial", type: "artifact", cost: 2, manaCost: "{2}", typeLine: "Artifact", text: "{1}, {T}, Sacrifice this artifact: It deals 2 damage to target creature." },
  maul: { id: "maul", name: "Maul", type: "artifact", cost: 3, manaCost: "{3}", typeLine: "Artifact — Equipment", text: "When this equipment enters, attach it to target creature you control.\nEquipped creature gets +1/+1.\nEquip {2}" },
  lure: creature("lure", 3, 3, "All creatures able to block this creature do so."),
  fling: { id: "fling", name: "Fling", type: "instant", cost: 2, manaCost: "{1}{R}", text: "As an additional cost to cast this spell, sacrifice a creature.\nFling deals damage equal to the sacrificed creature's power to any target." },
  sengir: creature("sengir", 4, 4, "Flying\nWhenever a creature dealt damage by this creature this turn dies, put a +1/+1 counter on this creature.", { keywords: ["flying"] }),
  vamp: creature("vamp", 4, 4, "Whenever a creature dealt damage by this creature this turn dies, put a +1/+1 counter on this creature."),
  bear: creature("bear", 2, 2),
  grizzly: creature("grizzly", 2, 2),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
  while (g.priority && !g.pendingPick && !g.pendingChoice) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("the new texts are understood", () => {
  for (const id of ["checkland", "slowland", "fastland", "rummager", "fog", "censor", "mist", "armada", "tosk", "shu", "charger", "champ", "geist", "spine", "block", "vial", "maul"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("a land that enters tapped unless a condition holds", () => {
  // two basic lands needed: the setup has four Mountains
  const g = setup(["checkland"]);
  assert.equal(find(act(g, "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, false);
  const few = setup(["checkland"]);
  few.players.p1.battlefield = few.players.p1.battlefield.slice(4);
  assert.equal(find(act(few, "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, true);
  // two or fewer other lands: four lands in play means tapped
  assert.equal(find(act(setup(["slowland"]), "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, true);
  const early = setup(["slowland"]);
  early.players.p1.battlefield = early.players.p1.battlefield.slice(2);
  assert.equal(find(act(early, "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, false);
  // a player at 13 life or less
  const hurt = setup(["fastland"]);
  hurt.players.p2.life = 13;
  assert.equal(find(act(hurt, "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, false);
  assert.equal(find(act(setup(["fastland"]), "p1", { type: "playLand", iid: "h0" }), "h0")?.tapped, true);
});

test("you may discard a card, and if you do, draw a card", () => {
  let g = setup(["rummager", "bear"]);
  const handBefore = g.players.p1.hand.length;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "rummage");
  const library = g.players.p1.library.length;
  g = act(g, "p1", { type: "pick", iid: "h1" });
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h1"), true);
  assert.equal(g.players.p1.library.length, library - 1);
  assert.equal(g.players.p1.hand.length, handBefore - 2 + 1); // cast one, discarded one, drew one
  // declining changes nothing
  let h = setup(["rummager", "bear"]);
  h = settle(act(h, "p1", { type: "castCreature", iid: "h0" }));
  h = act(h, "p1", { type: "pick" });
  assert.equal(h.players.p1.hand.length, 1);
});

test("prevent all combat damage", () => {
  let g = setup(["fog"], ["bear"]);
  g.phase = "attackers";
  g.players.p1.hand = [];
  g.players.p2.hand = [{ iid: "o0", defId: "fog", owner: "p2" }];
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [] });
  g = settle(g);
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [] }));
  assert.equal(g.players.p2.life, 20);
});

test("counter unless its controller pays", () => {
  let g = setup(["heal"]);
  g.players.p2.hand = [{ iid: "o0", defId: "censor", owner: "p2" }];
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  const item = g.stack[g.stack.length - 1];
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: item.id }] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "ward"); // p1 may pay {2}
  assert.equal(g.pendingPick?.player, "p1");
  const paid = act(g, "p1", { type: "pick", iid: "pay" });
  assert.equal(paid.players.p1.life, 21, "the spell resolved");
  const refused = act(g, "p1", { type: "pick" });
  assert.equal(refused.players.p1.life, 20, "the spell was countered");
});

test("can't be blocked by creatures with power 2 or less", () => {
  let g = setup([], [], ["mist"]);
  g.phase = "attackers";
  g.active = "p2";
  g = settle(act(g, "p2", { type: "declareAttackers", attackers: ["t0"] }));
  g.players.p1.battlefield.push(perm("bb", "bear"));
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "bb", attacker: "t0" }] }).ok, false);
  g.cards.bigbear = creature("bigbear", 3, 3);
  g.players.p1.battlefield.push(perm("big", "bigbear"));
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "big", attacker: "t0" }] }).ok, true);
});

test("can't attack unless the defending player controls an Island", () => {
  const g = setup([], ["armada"]);
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, false);
  g.players.p2.battlefield.push(perm("is", "isle", "p2"));
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, true);
});

test("combat damage to a player trigger", () => {
  let g = setup([], ["tosk"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [] }));
  g = settle(g);
  assert.equal(g.players.p2.life, 18);
  assert.equal(find(g, "m0")?.counters, 1);
});

test("whenever this blocks / becomes blocked: until end of turn bonuses", () => {
  let g = setup([], ["charger"], ["shu"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g.players.p2.battlefield.push(perm("blk", "bear", "p2"));
  const said: string[] = [];
  let r = applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "blk", attacker: "m0" }, { blocker: "t0", attacker: "m0" }] });
  assert.ok(r.ok);
  for (let i = 0; i < 10 && r.ok && r.state.priority; i++) {
    said.push(...r.events.flatMap((e) => (e.type === "effect" ? [e.text] : [])));
    r = applyAction(r.state, r.state.priority.holder, { type: "passPriority" });
  }
  assert.ok(r.ok);
  said.push(...r.events.flatMap((e) => (e.type === "effect" ? [e.text] : [])));
  assert.ok(said.some((t) => t.includes("+3/+0")), `becomes blocked: ${said.join(" | ")}`);
  assert.ok(said.some((t) => t.includes("+2/+2")), `blocks: ${said.join(" | ")}`);
});

test("whenever you cast a noncreature spell / an instant or sorcery", () => {
  let g = setup(["heal"], ["champ", "geist"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(find(g, "m0")?.counters, 1);
  assert.equal(find(g, "m1")?.powerBonus, 2);
});

test("when this is put into a graveyard from the battlefield", () => {
  // sacrifice-like removal: destroy both artifacts with a spell
  const h = setup([], ["spine", "block"]);
  h.cards.wrath = spell("wrath", "sorcery", "Destroy target artifact.");
  h.players.p1.hand = [{ iid: "w0", defId: "wrath", owner: "p1" }, { iid: "w1", defId: "wrath", owner: "p1" }];
  const library = h.players.p1.library.length;
  let r = settle(act(h, "p1", { type: "castSpell", iid: "w0", targets: on("m0") }));
  assert.equal(r.players.p1.hand.some((c) => c.iid === "m0"), true, "returned to hand");
  r = settle(act(r, "p1", { type: "castSpell", iid: "w1", targets: on("m1") }));
  assert.equal(r.players.p1.library.length, library - 1, "drew a card");
});

test("an ability of a sacrificed artifact: 'it deals 2 damage to target creature'", () => {
  let g = setup([], ["vial"], ["bear"]);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined);
});

test("an Equipment that attaches itself as it enters", () => {
  let g = setup(["maul"], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = settle(g);
  if (g.pendingChoice) g = act(g, "p1", { type: "chooseTargets", targets: on("m0") });
  g = settle(g);
  assert.equal(g.players.p1.battlefield.find((p) => p.card.iid === "h0")?.attachedTo, "m0");
});

test("all creatures able to block it do so", () => {
  let g = setup([], [], ["lure"]);
  g.phase = "attackers";
  g.active = "p2";
  g = settle(act(g, "p2", { type: "declareAttackers", attackers: ["t0"] }));
  g.players.p1.battlefield.push(perm("b1", "bear"), perm("b2", "bear"));
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [] }).ok, false, "nobody blocks: not allowed");
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "b1", attacker: "t0" }] }).ok, false, "one is still free");
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "b1", attacker: "t0" }, { blocker: "b2", attacker: "t0" }] }).ok, true);
  g.players.p1.battlefield.find((p) => p.card.iid === "b2")!.tapped = true; // a tapped creature is not able
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "b1", attacker: "t0" }] }).ok, true);
});

test("damage equal to the sacrificed creature's power", () => {
  let g = setup(["fling"], ["grizzly"]);
  g.cards.big = creature("big", 5, 5);
  g.players.p1.battlefield.push(perm("bg", "big"));
  g.players.p1.life = 20;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], sacrifice: "bg" });
  g = settle(g);
  assert.equal(g.players.p2.life, 15);
  assert.equal(find(g, "bg"), undefined, "the creature was sacrificed");
});

test("whenever a creature dealt damage by this creature this turn dies", () => {
  let g = setup([], ["vamp"], ["bear"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }));
  g = settle(g);
  assert.equal(find(g, "t0"), undefined, "the Bear died");
  assert.equal(find(g, "m0")?.counters, 1, "and the attacker grew");
});
