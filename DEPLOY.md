# Putting MTG Duel on the internet

Two pieces, two services:

| Piece | Where | What it is |
|---|---|---|
| The website (`mtg/`) | **Vercel** | the pages, login, decks, and the play screen |
| The live game server (`game-server/`) | **Railway** | runs the matches (it must stay on all the time) |

Both build from the same GitHub repository. Both also need the rules engine in `packages/engine`; the build files already take care of that.

## 0. Before anything: the code must be on GitHub

The folder `mtg/` must be a normal part of the repository (not a separate repository inside it), and everything must be committed and pushed.
Check on github.com that the `mtg` folder shows files you can open, not a grey arrow.

## 1. The game server on Railway

1. railway.com: sign in with GitHub, **New Project → Deploy from GitHub repo**, choose the repository.
2. Open the service → **Settings**:
   - **Root Directory**: leave empty (the repository root).
   - **Config-as-code file path** (Settings → Config-as-code): `game-server/railway.json`. It tells Railway to build with `game-server/Dockerfile` and to check `/health`.
3. **Variables** (the secret key lives only here, never on Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL` = the same value as in `mtg/.env.local`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
   - `SUPABASE_SECRET_KEY` = same
   Do **not** set `DEV_AUTH`.
4. **Settings → Networking → Generate Domain**. You get something like `https://mtg-game-server-production.up.railway.app`. Copy it.
5. Check it: open `<that address>/health`. You should see `{"ok":true}`.
6. Optional: **Settings → Usage limit** to cap the monthly cost.

## 2. The website on Vercel

1. vercel.com: sign in with GitHub, **Add New → Project**, import the repository.
2. **Root Directory**: `mtg`. Keep **Include source files outside of the Root Directory** switched on (it is by default).
   The install and build commands come from `mtg/vercel.json`.
3. **Environment Variables** (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = same as in `mtg/.env.local`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
   - `NEXT_PUBLIC_GAME_SERVER_URL` = the Railway address from step 1.4 (`https://...up.railway.app`)
4. **Deploy**. You get an address like `https://mtg-duel.vercel.app`. Send that to your brother.

If you change `NEXT_PUBLIC_GAME_SERVER_URL` later, redeploy the website: these values are baked in at build time.

## 3. First game

1. Both of you open the Vercel address and sign in (your brother makes his own account with "Create one").
2. One creates a room, the other joins it from the Live matches list.

## If something goes wrong

- **"Is the game server running?" on the home page**: `NEXT_PUBLIC_GAME_SERVER_URL` is missing or wrong, or Railway has not finished deploying. Open `<railway address>/health`.
- **Sign-in fails**: the two Supabase values on Vercel do not match `mtg/.env.local`.
- **A player is told "Please sign in again"**: the login expired; sign out and in.
- **Railway build fails on `npm ci`**: `game-server/package-lock.json` and `packages/engine/package-lock.json` must be committed.
- **Cards missing in a match**: the card database import (`npm run import:cards` in `mtg/`) must have been run on the same Supabase project.

## Costs

Vercel's free plan is enough for this. Railway has no free plan; a small server like this is usually a few dollars a month.
A match that is in progress is lost if Railway restarts the server (a new deploy does that), so avoid deploying while you are playing.
