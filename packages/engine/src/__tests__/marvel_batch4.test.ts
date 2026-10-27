import { test } from "node:test";
import assert from "node:assert/strict";
import { act, find, hand, named, plain, setup, settle } from "./marvelKit.js";

test("Shang-Chi: a creature that just arrived can use a {T} ability", () => {
  const tapper = plain("tap", "Tapper", "{1}", 1, 1, "{T}: You gain 1 life.", "Creature — Human");
  const fresh = (mine: string[]) => {
    const g = setup({ mine, extra: { tap: tapper } });
    find(g, "m0")!.summoningSick = true;
    return g;
  };
  assert.throws(() => act(fresh(["tap"]), "p1", { type: "activateAbility", iid: "m0", index: 0 }), /just arrived/);
  const g = fresh(["tap", "Shang-Chi, Master of Kung Fu"]);
  const done = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }));
  assert.equal(done.players.p1.life, 21);
});

test("Misty Knight: draws a card for each card discarded this turn", () => {
  let g = setup({ mine: ["Misty Knight, Hero for Hire"], hand: ["bear"], library: ["plains", "plains", "plains"] });
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, payWith: "h0" });
  g = settle(g);
  assert.equal(hand(g).length, 1, "discarded one, drew one");
});

test("Mister Fantastic: draw when tokens you control enter (once for the batch)", () => {
  let g = setup({ hand: ["Okoye, Dora Milaje Leader"], mine: ["Mister Fantastic, Reed Richards"], library: ["plains", "plains", "plains"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  while (g.pendingPick) g = settle(act(g, "p1", { type: "pick", iid: g.pendingPick.options[0] }));
  assert.equal(named(g, "p1", "Soldier").length, 2);
  assert.equal(hand(g).length, 1, "two tokens at once: one card");
});

test("Loki, God of Mischief: draws when your ability targets (once each turn)", () => {
  let g = setup({ mine: ["Loki, God of Mischief", "Agent Phil Coulson"], library: ["plains", "plains"] });
  void g;
  const bolter = plain("zap", "Zapper", "{1}", 1, 1, "{T}: Zapper deals 1 damage to target creature.", "Creature — Human");
  g = setup({ mine: ["Loki, God of Mischief", "zap"], theirs: ["bear"], library: ["plains", "plains"], extra: { zap: bolter } });
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m1", index: 0, targets: [{ kind: "permanent", iid: "t0" }] }));
  assert.equal(hand(g).length, 1);
});
