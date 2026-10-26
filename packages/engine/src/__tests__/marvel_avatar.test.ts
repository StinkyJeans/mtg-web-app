import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, getCyclable, isSupportedCard, legalTargets, powerOf, toughnessOf } from "../index.js";
import { kw } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the Beginner Box decks that were one to three cards short: Avatar (Zuko, Aang) and Marvel (Iron Man).
// Their texts are the real ones; the tests play each effect.

const card = (id: string, name: string, type: CardDef["type"], manaCost: string, text: string, extra: Partial<CardDef> = {}): CardDef => ({ id, name, type, cost: (manaCost.match(/\{/g) ?? []).length, manaCost, text, ...extra });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  zuko: card("zuko", "Zuko, Avatar Hunter", "creature", "{1}{R}", "Reach (This creature can block creatures with flying.)\nWhenever you cast a red spell, create a 2/2 red Soldier creature token.", { power: 2, toughness: 2, typeLine: "Legendary Creature — Human Noble", colors: ["R"], keywords: ["reach"] }),
  ironman: card("ironman", "Iron Man, Tony Stark", "creature", "{2}{R}", "Flying (This creature can't be blocked except by creatures with flying or reach.)\nAttacking creatures you control get +1/+0.\nWhenever you cast a red spell, create a 2/1 colorless Robot Hero artifact creature token with flying.", { power: 2, toughness: 3, typeLine: "Legendary Artifact Creature — Human Hero", colors: ["R"], keywords: ["flying"] }),
  operative: card("operative", "Crimson Operative", "creature", "{1}{R}", "Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)\nWhen this creature enters, exile the top card of your library. Until the end of your next turn, you may play that card.", { power: 2, toughness: 2, typeLine: "Artifact Creature — Human Villain", colors: ["R"], keywords: ["prowess"] }),
  katara: card("katara", "Katara, Heroic Healer", "creature", "{3}{W}", "Lifelink (Damage dealt by this creature also causes you to gain that much life.)\nWhen Katara enters, put a +1/+1 counter on each other creature you control.", { power: 2, toughness: 3, typeLine: "Legendary Creature — Human Warrior Ally", colors: ["W"], keywords: ["lifelink"] }),
  momo: card("momo", "Momo, Rambunctious Rascal", "creature", "{2}{W}", "Flying (This creature can't be blocked except by creatures with flying or reach.)\nWhen Momo enters, he deals 4 damage to target tapped creature an opponent controls.", { power: 2, toughness: 2, typeLine: "Legendary Creature — Lemur Bat Ally", colors: ["W"], keywords: ["flying"] }),
  rings: card("rings", "Razor Rings", "instant", "{1}{W}", "Razor Rings deals 4 damage to target attacking or blocking creature. You gain life equal to the excess damage dealt this way.", { typeLine: "Instant", colors: ["W"] }),
  aang: card("aang", "Aang, the Last Airbender", "creature", "{3}{W}", "Flying\nWhen Aang enters, airbend up to one other target nonland permanent. (Exile it. While it's exiled, its owner may cast it for {2} rather than its mana cost.)\nWhenever you cast a Lesson spell, Aang gains lifelink until end of turn.", { power: 3, toughness: 4, typeLine: "Legendary Creature — Human Avatar Ally", colors: ["W"], keywords: ["flying", "airbend"] }),
  rabaroo: card("rabaroo", "Rabaroo Troop", "creature", "{3}{W}", "Landfall — Whenever a land you control enters, this creature gains flying until end of turn and you gain 1 life.\nPlainscycling {2} ({2}, Discard this card: Search your library for a Plains card, reveal it, put it into your hand, then shuffle.)", { power: 3, toughness: 3, typeLine: "Creature — Rabbit Kangaroo", colors: ["W"], keywords: ["landfall", "plainscycling"] }),
  lesson: card("lesson", "Airbending Lesson", "instant", "{1}{W}", "Airbend target nonland permanent. (Exile it. While it's exiled, its owner may cast it for {2} rather than its mana cost.)\nDraw a card.", { typeLine: "Instant — Lesson", colors: ["W"], keywords: ["airbend"] }),
  bear: card("bear", "Bear", "creature", "{2}", "", { power: 2, toughness: 2, typeLine: "Creature — Bear", colors: ["G"] }),
  bolt: card("bolt", "Bolt", "instant", "{R}", "Bolt deals 1 damage to any target.", { typeLine: "Instant", colors: ["R"] }),
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  wall: card("wall", "Wall", "creature", "{1}{W}", "", { power: 0, toughness: 6, typeLine: "Creature — Wall", colors: ["W"] }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

/** A game where p1 has lots of mana, `mine` on the battlefield and `hand` to cast; p2 has `theirs`. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`pl${i}`, "plains")), ...Array.from({ length: 4 }, (_, i) => perm(`mt${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`q${i}`, "plains", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
const named = (g: GameState, who: PlayerId, name: string) => g.players[who].battlefield.filter((p) => g.cards[p.card.defId].name === name);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const lib = (g: GameState, defs: string[]) => (g.players.p1.library = defs.map((d, i) => ({ iid: `c${i}`, defId: d, owner: "p1" as const })));

test("the texts of these nine cards are understood", () => {
  for (const id of ["zuko", "ironman", "operative", "katara", "momo", "rings", "aang", "rabaroo", "lesson"]) assert.equal(isSupportedCard(DEFS[id]), true, DEFS[id].name);
});

// ───────── "Whenever you cast a red spell" / "a Lesson spell" ─────────

test("Zuko makes a 2/2 red Soldier for each red spell you cast, and only red ones", () => {
  let g = setup(["bolt", "bear", "bolt"], ["zuko"], []);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(named(g, "p1", "Soldier").length, 1, "one red spell, one Soldier");
  const soldier = named(g, "p1", "Soldier")[0];
  assert.equal(powerOf(g, soldier), 2);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h1" })); // a green creature spell
  assert.equal(named(g, "p1", "Soldier").length, 1, "a green spell does not count");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h2", targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(named(g, "p1", "Soldier").length, 2);
});

test("Iron Man makes a 2/1 flying Robot Hero for each red spell, and attackers get +1/+0", () => {
  let g = setup(["bolt"], ["ironman"], []);
  const ironman = find(g, "m0")!;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] }));
  const robots = named(g, "p1", "Robot Hero");
  assert.equal(robots.length, 1);
  assert.equal(powerOf(g, robots[0]), 2);
  assert.equal(toughnessOf(g, robots[0]), 1);
  assert.match(g.cards[robots[0].card.defId].typeLine ?? "", /Artifact/, "an artifact creature token");
  assert.equal(powerOf(g, ironman), 2, "he gets the bonus only while attacking");
  // while it is attacking (the engine would not stop for blocks here: nothing can block a flyer)
  g.phase = "blockers";
  g.combat = { attackers: [{ attacker: "m0", target: "p2", blockers: [] }] } as unknown as GameState["combat"];
  assert.equal(powerOf(g, find(g, "m0")!), 3, "attacking creatures you control get +1/+0");
  assert.equal(powerOf(g, named(g, "p1", "Robot Hero")[0]), 2, "the Robot is not attacking, so it keeps 2");
});

// ───────── counters on every other creature ─────────

test("Katara puts a +1/+1 counter on each other creature you control, not on herself or the opponent's", () => {
  let g = setup(["katara"], ["bear", "bear"], ["bear"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(powerOf(g, find(g, "m0")!), 3);
  assert.equal(powerOf(g, find(g, "m1")!), 3);
  assert.equal(powerOf(g, find(g, "h0")!), 2, "Katara herself gets none");
  assert.equal(powerOf(g, find(g, "t0")!), 2, "nor does the opponent's creature");
});

// ───────── "he deals 4 damage to target tapped creature an opponent controls" ─────────

test("Momo deals 4 damage to a tapped creature an opponent controls (an untapped one is never offered)", () => {
  const g0 = setup(["momo"], [], ["wall", "bear", "bear"]);
  find(g0, "t1")!.tapped = true;
  find(g0, "t2")!.tapped = true; // two tapped bears and an untapped wall
  let g = act(g0, "p1", { type: "castCreature", iid: "h0" });
  assert.ok(g.pendingChoice, "two legal targets: the player chooses");
  const offered = legalTargets(g, g.pendingChoice!.specs[0], "p1").map((t) => (t.kind === "permanent" ? t.iid : ""));
  assert.deepEqual(offered.sort(), ["t1", "t2"], "only the tapped creatures");
  g = settle(act(g, "p1", { type: "chooseTargets", targets: on("t1") }));
  assert.equal(find(g, "t1"), undefined, "the chosen tapped bear took 4 and died");
  assert.ok(find(g, "t2"), "the other tapped bear is fine");
  assert.ok(find(g, "t0"), "the untapped wall is untouched");
});

test("Momo with only one tapped creature to hit: it is chosen for you", () => {
  const g0 = setup(["momo"], [], ["wall", "bear"]);
  find(g0, "t1")!.tapped = true;
  const g = settle(act(g0, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(find(g, "t1"), undefined, "the tapped bear died");
  assert.ok(find(g, "t0"), "the untapped wall is untouched");
});

// ───────── excess damage ─────────

test("Razor Rings: 4 damage to an attacking creature, and life equal to the excess", () => {
  let g = setup(["rings"], [], ["bear"]);
  g.active = "p2";
  g.phase = "blockers";
  // the opponent's bear (2/2) is attacking: 4 damage is 2 more than needed
  g.combat = { attackers: [{ attacker: "t0", target: "p1", blockers: [] }] } as unknown as GameState["combat"];
  const before = g.players.p1.life;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined, "the bear died");
  assert.equal(g.players.p1.life, before + 2, "4 damage to a 2/2 is 2 excess");
});

test("Razor Rings: no excess, no life", () => {
  let g = setup(["rings"], [], ["wall"]);
  g.active = "p2";
  g.phase = "blockers";
  g.combat = { attackers: [{ attacker: "t0", target: "p1", blockers: [] }] } as unknown as GameState["combat"];
  const before = g.players.p1.life;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.ok(find(g, "t0"), "a 0/6 wall survives 4 damage");
  assert.equal(g.players.p1.life, before);
});

// ───────── airbend ─────────

test("Airbending Lesson exiles the permanent and draws; its owner may cast it for {2} from exile", () => {
  let g = setup(["lesson"], [], ["wall"]);
  lib(g, ["plains", "plains"]);
  const handBefore = g.players.p1.hand.length;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined, "the wall is gone from the battlefield");
  assert.equal(g.players.p2.exile.some((c) => c.iid === "t0"), true, "and in exile");
  assert.equal(g.players.p1.hand.length, handBefore - 1 + 1, "cast one card, drew one");
  // its owner (p2) may cast it for {2} instead of {1}{W}, on their own turn
  g.active = "p2";
  g.phase = "main1";
  g.priority = null;
  const castable = getCastable(g, "p2").find((c) => c.iid === "t0");
  assert.ok(castable, "the owner can cast the exiled wall");
  assert.equal(castable.zone, "exile");
  g.players.p2.battlefield = g.players.p2.battlefield.slice(0, 2); // only two lands: {2} is enough, {1}{W} would need a white one
  g = settle(act(g, "p2", { type: "castCreature", iid: "t0" }));
  assert.ok(find(g, "t0"), "it is back on the battlefield");
});

test("Aang airbends up to one OTHER nonland permanent when he enters, and has lifelink after a Lesson", () => {
  let g = setup(["aang", "lesson"], [], ["wall", "bear"]);
  lib(g, ["plains", "plains", "plains"]);
  g = act(g, "p1", { type: "castCreature", iid: "h0" });
  assert.ok(g.pendingChoice, "the enters ability asks for a target");
  const offered = legalTargets(g, g.pendingChoice!.specs[0], "p1").map((t) => (t.kind === "permanent" ? t.iid : ""));
  assert.equal(offered.includes("h0"), false, "Aang himself is not offered: it says OTHER");
  assert.equal(offered.includes("t0"), true);
  g = settle(act(g, "p1", { type: "chooseTargets", targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined, "the wall was airbent");
  assert.ok(find(g, "h0"), "Aang himself stays");
  assert.equal(kw(g, find(g, "h0")!, "lifelink"), false, "no lifelink yet");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h1", targets: on("t1") })); // a Lesson spell
  assert.equal(kw(g, find(g, "h0")!, "lifelink"), true, "casting a Lesson gives Aang lifelink until end of turn");
});

test("a token that is airbent is gone for good", () => {
  let g = setup(["lesson"], [], []);
  g.cards["token-bear"] = { ...DEFS.bear, id: "token-bear" } as CardDef;
  g.players.p2.battlefield.push(perm("tok", "token-bear", "p2"));
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("tok") }));
  assert.equal(find(g, "tok"), undefined);
  assert.equal([...g.players.p1.exile, ...g.players.p2.exile].some((c) => c.iid === "tok"), false, "a token does not stay in exile");
});

// ───────── plainscycling ─────────

test("Plainscycling {2}: discard it, search the library for a Plains card (nothing else is offered)", () => {
  let g = setup(["rabaroo"]);
  lib(g, ["bear", "plains", "mountain"]);
  assert.ok(getCyclable(g, "p1").some((c) => c.iid === "h0"), "it can be cycled");
  g = settle(act(g, "p1", { type: "cycle", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "searchAny");
  assert.deepEqual(g.pendingPick!.options, ["c1"], "only the Plains is offered, not the Mountain or the Bear");
  g = act(g, "p1", { type: "pick", iid: "c1" });
  assert.deepEqual(g.players.p1.hand.map((c) => g.cards[c.defId].name), ["Plains"]);
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true, "Rabaroo Troop went to the graveyard");
});

test("Rabaroo Troop: landfall gives it flying and 1 life", () => {
  let g = setup(["plains"], ["rabaroo"]);
  const before = g.players.p1.life;
  g = settle(act(g, "p1", { type: "playLand", iid: "h0" }));
  assert.equal(g.players.p1.life, before + 1);
});

// ───────── "until the end of your next turn, you may play that card" ─────────

test("Crimson Operative exiles the top card; it can be played this turn and on the next turn of yours, then no more", () => {
  let g = setup(["operative"]);
  lib(g, ["bear", "plains"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.exile.some((c) => c.iid === "c0"), true, "the bear is exiled");
  assert.ok(getCastable(g, "p1").some((c) => c.iid === "c0"), "playable this turn");
  // the end of this turn, then the opponent's turn: still playable, but only on my turns
  g.turn += 1;
  g.active = "p2";
  assert.equal(getCastable(g, "p1").some((c) => c.iid === "c0"), false, "not castable during the opponent's turn (a creature is a sorcery-speed card)");
  g.turn += 1;
  g.active = "p1";
  g.phase = "main1";
  assert.ok(getCastable(g, "p1").some((c) => c.iid === "c0"), "still playable on my next turn");
  g.turn += 2;
  assert.equal(getCastable(g, "p1").some((c) => c.iid === "c0"), false, "after the end of that next turn it is lost");
});
