"use client";

import type { GameState, PlayerId } from "@mtg/engine";
import { playerName } from "./log";
import { Help, targetName, itemName, readable } from "./cardText";

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
