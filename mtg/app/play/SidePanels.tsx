"use client";

import { useEffect, useRef, useState } from "react";
import { availableMana, MANA_COLORS } from "@mtg/engine";
import type { GameState, PlayerId } from "@mtg/engine";
import { ManaSymbol } from "./ManaSymbols";
import { playerName } from "./log";
import { lifeColor, PLAYER_STYLE } from "./theme";

export interface ChatMessage {
  id: number;
  from: PlayerId;
  text: string;
}

const panel = "flex min-h-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100/60 p-3";
const title = "text-sm font-semibold uppercase tracking-wide text-zinc-500";

/** A life total that counts up or down to its new value. The combat animation finds it by `data-life`. */
function LifeTotal({ id, value }: { id: PlayerId; value: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    const from = previous.current;
    previous.current = value;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min((now - start) / 600, 1);
      setShown(Math.round(from + (value - from) * k));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span data-life={id} className={`font-display inline-block text-4xl font-bold tabular-nums ${value <= 5 ? "text-red-600" : value <= 10 ? "text-amber-600" : "text-emerald-700"}`}>
      {shown}
    </span>
  );
}

/** Both players' name, life, mana and pile sizes. The player to act is highlighted. */
export function PlayersPanel({
  state,
  order,
  actor,
  onResign,
  heading = "Players",
}: {
  state: GameState;
  order: PlayerId[];
  actor: PlayerId;
  /** The small title above the panel. */
  heading?: string;
  /** Shows a Resign button on each player. */
  onResign?: (id: PlayerId) => void;
}) {
  return (
    <section className={panel}>
      <h2 className={title}>{heading}</h2>
      {order.map((id) => {
        const p = state.players[id];
        const pool = availableMana(state, id);
        const colors = MANA_COLORS.filter((c) => pool[c] > 0);
        const style = PLAYER_STYLE[id];
        const acting = id === actor;
        return (
          <div key={id} className={`rounded-xl border border-l-4 bg-white p-3 shadow-sm ${style.border} ${style.borderL} ${acting ? `shadow-lg ${style.glow} ring-2 ring-amber-300` : ""}`}>
            <div className="flex items-center justify-between gap-1">
              <span className={`font-display whitespace-nowrap rounded-full px-2.5 py-0.5 text-base font-bold ${style.chip}`}>{playerName(id)}</span>
              {acting && <span className="whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold uppercase font-display tracking-wide text-black">to act</span>}
              {onResign && !state.winner && (
                <button
                  onClick={() => onResign(id)}
                  className="rounded border border-red-300 px-1.5 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50"
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
              <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5 text-xs text-zinc-700">
                {colors.length === 0 && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-500">No mana</span>}
                {colors.map((c) => (
                  <span key={c} className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5">
                    <ManaSymbol symbol={c} />×{pool[c]}
                  </span>
                ))}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
              <div className={`h-full rounded-full transition-all duration-500 ${lifeColor(p.life)}`} style={{ width: `${Math.max(0, Math.min(100, (p.life / 20) * 100))}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] text-zinc-600">
              <span className="rounded bg-emerald-50 py-0.5" title="Cards in hand">
                ✋ Hand <b>{p.hand.length}</b>
              </span>
              <span className="rounded bg-amber-50 py-0.5" title="Cards in library">
                📚 Library <b>{p.library.length}</b>
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
    <section className={`${panel} h-48 lg:h-auto lg:flex-1`}>
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
export function LogPanel({ lines }: { lines: string[] }) {
  return (
    <section className={`${panel} h-48 lg:h-auto lg:flex-1`}>
      <h2 className={title}>Log</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-[15px] leading-relaxed text-zinc-800">
        {lines.map((line, i) => (
          <div key={i} className={line.startsWith("—") ? "mt-2 border-t border-zinc-300/70 pt-1.5 font-bold text-zinc-900" : ""}>
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}
