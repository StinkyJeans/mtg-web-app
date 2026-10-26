import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, legalTargets, powerOf, staticEffectsOn, toughnessOf } from "../index.js";
import { kw as kwOf, subtypesOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the "Eerie" theme deck (Secrets of Strixhaven) that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : s === "{X}" ? 0 : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});
const creature = (id: string, power: number, toughness: number, typeLine = "Creature — Bear", text = "", keywords: string[] = []): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{W}", power, toughness, typeLine, text, keywords });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 4, 4),
  angelLord: creature("angelLord", 1, 1, "Creature — Angel", "Other Angels you control get +1/+1."),
  bolt: card("bolt", "Bolt", "instant", "{W}", "Instant", "Bolt deals 3 damage to any target."),
  smash: card("smash", "Smash", "instant", "{W}", "Instant", "Destroy target enchantment."),
  murder: card("murder", "Murder", "instant", "{W}", "Instant", "Destroy target creature."),
  pacify: card("pacify", "Pacify", "enchantment", "{W}", "Enchantment — Aura", "Enchant creature\nEnchanted creature can't attack or block.", ["enchant"]),
  tracker: card("tracker", "Entity Tracker", "creature", "{2}{U}", "Creature — Human Scout", "Flash\nEerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, draw a card.", ["flash", "eerie"], { power: 2, toughness: 3 }),
  tamer: card("tamer", "Gremlin Tamer", "creature", "{W}{U}", "Creature — Human Scout", "Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, create a 1/1 red Gremlin creature token.", ["eerie"], { power: 2, toughness: 2 }),
  scavenger: card("scavenger", "Optimistic Scavenger", "creature", "{W}", "Creature — Human Scout", "Eerie — Whenever an enchantment you control enters and whenever you fully unlock a Room, put a +1/+1 counter on target creature.", ["eerie"], { power: 1, toughness: 1 }),
  armor: card("armor", "Ethereal Armor", "enchantment", "{W}", "Enchantment — Aura", "Enchant creature\nEnchanted creature gets +1/+1 for each enchantment you control and has first strike.", ["enchant"]),
  rescue: card("rescue", "Shardmage's Rescue", "enchantment", "{W}", "Enchantment — Aura", "Flash\nEnchant creature you control\nAs long as this Aura entered this turn, enchanted creature has hexproof.\nEnchanted creature gets +1/+1.", ["enchant", "flash"]),
  ghosts: card("ghosts", "Sheltered by Ghosts", "enchantment", "{1}{W}", "Enchantment — Aura", "Enchant creature you control\nWhen this Aura enters, exile target nonland permanent an opponent controls until this Aura leaves the battlefield.\nEnchanted creature gets +1/+0 and has lifelink and ward {2}.", ["enchant"]),
  destiny: card("destiny", "Angelic Destiny", "enchantment", "{2}{W}{W}", "Enchantment — Aura", "Enchant creature\nEnchanted creature gets +4/+4, has flying and first strike, and is an Angel in addition to its other types.\nWhen enchanted creature dies, return this card to its owner's hand.", ["enchant"]),
  maze: card("maze", "Lost in the Maze", "enchantment", "{X}{U}{U}", "Enchantment", "Flash\nWhen this enchantment enters, tap X target creatures. Put a stun counter on each of those creatures you don't control. (If a permanent with a stun counter would become untapped, remove one from it instead.)\nTapped creatures you control have hexproof.", ["flash"]),
  innocence: card("innocence", "Enduring Innocence", "creature", "{1}{W}{W}", "Enchantment Creature — Sheep Glimmer", "Lifelink\nWhenever one or more other creatures you control with power 2 or less enter, draw a card. This ability triggers only once each turn.\nWhen Enduring Innocence dies, if it was a creature, return it to the battlefield under its owner's control. It's an enchantment. (It's not a creature.)", ["lifelink"], { power: 2, toughness: 1 }),
  creeper: card("creeper", "Silent Hallcreeper", "creature", "{1}{U}", "Enchantment Creature — Horror", "This creature can't be blocked.\nWhenever this creature deals combat damage to a player, choose one that hasn't been chosen —\n• Put two +1/+1 counters on this creature.\n• Draw a card.\n• This creature becomes a copy of another target creature you control.", [], { power: 1, toughness: 1 }),
  laureate: card("laureate", "Quill-Blade Laureate // Twofold Intent", "creature", "{1}{W} // {1}{W}", "Creature — Human Cleric // Sorcery", "Double strike\nThis creature enters prepared. (While it's prepared, you may cast a copy of its spell. Doing so unprepares it.)\n//\nTarget creature gets +1/+0 and gains double strike until end of turn.", ["prepared", "double strike"], { power: 1, toughness: 1, cost: 2 }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], land = "plains"): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: 6 }, (_, i) => perm(`l${i}`, land)), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 3 }, (_, i) => perm(`k${i}`, "plains", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
const cast = (g: GameState, iid: string, targets: ReturnType<typeof on>[] = [], extra: Partial<Extract<Action, { type: "castSpell" }>> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets, ...extra }));

test("every card of the Eerie deck that needed new rules is understood", () => {
  for (const id of ["tracker", "tamer", "scavenger", "armor", "rescue", "ghosts", "destiny", "maze", "innocence", "creeper", "laureate"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("eerie: an enchantment entering under your control triggers it, a creature or the opponent's enchantment doesn't", () => {
  let g = setup(["pacify", "bear"], ["tracker", "tamer", "scavenger"], ["ogre"]);
  const hand = g.players.p1.hand.length;
  g = cast(g, "h0", [on("t0")]);
  // the Scavenger's counter needs a target: it is asked for
  if (g.pendingChoice) g = settle(act(g, "p1", { type: "chooseTargets", targets: [on("m0")] }));
  assert.equal(g.players.p1.hand.length, hand - 1 + 1); // Pacify left the hand, the Tracker drew one
  assert.equal(g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Gremlin").length, 1);
  assert.equal(find(g, "m0")!.counters, 1);
  // a creature entering does nothing
  const before = g.players.p1.hand.length;
  g = cast(g, "h1");
  assert.equal(g.players.p1.hand.length, before - 1);
  // an enchantment entering under the opponent's control does nothing for you
  const o = setup([], ["tracker"], []);
  o.players.p2.hand = [{ iid: "x0", defId: "pacify", owner: "p2" }];
  o.active = "p2";
  const mine = o.players.p1.hand.length;
  const after = settle(act(o, "p2", { type: "castSpell", iid: "x0", targets: [on("m0")] }));
  assert.equal(after.players.p1.hand.length, mine);
});

test("Ethereal Armor: +1/+1 for each enchantment you control, and first strike", () => {
  let g = setup(["armor", "pacify"], ["bear"], ["ogre"]);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(powerOf(g, find(g, "m0")!), 3);
  assert.equal(kwOf(g, find(g, "m0")!, "first strike"), true);
  g = cast(g, "h1", [on("t0")]); // a second enchantment you control
  assert.equal(powerOf(g, find(g, "m0")!), 4);
  assert.equal(toughnessOf(g, find(g, "m0")!), 4);
});

test("Shardmage's Rescue: hexproof only during the turn it entered, +1/+1 for good", () => {
  let g = setup(["rescue"], ["bear"]);
  g = cast(g, "h0", [on("m0")]);
  const spec = { kind: "creature" as const, label: "target creature" };
  assert.equal(legalTargets(g, spec, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), false);
  assert.equal(powerOf(g, find(g, "m0")!), 3);
  g.turn += 1;
  assert.equal(legalTargets(g, spec, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), true);
  assert.equal(powerOf(g, find(g, "m0")!), 3);
});

test("Sheltered by Ghosts: exiles until it leaves, and gives +1/+0, lifelink and ward {2}", () => {
  let g = setup(["ghosts", "smash"], ["bear"], ["ogre"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")] });
  g = settle(g);
  assert.equal(find(g, "t0"), undefined);
  const bear = find(g, "m0")!;
  assert.equal(powerOf(g, bear), 3);
  assert.equal(kwOf(g, bear, "lifelink"), true);
  assert.equal(staticEffectsOn(g, bear).find((st) => st.ward)?.ward, "{2}");
  // the opponent targets it: ward triggers
  g.players.p2.hand = [{ iid: "x0", defId: "bolt", owner: "p2" }];
  g.active = "p2";
  g = act(g, "p2", { type: "castSpell", iid: "x0", targets: [on("m0")] });
  assert.ok(g.stack.some((i) => i.kind === "ability" && i.text === "Ward {2}"));
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "ward");
  g = settle(act(g, "p2", { type: "pick" })); // not paid: the Bolt is countered
  assert.ok(find(g, "m0"));
  // the Aura leaves: the Ogre comes back
  g.active = "p1";
  g.phase = "main1";
  g = cast(g, "h1", [on(g.players.p1.battlefield.find((p) => p.card.defId === "ghosts")!.card.iid)]);
  assert.ok(find(g, "t0"));
});

test("Angelic Destiny: +4/+4, flying, first strike, an Angel too; back to the hand when the creature dies", () => {
  let g = setup(["destiny", "murder"], ["bear", "angelLord"]);
  g = cast(g, "h0", [on("m0")]);
  const bear = find(g, "m0")!;
  assert.equal(powerOf(g, bear), 2 + 4 + 1); // the Angel lord counts it as an Angel
  assert.equal(kwOf(g, bear, "flying"), true);
  assert.equal(kwOf(g, bear, "first strike"), true);
  g = cast(g, "h1", [on("m0")]);
  assert.equal(find(g, "m0"), undefined);
  assert.ok(g.players.p1.hand.some((c) => c.defId === "destiny"));
  assert.ok(!g.players.p1.graveyard.some((c) => c.defId === "destiny"));
});

test("Lost in the Maze: taps X different creatures, stuns the opponent's, and your tapped creatures have hexproof", () => {
  let g = setup(["maze"], ["bear"], ["ogre", "bear"], "island");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [], x: 2 }));
  assert.ok(g.pendingChoice);
  assert.equal(g.pendingChoice!.specs.length, 2);
  assert.equal(applyAction(g, "p1", { type: "chooseTargets", targets: [on("t0"), on("t0")] }).ok, false); // two different ones
  g = settle(act(g, "p1", { type: "chooseTargets", targets: [on("t0"), on("m0")] }));
  assert.equal(find(g, "t0")!.tapped, true);
  assert.equal(find(g, "t0")!.stun, 1);
  assert.equal(find(g, "m0")!.tapped, true);
  assert.equal(find(g, "m0")!.stun, undefined); // not on your own
  assert.equal(legalTargets(g, { kind: "creature", label: "target creature" }, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), false);
  // X = 0: nothing to tap, no trigger
  const z = settle(act(setup(["maze"], ["bear"], [], "island"), "p1", { type: "castSpell", iid: "h0", targets: [], x: 0 }));
  assert.equal(z.pendingChoice, null);
});

test("Enduring Innocence: draws once a turn, and comes back as an enchantment that is not a creature", () => {
  let g = setup(["bear", "bear", "murder", "smash"], ["innocence"]);
  const hand = g.players.p1.hand.length;
  g = cast(g, "h0");
  g = cast(g, "h1");
  assert.equal(g.players.p1.hand.length, hand - 2 + 1); // only once this turn
  g = cast(g, "h2", [on("m0")]);
  const back = find(g, "m0")!;
  assert.ok(back, "it returned");
  assert.equal(g.cards[back.card.defId].type, "enchantment");
  assert.equal(legalTargets(g, { kind: "creature", label: "target creature" }, "p1").some((t) => t.kind === "permanent" && t.iid === "m0"), false);
  // as an enchantment it is destroyed for good, and is its printed self in the graveyard
  g = cast(g, "h3", [on("m0")]);
  assert.equal(find(g, "m0"), undefined);
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === "m0" && c.defId === "innocence"));
});

test("Silent Hallcreeper: each mode once, and it can become a copy that keeps its counters", () => {
  let g = setup([], ["creeper", "ogre"]);
  const attack = (s: GameState) => {
    s.phase = "attackers";
    return settle(act(s, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  };
  g = attack(g);
  assert.equal(g.pendingPick?.kind, "mode");
  assert.deepEqual(g.pendingPick!.options, ["0", "1", "2"]);
  g = settle(act(g, "p1", { type: "pick", iid: "0" }));
  assert.equal(find(g, "m0")!.counters, 2);
  // next combat: the counters mode is gone
  g.combat = null;
  find(g, "m0")!.tapped = false;
  g = attack(g);
  assert.deepEqual(g.pendingPick!.options, ["1", "2"]);
  g = act(g, "p1", { type: "pick", iid: "2" });
  if (g.pendingChoice) g = act(g, "p1", { type: "chooseTargets", targets: [on("m1")] });
  g = settle(g);
  const copy = find(g, "m0")!;
  assert.equal(g.cards[copy.card.defId].name, "ogre");
  assert.equal(powerOf(g, copy), 4 + 2);
  // it dies as an Ogre, and is a Silent Hallcreeper in the graveyard
  g.phase = "main1";
  g.combat = null;
  g.players.p1.hand = [{ iid: "h9", defId: "murder", owner: "p1" }];
  g = cast(g, "h9", [on("m0")]);
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === "m0" && c.defId === "creeper"));
});

test("Quill-Blade Laureate: enters prepared, and a copy of Twofold Intent can be cast once", () => {
  let g = setup(["laureate"], ["bear"]);
  g = cast(g, "h0");
  const laureate = find(g, "h0")!;
  assert.ok(laureate.prepared);
  assert.equal(kwOf(g, laureate, "double strike"), true);
  assert.deepEqual(subtypesOf(g, laureate), ["human", "cleric"]); // the spell's "Sorcery" is not one of its types
  const option = getCastable(g, "p1").find((c) => c.zone === "prepared");
  assert.equal(option?.iid, "h0");
  g = cast(g, "h0", [on("m0")], { from: "prepared" });
  assert.equal(powerOf(g, find(g, "m0")!), 3);
  assert.equal(kwOf(g, find(g, "m0")!, "double strike"), true);
  assert.equal(find(g, "h0")!.prepared, undefined);
  assert.equal(g.players.p1.graveyard.length, 0); // a copy goes nowhere
  assert.equal(getCastable(g, "p1").some((c) => c.zone === "prepared"), false);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0")], from: "prepared" }).ok, false);
});
