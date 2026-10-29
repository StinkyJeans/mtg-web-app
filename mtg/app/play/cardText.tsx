"use client";

import type { GameState, StackItem, TargetChoice } from "@mtg/engine";
import { helpFor } from "./glossary";
import { playerName } from "./log";
import { nameWithStats } from "./stats";

/** A short plain-English explanation of what some rules text does (see glossary.ts). */
export function Help({ text, max = 3, large }: { text: string; max?: number; large?: boolean }) {
  const lines = helpFor(text, max);
  if (lines.length === 0) return null;
  return (
    <span className={large ? "mt-1.5 block text-[15px] font-normal leading-relaxed text-zinc-700" : "mt-1 block text-xs font-normal leading-snug text-zinc-500"}>
      {lines.map((l, i) => (
        <span key={`${i}-${l}`} className="block">
          ⓘ {l}
        </span>
      ))}
    </span>
  );
}

/** Name of something a spell or ability can point at. */
export const targetKey = (t: TargetChoice) => (t.kind === "player" || t.kind === "stack" ? `${t.kind}:${t.id}` : t.kind === "none" ? "none" : `${t.kind}:${t.iid}`);

export function targetName(state: GameState, t: TargetChoice): string {
  if (t.kind === "none") return "No target (skip)";
  if (t.kind === "player") return playerName(t.id);
  if (t.kind === "stack") {
    const item = state.stack.find((i) => i.id === t.id);
    return item ? `${itemName(state, item)} (on the stack)` : "a spell";
  }
  for (const p of Object.values(state.players)) {
    const perm = p.battlefield.find((x) => x.card.iid === t.iid);
    if (perm) return `${nameWithStats(state, perm)} (${playerName(p.id)})`;
    const dead = p.graveyard.find((x) => x.iid === t.iid);
    if (dead) return `${state.cards[dead.defId].name} (in ${playerName(p.id)}'s graveyard)`;
  }
  return t.iid;
}

export function itemName(state: GameState, item: StackItem): string {
  return item.kind === "spell" ? state.cards[item.card.defId].name : `${item.sourceName} ability`;
}

/** What a spell does only when its optional extra cost (waterbend, kicker) was paid: "Whenever a creature dies this turn, you gain 1 life." */
export function paidPart(text: string): string | null {
  const m = /if this spell's additional cost was paid, ([^.]+\.)/i.exec(text);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null;
}

/** Rules text as the engine reads it ("~", lowercase) made readable: the card's name back in, first letter capital. */
export function readable(text: string, cardName: string): string {
  const t = text.replace(/~/g, cardName).replace(/\{([a-z0-9]+)\}/g, (_, x: string) => `{${x.toUpperCase()}}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
