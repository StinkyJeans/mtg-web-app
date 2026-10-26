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
  loadDeckPreview,
  loadDefsFor,
  OFFICIAL_DECK_TYPES,
  OFFICIAL_PAGE_SIZE,
} from "@/lib/decks";
import type { Deck, OfficialDeck } from "@/lib/decks";
import { onIntent } from "@/lib/prefetch";
import ConfirmDialog from "../ConfirmDialog";
import LiveWallpaper from "../LiveWallpaper";
import { RowSkeletons } from "../Skeleton";
import DeckPreview from "./DeckPreview";

/** A colored edge for each kind of deck, so the list is easy to scan. */
const ACCENTS: Record<string, string> = {
  "Commander Deck": "#f4b43d",
  "Jumpstart": "#8b7cf6",
  "Theme Deck": "#38bdf8",
  "Welcome Deck": "#34d399",
  "Intro Pack": "#fb7185",
  "Planeswalker Deck": "#f97316",
  "Starter Deck": "#2dd4bf",
  "Duel Deck": "#e879f9",
};
function accentFor(type: string | null): string {
  if (!type) return "#94a3b8";
  if (ACCENTS[type]) return ACCENTS[type];
  let h = 0;
  for (const c of type) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 75% 62%)`;
}

const iconProps = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Numbered page buttons: first, previous, a window of numbers around the current page, next, last. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  const numbers: (number | "gap")[] = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) numbers.push(i);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }
  const base = "pager-btn";
  return (
    <nav aria-label="Pages" className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
      <button disabled={page === 0} onClick={() => onPage(page - 1)} className={base}>
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
            className={base}
          >
            {n + 1}
          </button>
        ),
      )}
      <button disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className={base}>
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
      <div className="panel-glass mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link href="/" className="btn-ghost" aria-label="Back to the home page">
            <svg viewBox="0 0 24 24" width="14" height="14" {...iconProps}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Home
          </Link>
          <h1 className="page-title">Decks</h1>
          <div className="seg" role="group" aria-label="Which decks">
            <button onClick={() => setTab("mine")} aria-pressed={tab === "mine"}>
              My decks
            </button>
            <button onClick={() => setTab("official")} aria-pressed={tab === "official"}>
              Official decks
            </button>
          </div>
          <Link href="/decks/new" className="btn-gold ml-auto !px-4 !py-2 !text-sm">
            <svg viewBox="0 0 24 24" width="15" height="15" {...iconProps} strokeWidth={2.6}>
              <path d="M12 5v14M5 12h14" />
            </svg>
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
  const [deleting, setDeleting] = useState<Deck | null>(null); // the deck the "are you sure?" pop-up is about
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
    return <p className="empty-note">No decks yet. Create one with &quot;New deck&quot;, or copy one from the Official decks tab.</p>;

  const pages = Math.max(1, Math.ceil(data.decks.length / OFFICIAL_PAGE_SIZE));
  const current = Math.min(shown, pages - 1);
  return (
    <>
    <ul className="flex flex-col gap-2.5">
      {data.decks.slice(current * OFFICIAL_PAGE_SIZE, (current + 1) * OFFICIAL_PAGE_SIZE).map((deck) => {
        const status = deckStatus(data.defs, deck.entries);
        return (
          <li key={deck.id} className="deck-row" style={{ "--accent": status.ready ? "#34d399" : "#f4b43d" } as React.CSSProperties}>
            <Link href={`/decks/${deck.id}`} className="deck-name hover:text-[#fcd34d]">
              {deck.name}
            </Link>
            <span className="chip chip-meta">{status.count} cards</span>
            {status.ready ? (
              <span className="chip chip-ok">✓ Ready to play</span>
            ) : (
              <span
                className="chip chip-warn"
                title={[...status.errors, ...status.unplayable.map((c) => `${c.name} can't be played yet`)].join("\n")}
              >
                ⚠ {status.errors.length + status.unplayable.length} problem{status.errors.length + status.unplayable.length === 1 ? "" : "s"}
              </span>
            )}
            <Link href={`/decks/${deck.id}`} className="btn-ghost ml-auto">
              Edit
            </Link>
            <button
              onClick={() => setDeleting(deck)}
              className="btn-danger"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
    <Pager page={current} pages={pages} onPage={setShown} />
    {deleting && (
      <ConfirmDialog
        title="Delete this deck?"
        subject={deleting.name}
        message="The deck is removed from your account for good. The cards stay in the catalogue, and you can always build a new one."
        confirmLabel="Delete deck"
        cancelLabel="Keep deck"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteDeck(deleting.id);
          setDeleting(null);
          setVersion((v) => v + 1);
        }}
      />
    )}
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
        <label className="tool-field min-w-[15rem] flex-1 sm:max-w-sm">
          <svg viewBox="0 0 24 24" {...iconProps}>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search official decks"
            aria-label="Search official decks"
            className="w-full"
          />
        </label>
        <label className="tool-field">
          <select
            value={deckType}
            onChange={(e) => {
              setDeckType(e.target.value);
              setPage(0);
            }}
            className="glass-select cursor-pointer pr-1"
            aria-label="Deck type"
          >
            <option value="">All deck types</option>
            {OFFICIAL_DECK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={playableOnly}
            onChange={(e) => {
              setPlayableOnly(e.target.checked);
              setPage(0);
            }}
          />
          <i />
          Only playable decks
        </label>
        <span className="count-chip">{loading ? "Loading…" : `${total.toLocaleString()} decks`}</span>
      </div>
      <details className="group text-sm text-slate-300">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-slate-300 hover:text-white">
          <svg viewBox="0 0 24 24" width="15" height="15" {...iconProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          How this works
        </summary>
        <p className="mt-2 max-w-3xl rounded-xl border border-white/12 bg-white/5 px-3 py-2 leading-relaxed text-slate-200">
          <b>View cards</b> shows what&apos;s inside. Only decks where every card can be played by the game can be copied or combined; the others are
          dimmed. Tick <b>Combine</b> on two or more decks to merge them into one of your own: two 20-card Jumpstart packs make a 40-card deck.
        </p>
      </details>

      {picked.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-[#14100a]/90 p-3 text-sm shadow-xl shadow-black/50">
          <span className="chip chip-warn">{picked.length} selected</span>
          <span className="min-w-0 flex-1 truncate text-slate-100">{picked.map((p) => p.name).join(" + ")}</span>
          <button
            onClick={combine}
            disabled={picked.length < 2 || busy !== null}
            title={picked.length < 2 ? "Tick at least two decks" : undefined}
            className="btn-gold"
          >
            {busy === "combine" ? "Combining…" : "Combine into one deck"}
          </button>
          <button onClick={() => setPicked([])} className="btn-ghost">
            Clear
          </button>
        </div>
      )}
      {(result?.error || error) && <p className="text-sm text-[#fca5a5]">{result?.error ?? error}</p>}

      {!loading && playableOnly && total === 0 && !result?.error && (
        <p className="empty-note text-sm">
          No official deck is made only of cards the game can play yet. The game understands about 1,900 of 39,000 cards, and a
          whole deck needs every one of its cards. Untick the box to see the decks, each with how many cards are missing.
        </p>
      )}

      {!result && <RowSkeletons count={OFFICIAL_PAGE_SIZE} className="h-[58px]" label="Loading decks" />}
      <ul className={`flex flex-col gap-2.5 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {result?.decks.map((deck) => (
          <li key={deck.id} data-picked={isPicked(deck)} className="deck-row" style={{ "--accent": accentFor(deck.deckType) } as React.CSSProperties}>
            <input
              type="checkbox"
              className="tick"
              checked={isPicked(deck)}
              disabled={deck.unplayable > 0}
              onChange={() => togglePick(deck)}
              aria-label={`Combine ${deck.name}`}
              title={deck.unplayable > 0 ? "This deck has cards the game can't play yet" : "Tick to combine with other decks"}
            />
            <span className={`deck-name ${deck.unplayable ? "!text-slate-300" : ""}`}>{deck.name}</span>
            {deck.unplayable === 0 ? (
              <span className="chip chip-ok">✓ Playable</span>
            ) : (
              <span className="chip chip-warn" title="Cards the game can't play yet are in this deck">
                ⚠ {deck.unplayable} card{deck.unplayable === 1 ? "" : "s"} can&apos;t be played yet
              </span>
            )}
            {deck.deckType && <span className="chip chip-meta">{deck.deckType}</span>}
            {deck.code && <span className="chip chip-meta font-mono">{deck.code}</span>}
            {deck.releaseDate && <span className="text-sm text-slate-300">{deck.releaseDate.slice(0, 4)}</span>}
            <button onClick={() => setPreview(deck)} className="btn-ghost ml-auto" {...onIntent(() => void loadDeckPreview(deck.id).catch(() => undefined))}>
              <svg viewBox="0 0 24 24" width="14" height="14" {...iconProps}>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View cards
            </button>
            <button
              disabled={busy !== null || deck.unplayable > 0}
              title={deck.unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
              onClick={() => copy(deck)}
              className="btn-gold"
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
