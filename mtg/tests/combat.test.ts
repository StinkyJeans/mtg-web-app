import { test } from "node:test";
import assert from "node:assert/strict";
import { blockOutcome, canBlock } from "@/app/play/combatHints";
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
