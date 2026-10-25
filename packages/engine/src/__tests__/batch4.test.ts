import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getActivatable, getCyclable, isSupportedCard, playerToAct, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string): CardDef => ({ id, name: id, type, cost: 1, manaCost: "{R}", text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  feast: spell("feast", "sorcery", "Create a Food token."),
  detective: spell("detective", "sorcery", "Investigate."),
  rebirth: { id: "rebirth", name: "Rebirth", type: "instant", cost: 1, manaCost: "{R}", text: "You gain 1 life.\nBasic landcycling {1}", keywords: ["basic landcycling"] },
  grind: spell("grind", "sorcery", "Mill three cards."),
  freeze: spell("freeze", "sorcery", "Tap target creature an opponent controls and put a stun counter on it."),
  sneak: spell("sneak", "sorcery", "Target creature can't be blocked this turn."),
  light: { id: "light", name: "Light", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment", text: "When this enchantment enters, exile target nonland permanent an opponent controls until this enchantment leaves the battlefield." },
  smash: spell("smash", "instant", "Destroy target enchantment."),
  grower: creature("grower", 1, 1, "Whenever you draw your second card each turn, put a +1/+1 counter on this creature."),
  impulse: spell("impulse", "instant", "Look at the top four cards of your library. Put one of them into your hand and the rest on the bottom of your library in any order."),
  waker: creature("waker", 5, 5, "{1}{R}, discard this card: Look at the top two cards of your library. Put one of them into your hand and the other into your graveyard."),
  ghoul: creature("ghoul", 2, 2, "{1}{R}, exile this card from your graveyard: You gain 5 life."),
  looter: creature("looter", 1, 1, "{1}, discard a card: Draw a card."),
  cauldron: { id: "cauldron", name: "Cauldron", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "{1}, {T}, Sacrifice a creature: You gain 1 life and draw a card." },
  bonus: creature("bonus", 1, 1, "Whenever you draw a card, you gain 1 life. This ability triggers only once each turn."),
  bear: creature("bear", 2, 2),
  elf: creature("elf", 1, 1, "", { typeLine: "Creature — Elf Warrior" }),
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 5 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
  while (g.priority && !g.pendingPick && !g.pendingChoice) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const lib = (g: GameState, defs: string[]) => (g.players.p1.library = defs.map((d, i) => ({ iid: `c${i}`, defId: d, owner: "p1" as const })));

test("the new texts are understood", () => {
  for (const id of ["feast", "detective", "rebirth", "grind", "freeze", "sneak", "light", "grower", "impulse", "waker", "ghoul", "looter", "cauldron", "bonus"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Food: create it, then sacrifice it to gain 3 life", () => {
  let g = setup(["feast"]);
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  const food = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Food");
  assert.ok(food, "a Food token exists");
  const ability = getActivatable(g, "p1").find((a) => a.iid === food.card.iid);
  assert.ok(ability, "it can be activated");
  g = settle(act(g, "p1", { type: "activateAbility", iid: food.card.iid, index: ability.index, targets: [] }));
  assert.equal(g.players.p1.life, 13);
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === food.card.iid), false, "the token was sacrificed");
});

test("Clue: investigate, then pay 2 and sacrifice it to draw", () => {
  let g = setup(["detective"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  const clue = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Clue");
  assert.ok(clue);
  const library = g.players.p1.library.length;
  const ability = getActivatable(g, "p1").find((a) => a.iid === clue.card.iid)!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: clue.card.iid, index: ability.index, targets: [] }));
  assert.equal(g.players.p1.library.length, library - 1);
});

test("basic landcycling: discard it and fetch a basic land", () => {
  let g = setup(["rebirth"]);
  lib(g, ["bear", "forest", "elf"]);
  assert.equal(getCyclable(g, "p1").length, 1);
  g = settle(act(g, "p1", { type: "cycle", iid: "h0" }));
  assert.equal(g.pendingPick?.kind, "searchAny");
  g = act(g, "p1", { type: "pick", iid: "c1" });
  assert.equal(g.players.p1.hand.some((c) => c.iid === "c1"), true);
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true);
});

test("you mill three cards", () => {
  let g = setup(["grind"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.players.p1.graveyard.length, 1 + 3); // the spell and three milled cards
});

test("a stun counter: tapped now, and it skips its next untap", () => {
  let g = setup(["freeze"], [], ["bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "t0")?.tapped, true);
  assert.equal(find(g, "t0")?.stun, 1);
  // the opponent's turn comes: their untap step removes the counter instead of untapping
  for (let i = 0; i < 12 && g.active === "p1"; i++) g = settle(act(g, playerToAct(g), { type: "passPhase" }));
  assert.equal(g.active, "p2");
  assert.equal(find(g, "t0")?.tapped, true, "still tapped");
  assert.equal(find(g, "t0")?.stun ?? 0, 0, "the counter is used up");
});

test("can't be blocked this turn", () => {
  let g = setup(["sneak"], ["bear"], ["bear"]);
  g.players.p1.hand = [{ iid: "h0", defId: "sneak", owner: "p1" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);
});

test("exile until this leaves the battlefield: Banishing Light style", () => {
  let g = setup(["light"], [], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = settle(g);
  if (g.pendingChoice) g = act(g, "p1", { type: "chooseTargets", targets: on("t0") });
  g = settle(g);
  assert.equal(find(g, "t0"), undefined, "the Bear is exiled");
  assert.equal(g.players.p2.exile.some((c) => c.iid === "t0"), true);
  // destroy the enchantment: the Bear comes back
  g.cards.smash = DEFS.smash;
  g.players.p1.hand = [{ iid: "s0", defId: "smash", owner: "p1" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "s0", targets: on("h0") }));
  assert.equal(find(g, "t0")?.card.owner, "p2", "the Bear is back on the battlefield");
  assert.equal(g.players.p2.exile.some((c) => c.iid === "t0"), false);
});

test("whenever you draw your second card each turn", () => {
  let g = setup([], ["grower"]);
  lib(g, ["bear", "bear", "bear", "bear"]);
  g.players.p1.drawnThisTurn = 0;
  g.cards.draw2 = spell("draw2", "sorcery", "Draw two cards.");
  g.players.p1.hand = [{ iid: "d0", defId: "draw2", owner: "p1" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "d0", targets: [] }));
  assert.equal(find(g, "m0")?.counters, 1, "the second card drawn this turn triggered it once");
});

test("look at the top four, put one into your hand, the rest on the bottom", () => {
  let g = setup(["impulse"]);
  lib(g, ["bear", "elf", "bear", "elf", "forest"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.pendingPick?.kind, "revealToHand");
  assert.equal(g.pendingPick?.optional, false, "you must take one");
  assert.equal(g.pendingPick?.options.length, 4);
  g = act(g, "p1", { type: "pick", iid: "c2" });
  assert.deepEqual(g.players.p1.library.map((c) => c.iid), ["c4", "c0", "c1", "c3"]);
});

test("an ability from the hand: discard this card", () => {
  let g = setup(["waker"]);
  lib(g, ["bear", "elf", "forest"]);
  const a = getActivatable(g, "p1").find((x) => x.iid === "h0");
  assert.ok(a, "it can be used from the hand");
  g = settle(act(g, "p1", { type: "activateAbility", iid: "h0", index: a.index, targets: [] }));
  assert.equal(g.pendingPick?.kind, "revealToHand");
  g = act(g, "p1", { type: "pick", iid: "c0" });
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true, "discarded as a cost");
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "c1"), true, "the other card goes to the graveyard");
});

test("an ability from the graveyard: exile this card", () => {
  let g = setup([]);
  g.players.p1.graveyard = [{ iid: "gy", defId: "ghoul", owner: "p1" }];
  g.players.p1.life = 10;
  const a = getActivatable(g, "p1").find((x) => x.iid === "gy");
  assert.ok(a);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "gy", index: a.index, targets: [] }));
  assert.equal(g.players.p1.life, 15);
  assert.equal(g.players.p1.exile.some((c) => c.iid === "gy"), true);
});

test("costs that need a card: discard a card, sacrifice a creature", () => {
  let g = setup(["bear"], ["looter"]);
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  assert.deepEqual(a.costChoices, ["h0"]);
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] }).ok, false, "a card must be chosen");
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [], payWith: "h0" }));
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true);
  assert.equal(g.players.p1.library.length, library - 1);

  let h = setup([], ["cauldron", "bear", "elf"]);
  const b = getActivatable(h, "p1").find((x) => x.iid === "m0")!;
  assert.deepEqual(b.costChoices?.sort(), ["m1", "m2"]);
  h.players.p1.life = 10;
  h = settle(act(h, "p1", { type: "activateAbility", iid: "m0", index: b.index, targets: [], payWith: "m2" }));
  assert.equal(h.players.p1.life, 11);
  assert.equal(find(h, "m2"), undefined, "the elf was sacrificed");
});

test("this ability triggers only once each turn", () => {
  let g = setup([], ["bonus"]);
  lib(g, ["bear", "bear", "bear"]);
  g.cards.draw2 = spell("draw2", "sorcery", "Draw two cards.");
  g.players.p1.hand = [{ iid: "d0", defId: "draw2", owner: "p1" }];
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "castSpell", iid: "d0", targets: [] }));
  assert.equal(g.players.p1.life, 11, "two cards drawn, one trigger");
});

// ───────── cost reduction, drawn-this-turn statics, attack triggers, becomes-target, artifact tokens ─────────

const MORE: Record<string, CardDef> = {
  zap: { id: "zap", name: "Zap", type: "instant", cost: 3, manaCost: "{2}{R}", text: "Zap costs {2} less to cast if you control a Wizard.\nZap deals 3 damage to any target." },
  wizard: creature("wizard", 1, 1, "", { typeLine: "Creature — Human Wizard" }),
  eye: creature("eye", 1, 1, "This creature gets +2/+2 as long as you've drawn two or more cards this turn."),
  ghost: creature("ghost", 2, 2, "This creature can't be blocked as long as you've drawn two or more cards this turn."),
  battle: creature("battle", 2, 2, "Battalion — Whenever this creature and at least two other creatures attack, put a +1/+1 counter on this creature."),
  intel: { id: "intel", name: "Intel", type: "enchantment", cost: 2, manaCost: "{1}{U}", typeLine: "Enchantment", text: "Whenever you attack with two or more creatures, draw a card." },
  shy: creature("shy", 1, 1, "When this creature becomes the target of a spell or ability, sacrifice it."),
  gadget: spell("gadget", "sorcery", "Create a 1/1 colorless Thopter artifact creature token with flying."),
  bolt: spell("bolt", "instant", "Bolt deals 2 damage to any target."),
};

function more(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = setup(hand, mine, theirs);
  g.cards = { ...g.cards, ...MORE };
  return g;
}

test("the last group of texts is understood", () => {
  for (const id of ["zap", "eye", "ghost", "battle", "intel", "shy", "gadget"]) assert.equal(isSupportedCard(MORE[id]), true, id);
});

test("costs less to cast if you control a Wizard", () => {
  const without = more(["zap"]);
  without.players.p1.battlefield = without.players.p1.battlefield.slice(0, 2); // only two lands: {2}{R} is too much
  assert.equal(applyAction(without, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] }).ok, false);
  const withWizard = more(["zap"], ["wizard"]);
  withWizard.players.p1.battlefield = [...withWizard.players.p1.battlefield.slice(0, 1), ...withWizard.players.p1.battlefield.slice(5)]; // one land and the Wizard
  const g = settle(act(withWizard, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(g.players.p2.life, 17);
});

test("as long as you've drawn two or more cards this turn", () => {
  let g = more(["bolt"], ["eye", "ghost"]);
  const stat = (iid: string) => {
    const p = find(g, iid)!;
    return [powerOf(g, p), toughnessOf(g, p)];
  };
  assert.deepEqual(stat("m0"), [1, 1]);
  g.players.p1.drawnThisTurn = 2;
  assert.deepEqual(stat("m0"), [3, 3]);
  // unblockable only while the condition holds
  g.players.p2.battlefield.push(perm("blk", "bear", "p2"));
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m1"] }));
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "blk", attacker: "m1" }] }).ok, false);
});

test("battalion needs three attackers; 'whenever you attack with two or more' draws", () => {
  let g = more([], ["battle", "bear", "bear", "intel"]);
  g.phase = "attackers";
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1", "m2"] }));
  assert.equal(find(g, "m0")?.counters, 1, "battalion");
  assert.equal(g.players.p1.library.length, library - 1, "attacked with two or more: drew a card");
  let h = more([], ["battle", "bear", "intel"]);
  h.phase = "attackers";
  h = settle(act(h, "p1", { type: "declareAttackers", attackers: ["m0", "m1"] }));
  assert.equal(find(h, "m0")?.counters, undefined, "only two attackers: no battalion");
});

test("when this becomes the target of a spell or ability, sacrifice it", () => {
  let g = more(["bolt"], [], ["shy"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(find(g, "t0"), undefined);
  assert.equal(g.players.p2.graveyard.some((c) => c.iid === "t0"), true);
});

test("an artifact creature token: Thopter", () => {
  let g = more(["gadget"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  const thopter = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Thopter");
  assert.ok(thopter);
  assert.match(g.cards[thopter.card.defId].typeLine ?? "", /Artifact Creature/);
  assert.deepEqual(g.cards[thopter.card.defId].keywords, ["flying"]);
});
