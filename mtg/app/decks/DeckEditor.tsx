"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardDef, CardType } from "@mtg/engine";
import { MAX_COPIES, isBasicLand } from "@mtg/engine";
import { CARDS_PAGE_SIZE, fetchCardsByIds } from "@/lib/cards";
import { deckStatus, getDeck, saveDeck } from "@/lib/decks";
import type { DeckEntries } from "@/lib/decks";
import { Lightbox } from "../play/CardDetail";
import CardView from "../play/CardView";
import { CardSkeletons, Skeleton } from "../Skeleton";
import { ManaSymbol } from "../play/ManaSymbols";
import TypeButton from "../cards/TypeButton";
import { useCardSearch } from "../cards/useCardSearch";

type Filter = "all" | CardType;
const TYPES: Filter[] = ["all", "creature", "land", "instant", "sorcery", "enchantment", "artifact", "planeswalker"];

const pill = (on: boolean) =>
  `rounded px-2.5 py-1 text-xs capitalize ${on ? "bg-amber-500 font-semibold text-black" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`;

/** Create (no deckId) or edit a deck. */
export default function DeckEditor({ deckId }: { deckId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("New deck");
  const [entries, setEntries] = useState<DeckEntries>({});
  const [defs, setDefs] = useState<Record<string, CardDef>>({});
  const [loaded, setLoaded] = useState(!deckId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<CardDef | null>(null); // card shown large in the popup
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<Filter>("all");
  const [playableOnly, setPlayableOnly] = useState(true);
  const [page, setPage] = useState(0);
  const { result, loading } = useCardSearch({ query, type, playableOnly, page });

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    getDeck(deckId)
      .then(async (deck) => ({ deck, defs: await fetchCardsByIds(Object.keys(deck.entries)) }))
      .then(({ deck, defs }) => {
        if (cancelled) return;
        setName(deck.name);
        setEntries(deck.entries);
        setDefs(defs);
        setLoaded(true);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const status = useMemo(() => deckStatus(defs, entries), [defs, entries]);
  const rows = useMemo(
    () =>
      Object.keys(entries)
        .map((id) => defs[id])
        .filter(Boolean)
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    [entries, defs],
  );

  function change(def: CardDef, delta: number) {
    setMessage(null);
    setDefs((d) => ({ ...d, [def.id]: def }));
    setEntries((e) => {
      const next = (e[def.id] ?? 0) + delta;
      const copy = { ...e };
      if (next <= 0) delete copy[def.id];
      else copy[def.id] = next;
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const id = await saveDeck({ id: deckId, name, entries });
      if (deckId) setMessage({ text: "Saved." });
      else router.replace(`/decks/${id}`);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Could not save.", bad: true });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Shell>{<p className="text-red-600">Could not load the deck: {loadError}</p>}</Shell>;
  if (!loaded)
    return (
      <Shell>
        <Skeleton className="h-10 w-72" />
        <CardSkeletons count={18} size="md" className="flex flex-wrap gap-2" />
      </Shell>
    );

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / CARDS_PAGE_SIZE));

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="min-w-64 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-lg font-semibold outline-none focus:border-amber-400"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-5 py-1.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save deck"}
        </button>
        {message && <span className={`text-sm ${message.bad ? "text-red-600" : "text-emerald-600"}`}>{message.text}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* Card search */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search cards"
              className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={() => {
                setPlayableOnly(!playableOnly);
                setPage(0);
              }}
              className={pill(playableOnly)}
              title="Only cards the game can play today"
            >
              Playable only
            </button>
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
            <span className="text-xs text-zinc-500">{loading ? "Loading…" : `${total.toLocaleString()} cards`}</span>
          </div>
          {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
          {!result && <CardSkeletons count={CARDS_PAGE_SIZE} size="md" className="flex flex-wrap gap-2" />}
          <div className={`flex flex-wrap gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {result?.cards.map((def) => (
              <CardView
                key={def.id}
                def={def}
                note={entries[def.id] ? `×${entries[def.id]}` : undefined}
                onClick={() => change(def, 1)}
                onZoom={() => setZoomed(def)}
              />
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
        </section>

        {/* The deck */}
        <aside className="flex h-fit flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-100 p-3 lg:sticky lg:top-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Deck</h2>
            <span className="text-sm text-zinc-600">{status.count} cards</span>
          </div>
          {status.ready ? (
            <p className="text-sm text-emerald-600">Ready to play.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs">
              {status.errors.map((e) => (
                <li key={e} className="text-amber-700">
                  {e}
                </li>
              ))}
              {status.unplayable.length > 0 && (
                <li className="text-red-600">Can&apos;t be played yet: {status.unplayable.map((c) => c.name).join(", ")}</li>
              )}
            </ul>
          )}
          {rows.length === 0 && <p className="text-sm text-zinc-500">Click cards on the left to add them.</p>}
          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {rows.map((def) => {
              const qty = entries[def.id];
              const over = qty > MAX_COPIES && !isBasicLand(def);
              return (
                <li key={def.id} className="flex items-center gap-2 rounded bg-zinc-200/60 px-2 py-1 text-sm">
                  <span className="flex w-6 justify-center"><ManaSymbol symbol={String(def.cost)} /></span>
                  <button
                    type="button"
                    onClick={() => setZoomed(def)}
                    className={`flex-1 cursor-zoom-in truncate text-left hover:underline ${def.playable === false ? "text-red-600" : ""}`}
                    title={`${def.name} (click to enlarge)`}
                  >
                    {def.name}
                  </button>
                  <button onClick={() => change(def, -1)} className="rounded bg-zinc-300 px-2 hover:bg-zinc-400" aria-label={`Remove one ${def.name}`}>
                    −
                  </button>
                  <span className={`w-5 text-center ${over ? "font-bold text-amber-700" : ""}`}>{qty}</span>
                  <button onClick={() => change(def, 1)} className="rounded bg-zinc-300 px-2 hover:bg-zinc-400" aria-label={`Add one ${def.name}`}>
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
      {zoomed && <Lightbox def={zoomed} onClose={() => setZoomed(null)} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-4 p-6 text-zinc-900">
      <Link href="/decks" className="text-sm text-zinc-600 underline hover:text-zinc-800">
        ← All decks
      </Link>
      {children}
    </main>
  );
}
