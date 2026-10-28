import { test } from "node:test";
import assert from "node:assert/strict";
import { gainedKeywords } from "@mtg/engine";
import { attackHint, blockOutcome, canBlock } from "@/app/play/combatHints";
import { endReason } from "@/app/play/log";
import { blocking, board, permanent } from "./fixtures";

test("a flyer can only be blocked by flying or reach", () => {
  const drake = permanent("drake", "p1");
  const bears = permanent("bears", "p2");
  const spider = permanent("spider", "p2");
  const g = blocking([drake], [bears, spider]);
  const ground = canBlock(g, "p2", bears.card.iid, drake.card.iid);
  assert.equal(ground.ok, false);
  assert.match(ground.reason ?? "", /flying/i);
  assert.deepEqual(canBlock(g, "p2", spider.card.iid, drake.card.iid), { ok: true });
});

test("a creature that gains flying (Dragon's Rage Channeler with delirium) is a free hit past ground creatures, and shows its flying", () => {
  const drc = permanent("drc", "p1");
  const g = board({ mine: [drc], theirs: [permanent("bears", "p2")] });
  assert.equal(attackHint(g, "p1", drc).tone, "risky", "a 1/1 the Bears can block and kill");
  assert.deepEqual(gainedKeywords(g, drc), []);
  g.players.p1.graveyard = ["mountain", "shock", "bears", "divination"].map((defId, i) => ({ iid: `y${i}`, defId, owner: "p1" as const }));
  assert.equal(attackHint(g, "p1", drc).tone, "free", "with delirium it flies over the Bears");
  assert.deepEqual(gainedKeywords(g, drc), ["flying"]);
});

test("while players may still respond to the attack, a creature that will be able to block still says so", () => {
  const drake = permanent("drake", "p1");
  const spider = permanent("spider", "p2");
  const g = blocking([drake], [spider]);
  g.priority = { holder: "p2", passes: 0, then: "afterAttackers" };
  assert.deepEqual(canBlock(g, "p2", spider.card.iid, drake.card.iid), { ok: true });
});

test("block outcomes say who dies", () => {
  const g = board();
  const [bears, giant, elf, other] = [permanent("bears", "p2"), permanent("giant", "p2"), permanent("elf", "p2"), permanent("bears", "p1")];
  assert.equal(blockOutcome(g, other, [bears]).tone, "trade");
  assert.equal(blockOutcome(g, other, [giant]).tone, "best");
  assert.equal(blockOutcome(g, other, [elf]).tone, "chump");
  assert.equal(blockOutcome(g, permanent("giant", "p1"), [permanent("spider", "p2")]).tone, "good"); // 3 damage into 4 toughness, 2 into 3
});

test("the end popup says how the game ended", () => {
  const g = board();
  assert.equal(endReason([{ type: "conceded", player: "p2" }, { type: "gameWon", player: "p1" }], g), "Player 2 resigned.");
  g.players.p2.life = 0;
  assert.equal(endReason([{ type: "gameWon", player: "p1" }], g), "Player 2 ran out of life.");
  g.players.p2.life = 5;
  assert.equal(endReason([{ type: "gameWon", player: "p1" }], g), "Player 2 ran out of cards to draw.");
  assert.equal(endReason([], g), null);
});
