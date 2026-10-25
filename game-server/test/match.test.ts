import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import type { Room as SDKRoom } from "@colyseus/sdk";
import { botAction, getCastable, getDamageAssignments, getForcedBlocks, getPossibleAttackers, HIDDEN_CARD_ID, legalTargets, MAX_HAND_SIZE, playerToAct, suggestDamageAssignment } from "@mtg/engine";
import type { Action, GameState, PlayerId } from "@mtg/engine";
import appConfig from "../src/app.config.js";
import { KICKED } from "../src/rooms/MatchRoom.js";
import type { MatchRoom, RoomSnapshot } from "../src/rooms/MatchRoom.js";

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
    assert.ok(snap.alice.coin && snap.alice.coin.call === null, "nobody has called yet");

    // only the guest calls the toss; the winner is whoever the coin agrees with
    alice.send("call", { side: "heads" });
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(snap.alice.coin!.call, null, "the host can't call");
    bob.send("call", { side: "tails" });
    await until("the coin is flipped", () => snap.alice.coin?.result != null);
    const coin = snap.alice.coin!;
    assert.equal(coin.call, "tails");
    assert.equal(coin.winner, coin.result === "tails" ? "p2" : "p1");

    // only the winner of the toss decides the order
    const winnerName = coin.winner === "p1" ? "alice" : "bob";
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

  it("lets the host play against a computer opponent, which plays a whole game by itself", async () => {
    const room = await colyseus.createRoom("match", { name: "Versus the bot" });
    const alice = await colyseus.connectTo(room, { token: "dev:erin" });
    let snap: RoomSnapshot | null = null;
    let view: GameState | null = null;
    let moves = 0;
    let botMoves = 0;
    let finished: (s: GameState) => void = () => {};
    const done = new Promise<GameState>((resolve) => (finished = resolve));
    const act = () => {
      if (!view) return;
      if (view.winner) return finished(view);
      const a = playerToAct(view) === "p1" ? botAction(view, "p1") : null; // the person at the keyboard (played by the same engine bot)
      if (a && ++moves < 4000) alice.send("action", { action: a });
    };
    alice.onMessage("room", (s: RoomSnapshot) => (snap = s));
    alice.onMessage("start", (m: { view: GameState }) => { view = m.view; act(); });
    alice.onMessage("update", (m: { view: GameState }) => {
      if (view && playerToAct(view) === "p2") botMoves++; // the room moved for the bot
      view = m.view;
      act();
    });
    alice.onMessage("error", () => {});
    const until = async (what: string, test: () => boolean, ms = 12000) => {
      for (let i = 0; i < ms / 25; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 25)); }
      throw new Error(`timed out waiting for: ${what}`);
    };
    await until("in the room", () => snap?.players.length === 1);

    // nobody else can join a room that has a bot
    alice.send("addBot");
    await until("bot added", () => snap?.players.length === 2);
    assert.equal(snap!.players[1].bot, true);
    assert.equal(snap!.players[1].name, "Bot");
    await assert.rejects(colyseus.connectTo(room, { token: "dev:frank" }), "a third person can't join");

    alice.send("startVote");
    await until("vote stage", () => snap?.stage === "vote");
    alice.send("vote", { size: 20 });
    await until("decks stage (the bot voted with the host)", () => snap?.stage === "decks");
    alice.send("deck", { name: "Reds", ids: deckOf(20, "mountain", "agent-of-atlas"), botDeck: { name: "Bot deck", ids: deckOf(20, "forest", "advance-scout") } });
    await until("coin stage", () => snap?.stage === "coin");
    await until("the bot (the guest) has called the coin", () => snap?.coin?.winner != null);
    if (snap!.coin!.winner === "p1") alice.send("order", { first: true });
    await until("playing (if the bot won the toss it chooses itself)", () => snap?.stage === "playing", 12000);

    const end = await done;
    assert.ok(end.winner, "the game ended");
    assert.ok(botMoves > 10, `the bot played its own turns (${botMoves} updates after its moves)`);
    console.log(`   vs bot: over after ${end.turn} turns; winner ${end.winner}; bot moves seen ${botMoves}`);
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
    bob.send("call", { side: "heads" });
    await wait(200);
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

  it("lets the host kick the guest, who can't come back to that room", async () => {
    const room = await colyseus.createRoom("match", { name: "Kick" });
    const host = await colyseus.connectTo(room, { token: "dev:erin" });
    const guest = await colyseus.connectTo(room, { token: "dev:frank" });
    let hostSnap: RoomSnapshot | null = null;
    host.onMessage("room", (s: RoomSnapshot) => (hostSnap = s));
    guest.onMessage("room", () => {});
    const left = new Promise<number>((resolve) => guest.onLeave((code) => resolve(code)));
    await new Promise((r) => setTimeout(r, 150));

    guest.send("kick");
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(room.clients.length, 2, "a guest can't kick the host");

    host.send("kick");
    assert.equal(await left, KICKED);
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(hostSnap!.players.length, 1);
    assert.equal(hostSnap!.stage, "waiting");
    await assert.rejects(colyseus.connectTo(room, { token: "dev:frank" }), /removed you/);
  });

  it("keeps a locked room closed to anyone without the password, and never sends the password", async () => {
    const room = await colyseus.createRoom("match", { name: "Locked", password: "s3cret" });
    const host = await colyseus.connectTo(room, { token: "dev:gina", password: "s3cret" });
    let snapshot: RoomSnapshot | null = null;
    host.onMessage("room", (s: RoomSnapshot) => (snapshot = s));
    await assert.rejects(colyseus.connectTo(room, { token: "dev:hank" }), /needs a password/);
    await assert.rejects(colyseus.connectTo(room, { token: "dev:hank", password: "guess" }), /Wrong password/);
    const guest = await colyseus.connectTo(room, { token: "dev:hank", password: "s3cret" });
    guest.onMessage("room", () => {});
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(snapshot!.players.length, 2);
    assert.equal(snapshot!.locked, true);
    assert.doesNotMatch(JSON.stringify(snapshot), /s3cret/);
  });

  it("brings a match back after the server restarts, as it was, with nobody losing for it", async () => {
    const room = await colyseus.createRoom<MatchRoom>("match", { name: "Restart" });
    const ivy = await colyseus.connectTo(room, { token: "dev:ivy" });
    const jack = await colyseus.connectTo(room, { token: "dev:jack" });
    const snap: Record<string, RoomSnapshot> = {};
    for (const [name, c] of [["ivy", ivy], ["jack", jack]] as const) {
      c.onMessage("room", (s: RoomSnapshot) => (snap[name] = s));
      c.onMessage("start", () => {});
      c.onMessage("update", () => {});
      c.send("hello"); // as the browser does: the snapshot is asked for once something is listening
    }
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const until = async (what: string, test: () => boolean) => {
      for (let i = 0; i < 200; i++) {
        if (test()) return;
        await wait(25);
      }
      throw new Error(`timed out waiting for: ${what}`);
    };
    await until("both in the room", () => snap.ivy?.players.length === 2);
    ivy.send("startVote");
    await until("vote", () => snap.ivy.stage === "vote");
    ivy.send("vote", { size: 20 });
    jack.send("vote", { size: 20 });
    await until("decks", () => snap.ivy.stage === "decks");
    ivy.send("deck", { name: "A", ids: deckOf(20, "mountain", "agent-of-atlas") });
    jack.send("deck", { name: "B", ids: deckOf(20, "forest", "advance-scout") });
    await until("coin", () => snap.ivy.stage === "coin");
    jack.send("call", { side: "heads" });
    await until("the flip", () => snap.ivy.coin?.winner != null);
    (snap.ivy.coin!.winner === "p1" ? ivy : jack).send("order", { first: true });
    await until("playing", () => snap.ivy.stage === "playing");
    for (let i = 0; i < 2; i++) {
      const s = room.debugGame()!;
      (playerToAct(s) === "p1" ? ivy : jack).send("action", { action: { type: "keepHand", bottom: [] } });
      await until("a hand kept", () => room.debugGame() !== s);
    }
    assert.notEqual(room.debugGame()!.phase, "mulligan");
    const before = JSON.stringify(room.debugGame());
    const roomId = room.roomId;

    // the restart: the match is saved, and both players are let go with "server shutdown", not as players who left
    const codes = Promise.all([ivy, jack].map((c) => new Promise<number>((resolve) => c.onLeave((code) => resolve(code)))));
    await room.onBeforeShutdown();
    assert.deepEqual(await codes, [4001, 4001]);
    assert.equal(room.debugGame()!.winner, null, "nobody lost because of the restart");

    // the first browser back brings the match back under its old id; the second joins it
    const ivy2: SDKRoom = await colyseus.sdk.create("match", { token: "dev:ivy", restore: roomId });
    const jack2: SDKRoom = await colyseus.sdk.joinById(roomId, { token: "dev:jack" });
    const views: Record<string, GameState> = {};
    for (const [name, c] of [["ivy", ivy2], ["jack", jack2]] as const) {
      c.onMessage("room", (s: RoomSnapshot) => (snap[name] = s));
      c.onMessage("start", (m: { view: GameState }) => (views[name] = m.view));
      c.onMessage("update", (m: { view: GameState }) => (views[name] = m.view));
      c.send("hello");
    }
    assert.equal(ivy2.roomId, roomId);
    const back = colyseus.getRoomById<MatchRoom>(roomId);
    await until("both back", () => snap.ivy?.players.every((p) => p.connected) === true && !!views.ivy && !!views.jack);
    assert.equal(JSON.stringify(back.debugGame()), before, "the game is exactly where it was");
    assert.equal(snap.jack.you, "p2", "each player is back in their own seat");
    assert.equal(views.ivy.players.p2.hand.every((c) => c.defId === HIDDEN_CARD_ID), true, "hands stay hidden after the restart");

    // the game goes on
    const seat = playerToAct(back.debugGame()!);
    const turnBefore = back.debugGame()!;
    (seat === "p1" ? ivy2 : jack2).send("action", { action: choose(views[seat === "p1" ? "ivy" : "jack"], seat) });
    await until("the next move", () => back.debugGame() !== turnBefore);

    await assert.rejects(colyseus.sdk.joinById(roomId, { token: "dev:mallory" }), /locked|full/);
    await assert.rejects(colyseus.sdk.create("match", { token: "dev:ivy", restore: "no-such-room" }), /ended/);
  });

  it("brings a match against the bot back after a restart, and the bot carries on", async () => {
    const room = await colyseus.createRoom<MatchRoom>("match", { name: "Bot restart" });
    const kim = await colyseus.connectTo(room, { token: "dev:kim" });
    let snap: RoomSnapshot | null = null;
    kim.onMessage("room", (s: RoomSnapshot) => (snap = s));
    kim.onMessage("start", () => {});
    kim.onMessage("update", () => {});
    kim.send("hello");
    const until = async (what: string, test: () => boolean, ms = 12000) => {
      for (let i = 0; i < ms / 25; i++) {
        if (test()) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(`timed out waiting for: ${what}`);
    };
    await until("in the room", () => snap?.players.length === 1);
    kim.send("addBot");
    await until("bot added", () => snap?.players.length === 2);
    kim.send("startVote");
    await until("vote", () => snap?.stage === "vote");
    kim.send("vote", { size: 20 });
    await until("decks", () => snap?.stage === "decks");
    kim.send("deck", { name: "Reds", ids: deckOf(20, "mountain", "agent-of-atlas"), botDeck: { name: "Bot deck", ids: deckOf(20, "forest", "advance-scout") } });
    await until("the bot called the coin", () => snap?.coin?.winner != null);
    if (snap!.coin!.winner === "p1") kim.send("order", { first: true });
    await until("playing", () => snap?.stage === "playing");

    const roomId = room.roomId;
    const left = new Promise<number>((resolve) => kim.onLeave((code) => resolve(code)));
    await room.onBeforeShutdown();
    assert.equal(await left, 4001);

    const kim2: SDKRoom = await colyseus.sdk.create("match", { token: "dev:kim", restore: roomId });
    const back = colyseus.getRoomById<MatchRoom>(roomId);
    let view: GameState | null = null;
    let botMoves = 0;
    const act = () => {
      if (!view || view.winner || playerToAct(view) !== "p1") return;
      const a = botAction(view, "p1");
      if (a) kim2.send("action", { action: a });
    };
    kim2.onMessage("room", (s: RoomSnapshot) => (snap = s));
    kim2.onMessage("start", (m: { view: GameState }) => ((view = m.view), act()));
    kim2.onMessage("update", (m: { view: GameState }) => {
      if (view && playerToAct(view) === "p2") botMoves++;
      view = m.view;
      act();
    });
    kim2.send("hello");
    await until("the bot is in its seat, not waited for", () => snap?.players.find((p) => p.bot)?.connected === true);
    await until("the bot makes moves after the restart", () => botMoves >= 3 || back.debugGame()!.winner !== null, 30000);
    assert.equal(back.debugGame()!.winner === null || botMoves > 0, true);
  });

  it("finishes ending the turn by itself after a 'beginning of combat' trigger's target is chosen", async () => {
    const room = await colyseus.createRoom<MatchRoom>("match", { name: "End turn" });
    const lee = await colyseus.connectTo(room, { token: "dev:lee" });
    const max = await colyseus.connectTo(room, { token: "dev:max" });
    const snap: Record<string, RoomSnapshot> = {};
    for (const [name, c] of [["lee", lee], ["max", max]] as const) {
      c.onMessage("room", (s: RoomSnapshot) => (snap[name] = s));
      c.onMessage("start", () => {});
      c.onMessage("update", () => {});
      c.onMessage("error", () => {});
      c.send("hello");
    }
    const until = async (what: string, test: () => boolean) => {
      for (let i = 0; i < 200; i++) {
        if (test()) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(`timed out waiting for: ${what}`);
    };
    await until("both in the room", () => snap.lee?.players.length === 2);
    lee.send("startVote");
    await until("vote", () => snap.lee.stage === "vote");
    lee.send("vote", { size: 20 });
    max.send("vote", { size: 20 });
    await until("decks", () => snap.lee.stage === "decks");
    lee.send("deck", { name: "A", ids: deckOf(20, "swamp", "slimy-dualleech") });
    max.send("deck", { name: "B", ids: deckOf(20, "swamp", "slimy-dualleech") });
    await until("coin", () => snap.lee.stage === "coin");
    max.send("call", { side: "heads" });
    await until("the flip", () => snap.lee.coin?.winner != null);
    (snap.lee.coin!.winner === "p1" ? lee : max).send("order", { first: true });
    await until("playing", () => snap.lee.stage === "playing");
    for (let i = 0; i < 2; i++) {
      const s = room.debugGame()!;
      (playerToAct(s) === "p1" ? lee : max).send("action", { action: { type: "keepHand", bottom: [] } });
      await until("a hand kept", () => room.debugGame() !== s);
    }

    // two creatures with power 2 or less: the trigger has a real choice to make
    const g = room.debugGame()!;
    const me = g.active;
    for (const iid of ["leech-a", "leech-b"]) g.players[me].battlefield.push({ card: { iid, defId: "slimy-dualleech", owner: me }, tapped: false, summoningSick: false, damage: 0 });
    const turn = g.turn;
    const client = me === "p1" ? lee : max;
    client.send("endTurn");
    await until("End turn stops for the trigger's target", () => room.debugGame()!.pendingChoice !== null);
    assert.equal(room.debugGame()!.turn, turn);
    // each Dualleech triggers on its own, so there are two targets to choose
    for (let i = 0; i < 4 && room.debugGame()!.pendingChoice; i++) {
      const d = room.debugGame()!;
      const c = d.pendingChoice!;
      client.send("action", { action: { type: "chooseTargets", targets: c.specs.map((spec) => legalTargets(d, spec, c.item.controller)[0]) } });
      await until("the target is taken", () => room.debugGame() !== d);
    }
    await until("the turn ends without pressing End turn again", () => room.debugGame()!.turn > turn);
  });
});
