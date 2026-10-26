"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerId } from "@mtg/engine";
import { countIds, saveDeck } from "@/lib/decks";
import { isRandomDeck, keptDeckName } from "@/lib/randomDeck";

export interface PlayedDeck {
  name: string;
  ids: string[];
}

/** Keeps a copy of a random deck that was played in My decks. Once saved (`savedId`), it links to the copy instead. */
export default function SaveDeck({ deck, savedId, onSaved, label = "Save this deck" }: { deck: PlayedDeck; savedId?: string; onSaved: (id: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveDeck({ name: keptDeckName(deck.name), entries: countIds(deck.ids) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the deck.");
    } finally {
      setBusy(false);
    }
  }

  if (savedId) {
    return (
      <Link href={`/decks/${savedId}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
        Saved ✓ Open in My decks
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        onClick={() => void save()}
        disabled={busy}
        title="Keep these cards as one of your decks, to play again or change"
        className="rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
      >
        {busy ? "Saving…" : label}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}

/** A button for each random deck in this match that can still be kept. Nothing when no deck was random. */
export function KeepRandomDecks({
  decks,
  saved,
  onSaved,
  label,
  note,
  className = "",
}: {
  decks: Partial<Record<PlayerId, PlayedDeck>>;
  saved: Partial<Record<PlayerId, string>>;
  onSaved: (who: PlayerId, id: string) => void;
  label: (who: PlayerId) => string;
  /** A line above the buttons. */
  note?: string;
  className?: string;
}) {
  const random = (Object.entries(decks) as [PlayerId, PlayedDeck | undefined][]).filter((e): e is [PlayerId, PlayedDeck] => !!e[1] && isRandomDeck(e[1].name));
  if (random.length === 0) return null;
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {note && <p className="text-sm text-zinc-600">{note}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {random.map(([who, deck]) => (
          <SaveDeck key={who} deck={deck} savedId={saved[who]} onSaved={(id) => onSaved(who, id)} label={label(who)} />
        ))}
      </div>
    </div>
  );
}
