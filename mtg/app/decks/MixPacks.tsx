"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CardDef } from "@mtg/engine";
import { deckColors, mixEntries, saveDeck } from "@/lib/decks";
import type { OfficialDeck } from "@/lib/decks";
import DeckColors from "./DeckColors";
import DeckPreview from "./DeckPreview";

const chip = (on: boolean) =>
  `flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${on ? "border-amber-400 bg-amber-400/25 font-semibold" : "border-white/25 bg-white/10 hover:bg-white/20"}`;

/** Pick any two of the Beginner Box packs, look at them together, and make them one deck of your own. */
export default function MixPacks({ packs, defs }: { packs: OfficialDeck[]; defs: Record<string, CardDef> }) {
  const router = useRouter();
  const [picked, setPicked] = useState<OfficialDeck[]>([]);
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A third pick replaces the older of the two.
  const toggle = (pack: OfficialDeck) =>
    setPicked((now) => (now.some((p) => p.id === pack.id) ? now.filter((p) => p.id !== pack.id) : [...now, pack].slice(-2)));

  const ready = picked.length === 2;
  const name = picked.map((p) => p.name).join(" + ");
  const entries = mixEntries(...picked.map((p) => p.entries));
  const count = Object.values(entries).reduce((n, q) => n + q, 0);

  async function copy() {
    setBusy(true);
    setError(null);
    try {
      router.push(`/decks/${await saveDeck({ name, entries })}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the deck.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-white/10 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-semibold">Mix two packs</h3>
        <span className="text-sm text-slate-300">Pick any two of the {packs.length} packs for a 40-card deck of your own.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {packs.map((pack) => {
          const on = picked.some((p) => p.id === pack.id);
          return (
            <button key={pack.id} onClick={() => toggle(pack)} aria-pressed={on} className={chip(on)}>
              {pack.name}
              <DeckColors colors={deckColors(defs, pack.entries)} />
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {ready ? (
          <>
            <span className="font-semibold">{name}</span>
            <span className="text-slate-200">· {count} cards</span>
            <DeckColors colors={deckColors(defs, entries)} />
          </>
        ) : (
          <span className="text-slate-300">{picked.length === 0 ? "Pick two packs." : "Pick one more pack."}</span>
        )}
        <span className="ml-auto flex gap-2">
          <button disabled={!ready} onClick={() => setViewing(true)} className="rounded border border-white/25 px-3 py-1 text-xs hover:bg-white/20 disabled:opacity-40">
            View cards
          </button>
          <button
            disabled={!ready || busy}
            onClick={copy}
            title="Make it one of your decks, to play it or change its cards"
            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
          >
            {busy ? "Copying…" : "Copy & edit"}
          </button>
        </span>
      </div>
      {error && <p className="text-sm text-[#fca5a5]">{error}</p>}
      {viewing && ready && <DeckPreview deck={{ id: name, name }} parts={picked.map((p) => p.id)} busy={busy} onCopy={copy} onClose={() => setViewing(false)} />}
    </div>
  );
}
