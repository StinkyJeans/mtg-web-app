"use client";

import { useCallback, useEffect, useState } from "react";
import { STARTER_DECK } from "@mtg/engine";
import { holdWallpaper } from "../LiveWallpaper";
import { CoinDisplay } from "../play/CoinFlip";
import { deckStatus, expandDeck, listMyDecks, loadDefsFor } from "@/lib/decks";
import { buildRandomDeck } from "@/lib/randomDeck";
import { leaveRoom, send } from "@/lib/online/session";
import { DECK_SIZES } from "@/lib/online/protocol";
import type { RoomSnapshot } from "@/lib/online/protocol";
import { KickButton } from "./RoomPopup";

interface DeckOption {
  id: string;
  name: string;
  ids: string[];
}
const RANDOM_ID = "random";
const STEPS = [
  { stage: "vote", label: "Vote" },
  { stage: "decks", label: "Decks" },
  { stage: "coin", label: "Coin toss" },
] as const;

/**
 * The pop-up that takes a room from "two players" to "the game starts": both vote for a deck size, both choose a deck,
 * then the coin is tossed and whoever wins it decides who goes first.
 */
export default function VotePopup({ room }: { room: RoomSnapshot }) {
  useEffect(() => holdWallpaper(), []);
  const at = STEPS.findIndex((s) => s.stage === room.stage);
  const me = room.players.find((p) => p.seat === room.you);
  const guest = room.you === room.host ? room.players.find((p) => p.seat !== room.host) : undefined; // the host may still remove the guest

  return (
    <div role="dialog" aria-modal="true" aria-label="Vote" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-white/25 bg-slate-950/60 p-6 text-white shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
        <header className="flex items-center gap-3">
          <ol className="flex flex-1 items-center gap-2" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s.stage} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${i === at ? "bg-amber-400 text-black" : i < at ? "bg-emerald-400/20 text-[#a7f3d0]" : "bg-white/10 text-slate-300"}`}>
                {i < at ? "✓" : i + 1} {s.label}
              </li>
            ))}
          </ol>
          {guest && <KickButton name={guest.name} />}
          <button onClick={() => leaveRoom()} aria-label="Leave the room" title="Leave the room" className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-lg leading-none hover:bg-white/20">
            ×
          </button>
        </header>

        {room.stage === "vote" && <VoteStep room={room} />}
        {room.stage === "decks" && <DeckStep room={room} ready={me?.deckReady ?? false} />}
        {(room.stage === "coin" || room.stage === "playing") && room.coin && <CoinStep room={room} />}
      </div>
    </div>
  );
}

function PlayerChips({ room, show }: { room: RoomSnapshot; show: (p: RoomSnapshot["players"][number]) => React.ReactNode }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {room.players.map((p) => (
        <li key={p.seat} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
          <span className="font-bold">{p.name}</span>
          {p.seat === room.you && <span className="text-slate-300"> (you)</span>}: {show(p)}
        </li>
      ))}
    </ul>
  );
}

function VoteStep({ room }: { room: RoomSnapshot }) {
  const mine = room.players.find((p) => p.seat === room.you)?.voted ?? null;
  return (
    <section className="flex flex-col gap-4 text-center">
      <div>
        <h2 className="text-2xl font-extrabold">Vote for the deck size</h2>
        <p className="mt-1 text-[15px] text-slate-200">Both players must choose the same size.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DECK_SIZES.map((n) => (
          <button
            key={n}
            onClick={() => send("vote", { size: n })}
            className={`rounded-2xl border-2 px-2 py-5 transition hover:-translate-y-0.5 ${mine === n ? "border-amber-300 bg-amber-400/25 ring-2 ring-amber-300/60" : "border-white/25 bg-white/10 hover:bg-white/20"}`}
          >
            <span className="block text-4xl font-extrabold">{n}</span>
            <span className="text-sm text-slate-200">cards</span>
          </button>
        ))}
      </div>
      {room.mismatch && <p className="rounded-xl bg-amber-400/20 px-3 py-2 text-[15px] font-semibold text-[#fde68a]">You voted for different sizes. Vote again.</p>}
      <PlayerChips room={room} show={(p) => (p.voted ? <span className="font-bold text-[#fde68a]">{p.voted}</span> : <span className="text-slate-300">not yet</span>)} />
    </section>
  );
}

function DeckStep({ room, ready }: { room: RoomSnapshot; ready: boolean }) {
  const size = room.size ?? 40;
  const [options, setOptions] = useState<DeckOption[] | null>(null);
  const [choice, setChoice] = useState(RANDOM_ID);
  const [busy, setBusy] = useState(false);

  // The starter deck plus every saved deck of this size that is legal and fully playable.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const found: DeckOption[] = [];
      if (STARTER_DECK.length === size) found.push({ id: "starter", name: "Starter deck", ids: STARTER_DECK });
      try {
        const decks = await listMyDecks();
        const defs = await loadDefsFor(decks);
        for (const d of decks) if (deckStatus(defs, d.entries).ready && expandDeck(d.entries).length === size) found.push({ id: d.id, name: d.name, ids: expandDeck(d.entries) });
      } catch {
        // the starter deck and a random deck still work
      }
      if (!cancelled) setOptions(found);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [size]);

  async function confirm() {
    setBusy(true);
    try {
      const picked = options?.find((o) => o.id === choice);
      if (picked) send("deck", { name: picked.name, ids: picked.ids });
      else {
        const random = await buildRandomDeck(size);
        send("deck", { name: random.name, ids: random.ids });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 text-center">
      <div>
        <h2 className="text-2xl font-extrabold">Choose your deck</h2>
        <p className="mt-1 text-[15px] text-slate-200">{size} cards. Your opponent does not see which one you pick.</p>
      </div>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        disabled={ready || options === null}
        aria-label="Deck"
        className="glass-select rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-base text-slate-100 disabled:opacity-60"
      >
        {(options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={RANDOM_ID}>Random {size}-card deck</option>
      </select>
      <button
        onClick={() => void confirm()}
        disabled={ready || busy || options === null}
        className="rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 text-lg font-extrabold text-black shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        {ready ? "Ready ✓" : busy ? "Preparing…" : "Ready"}
      </button>
      <PlayerChips room={room} show={(p) => (p.deckReady ? <span className="font-bold text-[#a7f3d0]">ready ✓</span> : <span className="text-slate-300">choosing…</span>)} />
    </section>
  );
}

function CoinStep({ room }: { room: RoomSnapshot }) {
  const coin = room.coin!;
  const [landed, setLanded] = useState(false);
  const onLanded = useCallback(() => setLanded(true), []);
  const name = (seat: "p1" | "p2") => room.players.find((p) => p.seat === seat)?.name ?? "";
  const { call, result, winner } = coin;
  if (!call || !result || !winner) return <CallStep room={room} />;
  const iWon = winner === room.you;

  return (
    <section className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-2xl font-extrabold">Coin toss</h2>
      <CoinDisplay result={result} onLanded={onLanded} className="h-64 w-[min(22rem,80vw)]" />
      {!landed ? (
        <p className="text-[15px] text-slate-200">
          {name(coin.caller)} called <span className="font-bold capitalize text-[#fde68a]">{call}</span>…
        </p>
      ) : (
        <>
          <p className="text-lg">
            It&apos;s <span className="font-extrabold capitalize">{result}</span>! <span className="font-bold text-[#fde68a]">{name(winner)}</span> wins the flip.
          </p>
          {coin.chose ? (
            <p className="rounded-xl bg-emerald-400/20 px-4 py-2 text-[15px] font-semibold text-[#a7f3d0]">
              {name(winner)} chose to go {coin.chose}. Starting the match…
            </p>
          ) : iWon ? (
            <>
              <p className="text-[15px] text-slate-200">Who goes first?</p>
              <div className="flex gap-3">
                <button onClick={() => send("order", { first: true })} className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-base font-extrabold text-black hover:-translate-y-0.5">
                  Go first
                </button>
                <button onClick={() => send("order", { first: false })} className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-base font-bold hover:bg-white/20">
                  Go second
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-white/10 px-4 py-2 text-[15px]">Waiting for {name(winner)} to choose who goes first…</p>
          )}
        </>
      )}
    </section>
  );
}

/** Before the flip: the caller picks heads or tails, the other player waits. */
function CallStep({ room }: { room: RoomSnapshot }) {
  const caller = room.coin!.caller;
  const callerName = room.players.find((p) => p.seat === caller)?.name ?? "";
  return (
    <section className="flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="text-2xl font-extrabold">Coin toss</h2>
        <p className="mt-1 text-[15px] text-slate-200">Whoever wins the toss chooses who goes first.</p>
      </div>
      {caller === room.you ? (
        <>
          <p className="text-lg font-semibold">Call it!</p>
          <div className="flex gap-3">
            <button onClick={() => send("call", { side: "heads" })} className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-base font-extrabold text-black hover:-translate-y-0.5">
              Heads
            </button>
            <button onClick={() => send("call", { side: "tails" })} className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-base font-bold hover:bg-white/20">
              Tails
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-white/10 px-4 py-2 text-[15px]">Waiting for {callerName} to call heads or tails…</p>
      )}
    </section>
  );
}
