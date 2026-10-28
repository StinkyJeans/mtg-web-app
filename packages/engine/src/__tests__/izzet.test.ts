import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, getPlottable, isSupportedCard } from "../index.js";
import { exilePlayable, kw, powerOf, toughnessOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the Modern Izzet Prowess deck that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  mountain: { id: "mountain", name: "Mountain", type: "land", cost: 0, typeLine: "Basic Land — Mountain" },
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  bear: card("bear", "Bear", "creature", "{1}{G}", "Creature — Bear", "", [], { power: 2, toughness: 2 }),
  bolt: card("bolt", "Lightning Bolt", "instant", "{R}", "Instant", "Lightning Bolt deals 3 damage to any target.", [], { colors: ["R"] }),
  preordain: card("preordain", "Preordain", "sorcery", "{U}", "Sorcery", "Scry 2, then draw a card.", ["scry"], { colors: ["U"] }),
  swiftspear: card("swiftspear", "Monastery Swiftspear", "creature", "{R}", "Creature — Human Monk", "Haste\nProwess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)", ["haste", "prowess"], { power: 1, toughness: 2 }),
  mesa: card("mesa", "Arid Mesa", "land", "", "Land", "{T}, Pay 1 life, Sacrifice Arid Mesa: Search your library for a Mountain or Plains card, put it onto the battlefield, then shuffle."),
  vents: card("vents", "Steam Vents", "land", "", "Land — Island Mountain", "({T}: Add {U} or {R}.)\nAs Steam Vents enters, you may pay 2 life. If you don't, it enters tapped."),
  islet: card("islet", "Fiery Islet", "land", "", "Land", "{T}, Pay 1 life: Add {U} or {R}.\n{1}, {T}, Sacrifice Fiery Islet: Draw a card."),
  drc: card("drc", "Dragon's Rage Channeler", "creature", "{R}", "Creature — Human Shaman", "Whenever you cast a noncreature spell, surveil 1. (Look at the top card of your library. You may put that card into your graveyard.)\nDelirium — As long as there are four or more card types among cards in your graveyard, Dragon's Rage Channeler gets +2/+2, has flying, and attacks each combat if able.", ["delirium", "surveil"], { power: 1, toughness: 1 }),
  slickshot: card("slickshot", "Slickshot Show-Off", "creature", "{1}{R}", "Creature — Bird Wizard", "Flying, haste\nWhenever you cast a noncreature spell, Slickshot Show-Off gets +2/+0 until end of turn.\nPlot {1}{R} (You may pay {1}{R} and exile this card from your hand. Cast it as a sorcery on a later turn without paying its mana cost. Plotting is a sorcery.)", ["flying", "plot", "haste"], { power: 1, toughness: 2 }),
  boomerang: card("boomerang", "Boomerang Basics", "sorcery", "{U}", "Sorcery — Lesson", "Return target nonland permanent to its owner's hand. If you controlled that permanent, draw a card."),
  iteration: card("iteration", "Expressive Iteration", "sorcery", "{U}{R}", "Sorcery", "Look at the top three cards of your library. Put one of them into your hand, put one of them on the bottom of your library, and exile one of them. You may play the exiled card this turn."),
  dart: card("dart", "Lava Dart", "instant", "{R}", "Instant", "Lava Dart deals 1 damage to any target.\nFlashback—Sacrifice a Mountain. (You may cast this card from your graveyard for its flashback cost. Then exile it.)", ["flashback"]),
  urge: card("urge", "Violent Urge", "instant", "{R}", "Instant", "Target creature gets +1/+0 and gains first strike until end of turn.\nDelirium — If there are four or more card types among cards in your graveyard, that creature gains double strike until end of turn.", ["delirium"]),
  cutter: card("cutter", "Cori-Steel Cutter", "artifact", "{1}{R}", "Artifact — Equipment", "Equipped creature gets +1/+1 and has trample and haste.\nFlurry — Whenever you cast your second spell each turn, create a 1/1 white Monk creature token with prowess. You may attach Cori-Steel Cutter to it.\nEquip {1}{R}", ["flurry", "equip"]),
  bauble: card("bauble", "Mishra's Bauble", "artifact", "{0}", "Artifact", "{T}, Sacrifice Mishra's Bauble: Look at the top card of target player's library. Draw a card at the beginning of the next turn's upkeep."),
  crypt: card("crypt", "Tormod's Crypt", "artifact", "{0}", "Artifact", "{T}, Sacrifice Tormod's Crypt: Exile target player's graveyard."),
  heat: card("heat", "Unholy Heat", "instant", "{R}", "Instant", "Unholy Heat deals 2 damage to target creature or planeswalker.\nDelirium — Unholy Heat deals 6 damage instead if there are four or more card types among cards in your graveyard.", ["delirium"]),
  meltdown: card("meltdown", "Meltdown", "sorcery", "{X}{R}", "Sorcery", "Destroy each artifact with mana value X or less.", [], { cost: 1 }),
  dispute: card("dispute", "Mystical Dispute", "instant", "{2}{U}", "Instant", "This spell costs {2} less to cast if it targets a blue spell.\nCounter target spell unless its controller pays {3}."),
  consign: card("consign", "Consign to Memory", "instant", "{U}", "Instant", "Replicate {1} (When you cast this spell, copy it for each time you paid its replicate cost. You may choose new targets for the copies.)\nCounter target triggered ability or colorless spell.", ["replicate"]),
  wall: card("wall", "Wall", "creature", "{2}", "Creature — Wall", "", [], { power: 0, toughness: 6 }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
const cards = (owner: PlayerId, prefix: string, defIds: string[]): CardInstance[] => defIds.map((d, i) => ({ iid: `${prefix}${i}`, defId: d, owner }));

/** p1's first main phase with the lands given (two Mountains and two Islands by default), the cards in hand, and permanents on each side. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = [], lands = ["mountain", "mountain", "island", "island"]): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = cards("p1", "h", hand);
  g.players.p1.battlefield = [...lands.map((d, i) => perm(`l${i}`, d)), ...mine.map((d, i) => perm(`m${i}`, d))];
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
  while (g.priority && !g.pendingChoice && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const cast = (g: GameState, iid: string, targets: unknown[] = [], more: Partial<Extract<Action, { type: "castSpell" }>> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: targets as never, ...more }));
/** Answers every "surveil 1" by keeping the card on top. */
const keepTops = (g: GameState) => {
  while (g.pendingPick?.kind === "surveil") g = settle(act(g, g.pendingPick.player, { type: "pick" }));
  return g;
};
/** A graveyard with four card types: a land, an instant, a sorcery and an artifact. */
const delirious = (g: GameState) => {
  g.players.p1.graveyard = cards("p1", "y", ["island", "bolt", "preordain", "bauble"]);
  return g;
};

test("every card of the Izzet Prowess deck that needed new rules is understood", () => {
  for (const id of ["mesa", "vents", "islet", "drc", "slickshot", "boomerang", "iteration", "dart", "urge", "cutter", "bauble", "crypt", "swiftspear", "preordain"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("a fetch land: pay 1 life and sacrifice it to put a Mountain or Plains card (a dual with the type too) onto the battlefield untapped", () => {
  const g = setup([], [], [], ["mesa"]);
  g.players.p1.library = cards("p1", "lib", ["island", "vents", "plains", "mountain", "mountain"]);
  let h = act(g, "p1", { type: "activateAbility", iid: "l0", index: 0, targets: [] });
  assert.equal(h.players.p1.life, 19);
  assert.ok(h.players.p1.graveyard.some((c) => c.iid === "l0"), "sacrificed");
  h = settle(h);
  assert.equal(h.pendingPick?.kind, "searchLand");
  const names = h.pendingPick!.options.map((iid) => h.cards[h.players.p1.library.find((c) => c.iid === iid)!.defId].name).sort();
  assert.deepEqual(names, ["Mountain", "Plains", "Steam Vents"], "one of each card, never the Island");
  const mountain = h.players.p1.library.find((c) => c.defId === "mountain")!.iid;
  h = act(h, "p1", { type: "pick", iid: mountain });
  assert.equal(find(h, mountain)?.tapped, false, "it enters untapped");
});

test("a shock land asks as it enters: 2 life, or it enters tapped (also when a fetch land finds it)", () => {
  const g = setup(["vents"], [], [], []);
  let h = act(g, "p1", { type: "playLand", iid: "h0" });
  assert.equal(h.pendingPick?.kind, "mayPay");
  assert.equal(h.pendingPick?.payLife, 2);
  const paid = act(h, "p1", { type: "pick", iid: "pay" });
  assert.deepEqual([paid.players.p1.life, find(paid, "h0")?.tapped], [18, false]);
  h = act(h, "p1", { type: "pick" });
  assert.deepEqual([h.players.p1.life, find(h, "h0")?.tapped], [20, true]);

  const f = setup([], [], [], ["mesa"]);
  f.players.p1.library = cards("p1", "lib", ["vents"]);
  let k = settle(act(f, "p1", { type: "activateAbility", iid: "l0", index: 0, targets: [] }));
  k = act(k, "p1", { type: "pick", iid: "lib0" });
  assert.equal(k.pendingPick?.tapIfNot, "lib0", "the fetched shock land asks too");
  k = act(k, "p1", { type: "pick", iid: "pay" });
  assert.deepEqual([k.players.p1.life, find(k, "lib0")?.tapped], [17, false]);
});

test("Fiery Islet's mana costs 1 life, so other lands pay first", () => {
  let g = setup(["bolt"], [], [], ["islet", "mountain"]);
  g = cast(g, "h0", [{ kind: "player", id: "p2" }]);
  assert.deepEqual([g.players.p1.life, find(g, "l1")?.tapped, find(g, "l0")?.tapped], [20, true, false]);
  let h = setup(["bolt"], [], [], ["islet"]);
  h = cast(h, "h0", [{ kind: "player", id: "p2" }]);
  assert.deepEqual([h.players.p1.life, h.players.p2.life], [19, 17]);
});

test("delirium: Dragon's Rage Channeler is a 3/3 flyer that must attack once four card types are in the graveyard", () => {
  const g = setup([], ["drc"]);
  const drc = find(g, "m0")!;
  assert.deepEqual([powerOf(g, drc), toughnessOf(g, drc), kw(g, drc, "flying")], [1, 1, false]);
  g.players.p1.graveyard = cards("p1", "y", ["island", "bolt", "preordain"]);
  assert.equal(powerOf(g, drc), 1, "three types are not enough");
  delirious(g);
  assert.deepEqual([powerOf(g, drc), toughnessOf(g, drc), kw(g, drc, "flying")], [3, 3, true]);
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "passPhase" }).ok, false, "it attacks each combat if able");
});

test("Dragon's Rage Channeler surveils whenever a noncreature spell is cast", () => {
  let g = setup(["bolt"], ["drc"]);
  g = cast(g, "h0", [{ kind: "player", id: "p2" }]);
  assert.equal(g.pendingPick?.kind, "surveil");
  const top = g.players.p1.library[0].iid;
  g = settle(act(g, "p1", { type: "pick", iid: top }));
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === top));
});

test("Violent Urge: first strike, and double strike with delirium", () => {
  let g = setup(["urge"], ["swiftspear"]);
  g = cast(g, "h0", [on("m0")]);
  assert.deepEqual([kw(g, find(g, "m0")!, "first strike"), kw(g, find(g, "m0")!, "double strike")], [true, false]);
  let h = delirious(setup(["urge"], ["swiftspear"]));
  h = cast(h, "h0", [on("m0")]);
  assert.equal(kw(h, find(h, "m0")!, "double strike"), true);
  assert.equal(powerOf(h, find(h, "m0")!), 3, "+1/+0 and prowess");
});

test("plot: pay {1}{R} to exile Slickshot Show-Off, then cast it for free as a sorcery on a later turn", () => {
  let g = setup(["slickshot"]);
  assert.deepEqual(getPlottable(g, "p1"), [{ iid: "h0", cost: "{1}{R}" }]);
  g = act(g, "p1", { type: "plot", iid: "h0" });
  assert.ok(g.players.p1.exile.some((c) => c.iid === "h0"));
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 2, "the plot cost was paid");
  assert.equal(exilePlayable(g, "p1").length, 0, "not this turn");
  g.turn += 2;
  for (const p of g.players.p1.battlefield) p.tapped = true;
  assert.ok(getCastable(g, "p1").some((c) => c.iid === "h0" && c.zone === "exile"), "free on a later turn");
  g = cast(g, "h0", [], { from: "exile" });
  assert.ok(find(g, "h0"), "on the battlefield without any mana");
  g.phase = "attackers";
  const h = setup([], [], [], []);
  h.players.p1.exile = cards("p1", "x", ["slickshot"]);
  h.players.p1.mayPlay = [{ iid: "x0", source: "plot", fromTurn: 0, payGeneric: 0, sorcery: true }];
  h.priority = { holder: "p1", passes: 0, then: null };
  h.stack = [{ kind: "ability", id: "s1", controller: "p2", source: "t0", sourceName: "Something", effects: [], targets: [], specs: [], text: "" }];
  assert.equal(applyAction(h, "p1", { type: "castSpell", iid: "x0", targets: [], from: "exile" }).ok, false, "only as a sorcery");
});

test("Slickshot Show-Off gets +2/+0 for each noncreature spell", () => {
  let g = setup(["bolt"], ["slickshot"]);
  g = cast(g, "h0", [{ kind: "player", id: "p2" }]);
  assert.equal(powerOf(g, find(g, "m0")!), 3);
});

test("Boomerang Basics draws a card only when it returned a permanent you controlled", () => {
  let g = setup(["boomerang"], ["bear"]);
  g = cast(g, "h0", [on("m0")]);
  assert.deepEqual([g.players.p1.hand.map((c) => c.defId).sort()], [["bear", "mountain"]]);
  let h = setup(["boomerang"], [], ["bear"]);
  h = cast(h, "h0", [on("t0")]);
  assert.deepEqual([h.players.p1.hand.length, h.players.p2.hand.length], [0, 1]);
});

test("Expressive Iteration: one card to hand, one exiled to play this turn, the last to the bottom", () => {
  let g = setup(["iteration"]);
  g.players.p1.library = cards("p1", "lib", ["bolt", "preordain", "island", "mountain"]);
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.kind, "toHand");
  g = act(g, "p1", { type: "pick", iid: "lib0" });
  assert.equal(g.pendingPick?.kind, "playExile");
  assert.deepEqual(g.pendingPick?.options, ["lib1", "lib2"]);
  g = act(g, "p1", { type: "pick", iid: "lib2" });
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid), ["lib0"]);
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["lib3", "lib1"], "the other one is at the bottom");
  assert.deepEqual(exilePlayable(g, "p1").map((c) => c.iid), ["lib2"]);
  g = act(g, "p1", { type: "playLand", iid: "lib2" });
  assert.ok(find(g, "lib2"), "the exiled land is played from exile");
});

test("Lava Dart's flashback sacrifices a Mountain instead of paying mana", () => {
  let g = setup([], [], ["bear"]);
  g.players.p1.graveyard = cards("p1", "y", ["dart"]);
  for (const p of g.players.p1.battlefield) p.tapped = true;
  const option = getCastable(g, "p1").find((c) => c.iid === "y0");
  assert.deepEqual(option?.sacrifice, ["l0", "l1"], "only the Mountains");
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "y0", targets: [on("t0")], from: "graveyard", sacrifice: "l2" }).ok, false, "an Island isn't a Mountain");
  g = cast(g, "y0", [{ kind: "player", id: "p2" }], { from: "graveyard", sacrifice: "l0" });
  assert.equal(g.players.p2.life, 19);
  assert.equal(find(g, "l0"), undefined, "the Mountain is gone");
  assert.ok(g.players.p1.exile.some((c) => c.iid === "y0"), "a flashback spell is exiled");
});

test("flurry: the second spell each turn makes a 1/1 Monk with prowess, and Cori-Steel Cutter may go on it", () => {
  let g = setup(["bolt", "bolt", "bolt"], ["cutter"], [], ["mountain", "mountain", "mountain", "island"]);
  g = cast(g, "h0", [{ kind: "player", id: "p2" }]);
  assert.equal(g.pendingPick, null);
  g = cast(g, "h1", [{ kind: "player", id: "p2" }]);
  assert.equal(g.pendingPick?.kind, "mayPay", "may attach");
  g = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  const monk = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Monk")!;
  assert.equal(find(g, "m0")?.attachedTo, monk.card.iid);
  assert.deepEqual([powerOf(g, monk), kw(g, monk, "haste"), kw(g, monk, "trample"), kw(g, monk, "prowess")], [2, true, true, true]);
  g = cast(g, "h2", [{ kind: "player", id: "p2" }]);
  assert.equal(g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Monk").length, 1, "only the second spell");
  assert.equal(powerOf(g, find(g, monk.card.iid)!), 3, "the Monk's prowess");
});

test("Mishra's Bauble: a free noncreature spell; look at the top card, then draw at the next upkeep", () => {
  let g = setup(["bauble"], ["swiftspear"]);
  g.players.p2.library = cards("p2", "their", ["bolt", "island"]);
  g = cast(g, "h0");
  assert.equal(powerOf(g, find(g, "m0")!), 2, "prowess");
  g = act(g, "p1", { type: "activateAbility", iid: "h0", index: 0, targets: [{ kind: "player", id: "p2" }] });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "look");
  assert.deepEqual(g.pendingPick?.options, ["their0"]);
  g = settle(act(g, "p1", { type: "pick" }));
  assert.equal(g.players.p2.library[0].iid, "their0", "it stays on top");
  const before = g.players.p1.hand.length;
  for (let i = 0; i < 40 && g.active === "p1"; i++) g = g.priority ? act(g, g.priority.holder, { type: "passPriority" }) : act(g, g.active, { type: "passPhase" });
  g = settle(g);
  assert.equal(g.players.p1.hand.length, before + 1, "drawn at the beginning of the opponent's upkeep");
});

test("Tormod's Crypt exiles a player's graveyard", () => {
  let g = setup([], ["crypt"]);
  g.players.p2.graveyard = cards("p2", "gy", ["bolt", "bear"]);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [{ kind: "player", id: "p2" }] }));
  assert.deepEqual([g.players.p2.graveyard.length, g.players.p2.exile.length], [0, 2]);
});

test("the sideboard cards are understood: Unholy Heat, Meltdown, Mystical Dispute, Consign to Memory", () => {
  for (const id of ["heat", "meltdown", "dispute", "consign"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Unholy Heat deals 2 damage, or 6 with delirium", () => {
  let g = setup(["heat"], [], ["wall"]);
  g = cast(g, "h0", [on("t0")]);
  assert.equal(find(g, "t0")?.damage, 2);
  let h = delirious(setup(["heat"], [], ["wall"]));
  h = cast(h, "h0", [on("t0")]);
  assert.equal(find(h, "t0"), undefined, "6 damage kills the 0/6");
});

test("Meltdown destroys each artifact with mana value X or less, on both sides", () => {
  let g = setup(["meltdown"], ["bauble", "cutter"], ["crypt"]);
  g = cast(g, "h0", [], { x: 1 });
  assert.deepEqual([!!find(g, "m0"), !!find(g, "m1"), !!find(g, "t0")], [false, true, false], "Bauble and Crypt (0) go, Cori-Steel Cutter (2) stays");
});

/** p1 casts `spell` (with these targets); p2, with only the lands given, holds priority with `answer` in hand. */
function respond(spell: string, targets: unknown[], answer: string, theirLands: string[]) {
  const g = setup([spell], ["swiftspear", "slickshot"], theirLands, ["mountain", "island"]);
  g.players.p2.hand = cards("p2", "o", [answer]);
  return act(g, "p1", { type: "castSpell", iid: "h0", targets: targets as never });
}

test("Mystical Dispute costs {U} against a blue spell, {2}{U} against any other", () => {
  let g = respond("preordain", [], "dispute", ["island"]);
  const spell = g.stack.find((i) => i.kind === "spell")!;
  assert.deepEqual(getCastable(g, "p2").map((c) => c.specs[0].spellColor), ["U"], "with one land only a blue spell can be its target");
  g = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: spell.id }] }));
  assert.equal(g.players.p1.graveyard.some((c) => c.defId === "preordain"), true, "countered: p1 can't pay {3}");
  const h = respond("bolt", [{ kind: "player", id: "p2" }], "dispute", ["island"]);
  assert.deepEqual(getCastable(h, "p2"), [], "Lightning Bolt is red: the full {2}{U} can't be paid");
});

test("Consign to Memory counters a triggered ability, or a colorless spell", () => {
  let g = respond("bolt", [{ kind: "player", id: "p2" }], "consign", ["island"]);
  const triggers = g.stack.filter((i) => i.kind === "ability");
  assert.equal(triggers.length, 2, "prowess and Slickshot Show-Off");
  const prowess = triggers.find((i) => i.kind === "ability" && i.sourceName === "Monastery Swiftspear")!;
  assert.equal(getCastable(g, "p2").length, 1);
  g = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: prowess.id }] }));
  assert.deepEqual([powerOf(g, find(g, "m0")!), powerOf(g, find(g, "m1")!), g.players.p2.life], [1, 3, 17], "no prowess; Slickshot's +2/+0 and the Bolt resolve");
  let h = respond("bauble", [], "consign", ["island"]);
  const bauble = h.stack.find((i) => i.kind === "spell")!;
  h = settle(act(h, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: bauble.id }] }));
  assert.equal(h.players.p1.graveyard.some((c) => c.defId === "bauble"), true, "the colorless Bauble is countered");
});

test("Consign to Memory's replicate: pay {1} more for a copy with a target of its own", () => {
  let g = respond("bolt", [{ kind: "player", id: "p2" }], "consign", ["island", "island"]);
  assert.deepEqual(getCastable(g, "p2")[0].replicate, { cost: "{1}", max: 1 });
  const [a, b] = g.stack.filter((i) => i.kind === "ability");
  const r = applyAction(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: a.id }, { kind: "stack", id: b.id }], replicate: 1 });
  assert.ok(r.ok, r.ok ? "" : r.error);
  assert.equal(r.events.filter((e) => e.type === "resolved" && e.name === "Consign to Memory").length, 2, "the spell and its copy");
  g = settle(r.state);
  assert.deepEqual([powerOf(g, find(g, "m0")!), powerOf(g, find(g, "m1")!), g.players.p2.life], [1, 1, 17], "both triggers countered");
  assert.equal(g.players.p2.graveyard.filter((c) => c.defId === "consign").length, 1, "the copy goes nowhere");
});
