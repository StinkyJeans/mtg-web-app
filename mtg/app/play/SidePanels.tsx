"use client";

import { useAnimationsOn } from "@/lib/motion";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { GameState, PlayerId } from "@mtg/engine";
import { ManaText } from "./ManaSymbols";
import { ManaMeter } from "./ManaMeter";
import type { ManaNote } from "./manaInfo";
import { playerName } from "./log";
import { lifeBusyUntil, registerLife } from "./lifeCount";
import { useUnseenCards } from "./pileFx";
import { useStacked } from "./useMedia";
import { lifeColor, PLAYER_STYLE } from "./theme";

export interface ChatMessage {
  id: number;
  from: PlayerId;
  text: string;
}

const panel = "flex min-h-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100/60 p-3";
const title = "text-sm font-semibold uppercase tracking-wide text-zinc-500";

/**
 * A life total that counts up or down ONE POINT AT A TIME: a creature that hits for 5 takes 20 to 19, 18, 17, 16, 15, each step a beat
 * apart with a small pop, so every point of damage is seen going. Past zero it keeps going into the negatives. The attack animation starts
 * the count the moment its hit lands (see `lifeCount`); a change that arrives from the game state does the same if it is not already shown.
 * The combat animation finds the number by `data-life`.
 */
function LifeTotal({ id, value }: { id: PlayerId; value: number }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value); // what is on screen right now
  const target = useRef(value); // where the count is going
  const number = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const pop = useRef<Animation | null>(null); // one pop animation, replayed on every point (a new one each time is a lot of small work)
  const timer = useRef(0);
  const on = useAnimationsOn();

  // Counts towards `target`, a point per beat. A new change while it is counting just moves the target: one count, never two at once.
  const count = useCallback(() => {
    window.clearTimeout(timer.current);
    const points = Math.abs(target.current - current.current);
    if (points === 0) return;
    const beat = Math.max(110, Math.min(300, 2000 / points)); // ms per point: a few points are counted slowly, a long count still ends in about two seconds
    lifeBusyUntil(performance.now() + beat * points);
    // Each step only changes the text of the number (no React render, nothing laid out again) and pops its wrapper (transform only: the
    // number itself already has its own pulsing animation when it is low). React is told once, at the end, for the colour and glow.
    const tick = () => {
      current.current += target.current > current.current ? 1 : -1;
      const text = number.current?.firstChild;
      if (text) text.nodeValue = String(current.current);
      if (wrap.current) {
        pop.current ??= wrap.current.animate([{ transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 180, easing: "ease-out" });
        pop.current.currentTime = 0;
        pop.current.play();
      }
      if (current.current !== target.current) timer.current = window.setTimeout(tick, beat);
      else setShown(current.current);
    };
    tick();
  }, []);

  useEffect(() => registerLife(id, (change) => { target.current += change; count(); }), [id, count]);
  useEffect(() => {
    if (value === target.current) return; // (the attack already counted it)
    target.current = value;
    count();
  }, [value, count]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const danger = shown <= 5 ? 2 : shown <= 10 ? 1 : 0; // 2: glowing red and pumping slowly, 1: a slow amber glow
  return (
    <span ref={wrap} className="relative inline-flex items-center justify-center">
      {danger > 0 && <span aria-hidden="true" className={`life-halo ${danger === 2 ? "life-halo-red" : "life-halo-amber"} ${on ? "life-halo-moving" : ""}`} />}
      <span ref={number} data-life={id} className={`font-display relative inline-block text-3xl font-bold tabular-nums lg:text-4xl ${danger === 2 ? "text-red-600 life-pump" : danger === 1 ? "text-amber-600" : "text-emerald-700"} ${danger === 2 && on ? "life-pump-moving" : ""}`}>
        {shown}
      </span>
    </span>
  );
}

/** Both players' name, life, mana and pile sizes. The player to act is highlighted. */
function PlayersPanelInner({
  state,
  order,
  actor,
  onResign,
  heading = "Players",
  manaNotes = {},
}: {
  state: GameState;
  order: PlayerId[];
  actor: PlayerId;
  /** A recent change in a player's untapped mana, and why. */
  manaNotes?: Partial<Record<PlayerId, ManaNote>>;
  /** The small title above the panel. */
  heading?: string;
  /** Shows a Resign button on each player. */
  onResign?: (id: PlayerId) => void;
}) {
  const unseen = { p1: useUnseenCards("p1"), p2: useUnseenCards("p2") }; // (the opening hands are dealt on screen: the libraries count down)
  const stacked = useStacked();
  if (stacked) {
    // A phone has no room for a column of panels: each player is a short card (name and life, then mana, then the pile sizes).
    return (
      <div className="flex flex-col gap-1">
        {order.map((id) => {
          const p = state.players[id];
          const style = PLAYER_STYLE[id];
          const acting = id === actor;
          return (
            <div key={id} className={`rounded-xl border border-l-4 bg-white px-2.5 py-1.5 shadow-sm ${style.border} ${style.borderL} ${acting ? `shadow-lg ${style.glow} ring-2 ring-amber-300` : ""}`}>
              <div className="flex items-center gap-1.5">
                <span title={playerName(id)} className={`font-display min-w-0 max-w-[34%] truncate rounded-full px-2.5 py-0.5 text-[15px] font-bold ${style.chip}`}>
                  {playerName(id)}
                </span>
                {acting && <span className="shrink-0 whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold uppercase font-display tracking-wide text-black">to act</span>}
                <span className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className="flex gap-1 text-[13px] text-zinc-600">
                    <span className="rounded bg-emerald-50 px-1" title="Cards in hand">✋<b>{p.hand.length}</b></span>
                    <span className="rounded bg-amber-50 px-1" title="Cards in library">📚<b>{p.library.length + unseen[id]}</b></span>
                    <span className="rounded bg-stone-100 px-1" title="Cards in graveyard">⚰️<b>{p.graveyard.length}</b></span>
                  </span>
                  {(p.poison ?? 0) > 0 && (
                    <span data-poison={id} className={`rounded px-1.5 py-0.5 text-[13px] font-bold tabular-nums ${(p.poison ?? 0) >= 7 ? "bg-lime-200 text-lime-900" : "bg-lime-100 text-lime-800"}`}>
                      ☠️ {p.poison}/10
                    </span>
                  )}
                  <span className="text-xl" aria-hidden="true">
                    ❤️
                  </span>
                  <LifeTotal id={id} value={p.life} />
                </span>
              </div>
              {/* the opponent's mana is a detail: only the player's own is shown */}
              {id === actor && <ManaMeter state={state} id={id} note={manaNotes[id]} compact />}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <section className={panel}>
      <h2 className={title}>{heading}</h2>
      {order.map((id) => {
        const p = state.players[id];
        const style = PLAYER_STYLE[id];
        const acting = id === actor;
        return (
          <div key={id} className={`rounded-xl border border-l-4 bg-white p-3 shadow-sm ${style.border} ${style.borderL} ${acting ? `shadow-lg ${style.glow} ring-2 ring-amber-300` : ""}`}>
            {/* a long account name shortens (…) and the badge and Resign button wrap below it instead of leaving the panel */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span title={playerName(id)} className={`font-display min-w-0 max-w-full truncate rounded-full px-2.5 py-0.5 text-base font-bold ${style.chip}`}>
                {playerName(id)}
              </span>
              {acting && <span className="shrink-0 whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold uppercase font-display tracking-wide text-black">to act</span>}
              {onResign && !state.winner && (
                <button
                  onClick={() => onResign(id)}
                  className="ml-auto shrink-0 rounded border border-red-300 px-1.5 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Resign
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                ❤️
              </span>
              <LifeTotal id={id} value={p.life} />
              {(p.poison ?? 0) > 0 && (
                <span data-poison={id} title="Poison counters: a player with ten or more loses the game" className={`rounded px-1.5 py-0.5 text-sm font-bold tabular-nums ${(p.poison ?? 0) >= 7 ? "bg-lime-200 text-lime-900" : "bg-lime-100 text-lime-800"}`}>
                  ☠️ {p.poison}/10
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
              <div className={`h-full rounded-full transition-all duration-500 ${lifeColor(p.life)}`} style={{ width: `${Math.max(0, Math.min(100, (p.life / 20) * 100))}%` }} />
            </div>
            <ManaMeter state={state} id={id} note={manaNotes[id]} />
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] text-zinc-600">
              <span className="rounded bg-emerald-50 py-0.5" title="Cards in hand">
                ✋ Hand <b>{p.hand.length}</b>
              </span>
              <span className="rounded bg-amber-50 py-0.5" title="Cards in library">
                📚 Library <b>{p.library.length + unseen[id]}</b>
              </span>
              <span className="rounded bg-stone-100 py-0.5" title="Cards in graveyard">
                ⚰️ Yard <b>{p.graveyard.length}</b>
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Local chat for now. It will be wired to the live game server when matches go online. */
export function ChatPanel({ messages, as, onSend }: { messages: ChatMessage[]; as: PlayerId; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <section className={`${panel} h-48 lg:h-auto lg:min-h-[8.5rem] lg:flex-1`}>
      <h2 className={title}>Chat</h2>
      <div className="min-h-0 flex-1 overflow-y-auto text-[15px] leading-relaxed">
        {messages.length === 0 && <p className="text-[15px] text-zinc-600">No messages yet.</p>}
        {messages.map((m) => (
          <p key={m.id} className="break-words">
            <span className={m.from === "p1" ? "font-semibold text-amber-600" : "font-semibold text-sky-600"}>{playerName(m.from)}: </span>
            {m.text}
          </p>
        ))}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed) return;
          onSend(trimmed);
          setText("");
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder={`Message as ${playerName(as)}`}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-100 px-2.5 py-1.5 text-[15px] outline-none focus:border-amber-400"
        />
        <button type="submit" className="rounded-lg bg-zinc-300 px-3.5 text-[15px] font-medium hover:bg-zinc-400">
          Send
        </button>
      </form>
    </section>
  );
}

/** Game log, newest first. */
/** One line of the log: drawn once (the mana symbols in it are worked out then) and left alone while it is not changed. */
const LogLine = memo(function LogLine({ line }: { line: string }) {
  return (
    <div className={line.startsWith("—") ? "mt-2 border-t border-zinc-300/70 pt-1.5 font-bold text-zinc-900" : ""}>
      <ManaText text={line} />
    </div>
  );
});

/**
 * The log, newest line first. Each new move adds lines at the top, so a line is known by its text and by how many identical lines are older than
 * it, not by its place in the list: the lines already there keep their page elements and are not drawn again (the list can have sixty lines,
 * and it was redrawn in full after every single move, by every viewer).
 */
export const LogPanel = memo(function LogPanel({ lines }: { lines: string[] }) {
  const older = new Map<string, number>();
  const keyed = [...lines].reverse().map((line) => {
    const n = older.get(line) ?? 0;
    older.set(line, n + 1);
    return { line, key: `${n}:${line}` };
  }).reverse();
  return (
    <section className={`${panel} h-48 lg:h-auto lg:min-h-[8.5rem] lg:flex-1`}>
      <h2 className={title}>Log</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-[15px] leading-relaxed text-zinc-800">
        {keyed.map((x) => (
          <LogLine key={x.key} line={x.line} />
        ))}
      </div>
    </section>
  );
});

/** What a players panel shows comes from these: both players (their mana can depend on the other's cards), whose turn it is and what is being waited for. The game state itself is a new object after every move. */
const panelSig = (p: { state: GameState; order: PlayerId[]; actor: PlayerId; heading?: string; onResign?: unknown }) =>
  JSON.stringify([p.order, p.state.players.p1, p.state.players.p2, p.actor, p.heading, p.state.turn, p.state.phase, p.state.active, p.state.priority?.holder, !!p.state.pendingPick, !!p.state.pendingChoice, p.state.winner, !!p.onResign]);
export const PlayersPanel = memo(PlayersPanelInner, (a, b) => panelSig(a) === panelSig(b));
