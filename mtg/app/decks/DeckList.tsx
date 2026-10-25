"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardDef } from "@mtg/engine";
import { copyOfficialDeck, DECK_PAGE_SIZE, deckColors, deckStatus, deleteDeck, listMyDecks, listOfficialDecks, loadDefsFor, OFFICIAL_SECTIONS, setName } from "@/lib/decks";
import type { Deck, DeckEntries, OfficialDeck } from "@/lib/decks";
import { cardImageUrl } from "@/lib/cards";
import LiveWallpaper from "../LiveWallpaper";
import { ManaSymbol } from "../play/ManaSymbols";
import { RowSkeletons, Skeleton } from "../Skeleton";
import DeckPreview from "./DeckPreview";

const pill = (on: boolean) =>
  `rounded px-3 py-1 text-sm ${on ? "bg-amber-500 font-semibold text-black" : "bg-white/15 text-slate-200 hover:bg-white/25"}`;

/** The deck's colors as mana symbols. */
function Colors({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  return (
    <span className="flex gap-0.5" aria-label={`Colors: ${colors.join(", ")}`}>
      {colors.map((c) => (
        <ManaSymbol key={c} symbol={c} />
      ))}
    </span>
  );
}

const cardTotal = (entries: DeckEntries) => Object.values(entries).reduce((n, q) => n + q, 0);

/** The card a deck is shown with: its most expensive creature (or spell) that has a picture. */
function coverOf(defs: Record<string, CardDef>, entries: DeckEntries): CardDef | undefined {
  const cards = Object.keys(entries)
    .map((id) => defs[id])
    .filter((d): d is CardDef => Boolean(d?.image) && d.type !== "land");
  return cards.sort((a, b) => Number(b.type === "creature") - Number(a.type === "creature") || b.cost - a.cost)[0];
}

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
          Ready-made decks
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
    return (
      <p className="text-slate-100">
        No decks of your own yet. Build one with &quot;New deck&quot;, or open Ready-made decks: you can play those as they are, or copy one
        and change its cards.
      </p>
    );

  const pages = Math.max(1, Math.ceil(data.decks.length / DECK_PAGE_SIZE));
  const current = Math.min(shown, pages - 1);
  return (
    <>
    <ul className="flex flex-col gap-2">
      {data.decks.slice(current * DECK_PAGE_SIZE, (current + 1) * DECK_PAGE_SIZE).map((deck) => {
        const status = deckStatus(data.defs, deck.entries);
        return (
          <li key={deck.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/20 bg-slate-950/35 px-3 py-2">
            <Link href={`/decks/${deck.id}`} className="font-semibold hover:text-[#fcd34d]">
              {deck.name}
            </Link>
            <Colors colors={deckColors(data.defs, deck.entries)} />
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
            <Link href={`/decks/${deck.id}`} className="ml-auto rounded border border-white/25 px-2 py-1 text-xs text-slate-200 hover:bg-white/20">
              Edit
            </Link>
            <button
              onClick={async () => {
                if (!window.confirm(`Delete "${deck.name}"?`)) return;
                await deleteDeck(deck.id);
                setVersion((v) => v + 1);
              }}
              className="rounded border border-white/25 px-2 py-1 text-xs text-slate-200 hover:bg-white/20"
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OfficialDeck | null>(null); // deck being looked at before copying
  const [data, setData] = useState<{ decks: OfficialDeck[]; defs: Record<string, CardDef>; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listOfficialDecks()
      .then(async (decks) => ({ decks, defs: await loadDefsFor(decks) }))
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setData({ decks: [], defs: {}, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (!data)
    return (
      <div role="status" aria-label="Loading decks" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[212px] rounded-xl" />
        ))}
      </div>
    );
  if (data.error) return <p className="text-sm text-[#fca5a5]">Could not load decks: {data.error}</p>;
  if (data.decks.length === 0) return <p className="text-slate-100">No ready-made decks yet.</p>;

  const known = new Set(OFFICIAL_SECTIONS.map((s) => s.deckType));
  const others = [...new Set(data.decks.map((d) => d.deckType ?? "Other"))].filter((t) => !known.has(t));
  const sections = [...OFFICIAL_SECTIONS, ...others.map((t) => ({ deckType: t, title: t, blurb: "" }))]
    .map((s) => ({ ...s, decks: data.decks.filter((d) => (d.deckType ?? "Other") === s.deckType) }))
    .filter((s) => s.decks.length > 0);

  return (
    <>
      <p className="text-sm text-slate-200">
        Every card in these decks works in the game. Pick one when a game asks for your deck, or copy it to your decks to change cards.
      </p>
      {error && <p className="text-sm text-[#fca5a5]">{error}</p>}
      {sections.map((section) => (
        <section key={section.deckType} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold">{section.title}</h2>
            {section.blurb && <span className="text-sm text-slate-300">{section.blurb}</span>}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {section.decks.map((deck) => (
              <OfficialDeckTile
                key={deck.id}
                deck={deck}
                defs={data.defs}
                busy={busy === deck.id}
                disabled={busy !== null}
                onView={() => setPreview(deck)}
                onCopy={() => copy(deck)}
              />
            ))}
          </ul>
        </section>
      ))}

      {preview && <DeckPreview deck={preview} busy={busy === preview.id} onCopy={() => copy(preview)} onClose={() => setPreview(null)} />}
    </>
  );
}

function OfficialDeckTile({
  deck,
  defs,
  busy,
  disabled,
  onView,
  onCopy,
}: {
  deck: OfficialDeck;
  defs: Record<string, CardDef>;
  busy: boolean;
  disabled: boolean;
  onView: () => void;
  onCopy: () => void;
}) {
  const cover = coverOf(defs, deck.entries);
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-white/15 bg-white/10">
      <button
        onClick={onView}
        aria-label={`View the cards of ${deck.name}`}
        className="h-28 bg-slate-900/60 bg-cover opacity-90 transition hover:opacity-100"
        style={cover?.image ? { backgroundImage: `url(${cardImageUrl(cover.image)})`, backgroundPosition: "50% 22%" } : undefined}
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{deck.name}</span>
          <span className="ml-auto">
            <Colors colors={deckColors(defs, deck.entries)} />
          </span>
        </div>
        <span className="text-xs text-slate-200">
          {[`${cardTotal(deck.entries)} cards`, setName(deck.code), deck.releaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}
        </span>
        <div className="mt-2 flex gap-2">
          <button onClick={onView} className="flex-1 rounded border border-white/25 px-2 py-1 text-xs hover:bg-white/20">
            View cards
          </button>
          <button
            disabled={disabled}
            onClick={onCopy}
            title="Make your own copy to change its cards"
            className="flex-1 rounded border border-white/25 px-2 py-1 text-xs hover:bg-white/20 disabled:opacity-50"
          >
            {busy ? "Copying…" : "Copy & edit"}
          </button>
        </div>
      </div>
    </li>
  );
}
