import type { CardDef, CardType } from "@mtg/engine";

// The server talks to Supabase with plain HTTP calls: it checks who a player is, loads card definitions for a match
// and writes the result. The secret key never leaves this process.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

export interface Account {
  id: string;
  username: string;
  /** The picture's public address, when the player has one. */
  avatar?: string;
}

// A token that was just checked is trusted for a while (never past its own expiry): opening the page asks once, and every room
// opened or joined after that would otherwise wait for two round trips to Supabase (which also limits how often it can be asked).
const TOKEN_TRUST_MS = 10 * 60_000;
const MAX_TRUSTED = 5000;
const trusted = new Map<string, { account: Account; until: number }>();
const asking = new Map<string, Promise<Account | null>>(); // the same token asked twice at once is asked once

/**
 * Who is this token? Asks Supabase, so an expired or made-up token is refused.
 * For local tests only (DEV_AUTH=1) a token like "dev:alice" is accepted as the account "alice".
 */
export async function accountFromToken(token: unknown): Promise<Account | null> {
  if (typeof token !== "string" || token.length === 0 || token.length > 4096) return null;
  if (process.env.DEV_AUTH === "1" && token.startsWith("dev:")) {
    const name = token.slice(4).slice(0, 24);
    return name ? { id: `dev-${name}`, username: name } : null;
  }
  const hit = trusted.get(token);
  if (hit && hit.until > Date.now()) return hit.account;
  let pending = asking.get(token);
  if (!pending) {
    pending = askSupabase(token).finally(() => asking.delete(token));
    asking.set(token, pending);
  }
  return pending;
}

async function askSupabase(token: string): Promise<Account | null> {
  if (!URL || !PUBLISHABLE) throw new Error("The server has no Supabase settings (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
  // The token says who it is for (and when it runs out); Supabase says whether to believe it. The nickname is asked for at the same
  // time as that answer, for the account the token names, and used only if Supabase agrees: one round trip where there were two.
  const claims = claimsOf(token);
  const asking = fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUBLISHABLE, authorization: `Bearer ${token}` } });
  const nickname = claims.sub && /^[0-9a-f-]{36}$/i.test(claims.sub)
    ? fetch(`${URL}/rest/v1/profiles?id=eq.${claims.sub}&select=nickname`, { headers: { apikey: SECRET } }).then((r) => (r.ok ? r.json() : [])).catch(() => [])
    : Promise.resolve([]);
  const res = await asking;
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; user_metadata?: { username?: string; avatar?: string | number | null }; email?: string };
  if (!user.id) return null;
  let username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "player";
  // a player's nickname (if they chose one) is the name shown in rooms and matches; the login name still identifies the account
  if (user.id === claims.sub) {
    const nick = ((await nickname) as { nickname?: string | null }[])[0]?.nickname;
    if (nick) username = nick;
  } else {
    const named = await fetch(`${URL}/rest/v1/profiles?id=eq.${user.id}&select=nickname`, { headers: { apikey: SECRET } }).catch(() => null);
    const nick = named?.ok ? ((await named.json()) as { nickname?: string | null }[])[0]?.nickname : null;
    if (nick) username = nick;
  }
  // the picture: a version number in the profile points at the file in storage (older accounts kept the picture itself, too big to pass around)
  const stored = user.user_metadata?.avatar;
  const avatar = stored !== undefined && stored !== null && !String(stored).startsWith("data:") ? `${URL}/storage/v1/object/public/avatars/${user.id}.jpg?v=${stored}` : undefined;
  const account: Account = { id: user.id, username, ...(avatar ? { avatar } : {}) };
  if (trusted.size >= MAX_TRUSTED) for (const [k, v] of trusted) if (v.until < Date.now()) trusted.delete(k);
  if (trusted.size >= MAX_TRUSTED) trusted.clear();
  trusted.set(token, { account, until: Math.min(Date.now() + TOKEN_TRUST_MS, claims.exp ? claims.exp * 1000 : Infinity) });
  return account;
}

/** What a token says about itself (not checked here: Supabase checks it). */
function claimsOf(token: string): { sub?: string; exp?: number } {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { sub?: string; exp?: number };
  } catch {
    return {};
  }
}

interface CardRow {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  power: number | null;
  toughness: number | null;
  image_path: string | null;
  type_line: string | null;
  mana_cost: string | null;
  colors: string[] | null;
  oracle_text: string | null;
  rarity: string | null;
  playable: boolean;
  scryfall_id: string | null;
  keywords: string[] | null;
}
const COLUMNS = "id,name,type,cost,power,toughness,image_path,type_line,mana_cost,colors,oracle_text,rarity,playable,scryfall_id,keywords";

// the same mapping the website uses (mtg/lib/cards.ts), so both sides see identical cards
function rowToDef(row: CardRow): CardDef {
  const def: CardDef = { id: row.id, name: row.name, type: row.type, cost: row.cost, playable: row.playable };
  if (row.power !== null) def.power = row.power;
  if (row.toughness !== null) def.toughness = row.toughness;
  if (row.type === "planeswalker" && row.toughness !== null) def.loyalty = row.toughness;
  if (row.image_path) def.image = row.image_path;
  if (row.type_line) def.typeLine = row.type_line;
  if (row.mana_cost) def.manaCost = row.mana_cost;
  if (row.oracle_text) def.text = row.oracle_text;
  if (row.colors?.length) def.colors = row.colors;
  if (row.rarity) def.rarity = row.rarity;
  if (row.scryfall_id) def.scryfallId = row.scryfall_id;
  if (row.keywords?.length) def.keywords = row.keywords.map((k) => k.toLowerCase());
  return def;
}

const known = new Map<string, CardDef>(); // cards already loaded, kept for the next match

/** Card definitions by id. Ids that don't exist are simply missing from the result. */
export async function loadCards(ids: string[]): Promise<Record<string, CardDef>> {
  const out: Record<string, CardDef> = {};
  const missing: string[] = [];
  for (const id of new Set(ids)) {
    const hit = known.get(id);
    if (hit) out[id] = hit;
    else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const list = batch.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
    const res = await fetch(`${URL}/rest/v1/cards?select=${COLUMNS}&id=in.(${encodeURIComponent(list)})`, { headers: { apikey: SECRET } });
    if (!res.ok) throw new Error(`Could not load cards (${res.status}).`);
    for (const row of (await res.json()) as CardRow[]) {
      const def = rowToDef(row);
      known.set(def.id, def);
      out[def.id] = def;
    }
  }
  return out;
}

/** Records a finished match. A failure is only logged: the game itself is over either way. */
export async function saveMatch(match: { p1: string; p2: string; winner: string | null; turns: number }): Promise<string | null> {
  if (match.p1.startsWith("dev-") || match.p2.startsWith("dev-")) return null; // test accounts have no profile
  try {
    const res = await fetch(`${URL}/rest/v1/matches`, {
      method: "POST",
      headers: { apikey: SECRET, "content-type": "application/json", prefer: "return=representation" },
      body: JSON.stringify(match),
    });
    if (!res.ok) {
      console.warn("Could not save the match:", res.status, await res.text());
      return null;
    }
    return ((await res.json()) as { id?: string }[])[0]?.id ?? null;
  } catch (e) {
    console.warn("Could not save the match:", e);
    return null;
  }
}

/**
 * The replay of a finished match: its seed, decks and every action, so the engine can play it again move by move.
 * It is a file in a private Storage bucket ("replays", one JSON per match). The website serves it only to the two players.
 */
export async function saveReplay(matchId: string, replay: unknown): Promise<void> {
  try {
    const headers = { apikey: SECRET, authorization: `Bearer ${SECRET}` };
    await fetch(`${URL}/storage/v1/bucket`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ id: "replays", name: "replays", public: false }) }).catch(() => undefined); // exists already: fine
    const res = await fetch(`${URL}/storage/v1/object/replays/${matchId}.json`, { method: "POST", headers: { ...headers, "content-type": "application/json", "x-upsert": "true" }, body: JSON.stringify(replay) });
    if (!res.ok) console.warn("Could not save the replay:", res.status, await res.text());
  } catch (e) {
    console.warn("Could not save the replay:", e);
  }
}

// ───────── matches in progress ─────────
// Saved after every change, so a restart of the server (a deploy) doesn't end them: see supabase/04-live-matches.sql.
// Without Supabase settings, or with LIVE_MATCHES=memory (the tests), they are only kept in this process.
const memory = new Map<string, string>();
const inMemory = () => process.env.LIVE_MATCHES === "memory" || !URL || !SECRET;
const KEEP_HOURS = 24; // a saved match nobody came back to is deleted after this long

const warned = new Set<string>();
const warnOnce = (key: string, ...message: unknown[]) => {
  if (warned.has(key)) return; // a missing table would otherwise log on every move
  warned.add(key);
  console.warn(...message);
};

async function live(method: "POST" | "DELETE", query: string, body?: string): Promise<void> {
  try {
    const res = await fetch(`${URL}/rest/v1/live_matches${query}`, {
      method,
      headers: { apikey: SECRET, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
      body,
    });
    if (!res.ok) warnOnce(`${method}${res.status}`, `Could not ${method === "POST" ? "save" : "delete"} a match in progress:`, res.status, await res.text());
  } catch (e) {
    warnOnce("unreachable", "Could not reach Supabase for a match in progress:", e);
  }
}

/**
 * `json` is the match already turned into text, so later changes to the room can't leak into a save that is still waiting.
 * It is stored as text inside the jsonb column: jsonb would reorder the keys, and the match must come back exactly as it was.
 */
export async function saveLive(roomId: string, json: string): Promise<void> {
  if (inMemory()) return void memory.set(roomId, json);
  await live("POST", "", JSON.stringify({ room_id: roomId, updated_at: new Date().toISOString(), data: json }));
}

export async function loadLive(roomId: string): Promise<unknown | null> {
  if (inMemory()) {
    const json = memory.get(roomId);
    return json ? JSON.parse(json) : null;
  }
  const res = await fetch(`${URL}/rest/v1/live_matches?select=data&room_id=eq.${encodeURIComponent(roomId)}`, { headers: { apikey: SECRET } });
  if (!res.ok) throw new Error(`Could not load the match (${res.status}).`);
  const rows = (await res.json()) as { data: unknown }[];
  const data = rows[0]?.data;
  return typeof data === "string" ? JSON.parse(data) : (data ?? null);
}

export async function dropLive(roomId: string): Promise<void> {
  if (inMemory()) return void memory.delete(roomId);
  await live("DELETE", `?room_id=eq.${encodeURIComponent(roomId)}`);
}

/** At start-up: forgets matches that nobody came back to. */
export async function pruneLive(): Promise<void> {
  if (inMemory()) return;
  await live("DELETE", `?updated_at=lt.${new Date(Date.now() - KEEP_HOURS * 3600_000).toISOString()}`);
}

// ───────── friends (the website keeps them in Supabase; the server reads them with its own key) ─────────
const friendCache = new Map<string, { ids: Set<string>; at: number }>();
const FRIENDS_TRUST_MS = 20_000;
/** For tests (DEV_AUTH): friendships between made-up accounts. */
const devFriends = new Map<string, Set<string>>();
export function setDevFriends(a: string, b: string) {
  for (const [x, y] of [[a, b], [b, a]] as const) devFriends.set(x, new Set([...(devFriends.get(x) ?? []), y]));
  friendCache.clear();
}

/**
 * The accounts that are friends of this account (accepted friendships only). Empty if the friends feature isn't installed yet.
 * The answer is kept for `maxAgeMs`; asking with a smaller number gets a fresher one (a friend just accepted, say).
 */
export async function friendIdsOf(accountId: string, maxAgeMs = FRIENDS_TRUST_MS): Promise<Set<string>> {
  if (accountId.startsWith("dev-")) return devFriends.get(accountId) ?? new Set();
  const hit = friendCache.get(accountId);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.ids;
  const ids = new Set<string>();
  try {
    const res = await fetch(`${URL}/rest/v1/friendships?select=requester,addressee&status=eq.accepted&or=(requester.eq.${accountId},addressee.eq.${accountId})&limit=400`, { headers: { apikey: SECRET } });
    if (res.ok) for (const r of (await res.json()) as { requester: string; addressee: string }[]) ids.add(r.requester === accountId ? r.addressee : r.requester);
  } catch {
    // no friends known: nobody is announced as a friend
  }
  if (friendCache.size > 5000) friendCache.clear();
  friendCache.set(accountId, { ids, at: Date.now() });
  return ids;
}
