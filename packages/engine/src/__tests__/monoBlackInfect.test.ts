import { test } from "node:test";
import assert from "node:assert/strict";
import { getActivatable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { GameState } from "../index.js";
import { act, choose, find, on, settle, setup, toNextTurn, yard } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { INFECT } from "./infectCards.js";

// The Mono-Black Infect deck (and its sideboard), card by card.

const game = (s: Setup = {}) => setup({ ...s, extra: { ...INFECT, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: [], ...more }));
const pick = (g: GameState, iid?: string) => settle(act(g, g.pendingPick!.player, { type: "pick", ...(iid ? { iid } : {}) }));
const poison = (g: GameState) => [g.players.p1.poison ?? 0, g.players.p2.poison ?? 0];
const pt = (g: GameState, iid: string) => `${powerOf(g, find(g, iid)!)}/${toughnessOf(g, find(g, iid)!)}`;

test("every card of the deck and its sideboard is playable, and the other proliferate artifacts", () => {
  for (const def of Object.values(INFECT)) assert.ok(isSupportedCard(def), def.name);
});

test("Ichor Rats: as it enters, each player gets a poison counter", () => {
  let g = game({ hand: ["ichor-rats"] });
  g = cast(g, "h0");
  assert.deepEqual(poison(g), [1, 1]);
});

test("Phyrexian Vatmother: you get a poison counter at the beginning of your upkeep", () => {
  const g = toNextTurn(game({ mine: ["phyrexian-vatmother"] }));
  assert.deepEqual(poison(g), [1, 0]);
});

test("Hand of the Praetors: other creatures with infect get +1/+1, even with infect from Tainted Strike", () => {
  let g = game({ hand: ["tainted-strike"], mine: ["hand-of-the-praetors", "plague-stinger", "bilious-skulldweller"] });
  assert.equal(pt(g, "m0"), "3/2", "not itself");
  assert.equal(pt(g, "m1"), "2/2", "Plague Stinger has infect");
  assert.equal(pt(g, "m2"), "1/1", "toxic isn't infect");
  g = cast(g, "h0", { targets: on("m2") });
  assert.equal(pt(g, "m2"), "3/2", "+1/+0 from the Strike, +1/+1 for its infect");
});

test("Hand of the Praetors: a creature spell with infect gives a poison counter; one without doesn't", () => {
  let g = game({ hand: ["plague-stinger", "bilious-skulldweller"], mine: ["hand-of-the-praetors"] });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.ok(g.pendingChoice, "the trigger waits for its target player");
  g = choose(g, "p1", [{ kind: "player", id: "p2" }]);
  assert.deepEqual(poison(g), [0, 1]);
  g = cast(g, "h1");
  assert.equal(g.pendingChoice, null, "Bilious Skulldweller has toxic, not infect");
  assert.deepEqual(poison(g), [0, 1]);
});

test("Grim Affliction: a -1/-1 counter, then proliferate: more poison, more -1/-1 on theirs, more +1/+1 on yours", () => {
  let g = game({ hand: ["grim-affliction"], mine: ["plague-stinger", "giant"], theirs: ["giant", "bear"] });
  g.players.p2.poison = 3;
  g.players.p1.poison = 2;
  find(g, "m0")!.counters = 1;
  find(g, "m1")!.minusCounters = 1;
  find(g, "t1")!.counters = 1;
  g = cast(g, "h0", { targets: on("t0") });
  assert.equal(find(g, "t0")!.minusCounters, 2, "the target's counter, then one more");
  assert.deepEqual(poison(g), [2, 4], "only the opponent's poison grows");
  assert.equal(find(g, "m0")!.counters, 2, "your +1/+1 counters grow");
  assert.equal(find(g, "m1")!.minusCounters, 1, "your -1/-1 counters don't");
  assert.equal(find(g, "t1")!.counters, 1, "their +1/+1 counters don't");
});

test("Drown in Ichor: -4/-4 until end of turn, then proliferate", () => {
  let g = game({ hand: ["drown-in-ichor"], theirs: ["giant"] });
  g.players.p2.poison = 5;
  g = cast(g, "h0", { targets: on("t0") });
  assert.equal(pt(g, "t0"), "2/2");
  assert.deepEqual(poison(g), [0, 6]);
});

test("Blightbelly Rat: when it dies, proliferate", () => {
  let g = game({ hand: ["drown-in-ichor"], mine: ["blightbelly-rat"] });
  g.players.p2.poison = 7;
  g = cast(g, "h0", { targets: on("m0") });
  assert.ok(yard(g).includes("Blightbelly Rat"));
  assert.deepEqual(poison(g), [0, 9], "the Drown's proliferate, then the Rat's");
});

test("Vraska's Fall: the opponent chooses a creature or planeswalker to sacrifice, then gets a poison counter", () => {
  let g = game({ hand: ["vraskas-fall", "vraskas-fall", "vraskas-fall"], theirs: ["giant", "bear"] });
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.kind, "sacrificeOwn");
  assert.equal(g.pendingPick?.player, "p2", "the opponent chooses");
  assert.deepEqual(g.pendingPick?.options, ["t0", "t1"]);
  assert.deepEqual(poison(g), [0, 0], "the poison counter waits for the sacrifice");
  g = pick(g, "t1");
  assert.equal(find(g, "t1"), undefined);
  assert.ok(find(g, "t0"));
  assert.deepEqual(poison(g), [0, 1]);
  g = cast(g, "h1");
  assert.equal(g.pendingPick, null, "one creature left: no choice to make");
  assert.equal(find(g, "t0"), undefined);
  g = cast(g, "h2");
  assert.deepEqual(poison(g), [0, 3], "with nothing to sacrifice, still a poison counter");
});

test("Contagion Clasp and Throne of Geth proliferate", () => {
  let g = game({ mine: ["throne-of-geth", "contagion-clasp"] });
  g.players.p2.poison = 1;
  const throne = getActivatable(g, "p1").find((a) => a.iid === "m0");
  assert.ok(throne);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: throne.index, targets: [], payWith: "m1" }));
  assert.deepEqual(poison(g), [0, 2]);
});
