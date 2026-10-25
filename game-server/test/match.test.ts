import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { getCastable, getDamageAssignments, getForcedBlocks, getPossibleAttackers, HIDDEN_CARD_ID, legalTargets, MAX_HAND_SIZE, playerToAct, suggestDamageAssignment } from "@mtg/engine";
import type { Action, GameState, PlayerId } from "@mtg/engine";
import appConfig from "../src/app.config.js";
import type { RoomSnapshot } from "../src/rooms/MatchRoom.js";

// These tests start the real server and play with real cards from the database (so they need the Supabase settings,
// and DEV_AUTH=1 so that tokens like "dev:alice" count as accounts).  Run:  npm test

const deckOf = (size: number, land: string, creature: string) => [...Array(Math.round(size * 0.4)).fill(land), ...Array(size - Math.round(size * 0.4)).fill(creature)];

/** A very simple player: it reads only the view it was sent, exactly like a browser would. */
function choose(s: GameState, seat: PlayerId): Action | null {
  if (playerToAct(s) !== seat) return null;
  if (s.pendingPick) return s.pendingPick.optional ? { type: "pick" } : { type: "pick", iid: s.pendingPick.options[0] };
  if (s.pendingChoice) {
    const targets = s.pendingChoice.specs.flatMap((spec) => legalTargets(s, spec, s.pendingChoice!.item.controller).slice(0, 1));
    return { type: "chooseTargets", targets };
  }
  if (s.priority) return { type: "passPriority" };
  const me = s.players[seat];
  switch (s.phase) {
    case "mulligan":
      return { type: "keepHand", bottom: [] };
    case "cleanup":
      return { type: "discard", iids: me.hand.slice(0, me.hand.length - MAX_HAND_SIZE).map((c) => c.iid) };
    case "damage":
      return { type: "assignDamage", assignments: getDamageAssignments(s).flatMap((d) => Object.entries(suggestDamageAssignment(s, d.attacker)).map(([blocker, amount]) => ({ attacker: d.attacker, blocker, amount }))) };
    case "blockers":
      return { type: "declareBlockers", blocks: getForcedBlocks(s) };
    case "attackers": {
      const can = getPossibleAttackers(s);
      return can.length > 0 ? { type: "declareAttackers", attackers: can } : { type: "passPhase" };
    }
    default: {
      const land = me.hand.find((c) => s.cards[c.defId]?.type === "land");
      if (land && me.landsPlayedThisTurn < 1) return { type: "playLand", iid: land.iid };
      const cast = getCastable(s, seat).find((c) => c.specs.length === 0 && !c.modal && c.maxX === undefined && !c.sacrifice);
      if (cast) return { type: "castSpell", iid: cast.iid, targets: [] };
      return { type: "passPhase" };
    }
  }
}

describe("a live match", function () {
  this.timeout(60_000);
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await boot(appConfig)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  it("goes from the room, through the vote and the coin toss, to a finished game; nobody sees the other's hand", async () => {
    const room = await colyseus.createRoom("match", { name: "Test room" });
    const alice = await colyseus.connectTo(room, { token: "dev:alice" });
    const bob = await colyseus.connectTo(room, { token: "dev:bob" });

    const snap: Record<string, RoomSnapshot> = {};
    const views: Record<string, GameState> = {};
    const seatOf: Record<string, PlayerId> = {};
    let steps = 0;
    let finished: (s: GameState) => void = () => {};
    const done = new Promise<GameState>((resolve) => (finished = resolve));
    const react = (name: "alice" | "bob", client: typeof alice) => {
      const act = () => {
        const v = views[name];
        if (!v) return;
        if (v.winner) return finished(v);
        const a = choose(v, seatOf[name]);
        if (a && ++steps < 4000) client.send("action", { action: a });
      };
      client.onMessage("room", (s: RoomSnapshot) => {
        snap[name] = s;
        seatOf[name] = s.you;
      });
      client.onMessage("start", (m: { view: GameState }) => {
        views[name] = m.view;
        act();
      });
      client.onMessage("update", (m: { view: GameState }) => {
        views[name] = m.view;
        act();
      });
      client.onMessage("error", (m: { message: string }) => console.log(`   (${name}) refused:`, m.message));
    };
    react("alice", alice);
    react("bob", bob);
    const until = async (what: string, test: () => boolean) => {
      for (let i = 0; i < 400; i++) {
        if (test()) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(`timed out waiting for: ${what}`);
    };

    await until("both players in the room", () => snap.alice?.players.length === 2 && snap.bob?.players.length === 2);
    assert.equal(snap.alice.you, "p1", "the host sits at p1");
    assert.equal(snap.bob.you, "p2");

    // only the host can open the vote
    bob.send("startVote");
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(snap.bob.stage, "waiting", "a guest can't start the vote");
    alice.send("startVote");
    await until("vote stage", () => snap.alice.stage === "vote");

    // different votes: they have to vote again
    alice.send("vote", { size: 20 });
    bob.send("vote", { size: 40 });
    await until("mismatch", () => snap.alice.mismatch === true);
    assert.equal(snap.alice.stage, "vote");
    alice.send("vote", { size: 20 });
    bob.send("vote", { size: 20 });
    await until("decks stage", () => snap.alice.stage === "decks");
    assert.equal(snap.alice.size, 20);

    // a deck of the wrong size is refused; right-sized decks are accepted
    alice.send("deck", { name: "Too small", ids: ["mountain"] });
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(snap.alice.stage, "decks");
    alice.send("deck", { name: "Reds", ids: deckOf(20, "mountain", "agent-of-atlas") });
    bob.send("deck", { name: "Greens", ids: deckOf(20, "forest", "advance-scout") });
    await until("coin stage", () => snap.alice.stage === "coin");
    assert.ok(snap.alice.coin && snap.alice.coin.call === "heads");

    // only the winner of the toss decides the order
    const winnerName = snap.alice.coin.winner === "p1" ? "alice" : "bob";
    const loser = winnerName === "alice" ? bob : alice;
    loser.send("order", { first: true });
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(snap.alice.stage, "coin", "the loser of the toss can't choose");
    (winnerName === "alice" ? alice : bob).send("order", { first: true });
    await until("playing", () => snap.alice.stage === "playing" && !!views.alice && !!views.bob);

    // hidden information: each player sees only their own hand
    const a = views.alice;
    assert.equal(a.players.p1.hand.every((c) => c.defId !== HIDDEN_CARD_ID), true, "alice sees her hand");
    assert.equal(a.players.p2.hand.every((c) => c.defId === HIDDEN_CARD_ID), true, "alice does not see bob's hand");
    assert.equal(a.players.p1.library.every((c) => c.defId === HIDDEN_CARD_ID), true, "nobody sees a library");
    assert.equal(a.rng, 0, "the shuffle seed stays on the server");
    assert.equal(a.cards["advance-scout"] === undefined || a.players.p2.battlefield.length > 0, true, "bob's deck list is not leaked");

    const end = await done;
    assert.ok(end.winner, "the game ended with a result");
    await until("over", () => snap.alice.stage === "over");
    console.log(`   game over after ${end.turn} turns, ${steps} actions; winner: ${end.winner}`);
  });

  it("refuses actions from the wrong player and from outsiders of the turn", async () => {
    const room = await colyseus.createRoom("match", { name: "Rules" });
    const alice = await colyseus.connectTo(room, { token: "dev:carol" });
    const bob = await colyseus.connectTo(room, { token: "dev:dave" });
    const errors: string[] = [];
    const snap: Record<string, RoomSnapshot> = {};
    for (const [name, c] of [["carol", alice], ["dave", bob]] as const) {
      c.onMessage("room", (s: RoomSnapshot) => (snap[name] = s));
      c.onMessage("error", (m: { message: string }) => errors.push(`${name}: ${m.message}`));
      c.onMessage("start", () => {});
      c.onMessage("update", () => {});
    }
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await wait(200);
    alice.send("startVote");
    await wait(100);
    alice.send("vote", { size: 20 });
    bob.send("vote", { size: 20 });
    await wait(100);
    alice.send("deck", { name: "A", ids: deckOf(20, "mountain", "agent-of-atlas") });
    bob.send("deck", { name: "B", ids: deckOf(20, "forest", "advance-scout") });
    await wait(1200);
    const chooser = snap.carol.coin!.winner === "p1" ? alice : bob;
    chooser.send("order", { first: true });
    await wait(400);
    assert.equal(snap.carol.stage, "playing");
    // in the mulligan both must keep before anything else; sending a play action first is refused
    alice.send("action", { action: { type: "playLand", iid: "nonsense" } });
    bob.send("action", { action: { type: "playLand", iid: "nonsense" } });
    await wait(300);
    assert.ok(errors.length >= 1, `expected an error, got: ${errors.join(" | ")}`);
  });
});
