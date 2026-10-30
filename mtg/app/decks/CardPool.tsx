"use client";

import { useState } from "react";
import type { CardDef, CardType } from "@mtg/engine";
import { CARDS_PAGE_SIZE } from "@/lib/cards";
import type { DeckEntries } from "@/lib/decks";
import CardView from "../play/CardView";
import { useHoverZoom } from "../play/HoverZoom";
import { CardSkeletons } from "../Skeleton";
import { usePageKeys } from "@/lib/pageKeys";
import { ManaSymbol } from "../play/ManaSymbols";
import TypeButton from "../cards/TypeButton";
import { useCardSearch } from "../cards/useCardSearch";

type Filter = "all" | CardType;
const TYPES: Filter[] = ["all", "creature", "land", "instant", "sorcery", "enchantment", "artifact", "planeswalker"];
const COLORS = ["W", "U", "B", "R", "G"];

/** The Add cards tab: search the cards the game can play and click one to add a copy to the deck. */
export default function CardPool({ hidden, entries, onAdd, onZoom }: { hidden: boolean; entries: DeckEntries; onAdd: (def: CardDef) => void; onZoom: (def: CardDef) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<Filter>("all");
  const [colors, setColors] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const zoom = useHoverZoom(); // the big card next to whatever the mouse is over
  const { result, loading } = useCardSearch({ query, type, playableOnly: true, colors, page });
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / CARDS_PAGE_SIZE));
  usePageKeys({ page, pages, setPage, enabled: !hidden }); // the arrow keys turn the page (while this list is the one on screen)

  // Any change to the search starts again from the first page.
  const refine = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };
  const toggleColor = refine((c: string) => setColors((cs) => COLORS.filter((x) => (x === c ? !cs.includes(c) : cs.includes(x)))));

  return (
    <section className={hidden ? "hidden" : "glass flex flex-col gap-3 p-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => refine(setQuery)(e.target.value)}
          placeholder="Search cards"
          className="rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-amber-300"
        />
        {TYPES.map((t) => (
          <TypeButton key={t} type={t} active={type === t} onClick={() => refine(setType)(t)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-300">Colors</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggleColor(c)}
            aria-pressed={colors.includes(c)}
            className={`rounded-full p-1 transition ${colors.includes(c) ? "bg-amber-400" : "opacity-40 grayscale hover:opacity-80"}`}
          >
            <ManaSymbol symbol={c} />
          </button>
        ))}
        {colors.length > 0 && (
          <button type="button" onClick={() => refine(setColors)([])} className="text-xs text-slate-300 underline hover:text-white">
            Any color
          </button>
        )}
        <span className="text-xs text-slate-400">
          {colors.length > 0 ? "Cards of these colors, plus colorless ones. " : ""}
          {loading ? "Loading…" : `${total.toLocaleString()} cards`}
        </span>
      </div>
      {result?.error && <p className="text-sm text-red-300">{result.error}</p>}
      {!result && <CardSkeletons count={CARDS_PAGE_SIZE} size="md" className="flex flex-wrap gap-2" />}
      <div className={`flex flex-wrap gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {result?.cards.map((def) => (
          <div key={def.id} {...zoom.on(def)}>
            <CardView def={def} note={entries[def.id] ? `×${entries[def.id]}` : undefined} onClick={() => onAdd(def)} onZoom={() => onZoom(def)} />
          </div>
        ))}
      </div>
      <div className="mx-auto flex items-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-ghost !px-3 !py-1">
          ← Prev
        </button>
        <span className="text-slate-300">
          Page {page + 1} of {pages.toLocaleString()}
        </span>
        <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="btn-ghost !px-3 !py-1">
          Next →
        </button>
      </div>
      {zoom.node}
    </section>
  );
}
