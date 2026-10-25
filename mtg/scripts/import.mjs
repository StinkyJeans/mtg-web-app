// Imports real MTG data into Supabase. Run from the mtg folder:
//
//   node scripts/import.mjs cards   [--limit N] [--dry-run]   cards from Scryfall
//   node scripts/import.mjs images  [--limit N] [--dry-run]   small card images -> Storage bucket "card-art"
//   node scripts/import.mjs decks   [--dry-run]               official decks from MTGJSON (see KEEP_DECKS)
//
// Order matters: cards, then images, then decks. Every phase can be re-run safely and
// `images` resumes where it stopped. --dry-run needs no Supabase key and writes nothing.
// Needs SUPABASE_SECRET_KEY in mtg/.env.local (server-only: no NEXT_PUBLIC_ prefix!).
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { isSupportedCard } from "@mtg/engine";

const UA = "MTGDuelPersonalProject/0.1 (personal, non-commercial)";
const CACHE = path.resolve(".import-cache");
const BUCKET = "card-art";

const args = process.argv.slice(2);
const phase = args[0];
const dryRun = args.includes("--dry-run");
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

// ───────── helpers ─────────
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in mtg/.env.local");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function withRetry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 500 * i * i));
    }
  }
}

async function get(url, accept = "*/*", timeoutMs = 30_000) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

const getJson = (url) => withRetry(async () => (await get(url, "application/json")).json());

async function pool(items, size, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// ───────── Scryfall -> card rows ─────────
const SKIP_LAYOUTS = new Set([
  "token", "double_faced_token", "emblem", "art_series", "vanguard", "planar", "scheme", "augment", "host", "reversible_card",
]);
const TYPE_ORDER = [
  ["Land", "land"], ["Creature", "creature"], ["Planeswalker", "planeswalker"], ["Instant", "instant"],
  ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"], ["Battle", "battle"],
];

const slugBase = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";

/** Streams the Scryfall oracle bulk file (one card per unique card) and keeps only what we need. */
async function loadOracle() {
  fs.mkdirSync(CACHE, { recursive: true });
  const meta = await getJson("https://api.scryfall.com/bulk-data");
  const bulk = meta.data.find((x) => x.type === "oracle_cards");
  const file = path.join(CACHE, path.basename(new URL(bulk.jsonl_download_uri).pathname));
  if (!fs.existsSync(file)) {
    console.log(`Downloading Scryfall oracle cards (${(bulk.compressed_size / 1e6).toFixed(0)} MB)...`);
    const res = await get(bulk.jsonl_download_uri, "*/*", 300_000);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }

  const out = [];
  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    if (SKIP_LAYOUTS.has(c.layout)) continue;
    const front = c.card_faces?.[0];
    out.push({
      oracle_id: c.oracle_id,
      scryfall_id: c.id,
      name: c.name,
      layout: c.layout,
      multiFace: Boolean(c.card_faces),
      type_line: c.type_line,
      frontType: front?.type_line ?? c.type_line,
      mana_cost: c.mana_cost ?? front?.mana_cost ?? "",
      cmc: c.cmc ?? 0,
      colors: c.colors ?? front?.colors ?? [],
      text: c.oracle_text ?? (c.card_faces ? c.card_faces.map((f) => f.oracle_text ?? "").join("\n//\n") : ""),
      rarity: c.rarity,
      set: c.set,
      keywords: c.keywords ?? [],
      power: c.power ?? front?.power ?? null,
      toughness: c.toughness ?? front?.toughness ?? null,
      loyalty: c.loyalty ?? front?.loyalty ?? null,
      small: c.image_uris?.small ?? front?.image_uris?.small ?? null,
    });
  }
  return out;
}

/**
 * Can the game engine play this card today? The engine itself decides: it reads the card's rules text and
 * only accepts a card when every line of it is understood (see packages/engine/src/oracle.ts).
 */
function isPlayable(c, type) {
  // A prepare card is one creature card with a spell beside it: the engine reads both halves from the joined text.
  // A Case is one face; its "To solve" and "Solved" lines are read like any other.
  if (c.layout !== "normal" && c.layout !== "prepare" && c.layout !== "case") return false;
  if (!["land", "creature", "artifact", "enchantment", "planeswalker", "instant", "sorcery"].includes(type)) return false;
  return isSupportedCard({
    id: "check",
    name: c.name,
    type,
    cost: Math.round(c.cmc),
    power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : undefined,
    toughness: /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : undefined,
    loyalty: /^\d+$/.test(c.loyalty ?? "") ? Number(c.loyalty) : undefined,
    typeLine: c.type_line,
    manaCost: c.mana_cost,
    text: c.text,
    keywords: c.keywords.map((k) => k.toLowerCase()),
  });
}

/**
 * Ids already in the database, by Scryfall oracle id. A card keeps its id forever: decks and saved games point at
 * it, and a new card with the same name must not change the id of an old one.
 */
async function loadExistingIds() {
  const supabase = db();
  const existing = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("cards").select("id, oracle_id").not("oracle_id", "is", null).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const row of data) existing.set(row.oracle_id, row.id);
    if (data.length < 1000) break;
  }
  return existing;
}

/**
 * Turns oracle cards into database rows, with readable unique ids like "lightning-bolt".
 * `existing` (oracle id -> id already in the database) keeps old cards on their old ids; only new cards get new ids.
 */
function buildRows(oracle, existing = new Map()) {
  const counts = new Map();
  for (const c of oracle) counts.set(slugBase(c.name), (counts.get(slugBase(c.name)) ?? 0) + 1);
  const taken = new Set(existing.values());

  return oracle.map((c) => {
    const base = slugBase(c.name);
    let id = existing.get(c.oracle_id);
    if (!id) {
      id = counts.get(base) > 1 ? `${base}-${c.oracle_id.slice(0, 8)}` : base;
      if (taken.has(id)) id = `${base}-${c.oracle_id.slice(0, 8)}`; // the plain name already belongs to another card
      taken.add(id);
    }
    const front = c.frontType.split("—")[0];
    const type = TYPE_ORDER.find(([word]) => front.includes(word))?.[1] ?? "other";
    return {
      id,
      name: c.name,
      type,
      cost: Math.round(c.cmc),
      power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : null,
      // A planeswalker has no toughness: its starting loyalty is kept in that column (the game reads it back as loyalty).
      toughness: type === "planeswalker" ? (/^\d+$/.test(c.loyalty ?? "") ? Number(c.loyalty) : null) : /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : null,
      type_line: c.type_line,
      mana_cost: c.mana_cost,
      cmc: c.cmc,
      colors: c.colors,
      oracle_text: c.text,
      rarity: c.rarity,
      set_code: c.set,
      keywords: c.keywords,
      oracle_id: c.oracle_id,
      scryfall_id: c.scryfall_id,
      playable: isPlayable(c, type),
      _small: c.small, // not a column: stripped before saving
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const stripPrivate = ({ _small, ...row }) => row;

// ───────── phases ─────────
async function importCards() {
  const rows = buildRows(await loadOracle(), dryRun ? new Map() : await loadExistingIds()).slice(0, limit);
  const playable = rows.filter((r) => r.playable);
  console.log(`${rows.length} cards, ${playable.length} playable by the engine.`);
  if (dryRun) {
    console.log("types:", Object.entries(Object.groupBy(rows, (r) => r.type)).map(([k, v]) => `${k} ${v.length}`).join(", "));
    console.log("sample:", stripPrivate(rows.find((r) => r.id === "lightning-bolt") ?? rows[0]));
    for (const id of ["mountain", "forest", "grizzly-bears", "hill-giant", "mons-s-goblin-raiders", "rumbling-baloth"])
      console.log(`starter card ${id}:`, rows.find((r) => r.id === id) ? `exists, playable=${rows.find((r) => r.id === id).playable}` : "not in Scryfall (your custom row stays)");
    return;
  }
  const supabase = db();
  let done = 0;
  for (const batch of chunks(rows, 500)) {
    const { error } = await withRetry(() => supabase.from("cards").upsert(batch.map(stripPrivate), { onConflict: "id" }));
    if (error) throw new Error(error.message);
    done += batch.length;
    console.log(`cards ${done}/${rows.length}`);
  }
}

async function importImages() {
  const rows = buildRows(await loadOracle(), dryRun ? new Map() : await loadExistingIds());
  const byId = new Map(rows.map((r) => [r.id, r]));

  let todo;
  if (dryRun) {
    todo = rows.filter((r) => r._small);
  } else {
    const supabase = db();
    todo = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("cards").select("id").is("image_path", null).order("id").range(from, from + 999);
      if (error) throw new Error(error.message);
      todo.push(...data.map((d) => byId.get(d.id)).filter((r) => r?._small));
      if (data.length < 1000) break;
    }
  }
  todo = todo.slice(0, limit);
  console.log(`${todo.length} images to upload.`);
  if (dryRun) return console.log("sample:", todo[0]?._small);

  const supabase = db();
  let done = 0;
  let failed = 0;
  for (const group of chunks(todo, 200)) {
    const saved = [];
    await pool(group, 8, async (row) => {
      try {
        const bytes = await withRetry(async () => Buffer.from(await (await get(row._small)).arrayBuffer()));
        const file = `small/${row.id}.jpg`;
        const { error } = await withRetry(() => supabase.storage.from(BUCKET).upload(file, bytes, { contentType: "image/jpeg", upsert: true }));
        if (error) throw new Error(error.message);
        saved.push({ id: row.id, image_path: file });
      } catch (e) {
        failed++;
        console.warn(`  failed ${row.id}: ${e.message}`);
      }
    });
    // Only touch image_path, so re-imported card data (e.g. `playable`) is never overwritten.
    await pool(saved, 8, async ({ id, image_path }) => {
      const { error } = await withRetry(() => supabase.from("cards").update({ image_path }).eq("id", id));
      if (error) throw new Error(error.message);
    });
    done += group.length;
    console.log(`images ${done}/${todo.length} (failed ${failed})`);
  }
  if (failed) console.log(`${failed} failed. Run the same command again to retry them.`);
}

// The official decks players pick from: theme decks, and ready-made Foundations Jumpstart pairs (two 20-card packs make
// a 40-card deck; the packs themselves aren't offered). Any other official deck in the database is removed by `decks`.
const KEEP_DECKS = new Set(["Eerie_SOS", "Lifegain_SOS", "Angels_ECL", "Pirates_ECL"]);
const FOUNDATIONS_PAIRS = [
  ["Vampires", "Healing"],
  ["Cats", "Healing"],
  ["Cats", "Inferno"],
  ["Elves", "Primal"],
  ["Pirates", "Undead"],
  ["Wizards", "Inferno"],
  ["Goblins", "Inferno"],
  ["Vampires", "Undead"],
];
const isFoundationsPack = (meta) => meta.code === "FDN" && meta.type === "Jumpstart";

/** The Foundations pairs, each as one deck: the cards of both packs added up. */
function foundationsPairs(packs) {
  const byName = new Map(packs.map((p) => [p.meta.name, p]));
  return FOUNDATIONS_PAIRS.flatMap(([a, b]) => {
    const [first, second] = [byName.get(a), byName.get(b)];
    if (!first || !second) {
      console.warn(`  no ${a} + ${b}: the ${first ? b : a} pack is missing`);
      return [];
    }
    const counts = new Map(first.counts);
    for (const [key, qty] of second.counts) counts.set(key, (counts.get(key) ?? 0) + qty);
    return [{ meta: { name: `${a} + ${b}`, type: "Foundations", code: "FDN", releaseDate: first.meta.releaseDate, fileName: `${a}+${b}_FDN` }, counts }];
  });
}

async function importDecks() {
  const oracleToId = new Map(buildRows(await loadOracle(), dryRun ? new Map() : await loadExistingIds()).map((r) => [r.oracle_id, r.id]));
  const list = (await getJson("https://mtgjson.com/api/v5/DeckList.json")).data.filter((d) => KEEP_DECKS.has(d.fileName) || isFoundationsPack(d));
  console.log(`${list.length} decks to download.`);

  const downloaded = [];
  let missing = 0;
  let done = 0;
  await pool(list, 8, async (meta) => {
    try {
      const cached = path.join(CACHE, "decks", `${meta.fileName}.json`);
      let deck;
      if (fs.existsSync(cached)) {
        deck = JSON.parse(fs.readFileSync(cached, "utf-8"));
      } else {
        deck = (await getJson(`https://mtgjson.com/api/v5/decks/${meta.fileName}.json`)).data;
        fs.mkdirSync(path.dirname(cached), { recursive: true });
        fs.writeFileSync(cached, JSON.stringify(deck));
      }
      const counts = new Map();
      const sections = [["main", deck.mainBoard], ["side", deck.sideBoard], ["commander", deck.commander]];
      for (const [board, cards] of sections) {
        for (const card of cards ?? []) {
          const id = oracleToId.get(card.identifiers?.scryfallOracleId);
          if (!id) {
            missing += card.count;
            continue;
          }
          counts.set(`${id}|${board}`, (counts.get(`${id}|${board}`) ?? 0) + card.count);
        }
      }
      if (counts.size) downloaded.push({ meta, counts });
    } catch (e) {
      console.warn(`  skipped ${meta.fileName}: ${e.message}`);
    }
    if (++done % 100 === 0) console.log(`downloaded ${done}/${list.length}`);
  });

  const decks = [...downloaded.filter((d) => !isFoundationsPack(d.meta)), ...foundationsPairs(downloaded.filter((d) => isFoundationsPack(d.meta)))];
  const total = decks.reduce((n, d) => n + d.counts.size, 0);
  console.log(`${decks.length} decks, ${total} deck-card rows, ${missing} cards skipped (tokens etc.).`);
  console.log("decks:", decks.map((d) => d.meta.name).join(", "));
  if (dryRun) return;

  const supabase = db();
  const ids = new Map(); // fileName -> deck id
  for (const batch of chunks(decks, 200)) {
    const rows = batch.map(({ meta }) => ({
      official: true,
      name: meta.name.slice(0, 120),
      deck_type: meta.type,
      code: meta.code,
      release_date: meta.releaseDate || null,
      source: meta.source ?? null,
      file_name: meta.fileName,
    }));
    const { data, error } = await withRetry(() => supabase.from("decks").upsert(rows, { onConflict: "file_name" }).select("id, file_name"));
    if (error) throw new Error(error.message);
    data.forEach((d) => ids.set(d.file_name, d.id));
  }

  // Replace the cards of every imported deck, so re-running never duplicates.
  for (const batch of chunks([...ids.values()], 200)) {
    const { error } = await withRetry(() => supabase.from("deck_cards").delete().in("deck_id", batch));
    if (error) throw new Error(error.message);
  }
  const cardRows = decks.flatMap(({ meta, counts }) =>
    [...counts].map(([key, qty]) => {
      const [card_id, board] = key.split("|");
      return { deck_id: ids.get(meta.fileName), card_id, board, qty };
    }),
  );
  let done2 = 0;
  for (const batch of chunks(cardRows, 1000)) {
    const { error } = await withRetry(() => supabase.from("deck_cards").insert(batch));
    if (error) throw new Error(error.message);
    done2 += batch.length;
    console.log(`deck cards ${done2}/${cardRows.length}`);
  }

  // Remove every other official deck imported earlier (starter decks, Jumpstart packs, ...). Players' own decks,
  // including copies they made of official ones, are separate decks and stay.
  const existing = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("decks").select("id, file_name").eq("official", true).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    existing.push(...data);
    if (data.length < 1000) break;
  }
  const stale = existing.filter((d) => !ids.has(d.file_name)).map((d) => d.id);
  for (const batch of chunks(stale, 100)) {
    const { error } = await withRetry(() => supabase.from("decks").delete().in("id", batch)); // deck_cards go with them
    if (error) throw new Error(error.message);
  }
  console.log(`Removed ${stale.length} other official decks.`);
}

const phases = { cards: importCards, images: importImages, decks: importDecks };
if (!phases[phase]) {
  console.error("Usage: node scripts/import.mjs <cards|images|decks> [--limit N] [--dry-run]");
  process.exit(1);
}
await phases[phase]();
console.log("Done.");
