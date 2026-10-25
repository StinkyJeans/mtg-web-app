import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, getCastable, getLegalActions, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string, manaCost = "{R}"): CardDef => ({ id, name: id, type, cost: 1, manaCost, text });
const goblin = (id: string, text = "", extra: Partial<CardDef> = {}) => creature(id, 1, 1, text, { typeLine: "Creature — Goblin", ...extra });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  researcher: goblin("researcher", "When this creature enters, exile the top card of your library. During any turn you attacked with this creature, you may play that card."),
  arcanist: creature("arcanist", 1, 1, "{T}: Add {C}. Spend this mana only to cast an instant or sorcery spell.", { manaCost: "{U}" }),
  muxus: goblin("muxus", "When this creature enters, reveal the top six cards of your library. Put all Goblin creature cards with mana value 5 or less from among them onto the battlefield and the rest on the bottom of your library in a random order.\nWhenever this creature attacks, it gets +1/+1 until end of turn for each other Goblin you control."),
  breath: spell("breath", "instant", "Tap up to two target creatures. Those creatures don't untap during their controller's next untap step."),
  lena: creature("lena", 3, 3, "When this creature enters, create a 1/1 white Soldier creature token for each nontoken creature you control.\nSacrifice this creature: Creatures you control with power less than this creature's power gain indestructible until end of turn.", { name: "Lena, Selfless Champion" }),
  goliath: goblin("goliath", "When this creature enters, create a number of 1/1 red Goblin creature tokens equal to the number of opponents you have.\n{3}{R}, {T}: If a source you control would deal damage to an opponent this turn, it deals double that damage to that player instead.", { keywords: ["double"] }),
  whale: creature("whale", 5, 5, "When this creature enters, each opponent creates a 1/1 red Pirate creature token with \"This token can't block\" and \"Creatures you control attack each combat if able.\"\nSpells your opponents cast that target this creature cost {3} more to cast."),
  bolt: spell("bolt", "instant", "This spell deals 1 damage to any target."),
  bear: creature("bear", 2, 2),
  gob: goblin("gob"),
  bigspell: spell("bigspell", "sorcery", "You gain 1 life.", "{U}"),
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  hbear: creature("hbear", 2, 2, "", { manaCost: "{U}" }),
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
const lib = (g: GameState, defs: string[]) => (g.players.p1.library = defs.map((d, i) => ({ iid: `c${i}`, defId: d, owner: "p1" as const })));
const named = (g: GameState, who: PlayerId, name: string) => g.players[who].battlefield.filter((p) => g.cards[p.card.defId].name === name);

test("the round 4 texts are understood", () => {
  for (const id of ["researcher", "arcanist", "muxus", "breath", "lena", "goliath", "whale"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("exile the top card; play it on a turn you attacked with the creature", () => {
  let g = setup(["researcher"], []);
  lib(g, ["bear", "mountain"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.exile.some((c) => c.iid === "c0"), true);
  assert.equal(getCastable(g, "p1").some((c) => c.iid === "c0"), false, "not before attacking");
  g.players.p1.battlefield.find((p) => p.card.iid === "h0")!.summoningSick = false;
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["h0"] });
  g = settle(g);
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [] }));
  assert.equal(g.phase, "main2");
  const c = getCastable(g, "p1").find((x) => x.iid === "c0");
  assert.ok(c, "castable from exile after attacking");
  assert.equal(c.zone, "exile");
  g = settle(act(g, "p1", { type: "castCreature", iid: "c0" }));
  assert.ok(find(g, "c0"), "it entered the battlefield");
  // a land can be played from exile too
  let l = setup(["researcher"], []);
  lib(l, ["mountain", "bear"]);
  l = settle(act(l, "p1", { type: "castCreature", iid: "h0" }));
  l.players.p1.battlefield.find((p) => p.card.iid === "h0")!.summoningSick = false;
  l.phase = "attackers";
  l = settle(act(l, "p1", { type: "declareAttackers", attackers: ["h0"] }));
  l = settle(act(l, "p2", { type: "declareBlockers", blocks: [] }));
  assert.ok(getLegalActions(l, "p1").some((a) => a.type === "playLand" && a.iid === "c0"));
  l = act(l, "p1", { type: "playLand", iid: "c0" });
  assert.ok(find(l, "c0"));
});

test("mana that can only pay for an instant or sorcery", () => {
  const g = setup(["hbear", "bigspell"], ["arcanist"]);
  // no lands of the right color: only the Arcanist's {C} is available beyond the Mountains
  g.players.p1.battlefield = g.players.p1.battlefield.filter((p) => p.card.iid === "m0");
  g.cards.sorcery2 = spell("sorcery2", "sorcery", "You gain 1 life.", "{C}");
  g.cards.creature2 = creature("creature2", 1, 1, "", { manaCost: "{C}" });
  g.players.p1.hand = [{ iid: "s", defId: "sorcery2", owner: "p1" }, { iid: "c", defId: "creature2", owner: "p1" }];
  const castable = getCastable(g, "p1").map((c) => c.iid);
  assert.equal(castable.includes("s"), true, "the sorcery can use it");
  assert.equal(castable.includes("c"), false, "the creature can not");
});

test("reveal the top six: Goblins go onto the battlefield, the rest to the bottom", () => {
  let g = setup(["muxus"]);
  lib(g, ["gob", "bear", "gob", "mountain", "bear", "mountain", "mountain"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.battlefield.filter((p) => ["c0", "c2"].includes(p.card.iid)).length, 2);
  assert.equal(g.players.p1.library.length, 5);
});

test("tap up to two creatures; they do not untap next time", () => {
  let g = setup(["breath"], [], ["bear", "bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")[0], on("t1")[0]] }));
  assert.equal(find(g, "t0")?.tapped, true);
  assert.equal(find(g, "t0")?.stun, 1);
  assert.equal(find(g, "t1")?.stun, 1);
});

test("sacrifice Lena: creatures with less power gain indestructible", () => {
  let g = setup([], ["lena", "bear", "bear"]);
  g.cards.big = creature("big", 5, 5);
  g.players.p1.battlefield.push(perm("bg", "big"));
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] }));
  assert.equal(find(g, "m0"), undefined, "Lena was sacrificed");
  assert.equal(find(g, "m1")?.tempKeywords?.includes("indestructible"), true, "power 2 is less than Lena's 3");
  assert.equal(find(g, "bg")?.tempKeywords?.includes("indestructible"), undefined, "power 5 is not");
});

test("double damage to an opponent; a token per opponent", () => {
  let g = setup(["goliath"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(named(g, "p1", "Goblin").length, 1, "one opponent: one token");
  g.players.p1.battlefield.find((p) => p.card.iid === "h0")!.summoningSick = false;
  const a = getActivatable(g, "p1").find((x) => x.iid === "h0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "h0", index: a.index, targets: [] }));
  g.cards.shock = spell("shock", "instant", "This spell deals 3 damage to any target.");
  g.players.p1.hand = [{ iid: "z", defId: "shock", owner: "p1" }];
  g.players.p1.battlefield.push(perm("extra1", "mountain"), perm("extra2", "mountain"));
  g = settle(act(g, "p1", { type: "castSpell", iid: "z", targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(g.players.p2.life, 14, "3 damage doubled");
});

test("the opponent's token can't block and all their creatures must attack; targeting tax", () => {
  let g = setup(["whale"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  const pirate = named(g, "p2", "Pirate")[0];
  assert.ok(pirate, "each opponent got a Pirate");
  g.players.p2.battlefield.push(perm("other", "bear", "p2"));
  g.active = "p2";
  g.phase = "attackers";
  g.players.p2.battlefield.forEach((p) => (p.summoningSick = false));
  const r = applyAction(g, "p2", { type: "passPhase" });
  assert.equal(r.ok, false, "they must attack");
  g.players.p2.hand = [{ iid: "z", defId: "bolt", owner: "p2" }];
  g.players.p2.battlefield = g.players.p2.battlefield.filter((p) => !p.card.iid.startsWith("q") || ["q0", "q1"].includes(p.card.iid));
  g.phase = "main1";
  assert.equal(applyAction(g, "p2", { type: "castSpell", iid: "z", targets: on("h0") }).ok, false, "costs 3 more");
  assert.ok(g);
});
