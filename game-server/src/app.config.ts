import { monitorEventLoopDelay } from "node:perf_hooks";
import { defineServer, defineRoom, LobbyRoom, matchMaker, monitor, playground, RedisDriver, RedisPresence, WebSocketTransport } from "colyseus";
import { MatchRoom } from "./rooms/MatchRoom.js";
import { botPool } from "./botPool.js";
import { LIMITS } from "./limits.js";

/**
 * The live game server.
 *   "lobby"  every signed-in browser joins it to see the list of rooms, updated as rooms open, fill up and close
 *   "match"  one room per match: voting, coin toss and the game itself (see rooms/MatchRoom.ts)
 *
 * One process is enough for a few hundred matches. To use more than one (see SCALING.md), set REDIS_URL: the processes
 * then share the room list and the "one room per account" rule through Redis, and players are sent to the process
 * that holds their room.
 */
const redis = process.env.REDIS_URL;

// How long the server's one thread is kept from answering: the number that tells you the server is too busy.
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();

const server = defineServer({
  // Redis is optional: without it everything lives in this process's memory.
  ...(redis ? { presence: new RedisPresence(redis), driver: new RedisDriver(redis) } : {}),

  // A browser can't send a huge message to eat the server's memory (the default limit is 100 MB).
  transport: new WebSocketTransport({ maxPayload: LIMITS.maxPayloadBytes() }),

  rooms: {
    lobby: defineRoom(LobbyRoom),
    match: defineRoom(MatchRoom).enableRealtimeListing(),
  },

  express: (app) => {
    // Railway (and any load balancer) asks this; it also reports how busy the server is, for watching it.
    app.get("/health", (_req, res) => {
      res.json({ ok: true });
    });
    app.get("/load", (_req, res) => {
      const ms = (ns: number) => Math.round((ns / 1e6) * 10) / 10;
      res.json({
        rooms: matchMaker.stats.local.roomCount,
        players: matchMaker.stats.local.ccu,
        maxRooms: LIMITS.maxRooms(),
        bot: botPool.stats(),
        // since the last time this was asked, in milliseconds: how late the server was to answer
        eventLoopDelay: { p50: ms(loop.percentile(50)), p99: ms(loop.percentile(99)), max: ms(loop.max) },
      });
      loop.reset();
    });
    // handy while developing; never expose these on the internet
    if (process.env.NODE_ENV !== "production") {
      app.use("/monitor", monitor());
      app.use("/", playground());
    }
  },

  beforeListen: () => {
    if (redis) console.log("Using Redis: this process can run next to others.");
  },
});

// let the bot's worker threads go when the server stops
process.once("SIGTERM", () => void botPool.close());
process.once("SIGINT", () => void botPool.close());

export default server;
