import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, getPossibleBlockers, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost: 1,
  manaCost: "{R}",
  power,
  toughness,
  text,
  keywords,
  typeLine: "Creature — Test",
  ...extra,
});
const spell = (id: string, name: string, type: "instant" | "sorcery", text: string, keywords: string[] = []): CardDef => ({ id, name, type, cost: 1, manaCost: "{R}", text, keywords });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bear: creature("bear", 2, 2),
  bear2: creature("bear2", 2, 2),
  giant: creature("giant", 3, 3),
  // scry / mill / surveil carry their keyword-action labels, like real cards
  peek: spell("peek", "Peek", "sorcery", "Scry 2, then draw a card.", ["scry"]),
  loot: spell("loot", "Loot", "sorcery", "Draw a card, then discard a card."),
  look: spell("look", "Look", "sorcery", "Surveil 2.", ["surveil"]),
  grind: spell("grind", "Grind", "sorcery", "Target player mills three cards.", ["mill"]),
  haste: spell("haste", "Haste Spell", "instant", "Target creature gets +1/+0 until end of turn. Untap it. It gains haste until end of turn."),
  // activation limits
  clerk: creature("clerk", 1, 1, "{R}: Draw a card. Activate only as a sorcery."),
  oncer: creature("oncer", 1, 1, "{R}: You gain 1 life. Activate only once each turn."),
  // forced and evasive attackers
  rager: creature("rager", 2, 2, "Rager attacks each combat if able."),
  spooky: creature("spooky", 2, 2, "Fear", ["fear"]),
  sneaky: creature("sneaky", 2, 2, "Intimidate", ["intimidate"], { colors: ["R"] }),
  swampwalker: creature("swampwalker", 2, 2, "Swampwalk"),
  blackbear: creature("blackbear", 2, 2, "", [], { colors: ["B"] }),
  redbear: creature("redbear", 2, 2, "", [], { colors: ["R"] }),
  bluebear: creature("bluebear", 2, 2, "", [], { colors: ["U"] }),
  golem: creature("golem", 2, 2, "", [], { typeLine: "Artifact Creature — Golem" }),
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
  // protections and counters
  hexed: creature("hexed", 2, 2, "Hexproof", ["hexproof"]),
  xdrawer: creature("xdrawer", 1, 1, "When this creature enters, draw X cards.", [], { cost: 1, manaCost: "{X}{R}" }),
  revenant: creature("revenant", 1, 1, "When this creature dies, put it on top of its owner's library."),
  gizmoWatcher: creature("gizmoWatcher", 1, 1, "Whenever another artifact you control enters, put a +1/+1 counter on this creature."),
  gizmo: { id: "gizmo", name: "Gizmo", type: "artifact", cost: 1, manaCost: "{R}", typeLine: "Artifact", text: "" } as CardDef,
  kickWatcher: creature("kickWatcher", 1, 1, "Whenever you cast a kicked spell, you gain 2 life."),
  kickme: spell("kickme", "Kick Me", "sorcery", "Kicker {R}\nYou gain 1 life."),
  warden: creature("warden", 3, 3, "Other untapped creatures you control have hexproof.", ["hexproof"]),
  zap: spell("zap", "Zap", "instant", "Zap deals 3 damage to any target."),
  ward: spell("ward", "Counterspell", "instant", "Counter target spell."),
  stubborn: spell("stubborn", "Stubborn", "sorcery", "Stubborn deals 2 damage to any target.\nStubborn can't be countered.".replace(/Stubborn can't/, "This spell can't")),
  // prowess
  monk: creature("monk", 1, 1, "Prowess", ["prowess"]),
  // equipment
  sword: { id: "sword", name: "Sword", type: "artifact", cost: 1, manaCost: "{R}", typeLine: "Artifact — Equipment", text: "Equipped creature gets +2/+1 and has first strike.\nEquip {1}" },
  // tokens
  recruiter: spell("recruiter", "Recruiter", "sorcery", "Create two 1/1 white Soldier creature tokens."),
  flyerMaker: spell("flyerMaker", "Flyer Maker", "sorcery", "Create a 2/2 blue Bird creature token with flying."),
  gold: spell("gold", "Gold", "sorcery", "Create a Treasure token."),
  expensive: { id: "expensive", name: "Expensive", type: "creature", cost: 3, manaCost: "{1}{B}{B}", power: 3, toughness: 3 },
  // labels with no effect
  voidling: creature("voidling", 2, 2, "Devoid", ["devoid"]),
  pal: creature("pal", 2, 2, "Partner", ["partner"]),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], opponentHand: string[] = [], lands = 4): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = opponentHand.map((d, i) => ({ iid: `o${i}`, defId: d, owner: "p2" }));
  g.players.p1.battlefield = [...Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const refuses = (s: GameState, p: PlayerId, a: Action) => {
  const r = applyAction(s, p, a);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid)!;
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("the new texts are understood, including cards that carry a keyword-action label", () => {
  for (const id of ["peek", "loot", "look", "grind", "haste", "clerk", "oncer", "rager", "spooky", "sneaky", "swampwalker", "hexed", "monk", "sword", "recruiter", "flyerMaker", "gold", "voidling", "pal"]) {
    assert.equal(isSupportedCard(DEFS[id]), true, id);
  }
});

// ───────── effects that wait for a choice and then carry on ─────────

test("Scry 2, then draw a card: the draw happens after the choice", () => {
  let g = setup(["peek"]);
  g.players.p1.library = ["a", "b", "c", "d"].map((x, i) => ({ iid: `lib${i}`, defId: "mountain", owner: "p1" }));
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.ok(g.pendingPick);
  assert.equal(g.players.p1.hand.length, 0); // nothing drawn yet
  g = act(g, "p1", { type: "pick", iid: "lib0" }); // bottom
  g = act(g, "p1", { type: "pick" }); // keep the other on top
  assert.equal(g.pendingPick, null);
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid), ["lib1"]); // drew the card that stayed on top
});

test("Draw a card, then discard a card: you choose what to discard from your own hand", () => {
  let g = setup(["loot"]);
  g.players.p1.hand.push({ iid: "keep", defId: "bear", owner: "p1" });
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.players.p1.hand.length, 2); // "keep" and the drawn card
  assert.equal(g.pendingPick!.player, "p1");
  g = act(g, "p1", { type: "pick", iid: "keep" });
  assert.equal(g.players.p1.hand.length, 1);
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "keep"), true);
});

test("Surveil: cards you don't keep go to the graveyard", () => {
  let g = setup(["look"]);
  g.players.p1.library = ["a", "b", "c"].map((x, i) => ({ iid: `lib${i}`, defId: "mountain", owner: "p1" }));
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = act(g, "p1", { type: "pick", iid: "lib1" });
  g = act(g, "p1", { type: "pick" });
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["lib0", "lib2"]);
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "lib1"), true);
});

test("Mill (a card with the Mill label) puts three cards into the graveyard", () => {
  let g = setup(["grind"]);
  const before = g.players.p2.library.length;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p2.library.length, before - 3);
});

test("'Untap it' and 'It gains haste' mean the creature that was targeted", () => {
  let g = setup(["haste"], ["bear"]);
  find(g, "m0").tapped = true;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") });
  assert.equal(find(g, "m0").tapped, false);
  assert.ok(find(g, "m0").tempKeywords?.includes("haste"));
  assert.equal(powerOf(g, find(g, "m0")), 3);
});

// ───────── activation limits ─────────

test("'Activate only as a sorcery' and 'only once each turn'", () => {
  let g = setup([], ["clerk"], [], [], 3);
  g.phase = "attackers"; // not a main phase
  assert.equal(getActivatable(g, "p1").some((a) => a.iid === "m0"), false);
  assert.match(refuses(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }), /sorcery/);
  g.phase = "main1";
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });

  let h = setup([], ["oncer"], [], [], 3);
  h = act(h, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.match(refuses(h, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }), /once each turn/);
  h.phase = "end";
  h = act(h, "p1", { type: "passPhase" }); // new turn, p2
  h.active = "p1";
  h.phase = "main1";
  h = act({ ...h, players: { ...h.players } }, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }); // usable again next turn
  assert.equal(h.players.p1.life, 22);
});

// ───────── attacking and blocking rules ─────────

test("'Attacks each combat if able': you can't skip the attack or leave it out", () => {
  const g = setup([], ["rager", "bear"], ["bear"]);
  g.phase = "attackers";
  assert.match(refuses(g, "p1", { type: "passPhase" }), /attacks each combat/);
  assert.match(refuses(g, "p1", { type: "declareAttackers", attackers: ["m1"] }), /attacks each combat/);
  const ok = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.equal(ok.phase, "blockers");
});

function blockCheck(attacker: string, blocker: string, extra: (g: GameState) => void = () => {}) {
  const g = setup([], [attacker], [blocker]);
  extra(g);
  g.phase = "attackers";
  const s = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  return applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok;
}

test("fear: only artifact and black creatures can block", () => {
  assert.equal(blockCheck("spooky", "redbear"), false);
  assert.equal(blockCheck("spooky", "blackbear"), true);
  assert.equal(blockCheck("spooky", "golem"), true);
});

test("intimidate: only artifact creatures and creatures sharing a color can block", () => {
  assert.equal(blockCheck("sneaky", "bluebear"), false);
  assert.equal(blockCheck("sneaky", "redbear"), true);
  assert.equal(blockCheck("sneaky", "golem"), true);
});

test("swampwalk: can't be blocked while the defender controls a Swamp", () => {
  assert.equal(blockCheck("swampwalker", "bear"), true);
  assert.equal(blockCheck("swampwalker", "bear", (g) => g.players.p2.battlefield.push(perm("sw", "swamp", "p2"))), false);
});

test("hexproof: only its controller can target it", () => {
  const g = setup(["zap"], ["bear"], ["hexed"]);
  refuses(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  const ok = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }); // my own bear is fine
  assert.equal(find(ok, "m0") === undefined, true);
  // the controller can target their own hexproof creature
  const own = setup([], [], ["hexed"], ["zap"]);
  own.active = "p2";
  own.players.p2.hand[0] = { iid: "o0", defId: "zap", owner: "p2" };
  const r = applyAction({ ...own }, "p2", { type: "castSpell", iid: "o0", targets: on("t0") });
  assert.equal(r.ok, true);
});

test("hexproof: \"other untapped creatures you control have hexproof\" protects the others only while they are untapped", () => {
  const g = setup(["zap"], ["bear"], ["warden", "bear2"]);
  refuses(g, "p1", { type: "castSpell", iid: "h0", targets: on("t1") }); // the untapped bear is protected
  find(g, "t1").tapped = true;
  const ok = applyAction({ ...g }, "p1", { type: "castSpell", iid: "h0", targets: on("t1") }); // tapped: no longer protected
  assert.equal(ok.ok, true);
});

test("an enter trigger that says X uses the X that was paid: \"When this creature enters, draw X cards\"", () => {
  let g = setup(["xdrawer"], [], [], [], 6);
  g.players.p1.library = Array.from({ length: 6 }, (_, i) => ({ iid: `lib${i}`, defId: "mountain", owner: "p1" }));
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], x: 3 });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p1.hand.length, 3);
  assert.equal(g.players.p1.library.length, 3);
});

test("\"When this creature dies, put it on top of its owner's library\": it leaves the graveyard for the top of the library", () => {
  let g = setup(["zap"], [], ["revenant"]);
  g.players.p2.library = [{ iid: "lib0", defId: "mountain", owner: "p2" }];
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p2.graveyard.some((c) => c.iid === "t0"), false);
  assert.equal(g.players.p2.library[0].iid, "t0");
});

test("\"whenever another artifact you control enters\" fires when an artifact (not a creature) enters", () => {
  let g = setup(["gizmo"], ["gizmoWatcher"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(find(g, "m0").counters, 1);
});

test("\"whenever you cast a kicked spell\" fires only when the kicker was paid", () => {
  let g = setup(["kickme"], ["kickWatcher"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], kicked: true });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p1.life, 20 + 1 + 2);
  let h = setup(["kickme"], ["kickWatcher"]);
  h = act(h, "p1", { type: "castSpell", iid: "h0", targets: [] });
  while (h.priority) h = act(h, h.priority.holder, { type: "passPriority" });
  assert.equal(h.players.p1.life, 20 + 1);
});

// ───────── counterspells and prowess ─────────

test("a spell that can't be countered ignores Counterspell", () => {
  let g = setup(["stubborn"], [], [], ["ward"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  const spellId = g.stack[0].id;
  g = act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: spellId }] });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p2.life, 18); // it resolved anyway
});

test("prowess: a noncreature spell gives +1/+1 until end of turn", () => {
  let g = setup(["zap", "bear"], ["monk"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(powerOf(g, find(g, "m0")), 2);
  assert.equal(toughnessOf(g, find(g, "m0")), 2);
  g = act(g, "p1", { type: "castSpell", iid: "h1", targets: [] }); // a creature spell: no prowess
  assert.equal(powerOf(g, find(g, "m0")), 2);
});

// ───────── equipment ─────────

test("equipment: equip at sorcery speed, bonuses apply, it stays when the creature dies", () => {
  let g = setup([], ["sword", "bear"]);
  assert.equal(find(g, "m0").attachedTo, undefined);
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("m1") });
  assert.equal(find(g, "m0").attachedTo, "m1");
  assert.equal(powerOf(g, find(g, "m1")), 4);
  assert.equal(toughnessOf(g, find(g, "m1")), 3);
  // can't equip in combat
  const c = { ...g, phase: "attackers" as const };
  assert.match(refuses(c, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("m1") }), /sorcery/);
  // the creature dies: the equipment stays, unattached
  g.players.p1.hand = [{ iid: "z", defId: "zap", owner: "p1" }];
  g = act(g, "p1", { type: "castSpell", iid: "z", targets: on("m1") });
  assert.ok(find(g, "m0"), "the equipment is still on the battlefield");
  assert.equal(find(g, "m0").attachedTo, undefined);
  // and it can be moved to another creature
  g.players.p1.battlefield.push(perm("m2", "bear2"));
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("m2") });
  assert.equal(powerOf(g, find(g, "m2")), 4);
});

// ───────── tokens and Treasure ─────────

test("creature tokens enter the battlefield, and vanish instead of going to the graveyard", () => {
  let g = setup(["recruiter", "zap"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  const soldiers = g.players.p1.battlefield.filter((p) => p.card.defId.startsWith("token-"));
  assert.equal(soldiers.length, 2);
  assert.equal(powerOf(g, soldiers[0]), 1);
  assert.equal(soldiers[0].summoningSick, true);
  const graveyard = g.players.p1.graveyard.length;
  g = act(g, "p1", { type: "castSpell", iid: "h1", targets: on(soldiers[0].card.iid) });
  assert.equal(g.players.p1.battlefield.filter((p) => p.card.defId.startsWith("token-")).length, 1);
  assert.equal(g.players.p1.graveyard.length, graveyard + 1); // only the Zap, not the token
});

test("a token with keywords", () => {
  let g = setup(["flyerMaker"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  const bird = g.players.p1.battlefield.find((p) => p.card.defId.startsWith("token-"))!;
  assert.equal(g.cards[bird.card.defId].keywords?.includes("flying"), true);
  assert.equal(powerOf(g, bird), 2);
});

test("Treasure: sacrificed for one mana of any color", () => {
  let g = setup(["gold", "expensive"], [], [], [], 1);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  const treasure = g.players.p1.battlefield.find((p) => p.card.defId.startsWith("token-"))!;
  assert.ok(treasure);
  g.players.p1.battlefield.push(perm("extra1", "mountain"), perm("extra2", "mountain"));
  g.players.p1.battlefield.find((p) => p.card.iid === "l0")!.tapped = false;
  // {1}{B}{B} with three Mountains and a Treasure: the Treasure must provide one {B}, but only one black is possible -> can't
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h1", targets: [] });
  assert.equal(r.ok, false);
  g.cards = { ...g.cards, expensive: { ...DEFS.expensive, manaCost: "{2}{B}" } };
  const ok = act(g, "p1", { type: "castSpell", iid: "h1", targets: [] });
  assert.equal(ok.players.p1.battlefield.some((p) => p.card.iid === treasure.card.iid), false, "the Treasure was sacrificed");
});

test("devoid and partner lines change nothing", () => {
  const g = setup(["bear"], ["voidling", "pal"]);
  assert.equal(powerOf(g, find(g, "m0")), 2);
});
