// Profile pictures. They are files in a public Supabase Storage bucket ("avatars", one JPEG per player), not data in
// the login token: a picture inside the token would be sent with every page and every game connection.
//
// The browser sends its own login token; this route checks who it is, and only then writes to THAT player's file with
// the server's secret key, which never leaves the server.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const BUCKET = "avatars";
const MAX_BYTES = 150_000;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Which account does this login token belong to? Asked of Supabase, so a made-up or expired token is refused. */
async function who(request: Request): Promise<string | null> {
  const token = /^Bearer (.+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token || token.length > 4096) return null;
  const res = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: PUBLISHABLE, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id && /^[0-9a-f-]{36}$/.test(user.id) ? user.id : null;
}

// a few changes a minute is plenty for a profile picture
const recent = new Map<string, number[]>();
function tooOften(id: string): boolean {
  const now = Date.now();
  const times = (recent.get(id) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 6) return true;
  times.push(now);
  recent.set(id, times);
  if (recent.size > 5000)
    for (const [k, v] of recent)
      if (v.every((t) => now - t >= 60_000)) recent.delete(k);
  return false;
}

const storage = (path: string, init: RequestInit) =>
  fetch(`${URL}/storage/v1/${path}`, {
    ...init,
    headers: { apikey: SECRET, ...init.headers },
  });

async function ensureBucket() {
  await storage("bucket", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_BYTES,
      allowed_mime_types: ["image/jpeg"],
    }),
  }); // "already exists" is fine
}

export async function POST(request: Request) {
  if (!SECRET || !URL)
    return json({ error: "Pictures are not set up on this server." }, 503);
  const id = await who(request);
  if (!id) return json({ error: "Please sign in again." }, 401);
  if (tooOften(id))
    return json({ error: "Too many changes. Wait a minute." }, 429);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES)
    return json({ error: "That picture is too big." }, 413);
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff))
    return json({ error: "Only JPEG pictures are accepted." }, 415);

  const put = () =>
    storage(`object/${BUCKET}/${id}.jpg`, {
      method: "POST",
      headers: {
        "content-type": "image/jpeg",
        "x-upsert": "true",
        "cache-control": "max-age=3600",
      },
      body: bytes,
    });
  let res = await put();
  if (!res.ok) {
    await ensureBucket(); // the first picture ever creates the bucket
    res = await put();
  }
  if (!res.ok) return json({ error: "Could not save the picture." }, 502);
  return json({ version: Date.now() });
}

export async function DELETE(request: Request) {
  if (!SECRET || !URL)
    return json({ error: "Pictures are not set up on this server." }, 503);
  const id = await who(request);
  if (!id) return json({ error: "Please sign in again." }, 401);
  if (tooOften(id))
    return json({ error: "Too many changes. Wait a minute." }, 429);
  await storage(`object/${BUCKET}/${id}.jpg`, { method: "DELETE" }); // already gone is fine
  return json({ ok: true });
}
