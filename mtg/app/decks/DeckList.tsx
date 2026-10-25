"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardDef } from "@mtg/engine";
import {
  combineDecks,
  copyOfficialDeck,
  deckStatus,
  deleteDeck,
  listMyDecks,
  listOfficialDecks,
  loadDefsFor,
  OFFICIAL_DECK_TYPES,
  OFFICIAL_PAGE_SIZE,
} from "@/lib/decks";
import type { Deck, OfficialDeck } from "@/lib/decks";
import LiveWallpaper from "../LiveWallpaper";
import { RowSkeletons } from "../Skeleton";
import DeckPreview from "./DeckPreview";

const pill = (on: boolean) =>
  `rounded px-3 py-1 text-sm ${on ? "bg-amber-500 font-semibold text-black" : "bg-white/15 text-slate-200 hover:bg-white/25"}`;

/** Numbered page buttons: first, previous, a window of numbers around the current page, next, last. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  const numbers: (number | "gap")[] = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) numbers.push(i);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }
  const base = "min-w-8 rounded-md border px-2 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1.5">
      <button disabled={page === 0} onClick={() => onPage(page - 1)} className={`${base} border-white/25 bg-white/10 hover:bg-white/20`}>
        ← Prev
      </button>
      {numbers.map((n, i) =>
        n === "gap" ? (
          <span key={`gap${i}`} className="px-1 text-slate-300">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${base} ${n === page ? "border-amber-400 bg-amber-500 font-semibold text-black" : "border-white/25 bg-white/10 hover:bg-white/20"}`}
          >
            {n + 1}
          </button>
        ),
      )}
      <button disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className={`${base} border-white/25 bg-white/10 hover:bg-white/20`}>
        Next →
      </button>
    </nav>
  );
}

export default function DeckList() {
  const [tab, setTab] = useState<"mine" | "official">("mine");
  return (
    <main className="relative flex flex-1 flex-col p-4 text-slate-100 sm:p-6">
      <LiveWallpaper name="decks" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-white/25 bg-slate-950/60 p-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-white underline hover:text-white">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold">Decks</h1>
        <button onClick={() => setTab("mine")} className={pill(tab === "mine")}>
          My decks
        </button>
        <button onClick={() => setTab("official")} className={pill(tab === "official")}>
          Official decks
        </button>
        <Link href="/decks/new" className="ml-auto rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
          New deck
        </Link>
      </div>
      {tab === "mine" ? <MyDecks /> : <OfficialDecks />}
      </div>
    </main>
  );
}

function MyDecks() {
  const [version, setVersion] = useState(0);
  const [shown, setShown] = useState(0);
  const [data, setData] = useState<{ version: number; decks: Deck[]; defs: Record<string, CardDef>; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyDecks()
      .then(async (decks) => ({ version, decks, defs: await loadDefsFor(decks) }))
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setData({ version, decks: [], defs: {}, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (!data || data.version !== version) return <RowSkeletons count={5} className="h-[72px]" label="Loading decks" />;
  if (data.error) return <p className="text-sm text-[#fca5a5]">Could not load decks: {data.error}</p>;
  if (data.decks.length === 0)
    return <p className="text-slate-100">No decks yet. Create one with &quot;New deck&quot;, or copy one from the Official decks tab.</p>;

  const pages = Math.max(1, Math.ceil(data.decks.length / OFFICIAL_PAGE_SIZE));
  const current = Math.min(shown, pages - 1);
  return (
    <>
    <ul className="flex flex-col gap-2">
      {data.decks.slice(current * OFFICIAL_PAGE_SIZE, (current + 1) * OFFICIAL_PAGE_SIZE).map((deck) => {
        const status = deckStatus(data.defs, deck.entries);
        return (
          <li key={deck.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/20 bg-slate-950/35 px-3 py-2">
            <Link href={`/decks/${deck.id}`} className="font-semibold hover:text-[#fcd34d]">
              {deck.name}
            </Link>
            <span className="text-sm text-slate-100">{status.count} cards</span>
            {status.ready ? (
              <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-xs text-[#a7f3d0]">Ready to play</span>
            ) : (
              <span
                className="rounded bg-amber-400/20 px-2 py-0.5 text-xs text-[#fde68a]"
                title={[...status.errors, ...status.unplayable.map((c) => `${c.name} can't be played yet`)].join("\n")}
              >
                {status.errors.length + status.unplayable.length} problem(s)
              </span>
            )}
            <button
              onClick={async () => {
                if (!window.confirm(`Delete "${deck.name}"?`)) return;
                await deleteDeck(deck.id);
                setVersion((v) => v + 1);
              }}
              className="ml-auto rounded border border-white/25 px-2 py-1 text-xs text-slate-200 hover:bg-white/20"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
    <Pager page={current} pages={pages} onPage={setShown} />
    </>
  );
}

function OfficialDecks() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OfficialDeck | null>(null); // deck being looked at before copying
  const [deckType, setDeckType] = useState("");
  const [playableOnly, setPlayableOnly] = useState(false);
  const [picked, setPicked] = useState<OfficialDeck[]>([]); // decks ticked to be combined into one
  const [result, setResult] = useState<{ key: string; decks: OfficialDeck[]; total: number; error?: string } | null>(null);

  const key = JSON.stringify({ query, page, deckType, playableOnly });
  const loading = result?.key !== key;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      listOfficialDecks(query, page, deckType, playableOnly)
        .then((r) => !cancelled && setResult({ key, ...r }))
        .catch((e: Error) => !cancelled && setResult({ key, decks: [], total: 0, error: e.message }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, query, page, deckType, playableOnly]);

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / OFFICIAL_PAGE_SIZE));

  async function copy(deck: OfficialDeck) {
    setBusy(deck.id);
    setError(null);
    try {
      router.push(`/decks/${await copyOfficialDeck(deck.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy the deck.");
      setBusy(null);
    }
  }

  const isPicked = (deck: OfficialDeck) => picked.some((p) => p.id === deck.id);
  const togglePick = (deck: OfficialDeck) =>
    deck.unplayable === 0 &&
    setPicked((list) => (list.some((p) => p.id === deck.id) ? list.filter((p) => p.id !== deck.id) : [...list, deck]));

  async function combine() {
    setBusy("combine");
    setError(null);
    try {
      router.push(`/decks/${await combineDecks(picked)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not combine the decks.");
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search official decks"
          className="rounded-lg border border-white/20 bg-white/10 text-slate-100 placeholder:text-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
        />
        <select
          value={deckType}
          onChange={(e) => {
            setDeckType(e.target.value);
            setPage(0);
          }}
          className="glass-select rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-slate-100"
          aria-label="Deck type"
        >
          <option value="">All deck types</option>
          {OFFICIAL_DECK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={playableOnly}
            onChange={(e) => {
              setPlayableOnly(e.target.checked);
              setPage(0);
            }}
            className="h-4 w-4 accent-amber-500"
          />
          Only playable decks
        </label>
        <span className="text-sm text-slate-300">{loading ? "Loading…" : `${total.toLocaleString()} decks`}</span>
        <span className="text-xs text-slate-300">
          View cards shows what&apos;s inside. Only decks where every card can be played by the game can be copied or combined;
          the others are greyed out. Tick Combine on two or more decks to merge them into one of your own: two 20-card
          Jumpstart packs make a 40-card deck.
        </span>
      </div>

      {picked.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/60 bg-slate-900/85 p-3 text-sm shadow">
          <span className="font-semibold">{picked.length} selected:</span>
          <span className="min-w-0 flex-1 truncate">{picked.map((p) => p.name).join(" + ")}</span>
          <button
            onClick={combine}
            disabled={picked.length < 2 || busy !== null}
            title={picked.length < 2 ? "Tick at least two decks" : undefined}
            className="rounded-lg bg-amber-500 px-4 py-1.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {busy === "combine" ? "Combining…" : "Combine into one deck"}
          </button>
          <button onClick={() => setPicked([])} className="rounded border border-white/25 px-3 py-1 hover:bg-white/20">
            Clear
          </button>
        </div>
      )}
      {(result?.error || error) && <p className="text-sm text-[#fca5a5]">{result?.error ?? error}</p>}

      {!loading && playableOnly && total === 0 && !result?.error && (
        <p className="rounded-lg border border-white/20 bg-slate-950/35 px-3 py-2 text-sm text-slate-100">
          No official deck is made only of cards the game can play yet. The game understands about 1,900 of 39,000 cards, and a
          whole deck needs every one of its cards. Untick the box to see the decks, each with how many cards are missing.
        </p>
      )}

      {!result && <RowSkeletons count={OFFICIAL_PAGE_SIZE} className="h-[58px]" label="Loading decks" />}
      <ul className={`flex flex-col gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {result?.decks.map((deck) => (
          <li
            key={deck.id}
            className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white/10 p-3 ${isPicked(deck) ? "border-amber-500" : "border-white/15"}`}
          >
            <label className={`flex items-center gap-1.5 text-xs text-slate-100 ${deck.unplayable ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={isPicked(deck)}
                disabled={deck.unplayable > 0}
                onChange={() => togglePick(deck)}
                className="h-4 w-4 accent-amber-500"
              />
              Combine
            </label>
            <span className={`font-semibold ${deck.unplayable ? "text-slate-300" : ""}`}>{deck.name}</span>
            {deck.unplayable === 0 ? (
              <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-xs text-[#a7f3d0]">Playable</span>
            ) : (
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs text-[#fde68a]" title="Cards the game can't play yet are in this deck">
                {deck.unplayable} card{deck.unplayable === 1 ? "" : "s"} can&apos;t be played yet
              </span>
            )}
            <span className="text-sm text-slate-100">
              {[deck.deckType, deck.code, deck.releaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}
            </span>
            <button
              onClick={() => setPreview(deck)}
              className="ml-auto rounded border border-white/25 px-3 py-1 text-xs hover:bg-white/20"
            >
              View cards
            </button>
            <button
              disabled={busy !== null || deck.unplayable > 0}
              title={deck.unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
              onClick={() => copy(deck)}
              className="rounded border border-white/25 px-3 py-1 text-xs hover:bg-white/20 disabled:opacity-50"
            >
              {busy === deck.id ? "Copying…" : "Copy to my decks"}
            </button>
          </li>
        ))}
      </ul>

      <Pager page={page} pages={pages} onPage={setPage} />

      {preview && (
        <DeckPreview
          deck={preview}
          busy={busy === preview.id}
          onCopy={() => copy(preview)}
          picked={isPicked(preview)}
          onTogglePick={() => togglePick(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
