import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, botAction, CARDS, createGame, getCastable, isSupportedCard, viewFor } from "../index.js";
import { changeLife, exilePlayable, kw, powerOf, subtypesOf, toughnessOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the Standard Izzet Spellementals deck (and its sideboard) that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : /^\{X\}$/.test(s) ? 0 : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  mountain: { id: "mountain", name: "Mountain", type: "land", cost: 0, typeLine: "Basic Land — Mountain" },
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  bear: card("bear", "Bear", "creature", "{1}{G}", "Creature — Bear", "", [], { power: 2, toughness: 2, colors: ["G"] }),
  shield: card("shield", "Shielded Golem", "creature", "{3}", "Creature — Golem", "Prevent all damage that would be dealt to Shielded Golem.", [], { power: 0, toughness: 4 }),
  relic: card("relic", "Relic", "artifact", "{1}", "Artifact", ""),
  anthem: card("anthem", "Glorious Anthem", "enchantment", "{1}{W}{W}", "Enchantment", "Creatures you control get +1/+1.", [], { colors: ["W"] }),
  bolt: card("bolt", "Lightning Bolt", "instant", "{R}", "Instant", "Lightning Bolt deals 3 damage to any target.", [], { colors: ["R"] }),
  draw: card("draw", "Inspiration", "sorcery", "{U}", "Sorcery", "Draw a card.", [], { colors: ["U"] }),
  burst: card("burst", "Burst Lightning", "instant", "{R}", "Instant", "Kicker {4} (You may pay an additional {4} as you cast this spell.)\nBurst Lightning deals 2 damage to any target. If this spell was kicked, it deals 4 damage instead.", ["kicker"], { colors: ["R"] }),
  vents: card("vents", "Steam Vents", "land", "", "Land — Island Mountain", "({T}: Add {U} or {R}.)\nAs Steam Vents enters, you may pay 2 life. If you don't, it enters tapped."),
  verge: card("verge", "Riverpyre Verge", "land", "", "Land", "{T}: Add {R}.\n{T}: Add {U}. Activate only if you control an Island or a Mountain."),
  sunderflock: card("sunderflock", "Sunderflock", "creature", "{7}{U}{U}", "Creature — Elemental", "This spell costs {X} less to cast, where X is the greatest mana value among Elementals you control.\nFlying\nWhen this creature enters, if you cast it, return all non-Elemental creatures to their owners' hands.", ["flying"], { power: 5, toughness: 5, colors: ["U"] }),
  crab: card("crab", "Eddymurk Crab", "creature", "{5}{U}{U}", "Creature — Elemental Crab", "Flash\nThis spell costs {1} less to cast for each instant and sorcery card in your graveyard.\nThis creature enters tapped if it's not your turn.\nWhen this creature enters, tap up to two target creatures.", ["flash"], { power: 5, toughness: 5, colors: ["U"] }),
  stallion: card("stallion", "Colorstorm Stallion", "creature", "{1}{U}{R}", "Creature — Elemental Horse", "Ward {1}, haste\nOpus — Whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn. If five or more mana was spent to cast that spell, create a token that's a copy of this creature.", ["ward", "haste", "opus"], { power: 3, toughness: 3, colors: ["U", "R"] }),
  hearth: card("hearth", "Hearth Elemental // Stoke Genius", "creature", "{5}{R} // {1}{R}", "Creature — Elemental // Sorcery — Adventure", "This spell costs {X} less to cast, where X is the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an Adventure.\n//\nDiscard your hand, then draw two cards. (Then exile this card. You may cast the creature later from exile.)", [], { cost: 6, power: 4, toughness: 5, colors: ["R"] }),
  joke: card("joke", "Impractical Joke", "sorcery", "{R}", "Sorcery", "Damage can't be prevented this turn. Impractical Joke deals 3 damage to up to one target creature or planeswalker.", [], { colors: ["R"] }),
  flow: card("flow", "Flow State", "sorcery", "{1}{U}", "Sorcery", "Look at the top three cards of your library. Put one of them into your hand and the rest on the bottom of your library in any order. If there is an instant card and a sorcery card in your graveyard, instead put two of them into your hand and the rest on the bottom of your library in any order.", [], { colors: ["U"] }),
  stories: card("stories", "Winternight Stories", "sorcery", "{2}{U}", "Sorcery", "Draw three cards. Then discard two cards unless you discard a creature card.\nHarmonize {4}{U} (You may cast this card from your graveyard for its harmonize cost. You may tap a creature you control to reduce that cost by {X}, where X is its power. Then exile this spell.)", ["harmonize"], { colors: ["U"] }),
  charm: card("charm", "Prismari Charm", "instant", "{U}{R}", "Instant", "Choose one —\n• Surveil 2, then draw a card.\n• Prismari Charm deals 1 damage to each of one or two targets.\n• Return target nonland permanent to its owner's hand.", ["surveil"], { colors: ["U", "R"] }),
  getOut: card("getOut", "Get Out", "instant", "{U}{U}", "Instant", "Choose one —\n• Counter target creature or enchantment spell.\n• Return one or two target creatures and/or enchantments you own to your hand.", [], { colors: ["U"] }),
  ral: { id: "ral", name: "Ral, Crackling Wit", type: "planeswalker", cost: 4, manaCost: "{2}{U}{R}", typeLine: "Legendary Planeswalker — Ral", toughness: 4, colors: ["U", "R"], text: "Whenever you cast a noncreature spell, put a loyalty counter on Ral.\n+1: Create a 1/1 blue and red Otter creature token with prowess.\n−3: Draw three cards, then discard two cards.\n−10: Draw three cards. You get an emblem with \"Instant and sorcery spells you cast have storm.\" (Whenever you cast an instant or sorcery spell, copy it for each spell cast before it this turn.)" },
  lynx: card("lynx", "Sunspine Lynx", "creature", "{2}{R}{R}", "Creature — Elemental Cat", "Players can't gain life.\nDamage can't be prevented.\nWhen this creature enters, it deals damage to each player equal to the number of nonbasic lands that player controls.", [], { power: 5, toughness: 4, colors: ["R"] }),
  stock: card("stock", "Stock Up", "sorcery", "{2}{U}", "Sorcery", "Look at the top five cards of your library. Put two of them into your hand and the rest on the bottom of your library in any order.", [], { colors: ["U"] }),
  annul: card("annul", "Annul", "instant", "{U}", "Instant", "Counter target artifact or enchantment spell.", [], { colors: ["U"] }),
  flashfreeze: card("flashfreeze", "Flashfreeze", "instant", "{1}{U}", "Instant", "Counter target red or green spell.", [], { colors: ["U"] }),
  vacuum: card("vacuum", "Ghost Vacuum", "artifact", "{1}", "Artifact", "{T}: Exile target card from a graveyard.\n{6}, {T}, Sacrifice this artifact: Put each creature card exiled with this artifact onto the battlefield under your control with a flying counter on it. Each of them is a 1/1 Spirit in addition to its other types. Activate only as a sorcery."),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
const cards = (owner: PlayerId, prefix: string, defIds: string[]): CardInstance[] => defIds.map((d, i) => ({ iid: `${prefix}${i}`, defId: d, owner }));
const islandsAndMountains = (n: number): string[] => Array.from({ length: n }, (_, i) => (i % 2 ? "mountain" : "island"));

/** p1's first main phase with the lands given (two Islands and two Mountains by default), the cards in hand, and permanents on each side. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = [], lands = islandsAndMountains(4)): GameState {
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
const p2 = { kind: "player" as const, id: "p2" as const };
const settle = (g: GameState) => {
  while (g.priority && !g.pendingChoice && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const cast = (g: GameState, iid: string, targets: unknown[] = [], more: Partial<Extract<Action, { type: "castSpell" }>> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: targets as never, ...more }));
const named = (g: GameState, player: PlayerId, name: string) => g.players[player].battlefield.filter((p) => g.cards[p.card.defId].name === name);

test("every card of the Izzet Spellementals deck and its sideboard that needed new rules is understood", () => {
  for (const id of ["verge", "sunderflock", "crab", "stallion", "hearth", "joke", "flow", "stories", "charm", "getOut", "ral", "lynx", "stock", "annul", "flashfreeze", "vacuum", "burst"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Riverpyre Verge makes {U} only while you control an Island or a Mountain", () => {
  const alone = setup(["draw"], [], [], ["verge"]);
  assert.deepEqual(getCastable(alone, "p1"), [], "on its own it only makes {R}");
  const g = cast(setup(["draw"], [], [], ["verge", "mountain"]), "h0");
  assert.equal(g.players.p1.hand.length, 1, "the Mountain opens the gate");
});

test("Eddymurk Crab: {1} less per instant and sorcery card in the graveyard; flashed in on the opponent's turn it enters tapped and taps two creatures", () => {
  let g = setup(["draw"], ["bear", "stallion"], ["island", "island"]);
  g.players.p2.hand = cards("p2", "o", ["crab"]);
  g.players.p2.graveyard = cards("p2", "y", ["bolt", "bolt", "draw", "draw", "burst"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(getCastable(g, "p2").length, 1, "it costs {U}{U}");
  g = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [] }));
  assert.equal(g.pendingChoice?.player, "p2");
  g = settle(act(g, "p2", { type: "chooseTargets", targets: [on("m0"), on("m1")] }));
  assert.deepEqual([find(g, "o0")?.tapped, find(g, "m0")?.tapped, find(g, "m1")?.tapped], [true, true, true]);

  let h = setup(["crab"], [], ["bear"], islandsAndMountains(7));
  h = cast(h, "h0");
  if (h.pendingChoice) h = settle(act(h, "p1", { type: "chooseTargets", targets: [on("t0"), { kind: "none" }] }));
  assert.deepEqual([find(h, "h0")?.tapped, find(h, "t0")?.tapped], [false, true], "on its controller's own turn it enters untapped");
});

test("Sunderflock costs less for the greatest mana value among your Elementals, and a cast one bounces every non-Elemental creature", () => {
  assert.deepEqual(getCastable(setup(["sunderflock"], ["bear"], [], islandsAndMountains(6)), "p1"), [], "nine mana without an Elemental");
  let g = setup(["sunderflock"], ["stallion", "bear"], ["bear"], islandsAndMountains(6));
  g = cast(g, "h0");
  assert.ok(find(g, "h0"), "{6}: the Stallion's mana value is 3");
  assert.deepEqual([!!find(g, "m0"), !!find(g, "m1"), !!find(g, "t0")], [true, false, false], "the Elemental stays, both Bears go home");
  assert.ok(g.players.p1.hand.some((c) => c.iid === "m1") && g.players.p2.hand.some((c) => c.iid === "t0"), "to their owners' hands");
});

test("Colorstorm Stallion's opus: +1/+1 per instant or sorcery, and a token copy when five or more mana was spent on it", () => {
  let g = setup(["bolt", "burst"], ["stallion"], [], islandsAndMountains(6));
  g = cast(g, "h0", [p2]);
  assert.deepEqual([powerOf(g, find(g, "m0")!), toughnessOf(g, find(g, "m0")!), named(g, "p1", "Colorstorm Stallion").length], [4, 4, 1], "one mana: just the pump");
  g = cast(g, "h1", [p2], { kicked: true });
  const horses = named(g, "p1", "Colorstorm Stallion");
  assert.equal(horses.length, 2, "five mana spent: a token copy");
  const token = horses.find((p) => p.card.iid !== "m0")!;
  assert.deepEqual([powerOf(g, find(g, "m0")!), powerOf(g, token), kw(g, token, "haste")], [5, 3, true], "the copy is a 3/3 with haste");
});

test("Hearth Elemental: Stoke Genius discards the hand and draws two, then the creature is cast from exile for less", () => {
  let g = setup(["hearth", "bolt", "draw"], [], [], islandsAndMountains(6));
  const adventure = getCastable(g, "p1").find((c) => c.iid === "h0" && c.adventure);
  assert.ok(adventure, "the Adventure can be cast from hand");
  g = cast(g, "h0", [], { adventure: true });
  assert.deepEqual(g.players.p1.graveyard.map((c) => c.defId).sort(), ["bolt", "draw"]);
  assert.equal(g.players.p1.hand.length, 2);
  assert.ok(g.players.p1.exile.some((c) => c.iid === "h0"), "on an adventure in exile");
  assert.deepEqual(exilePlayable(g, "p1").map((c) => c.iid), ["h0"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.ok(find(g, "h0"), "{5}{R} less two (an instant and a sorcery): cast with the last four lands");
  assert.equal(g.cards[find(g, "h0")!.card.defId].name, "Hearth Elemental // Stoke Genius");

  const h = setup(["hearth"], [], [], ["mountain", "island", "island"]);
  h.players.p1.graveyard = cards("p1", "y", ["hearth", "draw", "bolt"]);
  assert.ok(getCastable(h, "p1").some((c) => c.iid === "h0" && !c.adventure), "a card with an Adventure in the graveyard counts too");
});

test("a countered Adventure goes to the graveyard, not to exile", () => {
  let g = setup(["hearth"], [], ["island", "island"]);
  g.players.p2.hand = cards("p2", "o", ["flashfreeze"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], adventure: true });
  const spell = g.stack.find((i) => i.kind === "spell")!;
  g = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: spell.id }] }));
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === "h0" && c.defId === "hearth"));
  assert.deepEqual(exilePlayable(g, "p1"), []);
});

test("Impractical Joke: damage can't be prevented this turn, and its target is optional", () => {
  let g = setup(["joke", "bolt"], [], ["shield"]);
  g = cast(g, "h0", [on("t0")]);
  assert.equal(find(g, "t0")?.damage, 3, "the Golem's shield doesn't work this turn");
  g = cast(g, "h1", [on("t0")]);
  assert.equal(find(g, "t0"), undefined, "nor against the Bolt");
  let h = setup(["joke", "bolt"], [], ["shield"]);
  h = cast(h, "h0", [{ kind: "none" }]);
  h = cast(h, "h1", [on("t0")]);
  assert.equal(find(h, "t0")?.damage, 3, "with no target it still stops prevention");
  let k = setup(["bolt"], [], ["shield"]);
  k = cast(k, "h0", [on("t0")]);
  assert.equal(find(k, "t0")?.damage, 0, "without the Joke the damage is prevented");
});

test("Flow State puts one card into the hand, or two with an instant and a sorcery in the graveyard", () => {
  let g = setup(["flow"]);
  g.players.p1.library = cards("p1", "lib", ["bolt", "draw", "bear", "island"]);
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.kind, "revealToHand");
  g = settle(act(g, "p1", { type: "pick", iid: "lib1" }));
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid), ["lib1"]);
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["lib3", "lib0", "lib2"]);

  let h = setup(["flow"]);
  h.players.p1.graveyard = cards("p1", "y", ["bolt", "draw"]);
  h.players.p1.library = cards("p1", "lib", ["bolt", "draw", "bear", "island"]);
  h = cast(h, "h0");
  h = act(h, "p1", { type: "pick", iid: "lib0" });
  assert.equal(h.pendingPick?.kind, "revealToHand", "one more");
  h = settle(act(h, "p1", { type: "pick", iid: "lib2" }));
  assert.deepEqual(h.players.p1.hand.map((c) => c.iid).sort(), ["lib0", "lib2"]);
  assert.deepEqual(h.players.p1.library.map((c) => c.iid), ["lib3", "lib1"]);
});

test("Winternight Stories: draw three, then discard two cards or one creature card", () => {
  let g = setup(["stories"]);
  g.players.p1.library = cards("p1", "lib", ["bear", "bolt", "draw", "island"]);
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.kind, "discard");
  g = settle(act(g, "p1", { type: "pick", iid: "lib0" }));
  assert.equal(g.pendingPick, null, "the creature card is enough");
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid).sort(), ["lib1", "lib2"]);

  let h = setup(["stories"]);
  h.players.p1.library = cards("p1", "lib", ["bear", "bolt", "draw", "island"]);
  h = cast(h, "h0");
  h = act(h, "p1", { type: "pick", iid: "lib1" });
  assert.equal(h.pendingPick?.kind, "discard", "a noncreature card: one more");
  h = settle(act(h, "p1", { type: "pick", iid: "lib2" }));
  assert.deepEqual(h.players.p1.hand.map((c) => c.iid), ["lib0"]);
});

test("harmonize: cast Winternight Stories from the graveyard, tapping a creature to pay {X} of the cost, then exile it", () => {
  const g = setup([], ["stallion", "bear"], [], ["island", "island"]);
  g.players.p1.graveyard = cards("p1", "y", ["stories"]);
  g.players.p1.library = cards("p1", "lib", ["bear", "bolt", "draw"]);
  const option = getCastable(g, "p1").find((c) => c.iid === "y0");
  assert.deepEqual(option?.harmonize, { options: ["m0"], free: false }, "only the Stallion's 3 power makes {4}{U} affordable");
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "y0", targets: [], from: "graveyard" }).ok, false, "two lands can't pay {4}{U}");
  let h = cast(g, "y0", [], { from: "graveyard", harmonizeTap: "m0" });
  assert.equal(find(h, "m0")?.tapped, true);
  h = settle(act(h, "p1", { type: "pick", iid: "lib0" }));
  assert.ok(h.players.p1.exile.some((c) => c.iid === "y0"), "exiled afterwards");
});

test("Prismari Charm deals 1 damage to each of two different targets", () => {
  let g = setup(["charm"], [], ["bear"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", modes: [1], targets: [on("t0"), on("t0")] }).ok, false, "two different targets");
  g = cast(g, "h0", [on("t0"), p2], { modes: [1] });
  assert.deepEqual([find(g, "t0")?.damage, g.players.p2.life], [1, 19]);
  let h = setup(["charm"], [], ["bear"]);
  h = cast(h, "h0", [p2, { kind: "none" }], { modes: [1] });
  assert.equal(h.players.p2.life, 19, "or to just one");
});

test("Get Out counters a creature or enchantment spell, or returns up to two creatures and/or enchantments you own", () => {
  let g = setup(["getOut"], ["bear", "anthem"], ["bear"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", modes: [1], targets: [on("t0")] }).ok, false, "not the opponent's");
  g = cast(g, "h0", [on("m0"), on("m1")], { modes: [1] });
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid).sort(), ["m0", "m1"]);

  let h = setup(["relic"], [], ["island", "island"]);
  h.players.p2.hand = cards("p2", "o", ["getOut", "annul"]);
  h = act(h, "p1", { type: "castSpell", iid: "h0", targets: [] });
  const relic = h.stack.find((i) => i.kind === "spell")!;
  const options = getCastable(h, "p2").map((c) => c.iid);
  assert.deepEqual(options, ["o1"], "Get Out can't counter an artifact spell; Annul can");
  h = settle(act(h, "p2", { type: "castSpell", iid: "o1", targets: [{ kind: "stack", id: relic.id }] }));
  assert.ok(h.players.p1.graveyard.some((c) => c.iid === "h0"));
});

test("Flashfreeze counters only a red or green spell", () => {
  let g = setup(["bolt"], [], ["island", "island"]);
  g.players.p2.hand = cards("p2", "o", ["flashfreeze"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [p2] });
  const bolt = g.stack.find((i) => i.kind === "spell")!;
  g = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: bolt.id }] }));
  assert.equal(g.players.p2.life, 20);
  const h = setup(["draw"], [], ["island", "island"]);
  h.players.p2.hand = cards("p2", "o", ["flashfreeze"]);
  assert.deepEqual(getCastable(act(h, "p1", { type: "castSpell", iid: "h0", targets: [] }), "p2"), [], "a blue spell isn't a legal target");
});

test("Ral gains loyalty from each noncreature spell; its -10 draws three and gives a storm emblem", () => {
  let g = setup(["bolt", "bolt"], ["ral"], [], islandsAndMountains(4));
  find(g, "m0")!.loyalty = 9;
  g = cast(g, "h0", [p2]);
  assert.equal(find(g, "m0")?.loyalty, 10);
  g.players.p1.library = cards("p1", "lib", ["draw", "draw", "draw", "draw"]);
  g = settle(act(g, "p1", { type: "loyalty", iid: "m0", index: 2 }));
  assert.equal(g.players.p1.stormEmblem, true);
  assert.equal(g.players.p1.hand.length, 4);
  g = cast(g, "h1", [p2]);
  assert.equal(g.players.p2.life, 20 - 3 - 3 - 3, "the second spell this turn: one storm copy");
});

test("Sunspine Lynx: nobody gains life, damage can't be prevented, and it hits each player per nonbasic land", () => {
  let g = setup(["lynx", "bolt"], [], ["vents", "shield"], ["vents", "verge", "mountain", "mountain", "mountain"]);
  g = cast(g, "h0");
  assert.deepEqual([g.players.p1.life, g.players.p2.life], [18, 19]);
  changeLife(g, "p1", 5, []);
  assert.equal(g.players.p1.life, 18, "no life gain");
  g = cast(g, "h1", [on("t1")]);
  assert.equal(find(g, "t1")?.damage, 3, "the Golem's shield is off");
});

test("Stock Up puts two of the top five into the hand", () => {
  let g = setup(["stock"]);
  g.players.p1.library = cards("p1", "lib", ["bolt", "draw", "bear", "island", "mountain", "relic"]);
  g = cast(g, "h0");
  g = act(g, "p1", { type: "pick", iid: "lib4" });
  g = settle(act(g, "p1", { type: "pick", iid: "lib1" }));
  assert.deepEqual(g.players.p1.hand.map((c) => c.iid).sort(), ["lib1", "lib4"]);
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["lib5", "lib0", "lib2", "lib3"]);
});

test("Ghost Vacuum exiles graveyard cards, then returns the creature cards it took as 1/1 flying Spirits under your control", () => {
  let g = setup([], ["vacuum"], [], islandsAndMountains(6));
  g.players.p2.graveyard = cards("p2", "y", ["bear", "bolt"]);
  g.players.p1.graveyard = cards("p1", "z", ["sunderflock"]);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [{ kind: "card", iid: "y0" }] }));
  find(g, "m0")!.tapped = false;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [{ kind: "card", iid: "z0" }] }));
  find(g, "m0")!.tapped = false;
  g.players.p1.battlefield.push(perm("m9", "bear"));
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 1, targets: [] }));
  const spirits = [find(g, "y0")!, find(g, "z0")!];
  assert.ok(g.players.p1.battlefield.includes(spirits[0]), "the opponent's Bear is mine now");
  for (const s of spirits) assert.deepEqual([powerOf(g, s), toughnessOf(g, s), kw(g, s, "flying"), subtypesOf(g, s).includes("spirit")], [1, 1, true, true]);
  assert.ok(find(g, "m9"), "Sunderflock wasn't cast: nothing is bounced");
  assert.equal(find(g, "m0"), undefined, "sacrificed");
});

test("the bot casts Stoke Genius, and harmonizes Winternight Stories by tapping a creature", () => {
  const g = setup(["hearth"], [], [], ["mountain", "island"]);
  g.players.p1.library = cards("p1", "lib", ["draw", "draw"]);
  const choice = botAction(viewFor(g, "p1"), "p1");
  assert.ok(choice?.type === "castSpell" && choice.adventure, JSON.stringify(choice));
  const h = setup([], ["stallion"], [], ["island", "island"]);
  h.players.p1.graveyard = cards("p1", "y", ["stories"]);
  const harmonize = botAction(viewFor(h, "p1"), "p1");
  assert.ok(harmonize?.type === "castSpell" && harmonize.from === "graveyard" && harmonize.harmonizeTap === "m0", JSON.stringify(harmonize));
});
