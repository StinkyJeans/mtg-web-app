// Signing in goes through here, so that wrong passwords can be counted: 5 wrong tries lock the account for 10 minutes
// (see lib/loginLimit.ts). The count for a real account is kept inside that account in Supabase (app_metadata), so it
// holds across servers and restarts; a name that doesn't exist is counted in this server's memory with the same rule,
// so nobody can tell from the behaviour which names exist.
//
// Honest limit: Supabase's own sign-in address is public, and someone who calls it directly skips this route. This
// stops the website's form and ordinary scripts; for the rest, use Supabase's rate limits (Authentication → Rate
// Limits) and, later, a CAPTCHA.

import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth";
import {
  afterWrongPassword,
  describeWait,
  waitSeconds,
} from "@/lib/loginLimit";
import type { LoginLock } from "@/lib/loginLimit";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const ADMIN = {
  apikey: SECRET,
  authorization: `Bearer ${SECRET}`,
  "content-type": "application/json",
};

const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
const locked = (seconds: number) =>
  json(
    {
      error: `Too many wrong passwords. Try again in ${describeWait(seconds)}.`,
      retryAfterSeconds: seconds,
    },
    429,
    { "retry-after": String(seconds) },
  );

// ───────── counters kept in this server's memory: names that don't exist, and each address ─────────
const unknownNames = new Map<string, LoginLock>();
const ADDRESS_TRIES = 20; // one address trying many names (a school or a home network may share one)
const addressFails = new Map<string, { count: number; since: number }>();

function prune(map: Map<string, unknown>, size = 5000) {
  if (map.size > size) map.clear(); // a flood of made-up names can't grow memory without end
}

function addressBlocked(ip: string, now: number): number {
  const f = addressFails.get(ip);
  if (!f || now - f.since > 10 * 60_000) return 0;
  return f.count >= ADDRESS_TRIES
    ? Math.ceil((f.since + 10 * 60_000 - now) / 1000)
    : 0;
}
function addressFailed(ip: string, now: number) {
  prune(addressFails);
  const f = addressFails.get(ip);
  if (!f || now - f.since > 10 * 60_000)
    addressFails.set(ip, { count: 1, since: now });
  else f.count++;
}

// ───────── the lock inside a real account ─────────
async function profileId(name: string): Promise<string | null> {
  const res = await fetch(
    `${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(name)}&select=id&limit=1`,
    { headers: { apikey: SECRET } },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as { id: string }[];
  return rows[0]?.id ?? null;
}

async function readLock(id: string): Promise<LoginLock | null> {
  const res = await fetch(`${URL}/auth/v1/admin/users/${id}`, {
    headers: ADMIN,
  });
  if (!res.ok) return null;
  const user = (await res.json()) as {
    app_metadata?: { login_lock?: LoginLock };
  };
  return user.app_metadata?.login_lock ?? null;
}

async function writeLock(id: string, lock: LoginLock | null): Promise<void> {
  await fetch(`${URL}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: ADMIN,
    body: JSON.stringify({ app_metadata: { login_lock: lock } }),
  });
}

// one sign-in attempt per name at a time on this server, so a burst of parallel guesses can't all be counted as the first
const queues = new Map<string, Promise<unknown>>();
function oneAtATime<T>(key: string, job: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(job, job);
  const tail = run.finally(
    () => queues.get(key) === tail && queues.delete(key),
  );
  queues.set(key, tail);
  return run;
}

export async function POST(request: Request) {
  if (!URL || !PUBLISHABLE)
    return json({ error: "Sign-in is not set up on this server." }, 503);
  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  if (typeof body?.username !== "string" || typeof body.password !== "string")
    return json({ error: "Enter a username and a password." }, 400);
  const name = normalizeUsername(body.username);
  const password = body.password;
  if (
    !name ||
    name.length > MAX_USERNAME_LENGTH ||
    !password ||
    password.length > MAX_PASSWORD_LENGTH
  )
    return json({ error: "Wrong username or password." }, 401);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const early = addressBlocked(ip, Date.now());
  if (early > 0) return locked(early);

  return oneAtATime(name, async () => {
    const now = Date.now();
    const id = SECRET ? await profileId(name) : null;
    const current = id ? await readLock(id) : (unknownNames.get(name) ?? null);
    const wait = waitSeconds(current, now);
    if (wait > 0) return locked(wait); // locked: the password isn't even checked, so a right guess can't get in during the wait

    const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE, "content-type": "application/json" },
      body: JSON.stringify({ email: usernameToEmail(name), password }),
    });

    if (res.ok) {
      const session = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      if (id && current) await writeLock(id, null); // a good password clears the count
      return json({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    const failure = (await res.json().catch(() => ({}))) as {
      error_code?: string;
      msg?: string;
    };
    if (res.status !== 400 || failure.error_code !== "invalid_credentials") {
      // not a wrong password (Supabase's own limit, an outage...): say so, and don't count it against the account
      return json(
        {
          error:
            res.status === 429
              ? "Too many sign-in tries from here. Wait a few minutes."
              : "Could not sign in right now. Try again.",
        },
        res.status === 429 ? 429 : 502,
      );
    }

    addressFailed(ip, now);
    const next = afterWrongPassword(current, now);
    if (id) await writeLock(id, next);
    else {
      prune(unknownNames);
      unknownNames.set(name, next);
    }
    const after = waitSeconds(next, now);
    return after > 0
      ? locked(after)
      : json({ error: "Wrong username or password." }, 401);
  });
}
