import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, legalTargets, parseCard } from "../index.js";
import { bindSpecs, entersTappedNow, kw, powerOf, subtypesOf, toughnessOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the Modern Infect deck that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});
const INFECT = "Infect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  bear: card("bear", "Bear", "creature", "{1}{G}", "Creature — Bear", "", [], { power: 2, toughness: 2 }),
  bolt: card("bolt", "Bolt", "instant", "{R}", "Instant", "Bolt deals 3 damage to any target."),
  elf: card("elf", "Glistener Elf", "creature", "{G}", "Creature — Phyrexian Elf Warrior", INFECT, ["infect"], { power: 1, toughness: 1 }),
  agent: card("agent", "Blighted Agent", "creature", "{1}{U}", "Creature — Phyrexian Human Rogue", `${INFECT}\nThis creature can't be blocked.`, ["infect"], { power: 1, toughness: 1 }),
  hierarch: card("hierarch", "Noble Hierarch", "creature", "{G}", "Creature — Human Druid", "Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.)\n{T}: Add {G}, {W}, or {U}.", ["exalted"], { power: 0, toughness: 1 }),
  rotpriest: card("rotpriest", "Venerated Rotpriest", "creature", "{G}", "Creature — Phyrexian Druid", "Toxic 1 (Players dealt combat damage by this creature also get a poison counter.)\nWhenever a creature you control becomes the target of a spell, target opponent gets a poison counter.", ["toxic"], { power: 1, toughness: 2 }),
  krosa: card("krosa", "Might of Old Krosa", "instant", "{G}", "Instant", "Target creature gets +2/+2 until end of turn. If you cast this spell during your main phase, that creature gets +4/+4 until end of turn instead."),
  vines: card("vines", "Vines of Vastwood", "instant", "{G}", "Instant", "Kicker {G} (You may pay an additional {G} as you cast this spell.)\nTarget creature can't be the target of spells or abilities your opponents control this turn. If this spell was kicked, that creature gets +4/+4 until end of turn.", ["kicker"]),
  groundswell: card("groundswell", "Groundswell", "instant", "{G}", "Instant", "Target creature gets +2/+2 until end of turn.\nLandfall — If you had a land enter the battlefield under your control this turn, that creature gets +4/+4 until end of turn instead.", ["landfall"]),
  pierce: card("pierce", "Spell Pierce", "instant", "{U}", "Instant", "Counter target noncreature spell unless its controller pays {2}."),
  inkmoth: card("inkmoth", "Inkmoth Nexus", "land", "", "Land", "{T}: Add {C}.\n{1}: This land becomes a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect until end of turn. It's still a land. (It deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)"),
  pendelhaven: card("pendelhaven", "Pendelhaven", "land", "", "Legendary Land", "{T}: Add {G}.\n{T}: Target 1/1 creature gets +1/+2 until end of turn."),
  harbor: card("harbor", "Hinterland Harbor", "land", "", "Land", "This land enters tapped unless you control a Forest or an Island.\n{T}: Add {G} or {U}."),
  immense: card("immense", "Become Immense", "instant", "{5}{G}", "Instant", "Delve (Each card you exile from your graveyard while casting this spell pays for {1}.)\nTarget creature gets +6/+6 until end of turn.", ["delve"]),
  rage: card("rage", "Temur Battle Rage", "instant", "{1}{R}", "Instant", "Target creature gains double strike until end of turn.\nFerocious — That creature also gains trample until end of turn if you control a creature with power 4 or greater.", ["ferocious"]),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

/** p1's first main phase with four Forests and four Islands, the cards in hand, and permanents on each side. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("forest"), p2: Array(40).fill("forest") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...["forest", "forest", "forest", "forest", "island", "island", "island", "island"].map((d, i) => perm(`l${i}`, d)), ...mine.map((d, i) => perm(`m${i}`, d))];
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
const cast = (g: GameState, iid: string, targets: unknown[] = [], kicked = false) => settle(act(g, "p1", { type: "castSpell", iid, targets: targets as never, ...(kicked ? { kicked } : {}) }));
const chooseIfAsked = (g: GameState, targets: unknown[]) => (g.pendingChoice ? settle(act(g, g.pendingChoice.player, { type: "chooseTargets", targets: targets as never })) : g);
const attack = (g: GameState, attackers: string[]) => {
  g.phase = "attackers";
  return settle(act(g, "p1", { type: "declareAttackers", attackers }));
};
/** Passes until p2's turn has begun. */
function endTurn(g: GameState): GameState {
  for (let i = 0; i < 30 && g.active === "p1"; i++) g = g.priority ? act(g, g.priority.holder, { type: "passPriority" }) : act(g, g.active, { type: "passPhase" });
  return g;
}

test("every card of the Infect deck that needed new rules is understood", () => {
  for (const id of ["elf", "agent", "hierarch", "rotpriest", "krosa", "vines", "groundswell", "pierce", "inkmoth", "pendelhaven", "harbor", "immense", "rage"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("infect: combat damage to a player is poison counters, and to a creature -1/-1 counters", () => {
  let g = attack(setup([], ["agent"]), ["m0"]);
  assert.equal(g.players.p2.poison, 1);
  assert.equal(g.players.p2.life, 20, "no life is lost");

  let h = setup([], ["elf"], ["bear"]);
  h.phase = "attackers";
  h = settle(act(h, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  h = settle(act(h, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }));
  const bear = find(h, "t0")!;
  assert.equal(bear.minusCounters, 1);
  assert.equal(bear.infected, true, "marked as infected");
  assert.equal(bear.damage, 0);
  assert.equal(toughnessOf(h, bear), 1, "the counter stays after the turn");
  assert.equal(find(h, "m0"), undefined, "the Bear's normal damage kills the Elf");
});

test("a player with ten or more poison counters loses the game", () => {
  const g = setup([], ["agent"]);
  g.players.p2.poison = 9;
  const h = attack(g, ["m0"]);
  assert.equal(h.winner, "p1");
  assert.equal(h.players.p2.life, 20);
});

test("toxic: the player dealt combat damage also gets poison counters", () => {
  const g = attack(setup([], ["rotpriest"]), ["m0"]);
  assert.equal(g.players.p2.life, 19);
  assert.equal(g.players.p2.poison, 1);
});

test("Venerated Rotpriest: a spell targeting a creature you control gives the opponent a poison counter, an ability does not", () => {
  let g = setup(["krosa"], ["rotpriest", "elf", "pendelhaven"]);
  g = chooseIfAsked(cast(g, "h0", [on("m1")]), [{ kind: "player", id: "p2" }]);
  assert.equal(g.players.p2.poison, 1);
  assert.equal(powerOf(g, find(g, "m1")!), 5, "the spell resolved too");

  let h = setup([], ["rotpriest", "elf", "pendelhaven"]);
  h = settle(act(h, "p1", { type: "activateAbility", iid: "m2", index: 0, targets: [on("m1")] }));
  assert.equal(h.players.p2.poison ?? 0, 0);
  assert.equal(toughnessOf(h, find(h, "m1")!), 3, "Pendelhaven's +1/+2");
});

test("exalted: a creature attacking alone gets +1/+1 for each instance", () => {
  const g = attack(setup([], ["hierarch", "hierarch", "agent"]), ["m2"]);
  assert.equal(g.players.p2.poison, 3);
  const h = attack(setup([], ["hierarch", "agent", "agent"]), ["m1", "m2"]);
  assert.equal(h.players.p2.poison, 2, "two attackers: no exalted");
});

test("Inkmoth Nexus becomes a 1/1 flying, infect Phyrexian Blinkmoth artifact creature until end of turn", () => {
  let g = setup([], ["inkmoth"]);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }));
  const moth = find(g, "m0")!;
  assert.equal(moth.crewed, true);
  assert.equal(moth.tapped, false, "another land paid the {1}");
  assert.equal(powerOf(g, moth), 1);
  assert.equal(toughnessOf(g, moth), 1);
  assert.ok(kw(g, moth, "flying") && kw(g, moth, "infect"));
  assert.ok(subtypesOf(g, moth).includes("blinkmoth"));
  assert.equal(legalTargets(g, { kind: "artifact", label: "target artifact" }, "p2").length, 1, "it is an artifact now");
  g = attack(g, ["m0"]);
  assert.equal(g.players.p2.poison, 1);
  g = endTurn(g);
  const land = find(g, "m0")!;
  assert.ok(!land.crewed && !kw(g, land, "infect"), "a land again");
  assert.deepEqual(subtypesOf(g, land), []);
});

test("Inkmoth Nexus played this turn is summoning sick once it becomes a creature", () => {
  let g = setup(["inkmoth"]);
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  g = settle(act(g, "p1", { type: "activateAbility", iid: "h0", index: 0 }));
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["h0"] }).ok, false);
});

test("Vines of Vastwood: the opponent's spells can't target the creature this turn, and kicked it gets +4/+4", () => {
  const bolt = parseCard(DEFS.bolt).spell!.targets[0];
  let g = setup(["vines"], ["elf"]);
  g = cast(g, "h0", [on("m0")], true);
  assert.equal(powerOf(g, find(g, "m0")!), 5);
  assert.ok(!legalTargets(g, bolt, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), "not by the opponent");
  assert.ok(legalTargets(g, bolt, "p1").some((t) => t.kind === "permanent" && t.iid === "m0"), "its own controller still can");

  let h = setup(["vines"], ["elf"]);
  h = cast(h, "h0", [on("m0")]);
  assert.equal(powerOf(h, find(h, "m0")!), 1, "not kicked: no pump");
  h = endTurn(h);
  assert.ok(legalTargets(h, bolt, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), "only this turn");
});

test("Might of Old Krosa gives +4/+4 during your main phase, +2/+2 otherwise", () => {
  let g = setup(["krosa"], ["elf"]);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(powerOf(g, find(g, "m0")!), 5);

  let h = setup(["krosa"], ["elf"]);
  h.phase = "end";
  h = cast(h, "h0", [on("m0")]);
  assert.equal(powerOf(h, find(h, "m0")!), 3);
});

test("Groundswell gives +4/+4 if a land entered under your control this turn, +2/+2 otherwise", () => {
  let g = setup(["groundswell", "groundswell", "forest"], ["elf"]);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(powerOf(g, find(g, "m0")!), 3);
  g = act(g, "p1", { type: "playLand", iid: "h2" });
  g = cast(g, "h1", [on("m0")]);
  assert.equal(powerOf(g, find(g, "m0")!), 7);
});

test("Spell Pierce can target only a noncreature spell", () => {
  const spec = parseCard(DEFS.pierce).spell!.targets[0];
  const withPierce = (g: GameState) => {
    g.players.p2.hand = [{ iid: "p", defId: "pierce", owner: "p2" }];
    g.players.p2.battlefield = [perm("k0", "island", "p2")];
    return g;
  };
  const g = act(withPierce(setup(["bear"])), "p1", { type: "castSpell", iid: "h0" });
  assert.equal(legalTargets(g, spec, "p2").length, 0);
  const h = act(withPierce(setup(["krosa"], ["elf"])), "p1", { type: "castSpell", iid: "h0", targets: [on("m0")] });
  assert.equal(legalTargets(h, spec, "p2").length, 1);
});

test("Pendelhaven can target only a 1/1 creature", () => {
  const g = setup([], ["elf", "rotpriest", "pendelhaven"], ["bear"]);
  const spec = bindSpecs(parseCard(DEFS.pendelhaven).activated![0].targets, "m2")[0];
  assert.deepEqual(legalTargets(g, spec, "p1"), [on("m0")]);
});

test("Hinterland Harbor enters tapped unless you control a Forest or an Island", () => {
  const g = setup([]);
  assert.equal(entersTappedNow(g, "p1", DEFS.harbor), false);
  g.players.p1.battlefield = [perm("x", "inkmoth")];
  assert.equal(entersTappedNow(g, "p1", DEFS.harbor), true);
});

/** p1's graveyard: `n` cards, a creature first and then lands. */
const fillYard = (g: GameState, n: number) => {
  g.players.p1.graveyard = Array.from({ length: n }, (_, i) => ({ iid: `y${i}`, defId: i === 0 ? "elf" : "forest", owner: "p1" }));
};
const tapped = (g: GameState) => g.players.p1.battlefield.filter((p) => p.tapped).length;

test("Become Immense: delve exiles graveyard cards to pay {1} each, lands before creatures", () => {
  let g = setup(["immense"], ["elf"]);
  fillYard(g, 5);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(powerOf(g, find(g, "m0")!), 7);
  assert.equal(g.players.p1.exile.length, 5, "the whole graveyard paid for the {5}");
  assert.equal(tapped(g), 1, "only the {G} came from a land");

  const chosen = setup(["immense"], ["elf"]);
  fillYard(chosen, 5);
  const r = settle(act(chosen, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")], delve: ["y1", "y2"] }));
  assert.equal(r.players.p1.exile.length, 2);
  assert.equal(tapped(r), 4, "{G} and the {3} left");
  assert.deepEqual(r.players.p1.graveyard.map((c) => c.iid).sort(), ["h0", "y0", "y3", "y4"]);

  const auto = setup(["immense"], ["elf"]);
  fillYard(auto, 6);
  const picked = settle(act(auto, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")] }));
  assert.deepEqual(picked.players.p1.graveyard.map((c) => c.iid).sort(), ["h0", "y0"], "the five lands pay, the creature stays");
});

test("Become Immense can be cast with the graveyard paying what the lands can't, and delve is checked", () => {
  const g = setup(["immense"], ["elf"]);
  g.players.p1.battlefield.forEach((p) => p.card.defId !== "forest" && p.card.defId !== "elf" && (p.tapped = true));
  g.players.p1.battlefield.filter((p) => p.card.defId === "forest").slice(1).forEach((p) => (p.tapped = true));
  fillYard(g, 4);
  assert.equal(getCastable(g, "p1").length, 0, "one Forest and four cards can't pay {5}{G}");
  fillYard(g, 6);
  assert.deepEqual(getCastable(g, "p1")[0]?.delve, { min: 5, max: 5, options: ["y1", "y2", "y3", "y4", "y5", "y0"] });

  const all = setup(["immense"], ["elf"]);
  fillYard(all, 6);
  const tooMany = applyAction(all, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")], delve: ["y0", "y1", "y2", "y3", "y4", "y5"] });
  assert.equal(tooMany.ok, false, "delve pays only the generic {5}");
  const notThere = applyAction(all, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")], delve: ["l0"] });
  assert.equal(notThere.ok, false, "only cards in the graveyard");
});

test("Temur Battle Rage: double strike doubles an infect creature's poison; ferocious adds trample", () => {
  let g = setup(["rage"], ["elf", "mountain"]);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(kw(g, find(g, "m0")!, "double strike"), true);
  assert.equal(kw(g, find(g, "m0")!, "trample"), false, "no creature with power 4 or greater");
  g = attack(g, ["m0"]);
  assert.equal(g.players.p2.poison, 2);

  let h = setup(["krosa", "rage"], ["elf", "mountain"]);
  h = cast(h, "h0", [on("m0")]); // +4/+4 in the main phase: a 5/5
  h = cast(h, "h1", [on("m0")]);
  assert.equal(kw(h, find(h, "m0")!, "trample"), true);
});
