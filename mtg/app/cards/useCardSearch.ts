"use client";

import { useEffect } from "react";
import { useState } from "react";
import type { CardDef } from "@mtg/engine";
import { searchCards } from "@/lib/cards";
import type { CardSearch } from "@/lib/cards";

export interface CardSearchResult {
  key: string;
  cards: CardDef[];
  total: number;
  error?: string;
}

/** Debounced, paged card search against the database. `loading` is true while results are stale. */
export function useCardSearch(search: CardSearch) {
  const { query, type, playableOnly, page } = search;
  const [result, setResult] = useState<CardSearchResult | null>(null);
  const key = JSON.stringify({ query, type, playableOnly, page });

  useEffect(() => {
    let cancelled = false;
    // Small delay so typing doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      searchCards({ query, type, playableOnly, page })
        .then((r) => !cancelled && setResult({ key, ...r }))
        .catch((e: Error) => !cancelled && setResult({ key, cards: [], total: 0, error: e.message }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, query, type, playableOnly, page]);

  return { result, loading: result?.key !== key };
}
