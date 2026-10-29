import { test } from "node:test";
import assert from "node:assert/strict";
import { castCostOf, getActivatable, hasKeywordNow, isSupportedCard, legalTargets, powerOf, toughnessOf } from "../index.js";
import { subtypesOf } from "../core.js";
import type { GameState } from "../index.js";
import { act, attackWith, choose, fails, find, hand, named, on, plain, settle, setup } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { GREEN } from "./greenCards.js";

// The Mono-Green Stompy deck (and its sideboard), card by card.

const game = (s: Setup = {}) => setup({ ...s, extra: { ...GREEN, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: [], ...more }));
const use = (g: GameState, iid: string, text: RegExp, more: Record<string, unknown> = {}) => {
  const a = getActivatable(g, "p1").find((x) => x.iid === iid && text.test(x.text));
  assert.ok(a, `no usable ability ${text} on ${iid}`);
  return settle(act(g, "p1", { type: "activateAbility", iid, index: a.index, targets: [], ...more }));
};
const bird = { ...plain("bird", "Bird", "{1}", 1, 1, "Flying", "Creature — Bird"), keywords: ["flying"] };
const pt = (g: GameState, iid: string) => `${powerOf(g, find(g, iid)!)}/${toughnessOf(g, find(g, iid)!)}`;

test("every card of the deck and its sideboard is playable", () => {
  for (const def of Object.values(GREEN)) assert.ok(isSupportedCard(def), def.name);
});

test("Strangleroot Geist: undying brings it back once, with a +1/+1 counter", () => {
  let g = game({ hand: ["dismember", "dismember"], mine: ["strangleroot-geist"] });
  g = cast(g, "h0", { targets: on("m0") });
  assert.equal(pt(g, "m0"), "3/2", "back with a +1/+1 counter");
  g = cast(g, "h1", { targets: on("m0") });
  assert.equal(find(g, "m0"), undefined, "it had a counter: it stays dead");
});

test("Treetop Village: a 3/3 green Ape with trample until end of turn, not an artifact", () => {
  let g = game({ mine: ["treetop-village"] });
  g = use(g, "m0", /becomes a 3\/3/i);
  const village = find(g, "m0")!;
  assert.equal(pt(g, "m0"), "3/3");
  assert.ok(hasKeywordNow(g, village, "trample"));
  assert.ok(subtypesOf(g, village).includes("ape"));
  assert.deepEqual(village.tempColors, ["G"]);
  assert.equal(legalTargets(g, { kind: "artifact", label: "target artifact" }, "p2").some((t) => t.kind === "permanent" && t.iid === "m0"), false);
});

test("Ghalta, Primal Hunger: {X} less, where X is the total power of your creatures", () => {
  const g = game({ hand: ["ghalta"], mine: ["steel-leaf-champion", "llanowar-elves"] });
  assert.deepEqual(castCostOf(g, "p1", g.cards.ghalta), { generic: 4, colored: { G: 2 } }, "10 less 6 (5 + 1)");
  g.players.p1.battlefield.push({ card: { iid: "m9", defId: "steel-leaf-champion", owner: "p1" }, tapped: false, summoningSick: false, damage: 0 });
  assert.deepEqual(castCostOf(g, "p1", g.cards.ghalta), { generic: 0, colored: { G: 2 } }, "never below {G}{G}");
});

test("Garruk's Uprising: trample for your creatures, and a card for each creature with power 4 or greater", () => {
  let g = game({ hand: ["garruks-uprising", "steel-leaf-champion", "llanowar-elves"], mine: ["hooting-mandrills", "noble-hierarch"], lands: 5 });
  g = cast(g, "h0");
  assert.equal(hand(g).length, 3, "a power-4 creature was there as it entered: a card");
  assert.ok(hasKeywordNow(g, find(g, "m1")!, "trample"));
  g = cast(g, "h1");
  assert.equal(hand(g).length, 3, "Steel Leaf Champion (5 power): another card");
  g = cast(g, "h2");
  assert.equal(hand(g).length, 2, "Llanowar Elves (1 power): none");
});

test("Craterhoof Behemoth: trample and +X/+X for each creature you control", () => {
  let g = game({ hand: ["craterhoof-behemoth"], mine: ["llanowar-elves", "noble-hierarch"] });
  g = cast(g, "h0");
  assert.equal(pt(g, "m0"), "4/4", "three creatures: +3/+3");
  assert.ok(hasKeywordNow(g, find(g, "m1")!, "trample"));
});

test("Overwhelming Stampede: +X/+X where X is the greatest power, counted once", () => {
  let g = game({ hand: ["overwhelming-stampede"], mine: ["llanowar-elves", "steel-leaf-champion"] });
  g = cast(g, "h0");
  assert.equal(pt(g, "m0"), "6/6");
  assert.equal(pt(g, "m1"), "10/9");
});

test("Aspect of Hydra: +X/+X where X is your devotion to green", () => {
  let g = game({ hand: ["aspect-of-hydra"], mine: ["steel-leaf-champion", "llanowar-elves"] });
  g = cast(g, "h0", { targets: on("m1") });
  assert.equal(pt(g, "m1"), "5/5", "{G}{G}{G} and {G}: devotion 4");
});

test("Werewolf Pack Leader: a 5/3 with trample that isn't a Human until end of turn", () => {
  let g = game({ mine: ["werewolf-pack-leader"] });
  assert.ok(subtypesOf(g, find(g, "m0")!).includes("human"));
  g = use(g, "m0", /base power and toughness 5\/3/i);
  assert.equal(pt(g, "m0"), "5/3");
  assert.ok(hasKeywordNow(g, find(g, "m0")!, "trample"));
  assert.deepEqual(subtypesOf(g, find(g, "m0")!), ["werewolf"]);
});

test("Ram Through: with trample the excess goes to the creature's controller; without it, nothing does", () => {
  let g = game({ hand: ["ram-through", "ram-through"], mine: ["hooting-mandrills", "steel-leaf-champion"], theirs: ["bear", "bear"] });
  g = cast(g, "h0", { targets: [...on("m0"), ...on("t0")] });
  assert.equal(find(g, "t0"), undefined);
  assert.equal(g.players.p2.life, 18, "4 power, 2 to kill the Bear, 2 trample over");
  g = cast(g, "h1", { targets: [...on("m1"), ...on("t1")] });
  assert.equal(find(g, "t1"), undefined);
  assert.equal(g.players.p2.life, 18, "Steel Leaf Champion has no trample");
});

test("Elder Gargaroth: when it attacks, choose one (here a 3/3 Beast), and vigilance keeps it untapped", () => {
  let g = game({ mine: ["elder-gargaroth"] });
  g = attackWith(g, ["m0"]);
  assert.equal(g.pendingPick?.kind, "mode");
  g = settle(act(g, "p1", { type: "pick", iid: "0" }));
  assert.equal(named(g, "p1", "Beast").length, 1);
  assert.equal(find(g, "m0")!.tapped, false);
});

test("Elder Gargaroth: reach blocks a flyer, and blocking gives its controller a choice too", () => {
  let g = game({ mine: ["bird"], theirs: ["elder-gargaroth"], extra: { bird } });
  g = attackWith(g, ["m0"]);
  g = settle(act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }));
  assert.equal(g.pendingPick?.player, "p2");
  g = settle(act(g, "p2", { type: "pick", iid: "1" }));
  assert.equal(g.players.p2.life, 23, "gained 3 life");
});

test("Kraul Harpooner: gets +1/+0 per creature card in your graveyard and fights a flyer; ground creatures can't be chosen", () => {
  let g = game({ hand: ["kraul-harpooner"], yard: ["bear", "bear"], theirs: ["bird", "bear"], extra: { bird } });
  g = cast(g, "h0");
  assert.ok(g.pendingChoice, "it asks for up to one flyer");
  fails(g, "p1", { type: "chooseTargets", targets: on("t1") });
  g = choose(g, "p1", on("t0"));
  const harpooner = named(g, "p1", "Kraul Harpooner")[0];
  assert.equal(`${powerOf(g, harpooner)}/${toughnessOf(g, harpooner)}`, "5/2");
  assert.equal(find(g, "t0"), undefined, "the Bird is dead");
  assert.equal(harpooner.damage, 1);
});

test("Kraul Harpooner: no flyer chosen, no fight", () => {
  let g = game({ hand: ["kraul-harpooner"], theirs: ["bird"], extra: { bird } });
  g = cast(g, "h0");
  g = choose(g, "p1", [{ kind: "none" }]);
  assert.ok(find(g, "t0"), "the Bird lives");
  assert.equal(named(g, "p1", "Kraul Harpooner")[0].damage, 0);
});
