# MTG Duel live game server

A [Colyseus](https://colyseus.io) server (0.18) that runs online matches between two players.
The rules live in `packages/engine`; this server holds the real game state and applies every action with that engine,
so neither browser can cheat. Each player is only ever sent what they may see (`viewFor` in the engine): their own hand,
but not the opponent's hand or either library.

## Run it

```
cd game-server
npm install        # first time only
npm start          # listens on http://localhost:2567
```

It reads the Supabase settings from `../mtg/.env.local` (the same file the website uses; it needs
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`).
Then start the website as usual (`cd mtg && npm run dev`) and sign in on the home page.

The website finds the server at the same address as the page itself, port 2567 (so `http://192.168.1.20:3000`
uses `ws://192.168.1.20:2567`). To use another address, set `NEXT_PUBLIC_GAME_SERVER_URL` in `mtg/.env.local`.

## Playing

1. Home page: **Create room** (or **Join** a room in the Live matches list).
2. The host presses **Vote** once a second player has joined. Both vote for a deck size (20, 40 or 60) and must agree.
3. Both choose a deck (saved decks of that size, the starter deck, or a random one) and press **Ready**.
4. The server tosses the coin (the host calls heads). The winner chooses to go first or second.
5. The match starts on the play screen. Refreshing the page mid-match rejoins the same seat (the seat is held for 60 seconds).

## How it fits together

- `src/rooms/MatchRoom.ts`: one room per match (waiting → vote → decks → coin → playing → over), the messages, the rules.
- `src/supabase.ts`: checks who a player is (their Supabase login), loads card definitions, saves the finished match.
- `src/app.config.ts`: the `lobby` room (live list of rooms) and the `match` room.
- `test/match.test.ts`: plays whole matches through the real server (`npm test`; uses `DEV_AUTH=1` so tests can use fake accounts like `dev:alice`;
  that switch is never on in normal use).
- Website side: `mtg/lib/online/` (connection), `mtg/app/lobby/` (dashboard, room and vote pop-ups), `mtg/app/play/online/` (the match).

## Not online yet

- Only on your own network (or a tunnel) for now. Playing over the internet needs the server hosted somewhere reachable (Fly.io, Railway, a small VPS).
- Spectating a live match, and showing the opponent's sleeves and playmat.
