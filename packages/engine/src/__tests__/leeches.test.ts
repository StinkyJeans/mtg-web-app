import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, castCostOf, isSupportedCard, parseCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The Leech cards: each one is made from its real rules text, then played.

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost: 1,
  manaCost: "{R}",
  power,
  toughness,
  text,
  keywords: [],
  typeLine: "Creature — Test",
  ...extra,
});
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bear: creature("bear", 2, 2),
  ox: creature("ox", 3, 3),
  sliver: creature("sliver", 0, 2, "Whenever a Sliver you control attacks, defending player loses 1 life.", { name: "Leeching Sliver", typeLine: "Creature — Sliver" }),
  woeleecher: creature("woeleecher", 2, 2, "{R}, {T}: Remove a -1/-1 counter from target creature. If you do, you gain 2 life.", { name: "Woeleecher", typeLine: "Creature — Elemental" }),
  blitz: creature("blitz", 2, 2, "When this creature enters, target creature an opponent controls gets -2/-2 until end of turn. Remove all counters from that creature.", { name: "Blitz Leech", typeLine: "Creature — Leech", manaCost: "{R}" }),
  medic: creature("medic", 1, 1, "When Leech Medic enters the battlefield, create a Leeches token card and put it into your hand. (Leeches is a {1}{W}{W} sorcery from Homelands that reads, \"Target player loses all poison counters. Leeches deals that much damage to that player.\")", { name: "Leech Medic", typeLine: "Creature — Leech Cleric" }),
  swamp: { id: "swamp", name: "Leechridden Swamp", type: "land", cost: 0, typeLine: "Land — Swamp", text: "({T}: Add {B}.)\nThis land enters tapped.\n{R}, {T}: Each opponent loses 1 life. Activate only if you control two or more black permanents." },
  blackbear: creature("blackbear", 2, 2, "", { colors: ["B"] }),
  blackbear2: creature("blackbear2", 2, 2, "", { colors: ["B"] }),
  thoughtleech: { id: "thoughtleech", name: "Thoughtleech", type: "enchantment", cost: 2, manaCost: "{R}{R}", typeLine: "Enchantment", text: "Whenever an Island an opponent controls becomes tapped, you may gain 1 life." },
  isle: { id: "isle", name: "Isle", type: "land", cost: 0, typeLine: "Basic Land — Island", text: "" },
  ublast: { id: "ublast", name: "U Blast", type: "instant", cost: 1, manaCost: "{U}", text: "U Blast deals 0 damage to any target.", colors: ["U"], keywords: [] },
  powerleech: { id: "powerleech", name: "Powerleech", type: "enchantment", cost: 2, manaCost: "{G}{G}", typeLine: "Enchantment", text: "Whenever an artifact an opponent controls becomes tapped or an opponent activates an artifact's ability without {T} in its activation cost, you gain 1 life." },
  widget: { id: "widget", name: "Widget", type: "artifact", cost: 1, manaCost: "{R}", typeLine: "Artifact", text: "{R}: You gain 1 life." },
  warleech: { ...creature("warleech", 0, 0, "Monstrous War-Leech's power and toughness are each equal to the greatest mana value among cards in your graveyard.", { name: "Monstrous War-Leech", typeLine: "Creature — Leech Horror" }), power: undefined, toughness: undefined },
  bigleech: creature("bigleech", 7, 7, "This spell costs {1} less to cast for each Cave you control and each Cave card in your graveyard.\nLifelink", { name: "Gargantuan Leech", typeLine: "Creature — Leech", manaCost: "{7}{B}", cost: 8, keywords: ["lifelink"] }),
  cave: { id: "cave", name: "Cave", type: "land", cost: 0, typeLine: "Land — Cave", text: "" },
  expensive: { id: "expensive", name: "Expensive", type: "sorcery", cost: 4, manaCost: "{4}", text: "You gain 1 life." },
  collector: creature("collector", 2, 1, "Whenever you gain life for the first time each turn, this creature becomes prepared. (While it's prepared, you may cast a copy of its spell. Doing so unprepares it.)\n//\nEach opponent loses 2 life.", {
    name: "Leech Collector // Bloodletting",
    typeLine: "Creature — Human Warlock // Sorcery",
    manaCost: "{R} // {R}",
  }),
  gain: { id: "gain", name: "Gain Life Spell", type: "sorcery", cost: 1, manaCost: "{R}", text: "You gain 1 life.", keywords: [] },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], lands = 4): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
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
/** passes priority, and answers choices the first way, until the game is quiet */
function settle(s: GameState): GameState {
  let g = s;
  for (let i = 0; i < 30 && (g.priority || g.pendingChoice || g.pendingPick); i++) {
    if (g.pendingChoice) g = act(g, g.pendingChoice.player, { type: "chooseTargets", targets: g.pendingChoice.specs.map(() => ({ kind: "permanent", iid: "t0" })) });
    else if (g.pendingPick) g = act(g, g.pendingPick.player, { type: "pick", iid: g.pendingPick.options[0] });
    else g = act(g, g.priority!.holder, { type: "passPriority" });
  }
  return g;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid)!;
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("every Leech text in this file is understood", () => {
  for (const id of ["sliver", "woeleecher", "blitz", "medic", "swamp", "thoughtleech", "powerleech", "warleech", "bigleech", "collector"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Leeching Sliver: when a Sliver you control attacks, the defending player loses 1 life", () => {
  const g = setup([], ["sliver"]);
  g.phase = "attackers";
  const s = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(s.players.p2.life, 19);
});

test("Woeleecher: a -1/-1 counter comes off and its controller gains 2 life, but only if there was one", () => {
  const g = setup([], ["woeleecher"], ["bear"]);
  find(g, "t0").minusCounters = 1;
  const s = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("t0") }));
  assert.equal(find(s, "t0").minusCounters ?? 0, 0);
  assert.equal(s.players.p1.life, 22);
  const h = setup([], ["woeleecher"], ["bear"]);
  const t = settle(act(h, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("t0") }));
  assert.equal(t.players.p1.life, 20);
});

test("Blitz Leech: -2/-2 until end of turn, and every counter on that creature is removed", () => {
  const g = setup(["blitz"], [], ["ox"]);
  find(g, "t0").counters = 2;
  find(g, "t0").minusCounters = 1;
  const s = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  const t0 = find(s, "t0");
  assert.equal(t0.counters ?? 0, 0);
  assert.equal(t0.minusCounters ?? 0, 0);
  assert.equal(powerOf(s, t0), 1); // 3/3, -2/-2 until end of turn
});

test("Leech Medic: a Leeches card is made and put into the hand", () => {
  const s = settle(act(setup(["medic"]), "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(s.players.p1.hand.length, 1);
  assert.equal(s.players.p1.hand[0].defId, "leeches");
  assert.equal(s.cards["leeches"].name, "Leeches");
});

test("Leechridden Swamp: it can only be used while you control two or more black permanents", () => {
  const alone = setup([], ["swamp", "blackbear"]);
  const bad = applyAction(alone, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.equal(bad.ok, false);
  const two = setup([], ["swamp", "blackbear", "blackbear2"]);
  const s = settle(act(two, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }));
  assert.equal(s.players.p2.life, 19);
});

test("Thoughtleech: an opponent tapping an Island for mana gains you 1 life", () => {
  const g = setup([], ["thoughtleech"]);
  g.players.p2.battlefield = [perm("i0", "isle", "p2")];
  g.players.p2.hand = [{ iid: "o0", defId: "ublast", owner: "p2" }];
  g.active = "p2";
  const s = settle(act(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "player", id: "p1" }] }));
  assert.equal(s.players.p1.life, 21);
});

test("Powerleech: an opponent activating an artifact's ability without {T} gains you 1 life", () => {
  const g = setup([], ["powerleech"]);
  g.players.p2.battlefield = [perm("q0", "mountain", "p2"), perm("a0", "widget", "p2")];
  g.active = "p2";
  const s = settle(act(g, "p2", { type: "activateAbility", iid: "a0", index: 0, targets: [] }));
  assert.equal(s.players.p1.life, 21 + 0);
});

test("Monstrous War-Leech: power and toughness are the greatest mana value in your graveyard", () => {
  const g = setup([], ["warleech"]);
  g.players.p1.graveyard = [{ iid: "y0", defId: "expensive", owner: "p1" }, { iid: "y1", defId: "bear", owner: "p1" }];
  assert.equal(powerOf(g, find(g, "m0")), 4);
  assert.equal(toughnessOf(g, find(g, "m0")), 4);
});

test("Gargantuan Leech: costs {1} less for each Cave you control and each Cave card in your graveyard", () => {
  const g = setup(["bigleech"], ["cave"]);
  g.players.p1.graveyard = [{ iid: "y0", defId: "cave", owner: "p1" }];
  const cost = castCostOf(g, "p1", DEFS.bigleech);
  assert.equal(cost?.generic, 5); // {7}{B} less two
});

test("Leech Collector: gaining life for the first time each turn makes it prepared", () => {
  const g = setup(["gain"], ["collector"]);
  assert.ok(parseCard(DEFS.collector).prepare, "the spell half was read");
  const s = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.ok(find(s, "m0").prepared, "it is prepared");
  assert.equal(getCastable(s, "p1").some((c) => c.iid === "m0" && c.zone === "prepared"), true);
});
