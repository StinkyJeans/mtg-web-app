"use client";

import type { GameState, PlayerId } from "@mtg/engine";
import { playerName } from "./log";
<<<<<<< HEAD

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
const targetKey = (t: TargetChoice) => (t.kind === "player" || t.kind === "stack" ? `${t.kind}:${t.id}` : t.kind === "none" ? "none" : `${t.kind}:${t.iid}`);

export function targetName(state: GameState, t: TargetChoice): string {
  if (t.kind === "none") return "No target (skip)";
  if (t.kind === "player") return playerName(t.id);
  if (t.kind === "stack") {
    const item = state.stack.find((i) => i.id === t.id);
    return item ? `${itemName(state, item)} (on the stack)` : "a spell";
  }
  for (const p of Object.values(state.players)) {
    const perm = p.battlefield.find((x) => x.card.iid === t.iid);
    if (perm) return `${state.cards[perm.card.defId].name} (${playerName(p.id)})`;
    const dead = p.graveyard.find((x) => x.iid === t.iid);
    if (dead) return `${state.cards[dead.defId].name} (in ${playerName(p.id)}'s graveyard)`;
  }
  return t.iid;
}

export function itemName(state: GameState, item: StackItem): string {
  return item.kind === "spell" ? state.cards[item.card.defId].name : `${item.sourceName} ability`;
}

/** Rules text as the engine reads it ("~", lowercase) made readable: the card's name back in, first letter capital. */
export function readable(text: string, cardName: string): string {
  const t = text.replace(/~/g, cardName).replace(/\{([a-z0-9]+)\}/g, (_, x: string) => `{${x.toUpperCase()}}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
=======
import { Help, targetName, itemName, readable } from "./cardText";
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f

/** What is waiting to resolve, newest on top. The player to act can respond or pass. */
export function StackPanel({ state, actor, onPass, waiting }: { state: GameState; actor: PlayerId; onPass: () => void; /** Online, and the other player has to act: what to say while waiting. */ waiting?: string }) {
  // With nothing on the stack there can still be a window to respond (before combat damage): it needs its pass button too.
  if (state.stack.length === 0 && !state.priority) return null;
  const deciding = state.pendingPick !== null || state.pendingChoice !== null; // that choice comes first: passing is refused until it's made
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-violet-500/50 bg-violet-50 p-3">
      <h2 className="text-sm font-semibold uppercase font-display tracking-wide text-violet-700">
        {state.stack.length === 0 ? "Before combat damage: respond, or pass to continue" : "The stack (resolves top first)"}
      </h2>
      <ol className="flex flex-col gap-1.5 text-base">
        {[...state.stack].reverse().map((item) => (
          <li key={item.id} className="rounded-lg border border-violet-200 bg-white px-3 py-2">
            <span className="text-lg font-semibold">{itemName(state, item)}</span>
            <span className="text-zinc-600"> · {playerName(item.controller)}</span>
            {item.targets.length > 0 && <span className="text-zinc-700"> → {item.targets.map((t) => targetName(state, t)).join(", ")}</span>}
            {item.kind === "ability" && <div className="text-[15px] text-zinc-700">{readable(item.text, item.sourceName)}</div>}
            <Help text={item.kind === "ability" ? item.text : (state.cards[item.card.defId].text ?? "")} max={2} large />
          </li>
        ))}
      </ol>
      {state.priority && waiting && !deciding && <p className="text-base font-medium text-violet-800">{waiting}</p>}
      {state.priority && !waiting && !deciding && (
        <div className="flex items-center gap-3">
          <button onClick={onPass} className="rounded-lg bg-violet-600 px-4 py-2 text-base font-semibold text-white hover:bg-violet-500">
            {playerName(actor)}: {state.stack.length === 0 ? "pass (continue)" : "pass (let it resolve)"}
          </button>
          <span className="text-[15px] text-zinc-700">{state.stack.length === 0 ? "You may cast an instant or use an ability first." : "Or cast an instant / use an ability to respond."}</span>
        </div>
      )}
    </section>
  );
}
