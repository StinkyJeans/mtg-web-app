"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardDef } from "@mtg/engine";
import { fetchCardsByIds } from "@/lib/cards";
import { deckStatus, getDeck, saveDeck } from "@/lib/decks";
import type { DeckEntries } from "@/lib/decks";
import { Lightbox } from "../play/CardDetail";
import CardPool from "./CardPool";
import DeckCards from "./DeckCards";
import DeckSidebar from "./DeckSidebar";

const tabClass = (on: boolean) =>
  `rounded-lg px-4 py-1.5 text-sm font-semibold ${on ? "bg-amber-500 text-black" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`;

/** How the Deck tab groups the cards. */
const GROUPS: { label: string; has: (def: CardDef) => boolean }[] = [
  { label: "Creatures", has: (d) => d.type === "creature" },
  { label: "Spells", has: (d) => d.type !== "creature" && d.type !== "land" },
  { label: "Lands", has: (d) => d.type === "land" },
];

// The same deck always gives the same text, whatever order its cards were added in.
const snapshot = (name: string, entries: DeckEntries) => JSON.stringify([name.trim(), Object.entries(entries).sort()]);

/** Create (no deckId) or edit a deck. */
export default function DeckEditor({ deckId }: { deckId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("New deck");
  const [entries, setEntries] = useState<DeckEntries>({});
  const [saved, setSaved] = useState(() => snapshot("New deck", {}));
  const [defs, setDefs] = useState<Record<string, CardDef>>({});
  const [loaded, setLoaded] = useState(!deckId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<CardDef | null>(null); // card shown large in the popup
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [tab, setTab] = useState<"deck" | "pool">(deckId ? "deck" : "pool");
  const dirty = snapshot(name, entries) !== saved;

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    getDeck(deckId)
      .then(async (deck) => ({ deck, defs: await fetchCardsByIds(Object.keys(deck.entries)) }))
      .then(({ deck, defs }) => {
        if (cancelled) return;
        setName(deck.name);
        setEntries(deck.entries);
        setSaved(snapshot(deck.name, deck.entries));
        setDefs(defs);
        setLoaded(true);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // The browser asks before closing or reloading the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = useMemo(() => deckStatus(defs, entries), [defs, entries]);
  const rows = useMemo(
    () =>
      Object.keys(entries)
        .map((id) => defs[id])
        .filter(Boolean)
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    [entries, defs],
  );
  const groups = GROUPS.map((g) => ({ label: g.label, cards: rows.filter(g.has) })).filter((g) => g.cards.length > 0);
  // In the Deck tab the large view steps through the deck in the order shown.
  const shown = groups.flatMap((g) => g.cards);
  const zoomedAt = tab === "deck" && zoomed ? shown.findIndex((d) => d.id === zoomed.id) : -1;

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
      setSaved(snapshot(name, entries));
      if (deckId) setMessage({ text: "Saved." });
      else router.replace(`/decks/${id}`);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Could not save.", bad: true });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Shell>{<p className="text-red-600">Could not load the deck: {loadError}</p>}</Shell>;
  if (!loaded) return <Shell>{<p className="text-zinc-600">Loading deck…</p>}</Shell>;

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          aria-label="Deck name"
          className="min-w-64 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-lg font-semibold outline-none focus:border-amber-400"
        />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-amber-500 px-5 py-1.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save deck"}
        </button>
        {message?.bad ? (
          <span className="text-sm text-red-600">{message.text}</span>
        ) : dirty ? (
          <span className="text-sm text-amber-700">Unsaved changes</span>
        ) : (
          message && <span className="text-sm text-emerald-600">{message.text}</span>
        )}
      </div>

      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === "deck"} onClick={() => setTab("deck")} className={tabClass(tab === "deck")}>
          Deck ({status.count})
        </button>
        <button role="tab" aria-selected={tab === "pool"} onClick={() => setTab("pool")} className={tabClass(tab === "pool")}>
          Add cards
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {tab === "deck" && <DeckCards groups={groups} entries={entries} onChange={change} onZoom={setZoomed} onAdd={() => setTab("pool")} />}
        {/* kept mounted while hidden, so the search is still there when you come back */}
        <CardPool hidden={tab !== "pool"} entries={entries} onAdd={(def) => change(def, 1)} onZoom={setZoomed} />
        <DeckSidebar
          rows={rows}
          groups={groups}
          entries={entries}
          status={status}
          emptyText={tab === "pool" ? "Click cards on the left to add them." : "Open Add cards to pick cards."}
          onChange={change}
          onZoom={setZoomed}
        />
      </div>
      {zoomed && (
        <Lightbox
          def={zoomed}
          onClose={() => setZoomed(null)}
          {...(zoomedAt >= 0
            ? {
                onPrev: () => setZoomed(shown[(zoomedAt - 1 + shown.length) % shown.length]),
                onNext: () => setZoomed(shown[(zoomedAt + 1) % shown.length]),
                caption: `card ${zoomedAt + 1} of ${shown.length} · ×${entries[zoomed.id]} in the deck`,
              }
            : {})}
        />
      )}
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
