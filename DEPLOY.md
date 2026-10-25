# Putting MTG Duel on the internet

Two pieces, two services:

| Piece | Where | What it is |
|---|---|---|
| The website (`mtg/`) | **Vercel** (or Railway, see 2B) | the pages, login, decks, and the play screen |
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

## 2. The website

Pick ONE of these two. Both work; the first is free, the second keeps everything in one place.

### 2A. The website on Vercel (free)


1. vercel.com: sign in with GitHub, **Add New → Project**, import the repository.
2. **Root Directory**: `mtg`. Keep **Include source files outside of the Root Directory** switched on (it is by default).
   The install and build commands come from `mtg/vercel.json`.
3. **Environment Variables** (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = same as in `mtg/.env.local`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
   - `NEXT_PUBLIC_GAME_SERVER_URL` = the Railway address from step 1.4 (`https://...up.railway.app`)
4. **Deploy**. You get an address like `https://mtg-duel.vercel.app`. Send that to your brother.

If you change `NEXT_PUBLIC_GAME_SERVER_URL` later, redeploy the website: these values are baked in at build time.

### 2B. The website on Railway too (everything in one place)

Same Railway project as the game server, a second service.

1. In the Railway project: **New → GitHub Repo →** the same repository. This creates a second service.
2. Open it → **Settings → Config-as-code file path**: `mtg/railway.json`. Leave **Root Directory** empty.
3. **Variables** (set them BEFORE the first build finishes, or redeploy afterwards: these are baked into the pages while they build):
   - `NEXT_PUBLIC_SUPABASE_URL` = same as in `mtg/.env.local`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
   - `NEXT_PUBLIC_GAME_SERVER_URL` = the game server's Railway address from step 1.4 (`https://...up.railway.app`)
   Do **not** put `SUPABASE_SECRET_KEY` on this service.
4. **Settings → Networking → Generate Domain**. That address is the one you send to your brother.
5. If you change a `NEXT_PUBLIC_...` variable later, trigger a **Redeploy** of this service.

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

Vercel's free plan is enough for the website. Railway has no free plan; one small server is usually a few dollars a month, and a second service (the website) adds a little more. Set a usage limit in Railway so there are no surprises.
A match that is in progress is lost if Railway restarts the server (a new deploy does that), so avoid deploying while you are playing.
