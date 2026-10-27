import { test } from "node:test";
import assert from "node:assert/strict";
import { kw, } from "../core.js";
import { parseCard, powerOf } from "../index.js";
import { act, find, named, realCard, setup, settle } from "./marvelKit.js";

// Plan enchantments (plan counters, sacrificed at a threshold) and keyword counters.

test("Plan enchantments are read: a threshold with its own ability", () => {
  const p = parseCard(realCard("Claim the Kingdom"));
  assert.equal(p.ok, true);
  assert.equal(p.plan?.threshold, 4);
  assert.equal(p.plan?.targets.length, 1);
  assert.equal(parseCard(realCard("Political Triumph")).plan?.threshold, 4);
});

test("Claim the Kingdom: landfall puts a counter on a creature and a plan counter here; the fourth gives indestructible", () => {
  // (with one creature to choose, the game picks the target by itself)
  let g = setup({ hand: ["forest"], mine: ["Claim the Kingdom", "bear"] });
  const plan = () => find(g, "m0");
  const land = (iid: string) => {
    g.players.p1.landsPlayedThisTurn = 0;
    g.players.p1.hand.push({ iid, defId: "forest", owner: "p1" });
    g = settle(act(g, "p1", { type: "playLand", iid }));
  };
  for (let i = 0; i < 3; i++) {
    land(`f${i}`);
    assert.equal(plan()!.planCounters, i + 1);
  }
  assert.equal(find(g, "m1")!.counters, 3);
  land("f9");
  assert.equal(plan(), undefined, "sacrificed at the fourth counter");
  assert.equal(find(g, "m1")!.counters, 4);
  assert.ok(kw(g, find(g, "m1")!, "indestructible"), "has an indestructible counter");
});

test("Political Triumph: scry on each creature entering; at the fourth counter draw and +1/+1 counters on your creatures", () => {
  let g = setup({ hand: ["bear"], mine: ["Political Triumph", "elf"], library: ["plains", "plains"] });
  g.players.p1.battlefield.find((p) => p.card.iid === "m0")!.planCounters = 3;
  g = act(g, "p1", { type: "castCreature", iid: "h0" });
  g = settle(g);
  while (g.pendingPick) g = act(g, "p1", { type: "pick" }); // scry: keep it on top
  g = settle(g);
  assert.equal(find(g, "m0"), undefined, "sacrificed");
  assert.equal(find(g, "m1")!.counters, 1);
  assert.equal(named(g, "p1", "Bear")[0].counters, 1);
  assert.equal(g.players.p1.hand.length, 1, "drew a card");
});

test("keyword counters: Quicksilver's power-up gives +1/+1 and double strike", () => {
  let g = setup({ mine: ["Quicksilver, Brash Blur"] });
  const ability = parseCard(realCard("Quicksilver, Brash Blur")).activated[0];
  assert.equal(ability.powerUp, true);
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 });
  g = settle(g);
  assert.equal(powerOf(g, find(g, "m0")!), 2);
  assert.ok(kw(g, find(g, "m0")!, "double strike"));
});
