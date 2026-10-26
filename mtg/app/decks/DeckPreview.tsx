"use client";

import { useEffect, useState } from "react";
import { unplayableCards } from "@mtg/engine";
import type { CardDef } from "@mtg/engine";
import { loadDeckPreview } from "@/lib/decks";
import type { DeckBoard, DeckContents, OfficialDeck } from "@/lib/decks";
import { Lightbox } from "../play/CardDetail";
import CardView from "../play/CardView";
import { CardSkeletons } from "../Skeleton";
import Link from "next/link";
import { useHoverZoom } from "../play/HoverZoom";
import { holdWallpaper } from "../LiveWallpaper";

const BOARDS: { id: DeckBoard; label: string }[] = [
  { id: "commander", label: "Commander" },
  { id: "main", label: "Main deck" },
  { id: "side", label: "Sideboard" },
];

type Loaded = { contents: DeckContents; defs: Record<string, CardDef> };

/**
 * Look inside a deck. Hover a card to see it big, click it to read it large.
 * For an official deck, pass the copy / combine controls; for one of your own, pass `editHref` instead.
 */
export default function DeckPreview({
  deck,
  busy = false,
  onCopy,
  picked = false,
  onTogglePick,
  editHref,
  layer = "z-20",
  onClose,
}: {
  deck: Pick<OfficialDeck, "id" | "name"> & Partial<Pick<OfficialDeck, "deckType" | "code" | "releaseDate" | "unplayable">>;
  busy?: boolean;
  onCopy?: () => void;
  /** Whether the deck is ticked for combining, and a way to tick / untick it from here. */
  picked?: boolean;
  onTogglePick?: () => void;
  /** A link to edit the deck, for your own decks. */
  editHref?: string;
  /** Stacking class, for when this opens on top of another pop-up. */
  layer?: string;
  onClose: () => void;
}) {
  const zoom = useHoverZoom();
  const unplayable = deck.unplayable ?? 0;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomedIdx, setZoomedIdx] = useState<number | null>(null); // position in the deck, while a card is open large

  useEffect(() => {
    let cancelled = false;
    loadDeckPreview(deck.id)
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
      className={`fixed inset-0 ${layer} flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel-glass flex max-h-[92vh] w-full max-w-6xl flex-col gap-4 overflow-hidden p-5 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="page-title truncate !text-2xl sm:!text-3xl">{deck.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {deck.deckType && <span className="chip chip-meta">{deck.deckType}</span>}
              {deck.code && <span className="chip chip-meta font-mono">{deck.code}</span>}
              {deck.releaseDate && <span className="chip chip-meta">{deck.releaseDate.slice(0, 4)}</span>}
              {loaded && <span className="chip chip-meta">{allIds.length} cards</span>}
              {loaded && (playableCopies === allIds.length ? <span className="chip chip-ok">✓ All playable today</span> : <span className="chip chip-warn">⚠ {playableCopies} of {allIds.length} playable today</span>)}
            </div>
          </div>
          {onTogglePick && (
            <button
              onClick={onTogglePick}
              disabled={unplayable > 0}
              title={unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
              className={`btn-ghost ml-auto !px-4 !py-2 ${picked ? "!border-amber-300 !bg-amber-400/25" : ""}`}
            >
              {picked ? "Selected to combine ✓" : "Add to combine"}
            </button>
          )}
          {onCopy && (
            <button
              onClick={onCopy}
              disabled={busy || unplayable > 0}
              title={unplayable > 0 ? "This deck has cards the game can't play yet" : undefined}
              className="btn-gold !px-4 !py-2"
            >
              {busy ? "Copying…" : "Copy to my decks"}
            </button>
          )}
          {editHref && (
            <Link href={editHref} className="btn-gold ml-auto !px-4 !py-2">
              Edit deck
            </Link>
          )}
          <button onClick={onClose} aria-label="Close" className="btn-ghost !px-3 !py-2 !text-lg leading-none">
            ×
          </button>
        </div>

        {error && <p className="rounded-xl border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-[#fecaca]">Could not load the deck: {error}</p>}
        {!loaded && !error && <CardSkeletons count={20} size="md" className="flex flex-wrap gap-2" />}

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {sections.map((s, si) => (
            <section key={s.id}>
              <h3 className="mb-2.5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe29a]">
                {s.label}
                <span className="count-chip !px-2 !py-0 !text-xs">{s.total}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#f4b43d]/50 to-transparent" aria-hidden="true" />
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {s.entries.map(({ def, qty }, ei) => (
                  <div key={def.id} className="card-tile !items-stretch" onMouseEnter={(e) => zoom.show(def, e.currentTarget)} onMouseLeave={zoom.hide}>
                    <CardView
                      def={def}
                      size="md"
                      note={qty > 1 ? `×${qty}` : undefined}
                      ring={blocked.has(def.id) ? "ring-1 ring-red-500/60" : ""}
                      onClick={() => (zoom.hide(), setZoomedIdx(sectionStart[si] + ei))}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {loaded && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-slate-300">
              A red outline means the game can&apos;t play that card yet. Copying merges the commander into the main deck and leaves out
              the sideboard.
            </p>
          )}
        </div>
      </div>

      {zoomedIdx === null && zoom.node}

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
