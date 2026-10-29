import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, getActivatable, isSupportedCard } from "../index.js";
import type { GameState } from "../index.js";
import { act, choose, find, hand, on, plain, settle, setup, toNextTurn } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { STUN } from "./stunCards.js";

// The Azorius Stun deck (and its sideboard), card by card.

const game = (s: Setup = {}) => setup({ ...s, extra: { ...STUN, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: [], ...more }));
const use = (g: GameState, iid: string, text: RegExp, more: Record<string, unknown> = {}) => {
  const a = getActivatable(g, "p1").find((x) => x.iid === iid && text.test(x.text));
  assert.ok(a, `no usable ability ${text} on ${iid}`);
  return settle(act(g, "p1", { type: "activateAbility", iid, index: a.index, targets: [], ...more }));
};

test("every card of the deck and its sideboard is playable", () => {
  for (const def of Object.values(STUN)) assert.ok(isSupportedCard(def), def.name);
});

test("Freeze in Place: tapped with three stun counters, it misses its next three untaps", () => {
  let g = game({ hand: ["freeze-in-place"], theirs: ["bear"] });
  g = cast(g, "h0", { targets: on("t0") });
  if (g.pendingPick) g = settle(act(g, "p1", { type: "pick" })); // scry 2: keep both on top
  assert.equal(find(g, "t0")!.tapped, true);
  assert.equal(find(g, "t0")!.stun, 3);
  g = toNextTurn(g, "p2");
  assert.equal(find(g, "t0")!.tapped, true, "still tapped on its controller's turn");
  assert.equal(find(g, "t0")!.stun, 2);
});

test("Sleep-Cursed Faerie: enters tapped with three stun counters; paying to untap it takes a counter off instead", () => {
  let g = game({ hand: ["sleep-cursed-faerie"] });
  g = cast(g, "h0");
  const faerie = g.players.p1.battlefield.find((p) => p.card.defId === "sleep-cursed-faerie")!;
  assert.equal(faerie.tapped, true);
  assert.equal(faerie.stun, 3);
  g = use(g, faerie.card.iid, /untap/i);
  const after = find(g, faerie.card.iid)!;
  assert.equal(after.tapped, true);
  assert.equal(after.stun, 2);
});

test("Floodpits Drowner: stuns on the way in, then shuffles itself and a stunned creature away", () => {
  let g = game({ hand: ["floodpits-drowner"], mine: ["floodpits-drowner"], theirs: ["bear", "bear"] });
  g = cast(g, "h0");
  g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "t0")!.stun, 1);
  const shuffle = getActivatable(g, "p1").find((x) => x.iid === "m0" && /shuffle/i.test(x.text))!;
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: shuffle.index, targets: on("t1") }).ok, false, "the other Bear has no stun counter");
  g = use(g, "m0", /shuffle/i, { targets: on("t0") });
  assert.equal(find(g, "t0"), undefined);
  assert.equal(find(g, "m0"), undefined);
  assert.equal(g.players.p2.library.length, 6);
  assert.ok(g.players.p1.library.some((c) => c.iid === "m0"));
});

test("Sharae of Numbing Depths: taps and stuns as it enters, and draws a card for it, only once each turn", () => {
  let g = game({ hand: ["sharae-of-numbing-depths", "freeze-in-place"], theirs: ["bear", "bear"] });
  g = cast(g, "h0");
  g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "t0")!.stun, 1);
  assert.deepEqual(hand(g), ["Freeze in Place", "Plains"], "one card drawn");
  g = cast(g, "h1", { targets: on("t1") });
  if (g.pendingPick) g = settle(act(g, "p1", { type: "pick" }));
  assert.equal(hand(g).length, 1, "no second card this turn");
});

test("Solitary Sanctuary: each opposing creature you tap puts a +1/+1 counter on a creature of yours", () => {
  let g = game({ hand: ["solitary-sanctuary", "succumb-to-the-cold"], mine: ["spectral-sailor"], theirs: ["bear", "bear", "bear"] });
  g = cast(g, "h0");
  g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "m0")!.counters, 1, "Spectral Sailor is the only creature it can choose");
  g = cast(g, "h1", { targets: [...on("t1"), ...on("t2")] });
  while (g.pendingChoice) g = choose(g, "p1", on("m0"));
  assert.equal(find(g, "m0")!.counters, 3, "two more creatures tapped: two more counters");
  assert.equal(find(g, "t1")!.stun, 1);
  assert.equal(find(g, "t2")!.stun, 1);
});

test("Tapping a creature that is already tapped doesn't count for Sharae", () => {
  let g = game({ hand: ["out-cold"], mine: ["sharae-of-numbing-depths"], theirs: ["bear"] });
  g.players.p2.battlefield[0].tapped = true;
  g = cast(g, "h0", { targets: [...on("t0"), { kind: "none" }] });
  assert.equal(find(g, "t0")!.stun, 1);
  assert.deepEqual(hand(g), [], "no card from Sharae");
  assert.equal(g.players.p1.battlefield.filter((p) => p.card.defId.startsWith("token") || g.cards[p.card.defId]?.name === "Clue").length, 1, "Out Cold investigates");
});

test("Rowdy Snowballers: the stun counter goes on the creature it taps, not on itself", () => {
  const snowballers = plain("rowdy-snowballers", "Rowdy Snowballers", "{2}{U}", 2, 2, "When this creature enters, tap target creature an opponent controls and put a stun counter on it.", "Creature — Human Peasant Ally", ["U"]);
  let g = game({ hand: ["rowdy-snowballers"], theirs: ["bear"], extra: { "rowdy-snowballers": snowballers } });
  g = cast(g, "h0");
  assert.equal(find(g, "t0")!.stun, 1);
  assert.equal(g.players.p1.battlefield.find((p) => p.card.defId === "rowdy-snowballers")!.stun, undefined);
});
