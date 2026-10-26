"use client";

import type { Activatable, Crewable, Cyclable, GameState, LoyaltyOption } from "@mtg/engine";
import { ManaText } from "./ManaSymbols";
import { Help, readable } from "./cardText";

/** The name of a card in either player's hand. */
const cardName = (state: GameState, iid: string) => {
  const card = [...state.players.p1.hand, ...state.players.p2.hand].find((c) => c.iid === iid);
  return card ? state.cards[card.defId].name : "a card";
};

/** Abilities the player can use right now (tap to ping, pump, and so on). */
export function AbilityPanel({
  state,
  abilities,
  onUse,
  cycles = [],
  onCycle,
  crews = [],
  onCrew,
  loyalty = [],
  onLoyalty,
  flashbacks = [],
  exileLands = [],
  onPlayLand,
  onFlashback,
  locked = [],
  warnings = {},
}: {
  state: GameState;
  abilities: Activatable[];
  onUse: (a: Activatable) => void;
  cycles?: Cyclable[];
  onCycle?: (iid: string) => void;
  crews?: Crewable[];
  onCrew?: (iid: string) => void;
  loyalty?: LoyaltyOption[];
  onLoyalty?: (a: LoyaltyOption) => void;
  /** `source`: for a copy cast from a prepared creature, that creature's name. */
  flashbacks?: { iid: string; name: string; cost: string; zone?: "graveyard" | "exile" | "prepared"; source?: string; why?: "yard" | "warp" | "exiled"; tax?: number }[];
  /** Lands in exile that may be played ("you may play that card"). */
  exileLands?: { iid: string; name: string; tapped?: boolean }[];
  onPlayLand?: (iid: string) => void;
  onFlashback?: (iid: string) => void;
  /** Abilities that exist but can't be used right now, with the reason. Shown greyed out. */
  locked?: { key: string; where: "hand" | "battlefield"; label: React.ReactNode; reason: string; help?: string }[];
  /** "iid-index" -> a warning, for abilities that would change nothing right now. */
  warnings?: Record<string, string>;
}) {
  if (abilities.length === 0 && cycles.length === 0 && crews.length === 0 && loyalty.length === 0 && flashbacks.length === 0 && exileLands.length === 0 && locked.length === 0) return null;
  const nameOfPerm = (iid: string) => {
    for (const p of Object.values(state.players)) {
      const card = [...p.battlefield.map((x) => x.card), ...p.hand, ...p.graveyard].find((c) => c.iid === iid);
      if (card) return state.cards[card.defId].name;
    }
    return iid;
  };
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50 p-3">
      <h2 className="text-sm font-semibold uppercase font-display tracking-wide text-emerald-700">Abilities</h2>
      <div className="flex flex-col gap-1">
        {loyalty.map((a) => (
          <button key={`loyalty-${a.iid}-${a.index}`} onClick={() => onLoyalty?.(a)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">{nameOfPerm(a.iid)}</span> <span className="rounded bg-zinc-200 px-1.5 text-sm font-bold">{a.cost > 0 ? `+${a.cost}` : a.cost}</span>: {readable(a.text.replace(/^[+-]?\d+: /, ""), nameOfPerm(a.iid))}
            <Help text={a.text} large />
          </button>
        ))}
        {crews.map((c) => (
          <button key={`crew-${c.iid}`} onClick={() => onCrew?.(c.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Crew {nameOfPerm(c.iid)}</span> {c.crew}: tap creatures with total power {c.crew}, it becomes a creature this turn
            <Help text={`crew ${c.crew}`} large />
          </button>
        ))}
        {flashbacks.map((f) => (
          <button key={`flashback-${f.iid}`} onClick={() => onFlashback?.(f.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            {f.zone === "prepared" ? (
              <>
                <span className="font-semibold">Cast a copy of {f.name}</span>: <ManaText text={f.cost} /> — {f.source} is prepared (this unprepares it)
                <Help text="prepared" large />
              </>
            ) : f.why === "warp" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> — from exile, where warp put it
                <Help text="warp" large />
              </>
            ) : f.why === "exiled" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> plus <ManaText text={`{${f.tax ?? 0}}`} /> — it was exiled from your hand, so it costs more
              </>
            ) : f.zone === "exile" ? (
              <>
                <span className="font-semibold">Play {f.name}</span>: <ManaText text={f.cost} /> — it was exiled and you attacked this turn
              </>
            ) : f.why === "yard" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> — from your graveyard, this turn only
              </>
            ) : (
              <>
                <span className="font-semibold">Flashback {f.name}</span>: <ManaText text={f.cost} /> — cast it from your graveyard
                <Help text="flashback" large />
              </>
            )}
          </button>
        ))}
        {exileLands.map((l) => (
          <button key={`exile-land-${l.iid}`} onClick={() => onPlayLand?.(l.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Play {l.name}</span> as your land for the turn — {l.tapped ? "it was exiled from your hand, and enters tapped" : "it was exiled and you attacked this turn"}
          </button>
        ))}
        {cycles.map((c) => (
          <button key={`cycle-${c.iid}`} onClick={() => onCycle?.(c.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Cycle {cardName(state, c.iid)}</span>
            : <ManaText text={c.cost} /> — discard it, draw a card <span className="rounded bg-emerald-100 px-1.5 text-sm text-emerald-800">works from your hand</span>
            <Help text="cycling" large />
          </button>
        ))}
        {abilities.map((a) => (
          <button key={`${a.iid}-${a.index}`} onClick={() => onUse(a)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">{nameOfPerm(a.iid)}</span>
            {Object.values(state.players).some((p) => p.hand.some((c) => c.iid === a.iid)) && <span className="ml-1 rounded bg-sky-100 px-1.5 text-sm text-sky-800">from hand</span>}
            {Object.values(state.players).some((p) => p.graveyard.some((c) => c.iid === a.iid)) && <span className="ml-1 rounded bg-stone-200 px-1.5 text-sm text-stone-700">from graveyard</span>}
            : {readable(a.text, nameOfPerm(a.iid))}
            {warnings[`${a.iid}-${a.index}`] && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-sm font-semibold text-amber-800">⚠ {warnings[`${a.iid}-${a.index}`]}</span>}
            <Help text={a.text} large />
          </button>
        ))}
        {locked.map((l) => (
          <button key={l.key} disabled title={l.reason} className="cursor-not-allowed rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-base text-zinc-600 opacity-80">
            {l.label} <span className="rounded bg-zinc-200 px-1.5 text-sm text-zinc-700">{l.where === "hand" ? "from hand" : "on battlefield"}</span> <span className="text-sm italic">— {l.reason}</span>
            {l.help && <Help text={l.help} max={2} large />}
          </button>
        ))}
      </div>
    </section>
  );
}
