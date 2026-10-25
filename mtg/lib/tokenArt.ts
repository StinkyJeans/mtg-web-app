"use client";

import { useEffect, useState } from "react";
import type { CardDef } from "@mtg/engine";

// Tokens (a 1/1 Merfolk, a Treasure...) are made up during the game and have no art in our database.
// Scryfall has art for every token, so the first time a token appears we look its picture up by name, size and color.

const COLOR: Record<string, string> = { W: "w", U: "u", B: "b", R: "r", G: "g" };
const cache = new Map<string, Promise<TokenArt | null>>();

export interface TokenArt {
  /** Small picture for the board. */
  small: string;
  /** Large picture for the card detail view. */
  large: string;
  /** Only when Scryfall has no picture of this token: the artwork of a real creature of the same kind, to draw our own token card around. */
  crop?: string;
}

/** The game gives token definitions an id that starts with "token-". */
export const isTokenDef = (def: CardDef) => def.id.startsWith("token-");

async function search(query: string): Promise<TokenArt | null> {
  const r = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=art&order=released`);
  if (!r.ok) return null;
  const data = (await r.json()) as { data?: { image_uris?: { small: string; large: string }; card_faces?: { image_uris?: { small: string; large: string } }[] }[] };
  for (const card of data.data ?? []) {
    const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
    if (uris) return { small: uris.small, large: uris.large };
  }
  return null;
}

/** Artwork (no card frame) of an ordinary card, for tokens Scryfall has no picture of. */
async function searchCrop(query: string): Promise<string | null> {
  const r = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=art&order=released`);
  if (!r.ok) return null;
  const data = (await r.json()) as { data?: { image_uris?: { art_crop?: string }; card_faces?: { image_uris?: { art_crop?: string } }[] }[] };
  for (const card of data.data ?? []) {
    const crop = card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop;
    if (crop) return crop;
  }
  return null;
}

/** "Creature — Unicorn" -> "Unicorn" (the first creature type, or the token's name). */
const kindOf = (def: CardDef) => ((def.typeLine ?? "").split("—")[1] ?? "").trim().split(/\s+/)[0] || def.name.split(/\s+/).pop() || def.name;

/** Looks up the art for a token (once: the answer is remembered). */
export function fetchTokenArt(def: CardDef): Promise<TokenArt | null> {
  const key = `${def.name}|${def.power}|${def.toughness}|${(def.colors ?? []).join("")}`;
  let hit = cache.get(key);
  if (!hit) {
    const name = def.name.replace(/"/g, "");
    const colors = (def.colors ?? []).length > 0 ? `c=${(def.colors ?? []).map((c) => COLOR[c]).join("")}` : "c:c";
    const stats = def.power !== undefined && def.toughness !== undefined ? ` pow=${def.power} tou=${def.toughness}` : "";
    // the exact name with the right size and color first, then looser and looser matches
    hit = search(`t:token !"${name}"${stats} ${colors}`)
      .then((art) => art ?? search(`t:token !"${name}"${stats}`))
      .then((art) => art ?? search(`t:token name:"${name}"${stats} ${colors}`))
      .then((art) => art ?? search(`t:token name:"${name}"${stats}`))
      .then((art) => art ?? search(`t:token t:"${name}"`))
      // no token like it exists: borrow the artwork of a real creature of the same kind, size and color
      .then(async (art) => {
        if (art) return art;
        const kind = kindOf(def).replace(/[^\p{L}'-]/gu, "");
        if (!kind) return null;
        const col = (def.colors ?? []).length > 0 ? ` c=${(def.colors ?? []).map((c) => COLOR[c]).join("")}` : "";
        const crop = (await searchCrop(`t:${kind}${col}${stats} -t:token game:paper`)) ?? (await searchCrop(`t:${kind}${col} -t:token game:paper`)) ?? (await searchCrop(`t:${kind} -t:token game:paper`));
        return crop ? { small: "", large: "", crop } : null;
      })
      .catch(() => null);
    cache.set(key, hit);
  }
  return hit;
}

/** The art for a token, or null while it is loading or when there is none. Does nothing for ordinary cards. */
export function useTokenArt(def: CardDef): TokenArt | null {
  const [art, setArt] = useState<TokenArt | null>(null);
  const token = isTokenDef(def) && !def.image;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchTokenArt(def).then((a) => !cancelled && setArt(a));
    return () => {
      cancelled = true;
    };
  }, [token, def]);
  return token ? art : null;
}
