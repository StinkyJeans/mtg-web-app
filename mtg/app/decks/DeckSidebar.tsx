"use client";

import { useEffect, useState } from "react";
import type { CardDef } from "@mtg/engine";
import { fetchCardsByIds } from "@/lib/cards";
import type { DeckEntries, DeckStatus } from "@/lib/decks";
import { ManaSymbol } from "../play/ManaSymbols";
import { Quantity } from "./DeckCards";

const BASICS: [color: string, id: string][] = [
  ["W", "plains"],
  ["U", "island"],
  ["B", "swamp"],
  ["R", "mountain"],
  ["G", "forest"],
];
const CURVE_TOP = 6; // costs of 6 and more share the last bar

const heading = "text-xs font-semibold uppercase tracking-wide text-zinc-600";
const copies = (cards: CardDef[], entries: DeckEntries) => cards.reduce((n, d) => n + entries[d.id], 0);

interface Props {
  rows: CardDef[];
  groups: { label: string; cards: CardDef[] }[];
  entries: DeckEntries;
  status: DeckStatus;
  emptyText: string;
  onChange: (def: CardDef, delta: number) => void;
  onZoom: (def: CardDef) => void;
}

/** The deck at a glance, next to both tabs: whether it can be played, its shape, its cards and the basic lands. */
export default function DeckSidebar({ rows, groups, entries, status, emptyText, onChange, onZoom }: Props) {
  return (
    <aside className="flex h-fit flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-100 p-3 lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Deck</h2>
        <span className="text-sm text-zinc-600">{status.count} cards</span>
      </div>
      <Status status={status} />
      {groups.length > 0 && <p className="text-xs text-zinc-600">{groups.map((g) => `${copies(g.cards, entries)} ${g.label.toLowerCase()}`).join(" · ")}</p>}
      <Curve rows={rows} entries={entries} />
      <BasicLands entries={entries} onChange={onChange} />
      {rows.length === 0 && <p className="text-sm text-zinc-500">{emptyText}</p>}
      <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
        {rows.map((def) => (
          <li key={def.id} className="flex items-center gap-2 rounded bg-zinc-200/60 px-2 py-1 text-sm">
            <span className="flex w-6 justify-center">
              <ManaSymbol symbol={String(def.cost)} />
            </span>
            <button
              type="button"
              onClick={() => onZoom(def)}
              className={`flex-1 cursor-zoom-in truncate text-left hover:underline ${def.playable === false ? "text-red-600" : ""}`}
              title={`${def.name} (click to enlarge)`}
            >
              {def.name}
            </button>
            <Quantity def={def} qty={entries[def.id]} onChange={onChange} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Status({ status }: { status: DeckStatus }) {
  if (status.ready) return <p className="text-sm text-emerald-600">Ready to play.</p>;
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {status.errors.map((e, i) => (
        <li key={`${i}-${e}`} className="text-amber-700">
          {e}
        </li>
      ))}
      {status.unplayable.length > 0 && <li className="text-red-600">Can&apos;t be played yet: {status.unplayable.map((c) => c.name).join(", ")}</li>}
    </ul>
  );
}

/** How many nonland cards cost 0, 1, 2… mana. */
function Curve({ rows, entries }: { rows: CardDef[]; entries: DeckEntries }) {
  const bins = Array<number>(CURVE_TOP + 1).fill(0);
  for (const d of rows) if (d.type !== "land") bins[Math.min(d.cost, CURVE_TOP)] += entries[d.id];
  const max = Math.max(...bins);
  if (max === 0) return null;
  return (
    <div>
      <h3 className={heading}>Mana curve</h3>
      <div className="mt-1 flex items-end gap-1" role="img" aria-label={`Mana curve: ${bins.map((n, cost) => `${n} costing ${cost}`).join(", ")}`}>
        {bins.map((n, cost) => (
          <div key={cost} className="flex flex-1 flex-col items-center gap-0.5 text-[10px] text-zinc-600">
            <span>{n || ""}</span>
            <div className="w-full rounded-t bg-amber-500" style={{ height: Math.round((n / max) * 40) }} />
            <span>{cost === CURVE_TOP ? `${cost}+` : cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One click adds a basic land; the count under each symbol is how many the deck has. */
function BasicLands({ entries, onChange }: { entries: DeckEntries; onChange: (def: CardDef, delta: number) => void }) {
  const [defs, setDefs] = useState<Record<string, CardDef>>({});

  useEffect(() => {
    let cancelled = false;
    fetchCardsByIds(BASICS.map(([, id]) => id))
      .then((found) => !cancelled && setDefs(found))
      .catch(() => {}); // the lands can still be found under Add cards
    return () => {
      cancelled = true;
    };
  }, []);

  if (Object.keys(defs).length === 0) return null;
  return (
    <div>
      <h3 className={heading}>Basic lands</h3>
      <div className="mt-1 flex gap-1">
        {BASICS.map(([color, id]) => {
          const def = defs[id];
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(def, 1)}
              aria-label={`Add a ${def.name} (${entries[id] ?? 0} in the deck)`}
              title={`Add a ${def.name}`}
              className="flex flex-1 flex-col items-center gap-0.5 rounded bg-zinc-200 py-1 hover:bg-zinc-300"
            >
              <ManaSymbol symbol={color} />
              <span className="text-xs text-zinc-700">{entries[id] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">Most decks play about 17 lands in 40 cards, 24 in 60.</p>
    </div>
  );
}
