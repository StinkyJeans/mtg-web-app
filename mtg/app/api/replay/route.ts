// The replay of one finished match (the game server saves it as a file in the private "replays" bucket).
// The browser sends its login token; the replay is handed over only if that account played in the match.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  const id = new globalThis.URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "That is not a match." }, 400);
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token.length > 4096) return json({ error: "Please sign in again." }, 401);
  // the match row is only visible to its two players (row level security), so asking with THEIR token is the check
  const mine = await fetch(`${URL}/rest/v1/matches?id=eq.${id}&select=id`, { headers: { apikey: PUBLISHABLE, authorization: `Bearer ${token}` } });
  if (!mine.ok) return json({ error: "Please sign in again." }, 401);
  if (((await mine.json()) as unknown[]).length === 0) return json({ error: "You did not play in that match." }, 404);
  const file = await fetch(`${URL}/storage/v1/object/replays/${id}.json`, { headers: { apikey: SECRET, authorization: `Bearer ${SECRET}` } });
  if (!file.ok) return json({ error: "This match was not recorded: only matches played after replays were added have one." }, 404);
  return json(await file.json());
}
