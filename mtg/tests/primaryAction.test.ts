import { test } from "node:test";
import assert from "node:assert/strict";
import { primaryAction } from "@/app/play/CommandBar";
import type { Selection } from "@/app/play/CommandBar";
import { board, permanent } from "./fixtures";

const none: Selection = { handPick: [], attacking: [], attackTargets: {}, blocks: {}, damageTo: () => ({}) };
const pick = (sel: Partial<Selection> = {}) => ({ ...none, ...sel });

test("no big button while it is not this player's move, or something else needs an answer", () => {
  const g = board();
  assert.equal(primaryAction(g, "p1", false, none), null);
  assert.equal(primaryAction({ ...g, winner: "p1" }, "p1", true, none), null);
  assert.equal(primaryAction({ ...g, priority: { holder: "p1", passes: 0 } } as typeof g, "p1", true, none), null);
});

test("main phases move on to combat, then to the end step", () => {
  const g = board();
  assert.deepEqual(primaryAction(g, "p1", true, none), { label: "Go to combat", action: { type: "passPhase" } });
  assert.equal(primaryAction({ ...g, phase: "main2" }, "p1", true, none)?.label, "Go to end step");
});

test("the opening hand is kept, bottoming one card per mulligan", () => {
  const g = { ...board(), phase: "mulligan" as const, opening: { taken: { p1: 0, p2: 0 }, kept: { p1: false, p2: false } } };
  assert.deepEqual(primaryAction(g, "p1", true, none), { label: "Keep hand", action: { type: "keepHand", bottom: [] } });
  const after = { ...g, opening: { taken: { p1: 2, p2: 0 }, kept: { p1: false, p2: false } } };
  assert.deepEqual(primaryAction(after, "p1", true, pick({ handPick: ["a"] })), { label: "Keep and bottom 1/2", action: { type: "keepHand", bottom: ["a"] } });
});

test("cleanup counts the cards over seven", () => {
  const g = { ...board({ hand: Array(9).fill("bears") }), phase: "cleanup" as const };
  assert.deepEqual(primaryAction(g, "p1", true, pick({ handPick: ["x"] })), { label: "Discard 1/2", action: { type: "discard", iids: ["x"] } });
});

test("attacking: skip with no attackers, otherwise attack, sending only the chosen attackers' planeswalker targets", () => {
  const g = { ...board(), phase: "attackers" as const };
  assert.deepEqual(primaryAction(g, "p1", true, none), { label: "Skip attack", action: { type: "passPhase" } });
  assert.deepEqual(primaryAction(g, "p1", true, pick({ attacking: ["a"], attackTargets: { a: "pw", b: "pw" } })), {
    label: "Attack with 1",
    action: { type: "declareAttackers", attackers: ["a"], targets: { a: "pw" } },
  });
  assert.deepEqual(primaryAction(g, "p1", true, pick({ attacking: ["a", "b"] }))?.action, { type: "declareAttackers", attackers: ["a", "b"] });
});

test("blocking: no blocks, or confirm the chosen ones", () => {
  const g = { ...board(), phase: "blockers" as const };
  assert.deepEqual(primaryAction(g, "p1", true, none), { label: "No blocks", action: { type: "declareBlockers", blocks: [] } });
  assert.deepEqual(primaryAction(g, "p1", true, pick({ blocks: { b1: "a1", b2: "a1" } })), {
    label: "Confirm 2 blocks",
    action: { type: "declareBlockers", blocks: [{ blocker: "b1", attacker: "a1" }, { blocker: "b2", attacker: "a1" }] },
  });
});

test("damage: an attacker blocked by two creatures deals the damage as divided", () => {
  const attacker = permanent("giant", "p1");
  const [b1, b2] = [permanent("elf", "p2"), permanent("bears", "p2")];
  const g = { ...board({ mine: [attacker], theirs: [b1, b2] }), phase: "damage" as const, combat: { attackers: [{ attacker: attacker.card.iid, blockers: [b1.card.iid, b2.card.iid] }] } };
  const split = { [b1.card.iid]: 1, [b2.card.iid]: 2 };
  assert.deepEqual(primaryAction(g, "p1", true, pick({ damageTo: () => split })), {
    label: "Deal damage",
    action: {
      type: "assignDamage",
      assignments: [
        { attacker: attacker.card.iid, blocker: b1.card.iid, amount: 1 },
        { attacker: attacker.card.iid, blocker: b2.card.iid, amount: 2 },
      ],
    },
  });
});
