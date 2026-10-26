import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, castCostOf, createGame, getActivatable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The Marvel Beginner Box packs "Captain America Tutorial" and "Villains": real card texts, each effect played.

const card = (id: string, name: string, type: CardDef["type"], manaCost: string, text: string, extra: Partial<CardDef> = {}): CardDef => ({ id, name, type, cost: (manaCost.match(/\{/g) ?? []).length, manaCost, text, ...extra });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  hero: card("hero", "Hero in Training", "creature", "{2}{W}", "When this creature enters, draw a card. If you control another Hero, you gain 2 life.", { power: 2, toughness: 3, typeLine: "Creature — Human Hero", colors: ["W"] }),
  ally: card("ally", "Allied Hero", "creature", "{1}{W}", "", { power: 1, toughness: 1, typeLine: "Creature — Human Hero", colors: ["W"] }),
  shot: card("shot", "Hawkeye's Shot", "sorcery", "{4}{W}", "This spell costs {2} less to cast if it targets a tapped creature.\nExile target creature.", { typeLine: "Sorcery", colors: ["W"] }),
  mockingbird: card("mockingbird", "Mockingbird, Bobbi Morse", "creature", "{3}{W}", "Whenever Mockingbird is dealt damage, put a +1/+1 counter on her. (She must survive the damage to get the counter.)", { power: 2, toughness: 4, typeLine: "Legendary Creature — Human Hero", colors: ["W"] }),
  recruit: card("recruit", "Red Room Recruit", "creature", "{1}{B}", "When this creature enters, it connives. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.)", { power: 2, toughness: 2, typeLine: "Creature — Human Spy Villain", colors: ["B"], keywords: ["connive"] }),
  ninja: card("ninja", "Ninja of the Hand", "creature", "{2}{B}", "Deathtouch\nPower-up — {4}{B}: Each opponent discards a card. Put a +1/+1 counter on this creature. (Activate each power-up ability only once. Reduce the cost by its mana cost if it entered this turn.)", { power: 2, toughness: 2, typeLine: "Creature — Human Ninja Villain", colors: ["B"], keywords: ["deathtouch", "power-up"] }),
  baron: card("baron", "Baron Strucker, HYDRA Overlord", "creature", "{2}{B}", "Villain spells you cast cost {1} less to cast.\nWhenever another Villain you control enters, you may have it connive. Do this only once each turn. (Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on that creature.)", { power: 2, toughness: 3, typeLine: "Legendary Creature — Human Villain", colors: ["B"], keywords: ["connive"] }),
  tombstone: card("tombstone", "Tombstone, Career Criminal", "creature", "{2}{B}", "When Tombstone enters, return target Villain card from your graveyard to your hand.\nVillain spells you cast cost {1} less to cast.", { power: 3, toughness: 3, typeLine: "Legendary Creature — Human Villain", colors: ["B"] }),
  minotaur: card("minotaur", "Minotaur, Roxxon CEO", "creature", "{4}{B}{B}", "Whenever Minotaur, Roxxon CEO or another nontoken creature dies, you create a 2/1 black Villain creature token with menace. (It can't be blocked except by two or more creatures.)", { power: 4, toughness: 4, typeLine: "Legendary Creature — Minotaur Villain", colors: ["B"] }),
  bear: card("bear", "Bear", "creature", "{2}", "", { power: 2, toughness: 2, typeLine: "Creature — Bear", colors: ["G"] }),
  bolt: card("bolt", "Bolt", "instant", "{R}", "Bolt deals 1 damage to any target.", { typeLine: "Instant", colors: ["R"] }),
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

/** p1 has plenty of white, black and red mana, `mine` on the battlefield, `hand` to cast; p2 has `theirs` and a hand of two bears. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.library = Array.from({ length: 5 }, (_, i) => ({ iid: `c${i}`, defId: "plains", owner: "p1" as const }));
  g.players.p2.hand = [{ iid: "oh0", defId: "bear", owner: "p2" }, { iid: "oh1", defId: "bear", owner: "p2" }];
  g.players.p1.battlefield = [
    ...Array.from({ length: 4 }, (_, i) => perm(`pl${i}`, "plains")),
    ...Array.from({ length: 4 }, (_, i) => perm(`sw${i}`, "swamp")),
    ...Array.from({ length: 2 }, (_, i) => perm(`mt${i}`, "mountain")),
    ...mine.map((d, i) => perm(`m${i}`, d)),
  ];
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
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
/** Answers a pick with a card that is not a Red Room Recruit (the test needs the second one to cast). */
const pickSpare = (g: GameState): GameState => act(g, "p1", { type: "pick", iid: g.pendingPick!.options.find((o) => g.players.p1.hand.find((c) => c.iid === o && g.cards[c.defId].name !== "Red Room Recruit"))! });
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("the texts of these eight cards are understood", () => {
  for (const id of ["hero", "shot", "mockingbird", "recruit", "ninja", "baron", "tombstone", "minotaur"]) assert.equal(isSupportedCard(DEFS[id]), true, DEFS[id].name);
});

test("Hero in Training draws a card, and gains 2 life only if you control ANOTHER Hero", () => {
  let g = setup(["hero"], [], []);
  const life = g.players.p1.life;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.hand.length, 1, "drew a card");
  assert.equal(g.players.p1.life, life, "no other Hero: no life");
  let h = setup(["hero"], ["ally"], []);
  h = settle(act(h, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(h.players.p1.life, life + 2, "another Hero: +2 life");
});

test("Hawkeye's Shot costs {2} less only when it targets a tapped creature", () => {
  const g = setup(["shot"], [], ["bear", "bear"]);
  find(g, "t1")!.tapped = true;
  const def = g.cards.shot;
  assert.equal(castCostOf(g, "p1", def, on("t0"))!.generic, 4, "untapped target: full price");
  assert.equal(castCostOf(g, "p1", def, on("t1"))!.generic, 2, "tapped target: {2} less");
});

test("Mockingbird gets a +1/+1 counter each time she is dealt damage and survives", () => {
  let g = setup(["bolt"], ["mockingbird"], []);
  assert.equal(powerOf(g, find(g, "m0")!), 2);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  assert.equal(powerOf(g, find(g, "m0")!), 3, "+1/+1 counter");
  assert.equal(toughnessOf(g, find(g, "m0")!), 5);
});

test("Red Room Recruit connives: draw, discard; a nonland discard gives a +1/+1 counter, a land does not", () => {
  for (const [discard, expected] of [["bear", 3], ["plains", 2]] as const) {
    let g = setup(["recruit", discard], [], []);
    g.players.p1.library[0].defId = "plains";
    g = act(g, "p1", { type: "castCreature", iid: "h0" });
    g = settle(g);
    assert.equal(g.pendingPick?.kind, "discard", "it asks for a discard after drawing");
    assert.equal(g.players.p1.hand.length, 2, "drew one card");
    g = act(g, "p1", { type: "pick", iid: "h1" });
    assert.equal(g.pendingPick, null);
    assert.equal(powerOf(g, find(g, "h0")!), expected, `${discard} discarded`);
  }
});

test("Villain spells cost {1} less with Baron Strucker or Tombstone", () => {
  const g = setup(["recruit", "bear"], ["baron"], []);
  assert.equal(castCostOf(g, "p1", g.cards.recruit)!.generic, 0, "{1}{B} -> {B}");
  assert.equal(castCostOf(g, "p1", g.cards.bear)!.generic, 2, "a Bear is not a Villain");
});

test("Baron Strucker: another Villain entering connives, once each turn", () => {
  let g = setup(["recruit", "recruit"], ["baron"], []);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  // Red Room Recruit's own connive and Baron's give two picks: the first one answers Baron's or its own
  let picks = 0;
  for (let i = 0; i < 6 && (g.pendingPick || g.pendingChoice || g.priority); i++) {
    if (g.pendingPick) {
      g = pickSpare(g);
      picks++;
    } else g = settle(g);
  }
  assert.equal(picks, 2, "Recruit connives by itself, and Baron has it connive again");
  g = settle(act(g, "p1", { type: "castCreature", iid: g.players.p1.hand.find((c) => g.cards[c.defId].name === "Red Room Recruit")!.iid }));
  let more = 0;
  for (let i = 0; i < 6 && (g.pendingPick || g.priority); i++) {
    if (g.pendingPick) {
      g = pickSpare(g);
      more++;
    } else g = settle(g);
  }
  assert.equal(more, 1, "the second Villain this turn only connives by itself: Baron's is once each turn");
});

test("Tombstone returns a Villain card (and only a Villain) from your graveyard to your hand", () => {
  let g = setup(["tombstone"], [], []);
  g.players.p1.graveyard = [
    { iid: "y0", defId: "recruit", owner: "p1" },
    { iid: "y1", defId: "bear", owner: "p1" },
  ];
  g = act(g, "p1", { type: "castCreature", iid: "h0" });
  if (g.pendingChoice) g = act(g, "p1", { type: "chooseTargets", targets: [{ kind: "card", iid: "y0" }] });
  g = settle(g);
  assert.equal(g.players.p1.hand.some((c) => c.iid === "y0"), true, "the Villain came back");
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "y1"), true, "the Bear stayed");
});

test("Minotaur makes a 2/1 menace Villain when a nontoken creature dies, but not for a token", () => {
  let g = setup(["bolt", "bolt"], ["minotaur"], ["bear"]);
  find(g, "t0")!.damage = 1; // one more damage kills the bear
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined, "the bear died");
  const villains = named(g, "p1", "Villain");
  assert.equal(villains.length, 1, "a Villain token");
  assert.equal(powerOf(g, villains[0]), 2);
  assert.equal(toughnessOf(g, villains[0]), 1);
  // the token dies: no new token
  g = settle(act(g, "p1", { type: "castSpell", iid: "h1", targets: on(villains[0].card.iid) }));
  assert.equal(named(g, "p1", "Villain").length, 0, "the token is gone and made none");
});

test("Ninja of the Hand's power-up: {2} the turn it enters, {4}{B} later; only once", () => {
  let g = setup(["ninja"], [], []);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.ok(getActivatable(g, "p1").some((a) => a.iid === "h0"), "usable the turn it enters");
  // pay: with {2} the cost, the rest of the mana is left over
  const before = g.players.p1.battlefield.filter((p) => p.tapped).length;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "h0", index: 0, targets: [] }));
  assert.equal(g.pendingPick?.player, "p2", "the opponent chooses what to discard");
  g = act(g, "p2", { type: "pick", iid: "oh0" });
  const paid = g.players.p1.battlefield.filter((p) => p.tapped).length - before;
  assert.equal(paid, 2, "only {2} was paid the turn it entered");
  assert.equal(g.players.p2.hand.length, 1, "the opponent discarded a card");
  assert.equal(powerOf(g, find(g, "h0")!), 3, "+1/+1 counter");
  assert.equal(getActivatable(g, "p1").some((a) => a.iid === "h0"), false, "only once");
  // a Ninja that has been on the battlefield for a turn costs the full {4}{B}
  const later = setup([], ["ninja"], []);
  later.turn = 5;
  const ability = later.players.p1.battlefield.find((p) => p.card.iid === "m0")!;
  ability.enteredTurn = 2;
  assert.ok(getActivatable(later, "p1").some((a) => a.iid === "m0"), "affordable with 10 lands");
});
