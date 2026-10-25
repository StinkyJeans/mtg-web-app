import type { CardDef, CardType } from "@mtg/engine";

// The server talks to Supabase with plain HTTP calls: it checks who a player is, loads card definitions for a match
// and writes the result. The secret key never leaves this process.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

export interface Account {
  id: string;
  username: string;
}

// A token that was just checked is trusted for a minute: joining the lobby and then a room asks twice, and a busy
// server would otherwise ask Supabase (which limits how often it can be asked) for every single join.
const TOKEN_TRUST_MS = 60_000;
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
  const res = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUBLISHABLE, authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; user_metadata?: { username?: string }; email?: string };
  if (!user.id) return null;
  const account = { id: user.id, username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "player" };
  if (trusted.size >= MAX_TRUSTED) for (const [k, v] of trusted) if (v.until < Date.now()) trusted.delete(k);
  if (trusted.size >= MAX_TRUSTED) trusted.clear();
  trusted.set(token, { account, until: Date.now() + TOKEN_TRUST_MS });
  return account;
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
export async function saveMatch(match: { p1: string; p2: string; winner: string | null; turns: number }): Promise<void> {
  if (match.p1.startsWith("dev-") || match.p2.startsWith("dev-")) return; // test accounts have no profile
  try {
    const res = await fetch(`${URL}/rest/v1/matches`, {
      method: "POST",
      headers: { apikey: SECRET, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(match),
    });
    if (!res.ok) console.warn("Could not save the match:", res.status, await res.text());
  } catch (e) {
    console.warn("Could not save the match:", e);
  }
}
