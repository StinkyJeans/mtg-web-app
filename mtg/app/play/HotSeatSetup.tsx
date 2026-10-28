"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STARTER_DECK } from "@mtg/engine";
import type { CardDef, PlayerId } from "@mtg/engine";
import { fetchCardsByIds } from "@/lib/cards";
import { listPlayableDecks } from "@/lib/decks";
import type { DeckChoice } from "@/lib/decks";
import { buildRandomDeck } from "@/lib/randomDeck";
import { useCached, writeCached } from "@/lib/dashCache";
import type { useAppearance } from "@/lib/playmat";
import DeckPicker from "../decks/DeckPicker";
import LookPicker from "./LookPicker";
import { playerName } from "./log";

const STARTER: DeckChoice = { id: "starter", name: "Starter deck", ids: STARTER_DECK, official: true, colors: [] };
const RANDOM_ID = "random"; // a deck built at random when the game starts

/** Both players' decks and every card in them, ready for the coin flip. */
export interface DeckPair {
  decks: Record<PlayerId, string[]>;
  /** Their sideboards, outside the game (for "learn"). */
  sides?: Partial<Record<PlayerId, string[]>>;
  names: Record<PlayerId, string>;
  cards: Record<string, CardDef>;
}

/** Hot-seat: each player picks a 60-card deck. The game screen keeps this, so "Play again" reuses the picks. */
export function useHotSeatDecks(enabled: boolean) {
  const cachedChoices = useCached<DeckChoice[]>("playable-decks"); // last time's decks, shown at once while the fresh list loads
  const [fetchedOptions, setOptions] = useState<DeckChoice[] | null>(null);
  const options = fetchedOptions ?? (cachedChoices ? [...cachedChoices, STARTER] : [STARTER]);
  const [hidden, setHidden] = useState(0); // saved decks that can't be played yet
  const [choice, setChoice] = useState<Record<PlayerId, string>>({ p1: RANDOM_ID, p2: RANDOM_ID });
  const agreedSize = 60; // every deck is 60 cards

  // Offer every saved deck that is legal and fully playable, the ready-made decks and the starter deck.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listPlayableDecks()
      .then(({ choices, hidden }) => {
        if (cancelled) return;
        writeCached("playable-decks", choices);
        setOptions([...choices, STARTER]);
        setHidden(hidden);
      })
      .catch(() => {}); // the starter deck still works if saved decks can't be loaded
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const choose = (p: PlayerId, id: string) => setChoice((c) => ({ ...c, [p]: id }));

  /** Builds or looks up both decks and loads their cards. Throws with a message for the player when that fails. */
  async function load(): Promise<DeckPair> {
    const pick = async (p: PlayerId): Promise<{ ids: string[]; name: string; side?: string[] }> => {
      if (choice[p] === RANDOM_ID) return buildRandomDeck(agreedSize);
      const o = options.find((x) => x.id === choice[p]);
      return { ids: o?.ids ?? [], name: o?.name ?? "Deck", side: o?.side ?? [] };
    };
    const [d1, d2] = [await pick("p1"), await pick("p2")];
    const decks = { p1: d1.ids, p2: d2.ids };
    const sides = { p1: d1.side ?? [], p2: d2.side ?? [] };
    const cards = await fetchCardsByIds([...decks.p1, ...decks.p2, ...sides.p1, ...sides.p2]);
    const missing = [...decks.p1, ...decks.p2].find((id) => !cards[id]);
    if (missing) throw new Error(`Card "${missing}" is missing from the database. Did you run the card import?`);
    return { decks, sides, names: { p1: d1.name, p2: d2.name }, cards };
  }

  return { options, hidden, choice, agreedSize, choose, load };
}

export type HotSeatDecks = ReturnType<typeof useHotSeatDecks>;

/** The hot-seat start screen: a 60-card deck for each player, their sleeves and mats, and the start button. */
export default function HotSeatSetup({ decks, loading, error, onStart, look }: { decks: HotSeatDecks; loading: boolean; error: string | null; onStart: () => void; look: ReturnType<typeof useAppearance> }) {
  const { options, hidden, choice, agreedSize } = decks;
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-5 p-5 text-slate-100 sm:p-8">
      <div className="page-atmosphere" aria-hidden="true" />
      <div className="panel-glass flex w-full max-w-[88rem] flex-col items-center gap-5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="page-title !text-3xl sm:!text-4xl">Hot-seat duel</h1>
          <p className="text-slate-300">Two players, one screen. Heads or tails decides who goes first.</p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-4">
          {(["p1", "p2"] as const).map((p) => (
            <div key={p} className="seat-card" style={{ "--accent": p === "p1" ? "#f4b43d" : "#38bdf8" } as React.CSSProperties}>
              <span className="seat-name">
                <i aria-hidden="true" />
                {playerName(p)}
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="field-label">60-card deck</span>
                <DeckPicker choices={options} size={agreedSize} randomId={RANDOM_ID} value={choice[p]} onChange={(id) => decks.choose(p, id)} wide />
              </div>
              <LookPicker large who={p} sleeve={look.storedSleeve[p]} mat={look.storedMat[p]} onSleeve={(v) => look.choose("sleeve", p, v)} onMat={(v) => look.choose("mat", p, v)} />
            </div>
          ))}
        </div>

        <p className="max-w-md text-center text-sm text-slate-300">Every deck is 60 cards. Each player chooses one, or gets a random one.</p>
        {hidden > 0 && (
          <p className="max-w-md text-center text-xs text-slate-400">
            {hidden} saved deck{hidden > 1 ? "s are" : " is"} not offered: not legal (20+ cards, max 4 copies) or containing cards the game can&apos;t play yet. Only 60-card decks are listed. See the Decks page.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={onStart} disabled={loading} className="btn-gold !px-8 !py-3 !text-base">
            {loading ? "Loading cards…" : "Start game"}
          </button>
          <Link href="/" className="btn-ghost !px-5 !py-3 !text-sm">
            ← Back to home
          </Link>
        </div>
        {error && <p role="alert" className="max-w-md rounded-xl border border-red-400/40 bg-red-950/50 px-3 py-2 text-center text-sm text-[#fecaca]">{error}</p>}
      </div>
    </main>
  );
}
