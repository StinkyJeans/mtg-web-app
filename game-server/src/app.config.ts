import { defineServer, defineRoom, LobbyRoom, monitor, playground } from "colyseus";
import { MatchRoom } from "./rooms/MatchRoom.js";

/**
 * The live game server.
 *   "lobby"  every signed-in browser joins it to see the list of rooms, updated as rooms open, fill up and close
 *   "match"  one room per match: voting, coin toss and the game itself (see rooms/MatchRoom.ts)
 */
const server = defineServer({
  rooms: {
    lobby: defineRoom(LobbyRoom),
    match: defineRoom(MatchRoom).enableRealtimeListing(),
  },

  express: (app) => {
    app.get("/health", (_req, res) => {
      res.json({ ok: true });
    });
    // handy while developing; never expose these on the internet
    if (process.env.NODE_ENV !== "production") {
      app.use("/monitor", monitor());
      app.use("/", playground());
    }
  },
});

export default server;
