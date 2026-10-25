import { Room, Client, CloseCode } from "colyseus";
import { applyAction, botAction, createGame, HIDDEN_CARD_ID, playerToAct, viewFor } from "@mtg/engine";
import type { Action, CardDef, GameEvent, GameState, PlayerId } from "@mtg/engine";
import { accountFromToken, loadCards, saveMatch } from "../supabase.js";
import type { Account } from "../supabase.js";

/**
 * One match, from the moment the host opens the room to the moment someone wins.
 *
 *   waiting  → the host is alone, or the second player has joined (the host then sees "Vote")
 *   vote     → both players vote for a deck size (20, 40 or 60); they must agree
 *   decks    → both players choose a deck of that size
 *   coin     → the server flips the coin; whoever wins it chooses who goes first
 *   playing  → the game runs HERE: the server holds the real game state and the rules; the browsers only send actions
 *   over     → someone won (or left)
 *
 * Nothing secret is ever sent: each player gets a view of the game with the opponent's hand and both libraries face down.
 */
export type Stage = "waiting" | "vote" | "decks" | "coin" | "playing" | "over";
export const DECK_SIZES = [20, 40, 60] as const;

interface Member {
  sessionId: string;
  account: Account;
  seat: PlayerId;
  connected: boolean;
  vote: number | null;
  deck: { name: string; ids: string[] } | null;
  /** The computer player: it has no browser, and the room plays its moves. */
  isBot?: boolean;
}

export interface RoomMeta {
  name: string;
  host: string;
  players: string[];
  status: Stage;
  turn: number;
  /** A room with a computer opponent: nobody else can join it. */
  bot: boolean;
}

/** What the lobby shows for a room, and what each player's room pop-up is drawn from. */
export interface RoomSnapshot {
  stage: Stage;
  name: string;
  you: PlayerId;
  host: PlayerId;
  size: number | null;
  /** "The votes differ" so the pop-up can say so. */
  mismatch: boolean;
  players: { seat: PlayerId; name: string; connected: boolean; voted: number | null; deckReady: boolean; bot?: boolean }[];
  coin: { call: "heads" | "tails"; result: "heads" | "tails"; winner: PlayerId; chose: "first" | "second" | null } | null;
  winner: PlayerId | "draw" | null;
  endReason: string | null;
}

const RECONNECT_SECONDS = 60;

export class MatchRoom extends Room<{ metadata: RoomMeta }> {
  maxClients = 2;

  private members: Member[] = [];
  private stage: Stage = "waiting";
  private title = "Room";
  private size: number | null = null;
  private mismatch = false;
  private coin: RoomSnapshot["coin"] = null;
  private game: GameState | null = null;
  private winner: PlayerId | "draw" | null = null;
  private endReason: string | null = null;
  private deckNames: Record<PlayerId, string> = { p1: "", p2: "" };
  private defs: Record<string, CardDef> = {};
  private busy = false; // actions are handled one at a time
  private botTimer?: ReturnType<typeof setTimeout>;

  messages = {
    startVote: (client: Client) => {
      const m = this.member(client);
      if (!m || m.seat !== "p1" || this.stage !== "waiting" || this.members.length < 2) return;
      this.members.forEach((x) => (x.vote = null));
      this.mismatch = false;
      this.stage = "vote";
      this.publish();
    },

    /** The host plays against the computer instead of waiting for a second player. */
    addBot: (client: Client) => {
      const m = this.member(client);
      if (!m || m.seat !== "p1" || this.stage !== "waiting" || this.members.length !== 1) return;
      this.members.push({ sessionId: "bot", account: { id: "bot", username: "Bot" }, seat: "p2", connected: true, vote: null, deck: null, isBot: true });
      void this.lock(); // nobody else can join a room that has a bot
      this.publish();
    },

    removeBot: (client: Client) => {
      const m = this.member(client);
      if (!m || m.seat !== "p1" || this.stage !== "waiting" || !this.bot) return;
      this.members = this.members.filter((x) => !x.isBot);
      void this.unlock();
      this.publish();
    },

    vote: (client: Client, message: { size?: number }) => {
      const m = this.member(client);
      if (!m || this.stage !== "vote" || !(DECK_SIZES as readonly number[]).includes(message?.size as number)) return;
      m.vote = message.size as number;
      if (this.bot) this.bot.vote = m.vote; // the bot always agrees with the host
      this.mismatch = false;
      const [a, b] = this.members;
      if (this.members.length === 2 && a.vote !== null && b.vote !== null) {
        if (a.vote === b.vote) {
          this.size = a.vote;
          this.members.forEach((x) => (x.deck = null));
          this.stage = "decks";
        } else {
          this.mismatch = true; // they must choose again
          this.members.forEach((x) => (x.vote = null));
        }
      }
      this.publish();
    },

    deck: async (client: Client, message: { name?: string; ids?: unknown; botDeck?: { name?: string; ids?: unknown } }) => {
      const m = this.member(client);
      if (!m || this.stage !== "decks" || this.size === null) return;
      const idsOf = (x: unknown) => (Array.isArray(x) ? (x as unknown[]).filter((y): y is string => typeof y === "string") : []);
      const check = async (ids: string[]) => {
        if (ids.length !== this.size) throw new Error(`The deck needs exactly ${this.size} cards.`);
        const cards = await loadCards(ids);
        const bad = ids.find((id) => !cards[id] || cards[id].playable === false);
        if (bad) throw new Error(`"${bad}" can't be played in this game.`);
        Object.assign(this.defs, cards);
      };
      try {
        const ids = idsOf(message?.ids);
        await check(ids);
        // against the bot, the host brings the bot's deck too (a random one)
        if (this.bot && m.seat === "p1") {
          const botIds = idsOf(message?.botDeck?.ids);
          await check(botIds);
          this.bot.deck = { name: String(message?.botDeck?.name ?? "Bot deck").slice(0, 40), ids: botIds };
        }
        m.deck = { name: String(message?.name ?? "Deck").slice(0, 40), ids };
      } catch (e) {
        client.send("error", { message: e instanceof Error ? e.message : "That deck can't be used." });
        return;
      }
      if (this.stage === "decks" && this.members.length === 2 && this.members.every((x) => x.deck)) this.flipCoin();
      this.publish();
    },

    order: (client: Client, message: { first?: boolean }) => {
      const m = this.member(client);
      if (!m || this.stage !== "coin" || !this.coin || this.coin.winner !== m.seat || this.coin.chose) return;
      this.coin.chose = message?.first === false ? "second" : "first";
      this.startGame(this.coin.chose === "first" ? m.seat : m.seat === "p1" ? "p2" : "p1");
    },

    action: (client: Client, message: { action?: Action; spare?: string[] }) => {
      const m = this.member(client);
      if (!m || !message?.action) return;
      this.play(m, () => this.applyFor(m.seat, message.action as Action, message.spare));
    },

    endTurn: (client: Client) => {
      const m = this.member(client);
      if (!m) return;
      this.play(m, () => this.passThroughTurn(m.seat));
    },

    /** A browser that has just joined (or reconnected) asks where things stand, once it is ready to listen. */
    hello: (client: Client) => {
      const m = this.member(client);
      if (!m) return;
      client.send("room", this.snapshot(m));
      if (this.stage === "playing" || this.stage === "over") this.sendGame(m);
    },

    chat: (client: Client, message: { text?: string }) => {
      const m = this.member(client);
      const text = String(message?.text ?? "").trim().slice(0, 200);
      if (!m || !text) return;
      this.broadcast("chat", { from: m.seat, name: m.account.username, text });
    },
  };

  async onAuth(client: Client, options: { token?: string }) {
    const account = await accountFromToken(options?.token);
    if (!account) throw new Error("Please sign in again.");
    // the same account can't hold two seats
    if (this.members.some((m) => m.account.id === account.id && m.connected)) throw new Error("You are already in this room.");
    return account;
  }

  onCreate(options: { name?: string }) {
    this.title = String(options?.name ?? "").trim().slice(0, 40) || "Room";
  }

  onJoin(client: Client, _options: unknown, account?: Account) {
    const acc = (account ?? (client.auth as Account | undefined))!;
    const back = this.members.find((x) => x.account.id === acc.id);
    if (back) {
      // a player coming back after a lost connection
      back.sessionId = client.sessionId;
      back.connected = true;
      this.publish();
      this.sendGame(back);
      return;
    }
    const seat: PlayerId = this.members.some((x) => x.seat === "p1") ? "p2" : "p1";
    this.members.push({ sessionId: client.sessionId, account: acc, seat, connected: true, vote: null, deck: null });
    if (this.members.length === 2) void this.lock(); // full: the matchmaker stops sending people here
    this.publish();
  }

  async onLeave(client: Client, code: number) {
    const m = this.members.find((x) => x.sessionId === client.sessionId);
    if (!m) return;
    const leftOnPurpose = code === CloseCode.CONSENTED;

    if (this.stage === "playing" && !leftOnPurpose) {
      // a dropped connection: hold the seat for a while
      m.connected = false;
      this.publish();
      try {
        const back = await this.allowReconnection(client, RECONNECT_SECONDS);
        m.sessionId = back.sessionId; // the new connection takes the old seat
        m.connected = true;
        this.publish();
        return; // the browser now asks "hello" and gets the game as it stands
      } catch {
        m.connected = false;
      }
    }

    if (this.stage === "playing") {
      this.finish(m.seat === "p1" ? "p2" : "p1", `${m.account.username} left the game.`);
      return;
    }
    if (this.stage === "over") {
      this.members = this.members.filter((x) => x !== m);
      this.publish();
      return;
    }
    // before the game: the host leaving closes the room, a guest leaving just frees the seat
    if (m.seat === "p1") {
      this.broadcast("closed", { message: `${m.account.username} (the host) closed the room.` });
      this.members = [];
      void this.disconnect();
      return;
    }
    this.members = this.members.filter((x) => x !== m);
    this.members.forEach((x) => ((x.vote = null), (x.deck = null)));
    this.stage = "waiting";
    this.size = null;
    this.mismatch = false;
    this.coin = null;
    void this.unlock();
    this.publish();
  }

  // ───────── helpers ─────────
  private member(client: Client) {
    return this.members.find((x) => x.sessionId === client.sessionId);
  }

  private clientOf(m: Member) {
    return this.clients.find((c) => c.sessionId === m.sessionId);
  }

  private snapshot(m: Member): RoomSnapshot {
    return {
      stage: this.stage,
      name: this.title,
      you: m.seat,
      host: "p1",
      size: this.size,
      mismatch: this.mismatch,
      players: this.members.map((x) => ({ seat: x.seat, name: x.account.username, connected: x.connected, voted: x.vote, deckReady: x.deck !== null, ...(x.isBot ? { bot: true } : {}) })),
      coin: this.coin,
      winner: this.winner,
      endReason: this.endReason,
    };
  }

  /** Tells every player where things stand, and updates the room's line in the lobby. */
  private publish() {
    for (const m of this.members) this.clientOf(m)?.send("room", this.snapshot(m));
    const host = this.members.find((x) => x.seat === "p1");
    void this.setMetadata({ name: this.title, host: host?.account.username ?? "", players: this.members.map((x) => x.account.username), status: this.stage, turn: this.game?.turn ?? 0, bot: this.bot !== undefined });
  }

  private flipCoin() {
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const call = "heads"; // the host calls heads, as in the hot-seat game
    this.coin = { call, result, winner: result === call ? "p1" : "p2", chose: null };
    this.stage = "coin";
    // If the bot wins the toss it chooses (to go first) once the coin has had time to land on the players' screens.
    if (this.bot && this.coin.winner === this.bot.seat) {
      this.botTimer = setTimeout(() => {
        if (this.stage !== "coin" || !this.coin || this.coin.chose || !this.bot) return;
        this.coin.chose = "first";
        void this.startGame(this.bot.seat);
        this.publish();
      }, 5500);
    }
  }

  private async startGame(first: PlayerId) {
    const [a, b] = [this.members.find((x) => x.seat === "p1")!, this.members.find((x) => x.seat === "p2")!];
    this.deckNames = { p1: a.deck!.name, p2: b.deck!.name };
    const decks = { p1: a.deck!.ids, p2: b.deck!.ids };
    this.game = createGame(decks, Math.floor(Math.random() * 2 ** 31), this.defs, { startingPlayer: first, mulligan: true });
    this.stage = "playing";
    this.publish();
    for (const m of this.members) this.sendGame(m, true);
    this.scheduleBot();
  }

  /** The whole game as one player sees it: sent when the match starts and to a player who reconnects. */
  private sendGame(m: Member, fresh = false) {
    if (!this.game) return;
    const winnerName = this.coin ? this.members.find((x) => x.seat === this.coin!.winner)?.account.username : "";
    const callerName = this.members.find((x) => x.seat === "p1")?.account.username;
    this.clientOf(m)?.send("start", {
      view: viewFor(this.game, m.seat),
      events: [] as GameEvent[],
      you: m.seat,
      names: Object.fromEntries(this.members.map((x) => [x.seat, x.account.username])),
      deckNames: this.deckNames,
      summary: this.coin ? `${callerName} called ${this.coin.call}; it landed ${this.coin.result}. ${winnerName} won the flip and chose to go ${this.coin.chose}.` : "",
      fresh,
    });
  }

  private sendUpdate(events: GameEvent[]) {
    if (!this.game) return;
    for (const m of this.members) this.clientOf(m)?.send("update", { view: viewFor(this.game, m.seat), events });
  }

  /** One action at a time, only from the right player, and the new state goes out to both. */
  private play(m: Member, run: () => { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string }) {
    if (this.stage !== "playing" || !this.game || this.busy) return;
    this.busy = true;
    try {
      const r = run();
      if (!r.ok) {
        this.clientOf(m)?.send("error", { message: r.error });
        return;
      }
      this.game = r.state;
      this.sendUpdate(r.events);
      if (this.game.winner) this.finish(this.game.winner, null);
    } finally {
      this.busy = false;
    }
    this.scheduleBot();
  }

  /** The bot's turn to act: it thinks (it is quick), waits a moment so the screen can follow, then plays. */
  private scheduleBot() {
    const bot = this.bot;
    if (!bot || this.stage !== "playing" || !this.game || this.game.winner || playerToAct(this.game) !== bot.seat) return;
    clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      const game = this.game;
      if (!game || this.stage !== "playing" || playerToAct(game) !== bot.seat) return;
      // the bot is given only what a player could see
      const action = botAction(viewFor(game, bot.seat), bot.seat);
      if (!action) {
        this.finish(bot.seat === "p1" ? "p2" : "p1", "The bot could not find a move.");
        return;
      }
      const quick = ["passPriority", "passPhase", "keepHand", "mulligan", "discard", "assignDamage", "pick", "chooseTargets", "declareBlockers"].includes(action.type);
      this.botTimer = setTimeout(() => this.play(bot, () => this.applyFor(bot.seat, action)), quick ? 250 : 900 + Math.random() * 600);
    }, 60);
  }

  private get bot(): Member | undefined {
    return this.members.find((x) => x.isBot);
  }

  private applyFor(seat: PlayerId, action: Action, spare?: string[]) {
    const state = this.game!;
    if (action.type !== "concede" && playerToAct(state) !== seat) return { ok: false as const, error: "It isn't your turn to act." };
    const held = spare && spare.length > 0 ? { ...state, players: { ...state.players, [seat]: { ...state.players[seat], spareMana: spare } } } : state;
    const r = applyAction(held, seat, action);
    if (r.ok) r.state.players[seat].spareMana = undefined;
    return r;
  }

  /** "End turn": passes through the rest of the turn in one go, as the hot-seat button does. */
  private passThroughTurn(seat: PlayerId) {
    let s = this.game!;
    if (playerToAct(s) !== seat) return { ok: false as const, error: "It isn't your turn to act." };
    const events: GameEvent[] = [];
    const turn = s.turn;
    for (let i = 0; i < 6 && s.turn === turn && !s.winner && s.phase !== "cleanup"; i++) {
      const r = applyAction(s, playerToAct(s), { type: "passPhase" });
      if (!r.ok) return i === 0 ? r : { ok: true as const, state: s, events };
      s = r.state;
      events.push(...r.events);
    }
    return { ok: true as const, state: s, events };
  }

  private finish(winner: PlayerId | "draw", reason: string | null) {
    if (this.stage === "over") return;
    if (reason && this.game && !this.game.winner) {
      // someone left: the game state itself records the result
      const r = applyAction(this.game, winner === "p1" ? "p2" : "p1", { type: "concede" });
      if (r.ok) {
        this.game = r.state;
        this.sendUpdate(r.events);
      }
    }
    this.winner = winner;
    this.endReason = reason;
    this.stage = "over";
    const a = this.members.find((x) => x.seat === "p1");
    const b = this.members.find((x) => x.seat === "p2");
    if (a && b && !this.bot) void saveMatch({ p1: a.account.id, p2: b.account.id, winner: winner === "draw" ? null : (winner === "p1" ? a : b).account.id, turns: this.game?.turn ?? 0 });
    this.publish();
  }

  onDispose() {
    clearTimeout(this.botTimer);
  }

  /** Test helper: the real state, never sent to anyone. */
  debugGame() {
    return this.game;
  }
}

export { HIDDEN_CARD_ID };
