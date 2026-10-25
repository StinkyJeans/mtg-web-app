"use client";

import type { CardDef, GameState, PlayerId } from "@mtg/engine";
import { cardImageUrl } from "@/lib/cards";
import CardView from "./CardView";
import { playerName } from "./log";
import { SleeveBack } from "./AppearanceDialog";

/** The back of a card: used for the library and by the draw animation. */
export const CARD_BACK = "bg-gradient-to-br from-amber-700 via-amber-900 to-stone-900";

/**
 * A pile of cards: the library (face down, count) or the graveyard (top card face up, click to browse).
 * `data-pile` lets the animations find it, so cards can fly in.
 */
export function Pile({ state, owner, kind, compact, onOpen, deckName, sleeve }: { state: GameState; owner: PlayerId; kind: "library" | "graveyard" | "exile"; compact?: boolean; onOpen?: () => void; deckName?: string; sleeve?: { css: string; edge: string } }) {
  const cards = state.players[owner][kind];
  const top = kind !== "library" ? state.cards[cards[cards.length - 1]?.defId ?? ""] : undefined;
  const label = kind === "library" ? "Library" : kind === "graveyard" ? "Graveyard" : "Exile";
  const clickable = kind !== "library" && cards.length > 0 && onOpen;

  if (kind === "exile") {
    // Exile is usually empty or nearly so: a slim strip, not a full pile.
    return (
      <button
        type="button"
        data-pile={`exile-${owner}`}
        onClick={clickable ? onOpen : undefined}
        disabled={!clickable}
        aria-label={`${playerName(owner)}'s exile: ${cards.length} cards`}
        title={clickable ? `Look at the cards ${playerName(owner)} has in exile` : "Exile: cards removed from the game. Nothing here yet."}
        className={`flex min-h-10 w-full flex-1 items-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-sky-200/50 bg-black/35 px-2 py-1 text-slate-100 ${clickable ? "cursor-pointer hover:bg-black/50" : "cursor-default"}`}
      >
        <div
          className="relative shrink-0 rounded-[3px] border border-sky-200/50 bg-sky-950/60"
          style={{ height: "calc(var(--card-h, 100px) * 0.34)", aspectRatio: "5 / 7", ...(top?.image ? { backgroundImage: `url(${cardImageUrl(top.image)})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}
        />
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-slate-300">Exile</span>
        <span className="ml-auto text-2xl font-bold text-white">{cards.length}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-pile={`${kind}-${owner}`}
      onClick={clickable ? onOpen : undefined}
      disabled={!clickable}
      aria-label={`${playerName(owner)}'s ${label.toLowerCase()}: ${cards.length} cards`}
      title={clickable ? `Look through ${playerName(owner)}'s graveyard` : undefined}
      className={`relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg border-2 bg-black/35 text-slate-100 ${
        kind === "graveyard" ? "border-white/25" : "border-[#fcd34d]/70"
      } ${compact ? "min-h-[3.4rem] min-w-0 flex-1 px-2 py-1" : "h-36 px-3"} ${clickable ? "cursor-pointer hover:bg-black/50" : "cursor-default"}`}
    >
      {kind === "library" && cards.length > 0 && sleeve ? (
        <div className="relative ml-1 mt-1 shrink-0" data-sleeve-pile style={{ height: "calc(var(--card-h, 100px) * 0.5)", aspectRatio: "5 / 7" }}>
          {/* a thicker stack looks like a bigger library */}
          <SleeveBack
            css={sleeve.css}
            edge={sleeve.edge}
            className={`${compact ? "h-full w-full" : "h-28 w-20"} ${cards.length > 20 ? "shadow-[2px_-2px_0_rgba(0,0,0,0.55),4px_-4px_0_rgba(255,255,255,0.18),6px_-6px_0_rgba(0,0,0,0.45)]" : cards.length > 6 ? "shadow-[2px_-2px_0_rgba(0,0,0,0.55),4px_-4px_0_rgba(255,255,255,0.18)]" : ""}`}
          />
        </div>
      ) : (
        <div
          className={`relative shrink-0 rounded border border-white/30 ${compact ? "" : "h-28 w-20"} ${kind === "library" && cards.length > 0 ? CARD_BACK : "bg-white/10"}`}
          style={{ ...(compact ? { height: "calc(var(--card-h, 100px) * 0.5)", aspectRatio: "5 / 7" } : {}), ...(top?.image ? { backgroundImage: `url(${cardImageUrl(top.image)})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}
        >
          {kind === "library" && cards.length > 0 && <div className="absolute inset-1 rounded-sm border border-[#fcd34d]/50" />}
          {cards.length === 0 && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300">empty</span>}
        </div>
      )}
      <div className="flex min-w-0 flex-col text-left">
        <span className="text-[10px] font-semibold uppercase font-display tracking-wide text-slate-300">{label}</span>
        <span className={`font-bold text-white ${compact ? "text-2xl" : "text-2xl"}`}>{cards.length}</span>
        {kind === "library" && deckName && (
          <span title={deckName} className={`truncate text-slate-300 ${compact ? "max-w-24 text-[10px]" : "max-w-40 text-xs"}`}>
            {deckName}
          </span>
        )}
      </div>
    </button>
  );
}

/** Everything in a graveyard, newest first. Closes with the X button only. */
export function GraveyardDialog({ state, owner, zone = "graveyard", onClose, onZoom, onPreview, onUnpreview }: { state: GameState; owner: PlayerId; zone?: "graveyard" | "exile"; onClose: () => void; onZoom: (def: CardDef) => void; onPreview?: (def: CardDef, el: HTMLElement) => void; onUnpreview?: () => void }) {
  const cards = [...state.players[owner][zone]].reverse();
  const title = zone === "exile" ? "exile" : "graveyard";
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/25 bg-slate-950/50 p-4 text-white shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-wide text-white">
            {playerName(owner)}&apos;s {title} ({cards.length})
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-lg leading-none text-white hover:bg-white/20">
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-2 overflow-y-auto">
          {cards.map((c) => (
            <div key={c.iid} className="shrink-0" onMouseEnter={(e) => onPreview?.(state.cards[c.defId], e.currentTarget)} onMouseLeave={() => onUnpreview?.()}>
              <CardView def={state.cards[c.defId]} onClick={() => onZoom(state.cards[c.defId])} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
