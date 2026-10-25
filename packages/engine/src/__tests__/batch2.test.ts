import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string): CardDef => ({ id, name: id, type, cost: 1, manaCost: "{R}", text });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  digger: spell("digger", "sorcery", "Look at the top four cards of your library. You may reveal a creature card from among them and put it into your hand. Put the rest on the bottom of your library in any order."),
  whitedig: spell("whitedig", "sorcery", "Look at the top three cards of your library. You may reveal a white card from among them and put it into your hand. Put the rest on the bottom of your library in a random order."),
  tutor: spell("tutor", "sorcery", "Search your library for a card, put that card into your hand, then shuffle."),
  wilds: { id: "wilds", name: "Wilds", type: "land", cost: 0, typeLine: "Land", text: "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle." },
  bounce: spell("bounce", "instant", "Return target nonland permanent to its owner's hand."),
  smite: spell("smite", "instant", "Destroy target nonland permanent an opponent controls."),
  negate: spell("negate", "instant", "Counter target noncreature spell."),
  scatter: spell("scatter", "instant", "Counter target creature spell."),
  heal: spell("heal", "sorcery", "You gain 1 life."),
  healer: creature("healer", 1, 1, "Whenever another creature you control enters, you gain 2 life."),
  pester: creature("pester", 1, 1, "Whenever a creature you control with power 2 or less enters, you gain 1 life."),
  airship: creature("airship", 2, 2, "This creature can block only creatures with flying.", { keywords: ["flying"] }),
  pegasus: creature("pegasus", 2, 2, "This creature can't attack or block alone.", { keywords: ["flying"] }),
  flyer: creature("flyer", 2, 2, "", { keywords: ["flying"] }),
  bear: creature("bear", 2, 2),
  giant: creature("giant", 4, 4),
  elf: creature("elf", 1, 1, "", { typeLine: "Creature — Elf Warrior" }),
  trainer: creature("trainer", 1, 1, "{T}: You gain 1 life. Activate only during your turn."),
  swampy: { id: "swampy", name: "Swampy", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
  whitebear: creature("whitebear", 2, 2, "", { colors: ["W"], typeLine: "Creature — Bear" }),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
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
const lib = (g: GameState, defs: string[]) => (g.players.p1.library = defs.map((d, i) => ({ iid: `c${i}`, defId: d, owner: "p1" as const })));
const order = (g: GameState) => g.players.p1.library.map((c) => c.iid);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("the new texts are understood", () => {
  for (const id of ["digger", "whitedig", "tutor", "wilds", "bounce", "smite", "negate", "scatter", "healer", "pester", "airship", "pegasus", "trainer"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("look at the top cards, take a matching one, the rest go to the bottom", () => {
  let g = setup(["digger"]);
  lib(g, ["mountain", "bear", "mountain", "elf", "mountain", "mountain"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.pendingPick?.kind, "revealToHand");
  assert.deepEqual(g.pendingPick?.options, ["c1", "c3"]); // only the creatures
  g = act(g, "p1", { type: "pick", iid: "c3" });
  assert.equal(g.players.p1.hand.some((c) => c.iid === "c3"), true);
  assert.deepEqual(order(g), ["c4", "c5", "c0", "c1", "c2"]); // the other three looked-at cards are at the bottom, in order
});

test("you may take nothing: every looked-at card goes to the bottom", () => {
  let g = setup(["digger"]);
  lib(g, ["bear", "mountain", "mountain", "mountain", "mountain"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  g = act(g, "p1", { type: "pick" });
  assert.equal(g.players.p1.hand.length, 0);
  assert.deepEqual(order(g), ["c4", "c0", "c1", "c2", "c3"]);
});

test("nothing matches: no choice is asked and the cards go to the bottom", () => {
  let g = setup(["whitedig"]);
  lib(g, ["bear", "bear", "bear", "mountain"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.pendingPick, null);
  assert.equal(g.players.p1.library.length, 4);
  assert.equal(order(g)[0], "c3");
});

test("a color word in the filter matches the card's colors", () => {
  let g = setup(["whitedig"]);
  lib(g, ["bear", "whitebear", "bear", "mountain"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.deepEqual(g.pendingPick?.options, ["c1"]);
});

test("search for any card puts it into your hand and shuffles", () => {
  let g = setup(["tutor"]);
  lib(g, ["bear", "elf", "mountain"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.pendingPick?.kind, "searchAny");
  assert.equal(g.pendingPick?.options.length, 3);
  g = act(g, "p1", { type: "pick", iid: "c1" });
  assert.equal(g.players.p1.hand.some((c) => c.iid === "c1"), true);
  assert.equal(g.players.p1.library.length, 2);
});

test("a land that sacrifices itself to fetch a basic land tapped", () => {
  let g = setup([]);
  g.players.p1.battlefield.push(perm("w", "wilds"));
  lib(g, ["swampy", "bear", "mountain"]);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "w", index: 0, targets: [] }));
  assert.equal(g.pendingPick?.kind, "searchLand");
  g = act(g, "p1", { type: "pick", iid: "c0" });
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === "w"), false, "the land was sacrificed");
  assert.equal(g.players.p1.battlefield.find((p) => p.card.iid === "c0")?.tapped, true);
});

test("'activate only during your turn'", () => {
  const g = setup([], ["trainer"]);
  g.active = "p2";
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }).ok, false);
  g.active = "p1";
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }).ok, true);
});

test("return or destroy a nonland permanent, but not a land", () => {
  let g = setup(["bounce"], ["bear"], ["bear"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("q0") }).ok, false, "a land is not a legal target");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(g.players.p2.hand.some((c) => c.iid === "t0"), true);

  let h = setup(["smite"], ["bear"], ["bear"]);
  assert.equal(applyAction(h, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }).ok, false, "only an opponent's permanent");
  h = settle(act(h, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(h.players.p2.graveyard.some((c) => c.iid === "t0"), true);
});

test("counter target creature spell / noncreature spell", () => {
  for (const [counter, cast, works] of [["scatter", "giant", true], ["scatter", "heal", false], ["negate", "heal", true], ["negate", "giant", false]] as const) {
    let g = setup([cast]);
    g.players.p2.hand = [{ iid: "o0", defId: counter, owner: "p2" }];
    g = act(g, "p1", cast === "giant" ? { type: "castCreature", iid: "h0" } : { type: "castSpell", iid: "h0", targets: [] });
    const item = g.stack[g.stack.length - 1];
    if (!item) {
      assert.equal(works, false, `${counter} should have had a target`); // no legal target: the opponent isn't even offered a response
      continue;
    }
    const r = applyAction(g, "p2", { type: "castSpell", iid: "o0", targets: [{ kind: "stack", id: item.id }] });
    assert.equal(r.ok, works, `${counter} on ${cast}`);
  }
});

test("whenever another creature you control enters: lifegain, and the power limit", () => {
  let g = setup(["bear"], ["healer"]);
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.life, 12);
  let small = setup(["bear"], ["pester"]);
  small.players.p1.life = 10;
  small = settle(act(small, "p1", { type: "castCreature", iid: "h0" })); // power 2: counts
  assert.equal(small.players.p1.life, 11);
  let big = setup(["giant"], ["pester"]);
  big.players.p1.life = 10;
  big = settle(act(big, "p1", { type: "castCreature", iid: "h0" })); // power 4: does not
  assert.equal(big.players.p1.life, 10);
});

test("a creature that can block only creatures with flying", () => {
  let g = setup([], [], ["bear", "flyer"]);
  g.players.p1.battlefield.push(perm("ab", "airship"));
  g.phase = "attackers";
  g.active = "p2";
  g = settle(act(g, "p2", { type: "declareAttackers", attackers: ["t0", "t1"] }));
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "ab", attacker: "t0" }] }).ok, false);
  assert.equal(applyAction(g, "p1", { type: "declareBlockers", blocks: [{ blocker: "ab", attacker: "t1" }] }).ok, true);
});

test("a creature that can't attack or block alone", () => {
  const g = setup([], ["pegasus", "bear"]);
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, false);
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1"] }).ok, true);
});
