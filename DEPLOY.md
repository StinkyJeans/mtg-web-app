# Putting MTG Duel on the internet

Everything runs on **Railway**, in the project **mtg-web**. Two pieces, two services:

| Piece | Railway service | Address |
|---|---|---|
| The website (`mtg/`) | `web` | https://web-production-45825.up.railway.app |
| The live game server (`game-server/`) | `game-server` | https://game-server-production-e4d8.up.railway.app |

Both build from the GitHub repository `mtg-fanatics/mtg-web-app`, branch `main`, starting at the repository root.
Both need the rules engine in `packages/engine`; each Dockerfile builds it first.

## Deploying a change

Push to `main`. Railway rebuilds only the service whose files changed:

| Service | Rebuilds when these change |
|---|---|
| `web` | `mtg/**`, `packages/engine/**` |
| `game-server` | `game-server/**`, `packages/engine/**` |

A match that is in progress is lost when the game server restarts, so avoid pushing changes to `game-server/` or `packages/engine/` while you are playing.

To deploy what is on your computer without pushing, run this from the repository root: `railway up --service web` (or `--service game-server`).

## How the services are set up

Railway no longer reads `railway.json` files for new services, so these settings live on each service (dashboard → the service → **Settings**).

| Setting | `web` | `game-server` |
|---|---|---|
| Source | `mtg-fanatics/mtg-web-app`, `main` | same |
| Root Directory | empty (the repository root) | same |
| Build → Dockerfile Path | `mtg/Dockerfile` | `game-server/Dockerfile` |
| Build → Watch Paths | `mtg/**`, `packages/engine/**` | `game-server/**`, `packages/engine/**` |
| Deploy → Healthcheck Path | `/login` | `/health` |
| Deploy → Restart Policy | On failure, 5 retries | same |
| Networking → Domain | generated, port 8080 | generated, port 8080 |

### Variables

`game-server` (the secret key lives only here):
- `NEXT_PUBLIC_SUPABASE_URL` = the same value as in `mtg/.env.local`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
- `SUPABASE_SECRET_KEY` = same
- `PORT` = `8080`
- Do **not** set `DEV_AUTH`.

`web`:
- `NEXT_PUBLIC_SUPABASE_URL` = the same value as in `mtg/.env.local`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = same
- `NEXT_PUBLIC_GAME_SERVER_URL` = `https://${{game-server.RAILWAY_PUBLIC_DOMAIN}}` (Railway fills in the game server's address)
- `PORT` = `8080`

The website's `NEXT_PUBLIC_*` values are baked in at build time: if you change one, or the game server's address changes, redeploy `web`.

## First game

1. Both of you open the website address and sign in (your brother makes his own account with "Create one").
2. One creates a room, the other joins it from the Live matches list.

## If something goes wrong

- **"Is the game server running?" on the home page**: open `<game server address>/health`. You should see `{"ok":true}`. If you do, check `NEXT_PUBLIC_GAME_SERVER_URL` on `web` and redeploy it.
- **A push did not deploy**: the change was outside that service's Watch Paths (see above).
- **Sign-in fails**: the two Supabase values on `web` do not match `mtg/.env.local`.
- **A player is told "Please sign in again"**: the login expired; sign out and in.
- **Build fails on `npm ci`**: `mtg/package-lock.json`, `game-server/package-lock.json` and `packages/engine/package-lock.json` must be committed.
- **Cards missing in a match**: the card database import (`npm run import:cards` in `mtg/`) must have been run on the same Supabase project.
- **Logs**: `railway logs --service web` (or `game-server`); add `--build` for the build log.

## Costs

Railway has no free plan; two small services like these are usually a few dollars a month.
`railway usage` shows what you have spent, and `railway usage limit set` caps it.
