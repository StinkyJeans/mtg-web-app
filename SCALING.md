# Going public: what is in place, and what you do before opening the doors

## What the code now does for you

**Game server** (`game-server/`)
- **The bot thinks in worker threads** (`src/botPool.ts`), so its thinking can't freeze other people's matches. If a worker ever fails, the move is thought out on the spot instead, so a bot never gets stuck.
- **One room per account.** Nobody can flood the lobby with rooms. A room is released when its owner leaves or the game ends.
- **Limits** (all can be changed with environment variables, see below): rooms open at once, bot games at once, messages per second, size of a message, wrong room passwords.
- **Wrong passwords:** 5 wrong guesses and the account waits 60 seconds, whichever room it tries.
- **Idle rooms close by themselves:** a room nobody is using after 30 minutes, a finished game after 10, a game with no move for 2 hours.
- **Login checks are remembered for a minute**, so a busy server doesn't ask Supabase about the same login again and again.
- **`/load`** shows how busy the server is: rooms, players, bot queue, and how late the server is to answer (`eventLoopDelay`). If `p99` stays above ~100 ms, the server is too busy.

**Website** (`mtg/`)
- Card pictures, card data and the app files are kept on each device (`public/sw.js`), and the big wallpaper videos are cached for a week.
- **Profile pictures are files in Supabase Storage**, not part of the login token (which would have been sent with every request).
- The win/loss record is counted by the database instead of downloading up to 1,000 matches.
- **Sign-in limit:** 5 wrong passwords lock that account for 10 minutes (even the right password is refused during the wait, so guessing can't win). The count is kept inside the Supabase account, so it holds across servers and restarts, and a name that doesn't exist is locked the same way, so nobody can tell which names exist. One network address that gets 20 wrong passwords (any names) is also paused. Signing in goes through `/api/login` (`mtg/app/api/login/route.ts`); the rule itself is in `mtg/lib/loginLimit.ts`.

## What you need to do (the code can't do these for you)

### 1. Run the database changes (5 minutes)
Supabase → SQL Editor → New query → paste `supabase/04-scale.sql` → Run. It adds indexes, stores the official deck list as a table (the Decks page used to recount every deck on every visit), and limits each account to 100 decks. After this, `node scripts/import.mjs cards` (or `decks`) refreshes that stored list automatically.

### 2. Give the website the secret key
In Vercel / Railway `web` variables add `SUPABASE_SECRET_KEY` (same value as in `mtg/.env.local`). Without it, profile pictures say "not set up". The first picture uploaded creates the `avatars` storage bucket by itself.

### 3. Protect sign-in and sign-up (Supabase dashboard)
The 5-tries limit above only covers the website's own sign-in form. Supabase's sign-in address is public, so someone calling it directly skips our limit. Supabase's own limits are the backstop: **Authentication → Rate Limits** (by default about 30 sign-ins per 5 minutes per address; lower it if you like). A per-account lock enforced by Supabase itself needs its "Password Verification" hook, which is only on the Teams plan.

Accounts are made from a username, not an email, so "confirm email" can't be used. Instead:
- **Later, when it is needed: Authentication → Attack Protection → CAPTCHA** (Supabase has none of its own: it needs free keys from Cloudflare Turnstile or hCaptcha, and the login form must show the check). Without it, a script can create many accounts.
- **Authentication → Rate Limits:** keep the sign-up and sign-in limits low (the defaults are fine to start).
- Review **Authentication → Providers → Email → minimum password length** (8 or more).

### 4. Plan limits
- **Supabase free plan** pauses the project after a week without use and has small limits. For a public game use the Pro plan.
- **Vercel Hobby** is for personal, non-commercial use. A public game needs Pro.
- **Railway** has no free plan; the game server needs about 512 MB to 1 GB of memory for a few hundred matches.

## How many players is that?

One game-server process, measured on this computer (8 cores) with 60 simultaneous games against the bot: the server stayed at its idle response time (about 16 ms; the worst spike was 64 ms). Matches between two people cost much less than bot games. So a single process is comfortably enough for the first weeks: expect it to hold several hundred matches at once, memory being the limit. Watch `/load`.

To measure your own server: start it with `DEV_AUTH=1` on a test port and run `npx tsx loadtest/botgames.ts 60 30` from `game-server/`.

## Environment variables for the game server

| Variable | Default | Meaning |
|---|---|---|
| `MAX_ROOMS` | 400 | rooms open at once on this process |
| `MAX_BOT_GAMES` | 30 | games against the bot at once |
| `BOT_WORKERS` | CPU count − 1 (1 to 4) | worker threads for the bot (`0` = think on the main thread) |
| `MAX_MESSAGES_PER_SECOND` | 100 | a browser sending more is disconnected |
| `MAX_PAYLOAD_BYTES` | 65536 | largest message accepted |
| `IDLE_MINUTES` | 30 | closes a room nobody uses |
| `STUCK_GAME_MINUTES` | 120 | ends a game with no move for this long |
| `PASSWORD_TRIES` / `PASSWORD_LOCK_SECONDS` | 5 / 60 | wrong room passwords before waiting |
| `REDIS_URL` | not set | see below |

## When one process is no longer enough

First make the one server bigger (more memory/CPU on Railway): that is the simplest and goes a long way. Only then think about several processes:

1. Add a Redis database on Railway and set `REDIS_URL` on the game server. With it, the room list and the "one room per account" rule are shared through Redis (the code for this is in `src/app.config.ts`).
2. Several processes also need a way to send each player to the process that holds their room. Colyseus offers a small proxy for this, or Colyseus Cloud does it for you (see https://docs.colyseus.io/deployment/).

**Not tested:** the Redis setup. There was no Redis to test against here, so treat step 1 and 2 as a starting point to try on a test deployment, not as proven.

## Also worth knowing
- A restart of the game server ends the matches in progress (they are only held in memory). Deploy at quiet times.
- Games against the bot are not recorded in players' win/loss record.
