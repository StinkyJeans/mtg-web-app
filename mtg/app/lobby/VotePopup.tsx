"use client";

import { useCallback, useEffect, useState } from "react";
import { STARTER_DECK } from "@mtg/engine";
import { holdWallpaper } from "../LiveWallpaper";
import { CoinDisplay } from "../play/CoinFlip";
import LookPicker from "../play/LookPicker";
import { myLook, randomLook } from "@/lib/playmat";
import { listPlayableDecks } from "@/lib/decks";
import type { DeckChoice } from "@/lib/decks";
import DeckPicker from "../decks/DeckPicker";
import { buildRandomDeck } from "@/lib/randomDeck";
import { useCached, writeCached } from "@/lib/dashCache";
import { leaveRoom, send } from "@/lib/online/session";
import type { RoomSnapshot } from "@/lib/online/protocol";
import { KickButton } from "./RoomPopup";

const RANDOM_ID = "random";
const STARTER: DeckChoice = { id: "starter", name: "Starter deck", ids: STARTER_DECK, official: true, colors: [] };
const STEPS = [
  { stage: "decks", label: "Decks" },
  { stage: "coin", label: "Coin toss" },
] as const;

/**
 * The pop-up that takes a room from "two players" to "the game starts": both choose a 60-card deck,
 * then the coin is tossed and whoever wins it decides who goes first.
 */
export default function VotePopup({ room }: { room: RoomSnapshot }) {
  useEffect(() => holdWallpaper(), []);
  const at = STEPS.findIndex((s) => s.stage === room.stage);
  const me = room.players.find((p) => p.seat === room.you);
  const guest = room.you === room.host ? room.players.find((p) => p.seat !== room.host) : undefined; // the host may still remove the guest

  return (
    <div role="dialog" aria-modal="true" aria-label="Vote" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-5 overflow-y-auto rounded-3xl ${room.stage === "decks" ? "max-w-[88rem] p-7" : "max-w-lg p-6"}  border border-white/25 bg-slate-950/95 text-white shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]`}>
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

function DeckStep({ room, ready }: { room: RoomSnapshot; ready: boolean }) {
  const size = room.size ?? 60; // every deck is 60 cards
  // The table: the card sleeve and playmat this player wants. The server shows them to both players (and to anyone watching).
  const [sleeve, setSleeve] = useState(() => myLook.read("sleeve"));
  const [mat, setMat] = useState(() => myLook.read("mat"));
  const [botLook] = useState(() => randomLook()); // against the computer, the host also dresses its table
  const vsBotRoom = room.players.some((p) => p.bot);
  useEffect(() => {
    send("look", { sleeve, mat, ...(vsBotRoom ? { bot: botLook } : {}) });
  }, [sleeve, mat, vsBotRoom, botLook]);
  const cachedChoices = useCached<DeckChoice[]>("playable-decks"); // last time's decks, shown at once while the fresh list loads
  const [fetchedOptions, setOptions] = useState<DeckChoice[] | null>(null);
  const options = fetchedOptions ?? (cachedChoices ? [...cachedChoices, STARTER] : null);
  const [choice, setChoice] = useState(RANDOM_ID);
  const [busy, setBusy] = useState(false);

  // Every saved deck that is legal and fully playable, the ready-made decks and the starter deck; the menu keeps those of this size.
  useEffect(() => {
    let cancelled = false;
    listPlayableDecks()
      .then(({ choices }) => (writeCached("playable-decks", choices), [...choices, STARTER]))
      .catch(() => [STARTER]) // the starter deck and a random deck still work
      .then((found) => {
        if (!cancelled) setOptions(found);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm() {
    setBusy(true);
    try {
      const picked = options?.find((o) => o.id === choice && o.ids.length === size);
      const mine = picked ?? (await buildRandomDeck(size));
      // against the bot, the host also brings the bot's deck: a random one
      const vsBot = room.players.some((p) => p.bot);
      const botDeck = vsBot ? await buildRandomDeck(size) : undefined;
      send("deck", { name: picked ? picked.name : (mine as { name: string }).name, ids: picked ? picked.ids : (mine as { ids: string[] }).ids, ...(botDeck ? { botDeck: { name: botDeck.name, ids: botDeck.ids } } : {}) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-x-7 gap-y-4 text-center lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:text-left">
      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <div>
        <h2 className="text-3xl font-extrabold">Choose your deck</h2>
        <p className="mt-1 text-lg text-slate-200">
          {size} cards. {room.players.some((p) => p.bot) ? "The bot plays a random deck." : "Your opponent does not see which one you pick."}
        </p>
        </div>
        <DeckPicker choices={options ?? []} size={size} randomId={RANDOM_ID} value={choice} onChange={setChoice} disabled={ready} loading={options === null} wide />
      </div>
      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
      <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-center">
        <h3 className="mb-3 text-base font-bold uppercase tracking-widest text-[#ffe29a]">Choose your table</h3>
        <LookPicker
          large
          who={room.you}
          sleeve={sleeve}
          mat={mat}
          disabled={ready}
          onSleeve={(v) => (setSleeve(v), myLook.write("sleeve", v))}
          onMat={(v) => (setMat(v), myLook.write("mat", v))}
        />
        <p className="mt-3 text-sm text-slate-300">{vsBotRoom ? "Your table is shown on your side of the battlefield." : "Your opponent sees your mat and sleeve on their screen, and you see theirs."}</p>
      </div>
      <button
        onClick={() => void confirm()}
        disabled={ready || busy || options === null}
        className="rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-4 text-xl font-extrabold text-black shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        {ready ? "Ready ✓" : busy ? "Preparing…" : "Ready"}
      </button>
      <PlayerChips room={room} show={(p) => (p.deckReady ? <span className="font-bold text-[#a7f3d0]">ready ✓</span> : p.bot ? <span className="text-slate-300">waiting for you</span> : <span className="text-slate-300">choosing…</span>)} />
      </div>
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
