"use client";

import { useState } from "react";
import Link from "next/link";
import type { CardType } from "@mtg/engine";
import { CARDS_PAGE_SIZE } from "@/lib/cards";
import { Lightbox } from "../play/CardDetail";
import CardView from "../play/CardView";
import TypeButton from "./TypeButton";
import { useCardSearch } from "./useCardSearch";

type Filter = "all" | CardType;
const TYPES: Filter[] = ["all", "creature", "land", "instant", "sorcery", "enchantment", "artifact", "planeswalker"];

export default function CardBrowser() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<Filter>("all");
  const [playableOnly, setPlayableOnly] = useState(false);
  const [page, setPage] = useState(0);
  const { result, loading } = useCardSearch({ query, type, playableOnly, page });
  const [zoomedIdx, setZoomedIdx] = useState<number | null>(null); // position on this page, while a card is open large

  const shown = result?.cards ?? [];
  const zoomed = zoomedIdx === null ? undefined : shown[zoomedIdx];
  const step = (by: number) => setZoomedIdx((i) => (i === null || shown.length === 0 ? null : (i + by + shown.length) % shown.length));
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / CARDS_PAGE_SIZE));
  const pill = (on: boolean) =>
    `rounded px-3 py-1 text-sm capitalize ${on ? "bg-amber-500 font-semibold text-black" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`;

  return (
    <main className="flex flex-1 flex-col gap-4 p-6 text-zinc-900">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-zinc-600 underline hover:text-zinc-800">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold">Cards</h1>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name"
          className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
        />
        <button
          onClick={() => {
            setPlayableOnly(!playableOnly);
            setPage(0);
          }}
          className={pill(playableOnly)}
          title="Cards the game engine can play today"
        >
          Playable only
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <TypeButton
            key={t}
            type={t}
            active={type === t}
            onClick={() => {
              setType(t);
              setPage(0);
            }}
          />
        ))}
        <span className="ml-2 text-sm text-zinc-500">{loading ? "Loading…" : `${total.toLocaleString()} cards`}</span>
      </div>

      {result?.error && <p className="text-sm text-red-600">Could not load cards: {result.error}</p>}
      {result && !result.error && !loading && total === 0 && (
        <p className="text-zinc-600">No cards found. If the database is empty, run the card import (see the project notes).</p>
      )}

      <div className={`flex flex-wrap gap-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {result?.cards.map((def, i) => (
          <div key={def.id} className="flex flex-col gap-1">
            <CardView def={def} size="lg" onClick={() => setZoomedIdx(i)} />
            {def.playable === false && <span className="text-[10px] text-zinc-500">Not playable yet</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded bg-zinc-200 px-3 py-1 disabled:opacity-40">
          ← Prev
        </button>
        <span className="text-zinc-600">
          Page {page + 1} of {pages.toLocaleString()}
        </span>
        <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded bg-zinc-200 px-3 py-1 disabled:opacity-40">
          Next →
        </button>
      </div>

      {zoomed && (
        <Lightbox
          def={zoomed}
          onClose={() => setZoomedIdx(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          caption={`Card ${zoomedIdx! + 1} of ${shown.length} on this page`}
        />
      )}
    </main>
  );
}
