"use client";

import { Fragment } from "react";
import { manaSources } from "@mtg/engine";
import type { GameState, ManaSource, PlayerId } from "@mtg/engine";
import { ManaSymbol } from "./ManaSymbols";
import type { ManaNote } from "./manaInfo";

const ALL_FIVE = ["W", "U", "B", "R", "G"];

function ManaPip({ source }: { source: ManaSource }) {
  const makes = source.colors.length === 5 ? "one mana of any color" : source.colors.map((c) => `{${c}}`).join(" or ");
  const now = source.sick ? "just arrived: it can make mana from your next turn" : source.tapped ? "tapped: already used" : "untapped: ready to pay";
  const off = source.tapped || source.sick;
  return (
    <span
      title={`${source.name}: ${source.amount > 1 ? `${source.amount} × ` : ""}${makes}. ${now}.`}
      className={`inline-flex items-center gap-px rounded-full px-1 py-0.5 [&>i]:pointer-events-none ${off ? "opacity-35 grayscale" : "bg-white ring-1 ring-zinc-300"} ${source.sick ? "border border-dashed border-zinc-500" : ""}`}
    >
      {(source.colors.length === 5 ? ALL_FIVE : source.colors).map((c, i) => (
        <Fragment key={c}>
          {i > 0 && <span className="text-[10px] font-bold text-zinc-400">/</span>}
          <ManaSymbol symbol={c} />
        </Fragment>
      ))}
      {source.amount > 1 && <span className="text-[10px] font-bold">×{source.amount}</span>}
    </span>
  );
}

/**
 * A player's mana: how much they can still spend, one pip per permanent that makes mana (faded once tapped, dashed while it can't
 * be used yet), and for a few seconds after it changes, by how much and why ("−2 paid for Become Immense").
 */
export function ManaMeter({ state, id, note }: { state: GameState; id: PlayerId; note?: ManaNote }) {
  const sources = manaSources(state, id);
  const usable = sources.filter((s) => !s.sick);
  const ready = usable.filter((s) => !s.tapped).reduce((n, s) => n + s.amount, 0);
  const total = usable.reduce((n, s) => n + s.amount, 0);
  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
        <span className="font-semibold text-zinc-700">Mana</span>
        <span data-mana={id} className="font-display text-lg font-bold leading-none tabular-nums text-zinc-900">
          {ready}
        </span>
        <span className="text-xs text-zinc-500">of {total} untapped</span>
        {note && (
          <span key={note.key} className={`mana-note rounded px-1.5 py-0.5 text-xs font-bold ${note.delta < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {note.delta > 0 ? `+${note.delta}` : `−${-note.delta}`}
            {note.why && <span className="font-medium"> {note.why}</span>}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {sources.length === 0 && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">No mana sources yet</span>}
        {sources.map((s) => (
          <ManaPip key={s.iid} source={s} />
        ))}
      </div>
    </div>
  );
}
