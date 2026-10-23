import assert from "assert";
import { createGame, STARTER_DECK } from "@mtg/engine";

describe("engine is importable from game-server", () => {
  it("creates a game", () => {
    const g = createGame({ p1: STARTER_DECK, p2: STARTER_DECK }, 1);
    assert.strictEqual(g.players.p1.hand.length, 7);
  });
});
