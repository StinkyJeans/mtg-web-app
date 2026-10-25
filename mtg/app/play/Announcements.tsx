"use client";

import type { GameState } from "@mtg/engine";
import { cardImageUrl } from "@/lib/cards";
import { playerName } from "./log";
import type { Announcement } from "./log";

/** Cards announcing what a player just cast or used, shown on that player's side of the board. */
export default function Announcements({ items, onClose }: { items: Announcement[]; onClose: (id: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {items.map((a) => (
        <div key={a.id} className="announce-in flex items-start gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 shadow">
          <div className="text-xl" aria-hidden="true">
            ✨
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-900">{a.title}</div>
            {a.lines.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-zinc-800">
                {a.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={() => onClose(a.id)} aria-label="Close" className="rounded px-2 text-zinc-500 hover:bg-amber-100">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Everything cast or used this turn, kept on screen until the turn ends: spells go to the graveyard as soon as they
 * resolve, so without this it is hard to follow what has happened and what is still in effect.
 */
export function PlayedThisTurn({ items, state, onZoom }: { items: Announcement[]; state: GameState; onZoom: (defId: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="flex shrink-0 flex-col gap-1 rounded-xl border border-amber-300 bg-amber-50/80 p-2 shadow-sm">
      <h2 className="text-sm font-bold uppercase font-display tracking-wide text-amber-800">Played this turn ({items.length})</h2>
      <ol className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
        {[...items].reverse().map((a) => {
          const def = a.defId ? state.cards[a.defId] : undefined;
          return (
            <li key={a.id} className="flex items-start gap-2.5 rounded border border-amber-200 bg-white p-1.5">
              <button
                type="button"
                onClick={() => a.defId && onZoom(a.defId)}
                aria-label={def ? `Enlarge ${def.name}` : "Card"}
                className="h-14 w-10 shrink-0 rounded border border-zinc-500 bg-zinc-300 bg-cover bg-center"
                style={def?.image ? { backgroundImage: `url(${cardImageUrl(def.image)})` } : undefined}
              />
              <div className="min-w-0 flex-1 text-[15px] leading-snug">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 text-xs font-bold uppercase font-display ${a.player === "p1" ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-800"}`}>{playerName(a.player)}</span>
                  <span className="font-semibold">{a.title.replace(`${playerName(a.player)} `, "")}</span>
                  <span className="text-sm text-zinc-600">{a.kind === "spell" ? "spell" : "ability"}</span>
                </div>
                {a.lines.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-[15px] leading-snug text-zinc-800">
                    {a.lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
