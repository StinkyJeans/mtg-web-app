// Keeps what never changes on the device, so a return visit does not wait for the network.
//   - card pictures (Scryfall and our own storage): kept until the cache is full
//   - the app's built scripts and styles (/_next/static, named by content): kept for good
//   - the card catalogue and the official decks from the database: fresh for 12 hours
// Pages themselves, your own decks, matches and logins are never touched here.

const VERSION = "v2";
const IMAGES = `mtg-images-${VERSION}`;
const STATIC = `mtg-static-${VERSION}`;
const DATA = `mtg-data-${VERSION}`;
const MAX_IMAGES = 900;
const DATA_FRESH_MS = 12 * 60 * 60 * 1000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("mtg-") && ![IMAGES, STATIC, DATA].includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

const isCardImage = (url) =>
  url.hostname === "cards.scryfall.io" || (url.pathname.startsWith("/storage/v1/object/public/card-art/") && url.hostname.endsWith(".supabase.co"));

// Public catalogue only: every card, and the official decks (never the ones you own).
const isCatalogue = (url) =>
  url.hostname.endsWith(".supabase.co") &&
  (url.pathname === "/rest/v1/cards" || (url.pathname === "/rest/v1/decks" && url.searchParams.get("official") === "eq.true"));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.destination === "image" && isCardImage(url)) return event.respondWith(cardImage(req));
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(STATIC, req));
  if (isCatalogue(url)) return event.respondWith(freshData(req));
});

async function cacheFirst(name, req) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) void cache.put(req, res.clone());
  return res;
}

/** A card picture: the saved copy at once, otherwise fetched (as a readable response, so it is cheap to store) and saved. */
async function cardImage(req) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  let res;
  try {
    res = await fetch(req.url, { mode: "cors", credentials: "omit" });
  } catch {
    return fetch(req); // not readable cross-origin: show it, just don't keep it
  }
  if (res.ok) {
    void cache.put(req.url, res.clone()).then(() => trim(cache));
  }
  return res;
}

let trimming = false;
async function trim(cache) {
  if (trimming) return;
  trimming = true;
  try {
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(key); // oldest first
  } finally {
    trimming = false;
  }
}

/** Database reads that hardly change: the saved copy while it is under 12 hours old, else the network (the saved copy if offline). */
async function freshData(req) {
  const cache = await caches.open(DATA);
  const hit = await cache.match(req.url);
  const age = hit ? Date.now() - Number(hit.headers.get("x-cached-at") || 0) : Infinity;
  if (hit && age < DATA_FRESH_MS) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set("x-cached-at", String(Date.now()));
      // A page of results comes back as 206 (a range), which the cache refuses to store: keep it as a 200, the headers (with the total count) stay.
      const copy = new Response(await res.clone().blob(), { status: 200, headers });
      void cache.put(req.url, copy).catch(() => {});
    }
    return res;
  } catch (e) {
    if (hit) return hit;
    throw e;
  }
}
