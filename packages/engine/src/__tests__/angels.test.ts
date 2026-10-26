import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, legalTargets, parseManaCost, payMana } from "../index.js";
import { subtypesOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the "Angels" theme deck (Lorwyn Eclipsed) that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});
const creature = (id: string, power: number, toughness: number, typeLine = "Creature — Bear", manaCost = "{W}", text = ""): CardDef => card(id, id, "creature", manaCost, typeLine, text, [], { power, toughness });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  plains: { id: "plains", name: "Plains", type: "land", cost: 0, typeLine: "Basic Land — Plains" },
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 3, 3, "Creature — Ogre", "{2}{R}"),
  goblin: creature("goblin", 1, 1, "Creature — Goblin", "{R}"),
  angelOne: creature("angelOne", 1, 1, "Creature — Angel", "{W}"),
  shield: card("shield", "Shield", "artifact", "{1}", "Artifact", ""),
  bolt: card("bolt", "Bolt", "instant", "{R}", "Instant", "Bolt deals 3 damage to any target."),
  balm: card("balm", "Balm", "instant", "{W}", "Instant", "You gain 2 life."),
  chomping: card("chomping", "Chomping Changeling", "creature", "{2}{G}", "Creature — Shapeshifter", "Changeling (This card is every creature type.)\nWhen this creature enters, destroy up to one target artifact or enchantment.", ["changeling"], { power: 1, toughness: 2 }),
  exemplar: card("exemplar", "Exemplar of Light", "creature", "{2}{W}{W}", "Creature — Angel", "Flying\nWhenever you gain life, put a +1/+1 counter on this creature.\nWhenever you put one or more +1/+1 counters on this creature, draw a card. This ability triggers only once each turn.", ["flying"], { power: 3, toughness: 3 }),
  getLost: card("getLost", "Get Lost", "instant", "{1}{W}", "Instant", "Destroy target creature, enchantment, or planeswalker. Its controller creates two Map tokens. (They're artifacts with \"{1}, {T}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery.\")", ["explore"]),
  giada: card("giada", "Giada, Font of Hope", "creature", "{1}{W}", "Legendary Creature — Angel", "Flying, vigilance\nEach other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control.\n{T}: Add {W}. Spend this mana only to cast an Angel spell.", ["flying", "vigilance"], { power: 2, toughness: 2 }),
  inquisitor: card("inquisitor", "Lightstall Inquisitor", "creature", "{W}", "Creature — Angel Wizard", "Vigilance\nWhen this creature enters, each opponent exiles a card from their hand and may play that card for as long as it remains exiled. Each spell cast this way costs {1} more to cast. Each land played this way enters tapped.", ["vigilance"], { power: 2, toughness: 1 }),
  pawpatch: card("pawpatch", "Pawpatch Recruit", "creature", "{G}", "Creature — Rabbit Warrior", "Offspring {2} (You may pay an additional {2} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.)\nTrample\nWhenever a creature you control becomes the target of a spell or ability an opponent controls, put a +1/+1 counter on target creature you control other than that creature.", ["offspring", "trample"], { power: 2, toughness: 1 }),
  personify: card("personify", "Personify", "instant", "{1}{W}", "Instant", "Exile target creature you control, then return that card to the battlefield under its owner's control. Create a 1/1 colorless Shapeshifter creature token with changeling. (It's every creature type.)"),
  ridesEnd: card("ridesEnd", "Ride's End", "instant", "{4}{W}", "Instant", "This spell costs {3} less to cast if it targets a tapped permanent.\nExile target creature or Vehicle."),
  courtyard: card("courtyard", "Secluded Courtyard", "land", "", "Land", "As this land enters, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type or activate an ability of a creature source of the chosen type."),
  splitUp: card("splitUp", "Split Up", "sorcery", "{1}{W}{W}", "Sorcery", "Choose one —\n• Destroy all tapped creatures.\n• Destroy all untapped creatures."),
  shepherd: card("shepherd", "Starfield Shepherd", "creature", "{3}{W}{W}", "Creature — Angel", "Flying\nWhen this creature enters, search your library for a basic Plains card or a creature card with mana value 1 or less, reveal it, put it into your hand, then shuffle.\nWarp {1}{W} (You may cast this card from your hand for its warp cost. Exile this creature at the beginning of the next end step, then you may cast it from exile on a later turn.)", ["flying", "warp"], { power: 3, toughness: 2 }),
  valkyrie: card("valkyrie", "Youthful Valkyrie", "creature", "{1}{W}", "Creature — Angel", "Flying\nWhenever another Angel you control enters, put a +1/+1 counter on this creature.", ["flying"], { power: 1, toughness: 3 }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1", tapped = false) => ({ card: { iid, defId, owner } as CardInstance, tapped, summoningSick: false, damage: 0 });

/** p1's first main phase with four Plains and four Forests, the cards in hand, and creatures on each side. */
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...["plains", "plains", "plains", "plains", "forest", "forest", "forest", "forest"].map((d, i) => perm(`l${i}`, d)), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 3 }, (_, i) => perm(`k${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
const cast = (g: GameState, iid: string, targets: unknown[] = [], extra: Partial<Extract<Action, { type: "castSpell" }>> = {}) =>
  settle(act(g, "p1", { type: "castSpell", iid, targets: targets as never, ...extra }));
const choose = (g: GameState, targets: unknown[]) => settle(act(g, g.pendingChoice!.player, { type: "chooseTargets", targets: targets as never }));
const chooseIfAsked = (g: GameState, targets: unknown[]) => (g.pendingChoice ? choose(g, targets) : g);
const pick = (g: GameState, iid?: string) => settle(act(g, g.pendingPick!.player, { type: "pick", ...(iid ? { iid } : {}) }));
const tapLands = (g: GameState, untapped: number) => g.players.p1.battlefield.forEach((p, i) => p.card.iid.startsWith("l") && (p.tapped = i >= untapped));

test("every card of the Angels deck that needed new rules is understood", () => {
  for (const id of ["chomping", "exemplar", "getLost", "giada", "inquisitor", "pawpatch", "personify", "ridesEnd", "courtyard", "splitUp", "shepherd"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("Chomping Changeling is every creature type, so it is an Angel entering, and it destroys up to one artifact", () => {
  let g = setup(["chomping"], ["valkyrie"], ["shield"]);
  g = cast(g, "h0");
  g = chooseIfAsked(g, [on("t0")]);
  assert.equal(find(g, "m0")!.counters, 1, "Youthful Valkyrie: another Angel entered");
  assert.equal(find(g, "t0"), undefined, "the artifact is destroyed");
  assert.ok(subtypesOf(g, find(g, "h0")!).includes("angel"));
});

test("Exemplar of Light draws once a turn when it gets counters", () => {
  let g = setup(["balm", "balm"], ["exemplar"]);
  const hand = () => g.players.p1.hand.length;
  g = cast(g, "h0");
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(hand(), 2, "the Balm left, a card was drawn");
  g = cast(g, "h1");
  assert.equal(find(g, "m0")!.counters, 2);
  assert.equal(hand(), 1, "only once each turn");
});

test("Get Lost gives the destroyed creature's controller two Maps, and a Map makes a creature explore", () => {
  let g = setup(["getLost"], ["bear", "valkyrie"], ["ogre"]);
  g = cast(g, "h0", [on("m0")]);
  assert.equal(find(g, "m0"), undefined);
  const maps = g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name === "Map");
  assert.equal(maps.length, 2, "its controller (here the caster) creates them");
  g.players.p1.library[0] = { iid: "top", defId: "bear", owner: "p1" };
  g = settle(act(g, "p1", { type: "activateAbility", iid: maps[0].card.iid, index: 0, targets: [on("m1")] as never }));
  assert.equal(find(g, "m1")!.counters, 1, "a nonland card: the explorer gets a +1/+1 counter");
  assert.equal(find(g, maps[0].card.iid), undefined, "the Map is sacrificed");
});

test("Giada: other Angels enter with a counter for each Angel already there, and her mana only casts Angels", () => {
  let g = setup(["exemplar"], ["giada", "valkyrie"]);
  g = cast(g, "h0");
  const exemplar = g.players.p1.battlefield.find((p) => p.card.defId === "exemplar")!;
  assert.equal(exemplar.counters, 2, "Giada and the Valkyrie were already there");
  assert.equal(g.players.p1.hand.length, 1, "Exemplar of Light got counters: a card is drawn");
  const onlyGiada = setup([], ["giada"]);
  onlyGiada.players.p1.battlefield = onlyGiada.players.p1.battlefield.filter((p) => p.card.defId === "giada");
  assert.equal(payMana(onlyGiada, "p1", parseManaCost("{W}")!, DEFS.angelOne).ok, true);
  assert.equal(payMana(onlyGiada, "p1", parseManaCost("{W}")!, DEFS.bear).ok, false);
});

test("Lightstall Inquisitor: the opponent may play the exiled card, a spell for {1} more and a land tapped", () => {
  let g = setup(["inquisitor"]);
  g.players.p2.hand = [{ iid: "o1", defId: "goblin", owner: "p2" }, { iid: "o2", defId: "mountain", owner: "p2" }];
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.player, "p2", "the opponent chooses");
  g = pick(g, "o1");
  assert.ok(g.players.p2.exile.some((c) => c.iid === "o1"));
  g.active = "p2";
  g.priority = null;
  assert.ok(getCastable(g, "p2").some((c) => c.iid === "o1"), "{R} plus {1}: three Mountains pay for it");
  g.players.p2.battlefield.forEach((p, i) => (p.tapped = i > 0));
  assert.ok(!getCastable(g, "p2").some((c) => c.iid === "o1"), "one Mountain is not enough");

  let h = setup(["inquisitor"]);
  h.players.p2.hand = [{ iid: "o2", defId: "mountain", owner: "p2" }];
  h = pick(cast(h, "h0"), "o2");
  h.active = "p2";
  h.priority = null;
  h = act(h, "p2", { type: "playLand", iid: "o2" });
  assert.equal(find(h, "o2")!.tapped, true, "a land played this way enters tapped");
});

test("Pawpatch Recruit: when an opponent targets one of your creatures, another one gets a +1/+1 counter", () => {
  let g = setup(["balm"], ["pawpatch", "bear"]);
  g.players.p2.hand = [{ iid: "o1", defId: "bolt", owner: "p2" }];
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  if (g.priority?.holder === "p1") g = act(g, "p1", { type: "passPriority" });
  g = act(g, "p2", { type: "castSpell", iid: "o1", targets: [on("m1")] as never });
  g = chooseIfAsked(g, [on("m0")]);
  g = settle(g);
  assert.equal(find(g, "m0")!.counters, 1, "not the targeted creature: the other one");
});

test("Personify flickers a creature and makes a changeling Shapeshifter (an Angel too)", () => {
  let g = setup(["personify"], ["valkyrie", "bear"]);
  g = cast(g, "h0", [on("m1")]);
  const token = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Shapeshifter")!;
  assert.ok(token);
  assert.ok(subtypesOf(g, token).includes("angel"));
  assert.equal(find(g, "m0")!.counters, 1, "the token is another Angel entering");
  assert.ok(g.players.p1.battlefield.some((p) => p.card.defId === "bear"), "the Bear came back");
});

test("Ride's End costs {3} less with a tapped target, and then only tapped targets are offered", () => {
  let g = setup(["ridesEnd"], [], ["ogre", "goblin"]);
  find(g, "t0")!.tapped = true;
  tapLands(g, 2);
  const castable = getCastable(g, "p1").find((c) => c.iid === "h0");
  assert.ok(castable, "{1}{W} is enough for a tapped target");
  assert.deepEqual(legalTargets(g, castable!.specs[0], "p1").map((t) => (t.kind === "permanent" ? t.iid : "")), ["t0"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t1")] as never }).ok, false, "an untapped target costs the full {4}{W}");
  g = cast(g, "h0", [on("t0")]);
  assert.equal(find(g, "t0"), undefined);
  assert.ok(g.players.p2.exile.some((c) => c.iid === "t0"));
});

test("Secluded Courtyard asks for a creature type (the deck's most common first) and its colored mana casts only those", () => {
  let g = setup(["courtyard", "valkyrie", "exemplar", "bear"]);
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  assert.equal(g.pendingPick?.kind, "creatureType");
  assert.equal(g.pendingPick?.options[0], "angel");
  g = pick(g, "angel");
  assert.equal(find(g, "h0")!.chosenType, "angel");
  g.players.p1.battlefield = g.players.p1.battlefield.filter((p) => p.card.iid === "h0");
  assert.equal(payMana(g, "p1", parseManaCost("{W}")!, DEFS.angelOne).ok, true);
  assert.equal(payMana(g, "p1", parseManaCost("{W}")!, DEFS.bear).ok, false);
  assert.equal(payMana(g, "p1", parseManaCost("{1}")!, DEFS.bear).ok, true, "{C} still pays for anything");
});

test("Split Up destroys only the tapped (or only the untapped) creatures", () => {
  let g = setup(["splitUp"], ["bear"], ["ogre", "goblin"]);
  find(g, "m0")!.tapped = true;
  find(g, "t1")!.tapped = true;
  g = cast(g, "h0", [], { modes: [0] });
  assert.equal(find(g, "m0"), undefined);
  assert.equal(find(g, "t1"), undefined);
  assert.ok(find(g, "t0"), "the untapped Ogre stays");
});

test("Starfield Shepherd finds a basic Plains or a creature with mana value 1 or less", () => {
  let g = setup(["shepherd"]);
  g.players.p1.library = [
    { iid: "c1", defId: "goblin", owner: "p1" },
    { iid: "c2", defId: "plains", owner: "p1" },
    { iid: "c3", defId: "ogre", owner: "p1" },
    { iid: "c4", defId: "forest", owner: "p1" },
  ];
  g = cast(g, "h0");
  assert.deepEqual([...g.pendingPick!.options].sort(), ["c1", "c2"]);
  g = pick(g, "c2");
  assert.ok(g.players.p1.hand.some((c) => c.iid === "c2"));
});
