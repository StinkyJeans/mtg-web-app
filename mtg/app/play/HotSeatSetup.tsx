"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DECK_SIZES, STARTER_DECK } from "@mtg/engine";
import type { CardDef, PlayerId } from "@mtg/engine";
import { fetchCardsByIds } from "@/lib/cards";
import { listPlayableDecks } from "@/lib/decks";
import type { DeckChoice } from "@/lib/decks";
import { buildRandomDeck } from "@/lib/randomDeck";
import type { useAppearance } from "@/lib/playmat";
import DeckOptions from "../decks/DeckOptions";
import LookPicker from "./LookPicker";
import { playerName } from "./log";

const STARTER: DeckChoice = { id: "starter", name: "Starter deck", ids: STARTER_DECK, official: true };
const RANDOM_ID = "random"; // a deck built at random when the game starts

/** Both players' decks and every card in them, ready for the coin flip. */
export interface DeckPair {
  decks: Record<PlayerId, string[]>;
  names: Record<PlayerId, string>;
  cards: Record<string, CardDef>;
}

/** Hot-seat: each player votes for a deck size, then picks a deck of that size. The game screen keeps this, so "Play again" reuses the picks. */
export function useHotSeatDecks(enabled: boolean) {
  const [options, setOptions] = useState<DeckChoice[]>([STARTER]);
  const [votes, setVotes] = useState<Record<PlayerId, number | null>>({ p1: null, p2: null });
  const [hidden, setHidden] = useState(0); // saved decks that can't be played yet
  const [choice, setChoice] = useState<Record<PlayerId, string>>({ p1: RANDOM_ID, p2: RANDOM_ID });
  const agreedSize = votes.p1 !== null && votes.p1 === votes.p2 ? votes.p1 : null;

  // Offer every saved deck that is legal and fully playable, the ready-made decks and the starter deck.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listPlayableDecks()
      .then(({ choices, hidden }) => {
        if (cancelled) return;
        setOptions([...choices, STARTER]);
        setHidden(hidden);
      })
      .catch(() => {}); // the starter deck still works if saved decks can't be loaded
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  function vote(p: PlayerId, size: number) {
    setVotes((v) => ({ ...v, [p]: size }));
    setChoice({ p1: RANDOM_ID, p2: RANDOM_ID }); // decks depend on the size
  }

  const choose = (p: PlayerId, id: string) => setChoice((c) => ({ ...c, [p]: id }));

  /** Builds or looks up both decks and loads their cards. Throws with a message for the player when that fails. */
  async function load(): Promise<DeckPair> {
    if (!agreedSize) throw new Error("Both players must vote for the same deck size first.");
    const pick = async (p: PlayerId) => {
      if (choice[p] === RANDOM_ID) return buildRandomDeck(agreedSize);
      const o = options.find((x) => x.id === choice[p]);
      return { ids: o?.ids ?? [], name: o?.name ?? "Deck" };
    };
    const [d1, d2] = [await pick("p1"), await pick("p2")];
    const decks = { p1: d1.ids, p2: d2.ids };
    const cards = await fetchCardsByIds([...decks.p1, ...decks.p2]);
    const missing = [...decks.p1, ...decks.p2].find((id) => !cards[id]);
    if (missing) throw new Error(`Card "${missing}" is missing from the database. Did you run the card import?`);
    return { decks, names: { p1: d1.name, p2: d2.name }, cards };
  }

  return { options, votes, hidden, choice, agreedSize, vote, choose, load };
}

export type HotSeatDecks = ReturnType<typeof useHotSeatDecks>;

/** The hot-seat start screen: deck size votes, a deck for each player, their sleeves and mats, and the start button. */
export default function HotSeatSetup({ decks, loading, error, onStart, look }: { decks: HotSeatDecks; loading: boolean; error: string | null; onStart: () => void; look: ReturnType<typeof useAppearance> }) {
  const { options, votes, hidden, choice, agreedSize } = decks;
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-5 p-5 text-slate-100 sm:p-8">
      <div className="page-atmosphere" aria-hidden="true" />
      <div className="panel-glass flex w-full max-w-3xl flex-col items-center gap-5 p-6 sm:p-8">
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
              <span className="field-label">Vote for the deck size</span>
              <div className="seg seg-wide" role="group" aria-label={`${playerName(p)}: deck size`}>
                {DECK_SIZES.map((n) => (
                  <button key={n} aria-pressed={votes[p] === n} onClick={() => decks.vote(p, n)}>
                    {n} cards
                  </button>
                ))}
              </div>
              {agreedSize && (
                <label className="flex flex-col gap-1.5">
                  <span className="field-label">Deck</span>
                  <span className="tool-field !py-2">
                    <select value={choice[p]} onChange={(e) => decks.choose(p, e.target.value)} className="glass-select w-full cursor-pointer">
                      <DeckOptions choices={options} size={agreedSize} randomId={RANDOM_ID} />
                    </select>
                  </span>
                </label>
              )}
              <LookPicker who={p} sleeve={look.storedSleeve[p]} mat={look.storedMat[p]} onSleeve={(v) => look.choose("sleeve", p, v)} onMat={(v) => look.choose("mat", p, v)} />
            </div>
          ))}
        </div>

        <p className={`max-w-md text-center text-sm ${!agreedSize && votes.p1 !== null && votes.p2 !== null ? "text-[#fde68a]" : "text-slate-300"}`}>
          {agreedSize
            ? `Agreed: ${agreedSize}-card decks. A player without a saved deck of that size gets a random one.`
            : votes.p1 !== null && votes.p2 !== null
              ? "You voted for different sizes. Both players must agree on the same deck size."
              : "Each player votes. The game starts when both choose the same size."}
        </p>
        {hidden > 0 && (
          <p className="max-w-md text-center text-xs text-slate-400">
            {hidden} saved deck{hidden > 1 ? "s are" : " is"} not offered: not legal (20+ cards, max 4 copies) or containing cards the game can&apos;t play yet. Only decks with exactly
            the voted size are listed. See the Decks page.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={onStart} disabled={loading || !agreedSize} className="btn-gold !px-8 !py-3 !text-base">
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
