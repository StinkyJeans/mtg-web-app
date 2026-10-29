import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, getActivatable, hasKeywordNow, isSupportedCard, parseCard, powerOf, toughnessOf } from "../index.js";
import { subtypesOf } from "../core.js";
import type { GameState } from "../index.js";
import { act, choose, find, named, on, plain, settle, setup, toNextTurn } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { VAMP } from "./vampCards.js";

// The Vampire Supreme deck (and its sideboard), card by card.

const game = (s: Setup = {}) => setup({ ...s, extra: { ...VAMP, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: [], ...more }));
const loyalty = (g: GameState, iid: string, index: number, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "loyalty", iid, index, ...more }));
const pick = (g: GameState, iid?: string) => settle(act(g, g.pendingPick!.player, { type: "pick", ...(iid ? { iid } : {}) }));
const use = (g: GameState, iid: string, text: RegExp, more: Record<string, unknown> = {}) => {
  const a = getActivatable(g, "p1").find((x) => x.iid === iid && text.test(x.text));
  assert.ok(a, `no usable ability ${text} on ${iid}`);
  return settle(act(g, "p1", { type: "activateAbility", iid, index: a.index, targets: [], ...more }));
};

test("every card of the deck and its sideboard is playable", () => {
  for (const def of Object.values(VAMP)) assert.ok(isSupportedCard(def), def.name);
});

test("Knight of the Ebon Legion: pumps to 4/5 with deathtouch", () => {
  let g = game({ mine: ["knight-of-the-ebon-legion"] });
  g = use(g, "m0", /\+3\/\+3/);
  const knight = find(g, "m0")!;
  assert.equal(powerOf(g, knight), 4);
  assert.equal(toughnessOf(g, knight), 5);
  assert.ok(hasKeywordNow(g, knight, "deathtouch"));
});

test("Knight of the Ebon Legion: a +1/+1 counter at your end step only if a player lost 4 or more life this turn", () => {
  let g = game({ mine: ["knight-of-the-ebon-legion"] });
  g.players.p2.lifeLostThisTurn = 3;
  g = toNextTurn(g, "p2");
  assert.ok(!find(g, "m0")!.counters, "3 life isn't enough");
  g = toNextTurn(g, "p1");
  g.players.p2.lifeLostThisTurn = 4;
  g = toNextTurn(g, "p2");
  assert.equal(find(g, "m0")!.counters, 1);
});

test("Sorin, Imperious Bloodlord +1: deathtouch and lifelink, and a +1/+1 counter only on a Vampire", () => {
  let g = game({ mine: ["sorin-imperious-bloodlord", "vampire-nighthawk", "bear"] });
  find(g, "m0")!.loyalty = 4;
  g = loyalty(g, "m0", 0, { targets: on("m1") });
  assert.equal(find(g, "m1")!.counters, 1);
  find(g, "m0")!.loyaltyUsed = false;
  g = loyalty(g, "m0", 0, { targets: on("m2") });
  assert.ok(hasKeywordNow(g, find(g, "m2")!, "deathtouch"));
  assert.ok(hasKeywordNow(g, find(g, "m2")!, "lifelink"));
  assert.ok(!find(g, "m2")!.counters, "the Bear isn't a Vampire");
  assert.equal(find(g, "m0")!.loyalty, 6);
});

test("Sorin, Imperious Bloodlord +1: sacrifice a Vampire to deal 3 damage and gain 3 life", () => {
  let g = game({ mine: ["sorin-imperious-bloodlord", "vampire-of-the-dire-moon", "bear"], theirs: ["bear"] });
  find(g, "m0")!.loyalty = 4;
  g = loyalty(g, "m0", 1);
  assert.deepEqual(g.pendingPick!.options, ["m1"], "only the Vampire can be sacrificed");
  g = pick(g, "m1");
  g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "m1"), undefined);
  assert.equal(find(g, "t0"), undefined);
  assert.equal(g.players.p1.life, 23);
});

test("Sorin, Imperious Bloodlord −3: puts a Vampire of any mana value from your hand onto the battlefield", () => {
  let g = game({ mine: ["sorin-imperious-bloodlord"], hand: ["olivia-voldaren", "bear"] });
  find(g, "m0")!.loyalty = 4;
  g = loyalty(g, "m0", 2);
  assert.deepEqual(g.pendingPick!.options, ["h0"]);
  g = pick(g, "h0");
  assert.equal(named(g, "p1", "Olivia Voldaren").length, 1);
  assert.equal(find(g, "m0")!.loyalty, 1);
});

test("Olivia Voldaren: pings another creature, makes it a Vampire and grows", () => {
  let g = game({ mine: ["olivia-voldaren"], theirs: ["giant"] });
  g = use(g, "m0", /1 damage/, { targets: on("t0") });
  assert.equal(find(g, "t0")!.damage, 1);
  assert.ok(subtypesOf(g, find(g, "t0")!).includes("vampire"));
  assert.equal(find(g, "m0")!.counters, 1);
});

test("Olivia Voldaren: steals a Vampire for as long as you control her", () => {
  let g = game({ mine: ["olivia-voldaren"], theirs: ["bear", "vampire-nighthawk"], hand: ["terminate"] });
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: getActivatable(g, "p1").find((x) => x.iid === "m0" && /gain control/.test(x.text))!.index, targets: on("t0") }).ok, false, "the Bear isn't a Vampire");
  g = use(g, "m0", /gain control/, { targets: on("t1") });
  assert.equal(named(g, "p1", "Vampire Nighthawk").length, 1);
  g = toNextTurn(g, "p1");
  assert.equal(named(g, "p1", "Vampire Nighthawk").length, 1, "still hers on the next turn");
  g = cast(g, "h0", { targets: on("m0") });
  assert.equal(named(g, "p2", "Vampire Nighthawk").length, 1, "back to its owner once Olivia is gone");
});

test("Cordial Vampire: each creature that dies puts a +1/+1 counter on each of your Vampires", () => {
  let g = game({ mine: ["cordial-vampire", "gifted-aetherborn", "bear"], theirs: ["bear"], hand: ["lightning-bolt"] });
  g = cast(g, "h0", { targets: on("t0") });
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(find(g, "m1")!.counters, 1);
  assert.ok(!find(g, "m2")!.counters);
});

test("Cut Down: total power and toughness 5 or less", () => {
  let g = game({ hand: ["cut-down"], theirs: ["giant", "vampire-nighthawk"] });
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }).ok, false, "6/6 is too big");
  g = cast(g, "h0", { targets: on("t1") });
  assert.equal(find(g, "t1"), undefined);
});

test("Patron of the Vein: \"exile it\" is the creature that died, never the Patron itself", () => {
  const patron = plain("patron-of-the-vein", "Patron of the Vein", "{4}{B}{B}", 4, 4, "Flying\nWhen this creature enters, destroy target creature an opponent controls.\nWhenever a creature an opponent controls dies, exile it and put a +1/+1 counter on each Vampire you control.", "Creature — Vampire Shaman", ["B"]);
  const exilesItself = parseCard(patron).triggers.some((t) => t.effects.some((e) => e.type === "exile" && e.what.t === "self"));
  assert.equal(exilesItself, false);
});
