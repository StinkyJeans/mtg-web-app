"use client";

import type { CardDef } from "@mtg/engine";
import { MAX_COPIES, isBasicLand } from "@mtg/engine";
import type { DeckEntries } from "@/lib/decks";
import CardView from "../play/CardView";

/** − count + for one card of the deck. The count turns amber above the copy limit. */
export function Quantity({ def, qty, onChange }: { def: CardDef; qty: number; onChange: (def: CardDef, delta: number) => void }) {
  const over = qty > MAX_COPIES && !isBasicLand(def);
  return (
    <>
      <button onClick={() => onChange(def, -1)} className="rounded bg-zinc-300 px-2 hover:bg-zinc-400" aria-label={`Remove one ${def.name}`}>
        −
      </button>
      <span className={`w-5 text-center ${over ? "font-bold text-amber-700" : ""}`}>{qty}</span>
      <button onClick={() => onChange(def, 1)} className="rounded bg-zinc-300 px-2 hover:bg-zinc-400" aria-label={`Add one ${def.name}`}>
        +
      </button>
    </>
  );
}

/** The Deck tab: the deck's cards as pictures, grouped into creatures, spells and lands. Click a card to see it large. */
export default function DeckCards({
  groups,
  entries,
  onChange,
  onZoom,
  onAdd,
}: {
  groups: { label: string; cards: CardDef[] }[];
  entries: DeckEntries;
  onChange: (def: CardDef, delta: number) => void;
  onZoom: (def: CardDef) => void;
  onAdd: () => void;
}) {
  if (groups.length === 0) {
    return (
      <section className="flex flex-col items-start gap-2">
        <p className="text-zinc-600">This deck has no cards yet.</p>
        <button onClick={onAdd} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
          Add cards
        </button>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            {g.label} ({g.cards.reduce((n, d) => n + entries[d.id], 0)})
          </h3>
          <div className="flex flex-wrap gap-3">
            {g.cards.map((def) => (
              <div key={def.id} className="flex flex-col items-center gap-1">
                <CardView
                  def={def}
                  size="md"
                  note={`×${entries[def.id]}`}
                  ring={def.playable === false ? "ring-2 ring-red-500" : ""}
                  onClick={() => onZoom(def)}
                />
                <div className="flex items-center gap-1 text-sm">
                  <Quantity def={def} qty={entries[def.id]} onChange={onChange} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {groups.some((g) => g.cards.some((d) => d.playable === false)) && (
        <p className="text-xs text-zinc-500">A red outline means the game can&apos;t play that card yet.</p>
      )}
    </section>
  );
}
