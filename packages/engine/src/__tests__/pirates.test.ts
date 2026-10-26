import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, legalTargets, parseCard } from "../index.js";
import { bindSpecs } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the "Pirates" theme deck (Lorwyn Eclipsed) that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});
const creature = (id: string, power: number, toughness: number, manaCost = "{R}", typeLine = "Creature — Bear"): CardDef => card(id, id, "creature", manaCost, typeLine, "", [], { power, toughness });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  island: { id: "island", name: "Island", type: "land", cost: 0, typeLine: "Basic Land — Island" },
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 3, 3, "{2}{R}"),
  hulk: creature("hulk", 5, 5, "{4}{R}"),
  twoDrop: creature("twoDrop", 2, 1, "{1}{R}"),
  bolt: card("bolt", "Bolt", "instant", "{R}", "Instant", "Bolt deals 3 damage to any target."),
  howler: card("howler", "Captain Howler, Sea Scourge", "creature", "{2}{U}{R}", "Legendary Creature — Shark Pirate", "Ward—{2}, Pay 2 life.\nWhenever you discard one or more cards, target creature gets +2/+0 until end of turn for each card discarded this way. Whenever that creature deals combat damage to a player this turn, you draw a card.", ["ward"], { power: 5, toughness: 4 }),
  swash: card("swash", "Fearless Swashbuckler", "creature", "{1}{U}{R}", "Creature — Fish Pirate", "Haste\nVehicles you control have haste.\nWhenever you attack, if a Pirate and a Vehicle attacked this combat, draw three cards, then discard two cards.", ["haste"], { power: 3, toughness: 3 }),
  thrill: card("thrill", "Gastal Thrillroller", "artifact", "{2}{R}", "Artifact — Vehicle", "Trample, haste\nWhen this Vehicle enters, it becomes an artifact creature until end of turn.\nCrew 2\n{2}{R}, Discard a card: Return this card from your graveyard to the battlefield with a finality counter on it. Activate only as a sorcery.", ["trample", "haste", "crew"], { power: 4, toughness: 2 }),
  inti: card("inti", "Inti, Seneschal of the Sun", "creature", "{1}{R}", "Legendary Creature — Human Knight", "Whenever you attack, you may discard a card. When you do, put a +1/+1 counter on target attacking creature. It gains trample until end of turn.\nWhenever you discard one or more cards, exile the top card of your library. You may play that card until your next end step.", [], { power: 2, toughness: 2 }),
  galleon: card("galleon", "Magmatic Galleon", "artifact", "{3}{R}{R}", "Artifact — Vehicle", "When this Vehicle enters, it deals 5 damage to target creature an opponent controls.\nWhenever one or more creatures your opponents control are dealt excess noncombat damage, create a Treasure token.\nCrew 2", ["crew"], { power: 5, toughness: 5 }),
  mako: card("mako", "Marauding Mako", "creature", "{R}", "Creature — Shark Pirate", "Whenever you discard one or more cards, put that many +1/+1 counters on this creature.\nCycling {2} ({2}, Discard this card: Draw a card.)", ["cycling"], { power: 1, toughness: 1 }),
  snare: card("snare", "Spell Snare", "instant", "{U}", "Instant", "Counter target spell with mana value 2."),
  schooner: card("schooner", "Subterranean Schooner", "artifact", "{1}{U}", "Artifact — Vehicle", "Whenever this Vehicle attacks, target creature that crewed it this turn explores. (Reveal the top card of your library. Put that card into your hand if it's a land. Otherwise, put a +1/+1 counter on that creature, then put the card back or put it into your graveyard.)\nCrew 1", ["crew"], { power: 3, toughness: 4 }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

/** p1's first main phase with four Mountains and four Islands, the cards in hand, and permanents on each side (p2 has three Islands). */
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...["mountain", "mountain", "mountain", "mountain", "island", "island", "island", "island"].map((d, i) => perm(`l${i}`, d)), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 3 }, (_, i) => perm(`k${i}`, "island", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const all = (g: GameState) => [...g.players.p1.battlefield, ...g.players.p2.battlefield];
const find = (g: GameState, iid: string) => all(g).find((p) => p.card.iid === iid);
const on = (iid: string) => ({ kind: "permanent" as const, iid });
const settle = (g: GameState) => {
  while (g.priority && !g.pendingChoice && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const cast = (g: GameState, iid: string, targets: unknown[] = []) => settle(act(g, "p1", { type: "castSpell", iid, targets: targets as never }));
const choose = (g: GameState, targets: unknown[]) => settle(act(g, g.pendingChoice!.player, { type: "chooseTargets", targets: targets as never }));
const chooseIfAsked = (g: GameState, targets: unknown[]) => (g.pendingChoice ? choose(g, targets) : g); // a single legal target is chosen by itself
const pick = (g: GameState, iid?: string) => settle(act(g, g.pendingPick!.player, { type: "pick", ...(iid ? { iid } : {}) }));
const attack = (g: GameState, attackers: string[]) => {
  g.phase = "attackers";
  return settle(act(g, "p1", { type: "declareAttackers", attackers }));
};
const top = (g: GameState, defIds: string[]) => (g.players.p1.library = [...defIds.map((d, i) => ({ iid: `top${i}`, defId: d, owner: "p1" as const })), ...g.players.p1.library]);

test("every card of the Pirates deck that needed new rules is understood", () => {
  for (const id of ["howler", "swash", "thrill", "inti", "galleon", "mako", "snare", "schooner"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Marauding Mako gets a +1/+1 counter when another card is cycled", () => {
  let g = setup(["mako", "bear"], ["mako"]);
  g = settle(act(g, "p1", { type: "cycle", iid: "h0" }));
  assert.equal(find(g, "m0")!.counters, 1, "cycling discards a card");
  assert.equal(g.stack.length, 0);
});

test("Fearless Swashbuckler draws three and discards two only when a Pirate and a Vehicle attacked; the discard is one batch", () => {
  let g = setup([], ["swash", "schooner", "mako"]);
  find(g, "m1")!.crewed = true;
  top(g, ["bear", "bear", "bear"]);
  g = attack(g, ["m0", "m1"]);
  assert.equal(g.pendingPick?.kind, "discard");
  assert.equal(g.players.p1.hand.length, 3);
  g = pick(g, g.pendingPick!.options[0]);
  g = pick(g, g.pendingPick!.options[0]);
  assert.equal(g.players.p1.hand.length, 1);
  const mako = g.players.p1.battlefield.find((p) => p.card.defId === "mako")!;
  assert.equal(mako.counters, 2, "one trigger, that many counters");

  let h = setup([], ["swash", "mako"]);
  h = attack(h, ["m0"]);
  assert.equal(h.pendingPick, null, "no Vehicle attacked: nothing happens");
  assert.equal(h.players.p1.hand.length, 0);
});

test("Inti: discarding when you attack puts a counter and trample on an attacker, and the exiled top card can be played until your next end step", () => {
  let g = setup(["bear"], ["inti"]);
  top(g, ["bolt"]);
  g = attack(g, ["m0"]);
  assert.equal(g.pendingPick?.kind, "discard");
  assert.equal(g.pendingPick?.optional, true);
  g = pick(g, "h0");
  while (g.pendingChoice) g = choose(g, [on("m0")]);
  const inti = find(g, "m0")!;
  assert.equal(inti.counters, 1);
  assert.ok(inti.tempKeywords?.includes("trample"));
  assert.ok(g.players.p1.exile.some((c) => c.iid === "top0"), "the top card is exiled");
  g.phase = "main2";
  g.priority = null;
  assert.ok(getCastable(g, "p1").some((c) => c.iid === "top0"), "it can be cast this turn");
  g.phase = "end";
  assert.ok(!getCastable(g, "p1").some((c) => c.iid === "top0"), "not once the end step has begun");
});

test("Inti: declining the discard does nothing", () => {
  let g = setup(["bear"], ["inti"]);
  g = attack(g, ["m0"]);
  g = pick(g);
  assert.equal(g.pendingChoice, null);
  assert.equal(find(g, "m0")!.counters ?? 0, 0);
  assert.equal(g.players.p1.hand.length, 1);
});

test("Captain Howler pumps a creature for each card discarded, and that creature draws a card when it deals combat damage", () => {
  let g = setup(["mako"], ["howler"]);
  g = settle(act(g, "p1", { type: "cycle", iid: "h0" }));
  g = chooseIfAsked(g, [on("m0")]);
  const howler = find(g, "m0")!;
  assert.equal(howler.powerBonus, 2);
  const hand = g.players.p1.hand.length;
  g = attack(g, ["m0"]);
  assert.equal(g.players.p2.life, 13, "7 damage");
  assert.equal(g.players.p1.hand.length, hand + 1, "a card drawn for the combat damage");
});

test("Captain Howler's ward costs both {2} and 2 life", () => {
  const parsed = parseCard(DEFS.howler);
  assert.equal(parsed.ward, "{2}");
  assert.equal(parsed.wardLife, 2);
  let g = setup(["bolt"], [], ["howler"]);
  g = cast(g, "h0", [on("t0")]);
  assert.equal(g.pendingPick?.kind, "ward");
  g = pick(g, "pay");
  assert.equal(g.players.p1.life, 18);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 3, "the Bolt and the {2}");
  assert.equal(find(g, "t0")!.damage, 3, "the Bolt resolved");
});

test("Gastal Thrillroller is a creature the turn it enters, and comes back from the graveyard with a finality counter", () => {
  let g = setup(["thrill", "bear"]);
  g = cast(g, "h0");
  const thrill = find(g, "h0")!;
  assert.equal(thrill.crewed, true, "it became an artifact creature");
  g = attack(g, ["h0"]);
  assert.equal(g.players.p2.life, 16, "haste");

  let h = setup(["bear"]);
  h.players.p1.graveyard = [{ iid: "y0", defId: "thrill", owner: "p1" }];
  h = settle(act(h, "p1", { type: "activateAbility", iid: "y0", index: 0, payWith: "h0" }));
  const back = find(h, "y0")!;
  assert.ok(back, "it returned");
  assert.equal(back.finality, true);
  assert.equal(h.players.p1.hand.length, 0, "a card was discarded");
  h.players.p1.hand = [{ iid: "b", defId: "bolt", owner: "p1" }];
  h = cast(h, "b", [on("y0")]);
  assert.ok(h.players.p1.exile.some((c) => c.iid === "y0"), "with a finality counter it is exiled instead");
});

test("Magmatic Galleon makes a Treasure when an opponent's creature is dealt excess noncombat damage", () => {
  let g = setup(["galleon"], [], ["bear"]);
  g = chooseIfAsked(cast(g, "h0"), [on("t0")]);
  assert.equal(find(g, "t0"), undefined);
  assert.equal(g.players.p1.battlefield.filter((p) => g.cards[p.card.defId]?.name === "Treasure").length, 1, "5 damage to a 2/2: a Treasure");

  let h = setup(["galleon"], [], ["hulk"]);
  h = chooseIfAsked(cast(h, "h0"), [on("t0")]);
  assert.equal(h.players.p1.battlefield.filter((p) => h.cards[p.card.defId]?.name === "Treasure").length, 0, "exactly lethal is not excess");

  let k = setup(["bolt"], ["galleon", "bear"]);
  k = cast(k, "h0", [on("m1")]);
  assert.equal(k.players.p1.battlefield.filter((p) => k.cards[p.card.defId]?.name === "Treasure").length, 0, "only creatures your opponents control count");
});

test("Spell Snare can target only a spell with mana value exactly 2", () => {
  let g = setup(["twoDrop", "ogre"]);
  g.players.p2.hand = [{ iid: "s", defId: "snare", owner: "p2" }];
  const spec = parseCard(DEFS.snare).spell!.targets[0];
  g = act(g, "p1", { type: "castSpell", iid: "h0" });
  assert.equal(legalTargets(g, spec, "p2").length, 1);
  g = act(g, "p2", { type: "castSpell", iid: "s", targets: [{ kind: "stack", id: g.stack[0].id }] });
  g = settle(g);
  assert.equal(find(g, "h0"), undefined, "countered");
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === "h0"));

  let h = setup(["ogre"]);
  h = act(h, "p1", { type: "castSpell", iid: "h0" });
  assert.equal(legalTargets(h, spec, "p2").length, 0, "mana value 3");
});

test("Subterranean Schooner: only a creature that crewed it this turn can explore", () => {
  let g = setup([], ["schooner", "bear", "ogre"]);
  top(g, ["mountain"]);
  g = act(g, "p1", { type: "crew", iid: "m0" });
  g = settle(act(g, "p1", { type: "pick", iid: "m1" }));
  assert.deepEqual(legalTargets(g, bindSpecs(parseCard(DEFS.schooner).triggers[0].targets, "m0")[0], "p1"), [on("m1")], "the Bear crewed it, the Ogre didn't");
  g = chooseIfAsked(attack(g, ["m0"]), [on("m1")]);
  assert.ok(g.players.p1.hand.some((c) => c.iid === "top0"), "the Bear explored a land: it goes to the hand");
});
