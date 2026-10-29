"use client";

import { parseCard } from "@mtg/engine";
import type { Activatable, Crewable, Cyclable, GameState, LoyaltyOption } from "@mtg/engine";
import { ManaText } from "./ManaSymbols";
import { cardAt, Help, printedLine, pumpNow, readable } from "./cardText";
import { CostChips, lockHint, splitAbility } from "./abilityText";
import type { ExileReason } from "./abilityInfo";

/** The name of a card in either player's hand. */
const cardName = (state: GameState, iid: string) => {
  const card = [...state.players.p1.hand, ...state.players.p2.hand].find((c) => c.iid === iid);
  return card ? state.cards[card.defId].name : "a card";
};

/** An ability as the card words it: what it costs as chips, then what it does, and a "for each" worked out as things stand. */
function AbilityWords({ state, a }: { state: GameState; a: Activatable }) {
  const at = cardAt(state, a.iid);
  const name = at?.def.name ?? "a card";
  const parts = splitAbility(printedLine(a.text, at?.def), name);
  const now = at ? pumpNow(state, at.player, parseCard(at.def).activated[a.index]?.effects ?? []) : null;
  return (
    <span className="block pt-1">
      {parts.cost && <CostChips cost={parts.cost} cardName={name} />} <span>{parts.effect}</span>
      {now && <span className="block text-[15px] font-medium text-emerald-800">{now}</span>}
    </span>
  );
}

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
  plots = [],
  onPlot,
  flashbacks = [],
  exileLands = [],
  onPlayLand,
  onFlashback,
  locked = [],
  warnings = {},
  only,
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
  /** Cards in hand that can be plotted now. */
  plots?: { iid: string; name: string; cost: string }[];
  onPlot?: (iid: string) => void;
  /** `source`: for a copy cast from a prepared creature, that creature's name. */
  flashbacks?: { iid: string; name: string; cost: string; zone?: "graveyard" | "exile" | "prepared"; source?: string; why?: "yard" | "harmonize" | ExileReason; tax?: number; sacrifice?: string }[];
  /** Lands in exile that may be played ("you may play that card"). */
  exileLands?: { iid: string; name: string; tapped?: boolean; why?: ExileReason }[];
  onPlayLand?: (iid: string) => void;
  onFlashback?: (iid: string) => void;
  /** Abilities that exist but can't be used right now, with the reason. Shown greyed out. */
  locked?: { key: string; where: "hand" | "battlefield"; label: React.ReactNode; reason: string; help?: string }[];
  /** "iid-index" -> a warning, for abilities that would change nothing right now. */
  warnings?: Record<string, string>;
  /** Show only this card's abilities (the pop-up opened by clicking a card). */
  only?: string;
}) {
  if (only) {
    abilities = abilities.filter((a) => a.iid === only);
    cycles = cycles.filter((c) => c.iid === only);
    crews = crews.filter((c) => c.iid === only);
    loyalty = loyalty.filter((l) => l.iid === only);
    plots = [];
    flashbacks = [];
    exileLands = [];
    locked = locked.filter((l) => l.key.includes(only));
  }
  if (abilities.length === 0 && cycles.length === 0 && crews.length === 0 && loyalty.length === 0 && plots.length === 0 && flashbacks.length === 0 && exileLands.length === 0 && locked.length === 0) return null;
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
            ) : f.why === "airbend" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> — it was airbent: while it is exiled you may cast it for <ManaText text="{2}" /> instead of its mana cost
              </>
            ) : f.why === "plot" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span> for free — you plotted it; cast it as a sorcery, without paying its mana cost
                <Help text="plot" large />
              </>
            ) : f.why === "adventure" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> — from exile, after its Adventure
                <Help text="adventure" large />
              </>
            ) : f.why === "harmonize" ? (
              <>
                <span className="font-semibold">Harmonize {f.name}</span>: <ManaText text={f.cost} /> — cast it from your graveyard; you may tap a creature to pay {"{X}"} of it, X being its power
                <Help text="harmonize" large />
              </>
            ) : f.why === "thisTurn" ? (
              <>
                <span className="font-semibold">Play {f.name}</span>: <ManaText text={f.cost} /> — exiled from your library; you may play it this turn
              </>
            ) : f.why === "untilEndStep" || f.why === "untilNextTurn" ? (
              <>
                <span className="font-semibold">Play {f.name}</span>: <ManaText text={f.cost} /> — exiled from your library; you may play it {f.why === "untilEndStep" ? "until your next end step" : "until the end of your next turn"}
              </>
            ) : f.zone === "exile" ? (
              <>
                <span className="font-semibold">Play {f.name}</span>: <ManaText text={f.cost} /> — exiled from your library; you may play it during a turn you attacked with the creature that exiled it
              </>
            ) : f.why === "yard" ? (
              <>
                <span className="font-semibold">Cast {f.name}</span>: <ManaText text={f.cost} /> — from your graveyard, this turn only
              </>
            ) : f.sacrifice ? (
              <>
                <span className="font-semibold">Flashback {f.name}</span>: sacrifice a {f.sacrifice} — cast it from your graveyard
                <Help text="flashback" large />
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
            <span className="font-semibold">Play {l.name}</span> as your land for the turn — {l.tapped ? "it was exiled from your hand, and enters tapped" : l.why === "thisTurn" ? "it was exiled from your library, and you may play it this turn" : l.why === "untilNextTurn" ? "it was exiled from your library, and you may play it until the end of your next turn" : l.why === "untilEndStep" ? "it was exiled from your library, and you may play it until your next end step" : "it was exiled and you attacked this turn"}
          </button>
        ))}
        {plots.map((p) => (
          <button key={`plot-${p.iid}`} onClick={() => onPlot?.(p.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Plot {p.name}</span>
            : <ManaText text={p.cost} /> — exile it face up; on a later turn you may cast it as a sorcery without paying its mana cost <span className="rounded bg-emerald-100 px-1.5 text-sm text-emerald-800">works from your hand</span>
            <Help text="plot" large />
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
            {a.maxX !== undefined && <span className="ml-1 rounded bg-orange-100 px-1.5 text-sm text-orange-800">you choose X (up to {a.maxX})</span>}
            <AbilityWords state={state} a={a} />
            {warnings[`${a.iid}-${a.index}`] && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-sm font-semibold text-amber-800">⚠ {warnings[`${a.iid}-${a.index}`]}</span>}
            <Help text={a.text} large />
          </button>
        ))}
        {locked.map((l) => (
          <button key={l.key} disabled title={l.reason} className="cursor-not-allowed rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-base text-zinc-600 opacity-80">
            {l.label} <span className="rounded bg-zinc-200 px-1.5 text-sm text-zinc-700">{l.where === "hand" ? "from hand" : "on battlefield"}</span>
            <span className="mt-1 block text-sm">
              <span className="font-semibold text-zinc-700">Can&apos;t yet: </span>
              <span className="italic">{l.reason}</span>
              {lockHint(l.reason) && <span className="block text-zinc-600">→ {lockHint(l.reason)}</span>}
            </span>
            {l.help && <Help text={l.help} max={2} large />}
          </button>
        ))}
      </div>
    </section>
  );
}
