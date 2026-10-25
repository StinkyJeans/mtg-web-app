"use client";

import { useEffect, useState } from "react";
import { unplayableCards } from "@mtg/engine";
import type { CardDef } from "@mtg/engine";
import { fetchCardsByIds } from "@/lib/cards";
import { getDeckContents } from "@/lib/decks";
import type { DeckBoard, DeckContents, OfficialDeck } from "@/lib/decks";
import { Lightbox } from "../play/CardDetail";
import CardView from "../play/CardView";
import { holdWallpaper } from "../LiveWallpaper";

const BOARDS: { id: DeckBoard; label: string }[] = [
  { id: "commander", label: "Commander" },
  { id: "main", label: "Main deck" },
  { id: "side", label: "Sideboard" },
];

type Loaded = { contents: DeckContents; defs: Record<string, CardDef> };

/** Look inside an official deck before copying it. Click a card to read it large. */
export default function DeckPreview({
  deck,
  busy,
  onCopy,
  picked,
  onTogglePick,
  onClose,
}: {
  deck: OfficialDeck;
  busy: boolean;
  onCopy: () => void;
  /** Whether the deck is ticked for combining, and a way to tick / untick it from here. */
  picked: boolean;
  onTogglePick: () => void;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomedIdx, setZoomedIdx] = useState<number | null>(null); // position in the deck, while a card is open large

  useEffect(() => {
    let cancelled = false;
    getDeckContents(deck.id)
      .then(async (contents) => {
        const ids = BOARDS.flatMap((b) => Object.keys(contents.boards[b.id]));
        return { contents, defs: await fetchCardsByIds(ids) };
      })
      .then((l) => !cancelled && setLoaded(l))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deck.id]);

  // Freeze the moving wallpaper behind the blurred glass while this is open.
  useEffect(() => holdWallpaper(), []);

  // Esc closes the preview, unless a card is open large (then Esc closes just that).
  useEffect(() => {
    if (zoomedIdx !== null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomedIdx, onClose]);

  const sections = loaded
    ? BOARDS.map(({ id, label }) => {
        const entries = Object.entries(loaded.contents.boards[id])
          .map(([cardId, qty]) => ({ def: loaded.defs[cardId], qty }))
          .filter((e): e is { def: CardDef; qty: number } => Boolean(e.def))
          .sort((a, b) => a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name));
        return { id, label, entries, total: entries.reduce((n, e) => n + e.qty, 0) };
      }).filter((s) => s.entries.length > 0)
    : [];

  // Every distinct card in the order shown on screen, so Previous / Next follow what you see.
  const flat = sections.flatMap((s) => s.entries.map((e) => ({ ...e, label: s.label })));
  const sectionStart = sections.map((_, i) => sections.slice(0, i).reduce((n, s) => n + s.entries.length, 0));
  const step = (by: number) => setZoomedIdx((i) => (i === null ? null : (i + by + flat.length) % flat.length));
  const current = zoomedIdx === null ? null : flat[zoomedIdx];

  const allIds = sections.flatMap((s) => s.entries.flatMap((e) => Array<string>(e.qty).fill(e.def.id)));
  const blocked = loaded ? new Set(unplayableCards(loaded.defs, allIds).map((c) => c.id)) : new Set<string>();
  const playableCopies = allIds.filter((id) => !blocked.has(id)).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={deck.name}
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col gap-3 overflow-hidden rounded-2xl border border-white/25 bg-slate-950/50 p-4 text-white shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{deck.name}</h2>
            <p className="text-sm text-slate-200">
              {[deck.deckType, deck.code, deck.releaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}
              {loaded && ` · ${allIds.length} cards · ${playableCopies} playable by the game today`}
            </p>
          </div>
          <button
            onClick={onTogglePick}
            disabled={deck.unplayable > 0}
            title={deck.unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
            className={`ml-auto rounded-lg border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${picked ? "border-amber-400 bg-amber-400/25" : "border-white/30 bg-white/10 hover:bg-white/20"}`}
          >
            {picked ? "Selected to combine ✓" : "Add to combine"}
          </button>
          <button
            onClick={onCopy}
            disabled={busy || deck.unplayable > 0}
            title={deck.unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Copying…" : "Copy to my decks"}
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 hover:bg-white/20">
            ×
          </button>
        </div>

        {error && <p className="text-sm text-[#fca5a5]">Could not load the deck: {error}</p>}
        {!loaded && !error && <p className="text-slate-200">Loading cards…</p>}

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {sections.map((s, si) => (
            <section key={s.id}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
                {s.label} ({s.total})
              </h3>
              <div className="flex flex-wrap gap-2">
                {s.entries.map(({ def, qty }, ei) => (
                  <CardView
                    key={def.id}
                    def={def}
                    size="md"
                    note={qty > 1 ? `×${qty}` : undefined}
                    ring={blocked.has(def.id) ? "ring-1 ring-red-500/60" : ""}
                    onClick={() => setZoomedIdx(sectionStart[si] + ei)}
                  />
                ))}
              </div>
            </section>
          ))}
          {loaded && (
            <p className="text-xs text-slate-300">
              A red outline means the game can&apos;t play that card yet. Copying merges the commander into the main deck and leaves out
              the sideboard.
            </p>
          )}
        </div>
      </div>

      {current && (
        <Lightbox
          def={current.def}
          onClose={() => setZoomedIdx(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          caption={`${current.label} · card ${zoomedIdx! + 1} of ${flat.length}${current.qty > 1 ? ` · ×${current.qty} in the deck` : ""}`}
        />
      )}
    </div>
  );
}
