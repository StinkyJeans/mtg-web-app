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
