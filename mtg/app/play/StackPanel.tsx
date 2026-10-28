"use client";

import { fizzleReason, OPPONENT } from "@mtg/engine";
import type { GameState, PlayerId, StackItem } from "@mtg/engine";
import { playerName } from "./log";
import { Help, targetName, itemName, readable } from "./cardText";
import type { ChainStep } from "./chain";

const STEP_MARK: Record<ChainStep["tone"], { mark: string; className: string }> = {
  cast: { mark: "▶", className: "text-zinc-700" },
  resolved: { mark: "✓", className: "text-emerald-700" },
  countered: { mark: "✗", className: "font-semibold text-orange-700" },
  fizzled: { mark: "⦸", className: "font-semibold text-amber-700" },
};

/** What happened in this chain so far, oldest first: what was cast, and how each item left the stack. */
function ChainSteps({ steps }: { steps: ChainStep[] }) {
  return (
    <ol className="flex flex-col gap-0.5 text-[15px]">
      {steps.map((s, i) => (
        <li key={i} className={STEP_MARK[s.tone].className}>
          <span aria-hidden className="mr-1.5 inline-block w-4 text-center">{STEP_MARK[s.tone].mark}</span>
          {s.text}
        </li>
      ))}
    </ol>
  );
}

/** Whose priority it is and what passing does now, in plain words. */
function priorityLine(state: GameState, actor: PlayerId, waiting: boolean): { title: string; detail: string; mine: boolean } {
  const round = state.priority!;
  const other = OPPONENT[actor];
  const top = state.stack.length > 0 ? itemName(state, state.stack[state.stack.length - 1]) : null;
  const step = round.then === "afterAttackers" ? "blockers are declared" : "combat damage";
  if (waiting) {
    return {
      title: `${playerName(other)} has priority`,
      detail: `${round.passes === 1 ? "You passed. " : ""}Waiting for ${playerName(other)} to respond or pass.${top && round.passes === 1 ? ` If they pass, ${top} resolves.` : ""}`,
      mine: false,
    };
  }
  if (!top) return { title: `${playerName(actor)}: your priority`, detail: `Cast an instant or use an ability before ${step}, or pass to go on.`, mine: true };
  return {
    title: `${playerName(actor)}: your priority`,
    detail:
      round.passes === 1
        ? `${playerName(other)} passed. If you pass too, ${top} resolves.`
        : `Respond with an instant or ability, or pass: ${playerName(other)} then gets the chance to respond, and ${top} resolves once you both pass in a row.`,
    mine: true,
  };
}

function StackEntry({ state, item, next, actor }: { state: GameState; item: StackItem; next: boolean; actor: PlayerId }) {
  const fizzles = fizzleReason(state, item);
  const aimedAtIt = state.stack.filter((other) => other.targets.some((t) => t.kind === "stack" && t.id === item.id));
  const mine = item.controller === actor;
  return (
    <li className={`rounded-lg border bg-white px-3 py-2 ${next ? "border-violet-500 ring-1 ring-violet-400" : "border-violet-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${next ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-800"}`}>{next ? "Resolves next" : "Waiting"}</span>
        <span className="text-lg font-semibold">{itemName(state, item)}</span>
        <span className={`rounded px-1.5 text-sm font-medium ${mine ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{playerName(item.controller)}</span>
      </div>
      {item.targets.length > 0 && <div className="text-[15px] text-zinc-700">→ {item.targets.map((t) => targetName(state, t)).join(", ")}</div>}
      {item.kind === "ability" && <div className="text-[15px] text-zinc-700">{readable(item.text, item.sourceName)}</div>}
      {aimedAtIt.map((other) => (
        <div key={other.id} className="text-[15px] font-medium text-orange-700">
          ⚠ Targeted by {playerName(other.controller)}&apos;s {itemName(state, other)}{state.stack.indexOf(other) > state.stack.indexOf(item) ? ", which resolves first" : ""}
        </div>
      ))}
      {fizzles && <div className="text-[15px] font-semibold text-amber-700">⚠ Will do nothing if it resolves now: {fizzles}.</div>}
      <Help text={item.kind === "ability" ? item.text : (state.cards[item.card.defId].text ?? "")} max={2} large />
    </li>
  );
}

/**
 * The stack, newest on top, with whose priority it is and what passing does, and what already happened in this chain.
 * Once a chain with something worth knowing is over (a counter, a spell that did nothing, a response) it is summed up until closed.
 */
export function StackPanel({
  state,
  actor,
  onPass,
  waiting,
  chain = [],
  chainOver = false,
  onCloseChain,
}: {
  state: GameState;
  actor: PlayerId;
  onPass: () => void;
  /** Online, and the other player has to act: what to say while waiting. */
  waiting?: string;
  chain?: ChainStep[];
  /** The chain is over and worth a summary. */
  chainOver?: boolean;
  onCloseChain?: () => void;
}) {
  if (state.stack.length === 0 && !state.priority) {
    if (!chainOver || chain.length === 0) return null;
    return (
      <section className="flex flex-col gap-2 rounded-lg border border-violet-500/50 bg-violet-50 p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-violet-700">The chain is over: what happened</h2>
          <button onClick={onCloseChain} className="rounded px-2 text-sm font-medium text-violet-700 hover:bg-violet-100">Close</button>
        </div>
        <ChainSteps steps={chain} />
      </section>
    );
  }
  const deciding = state.pendingPick !== null || state.pendingChoice !== null; // that choice comes first: passing is refused until it's made
  const left = chain.some((s) => s.tone !== "cast"); // something already resolved, was countered or did nothing
  const top = state.stack.length > 0 ? itemName(state, state.stack[state.stack.length - 1]) : null;
  const who = state.priority && !deciding ? priorityLine(state, actor, !!waiting) : null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-violet-500/50 bg-violet-50 p-3" aria-live="polite">
      {who && (
        <div className={`rounded-lg px-3 py-2 ${who.mine ? "bg-violet-600 text-white" : "bg-zinc-200 text-zinc-800"}`}>
          <div className="text-base font-bold">{who.title}</div>
          <div className="text-[15px]">{who.detail}</div>
        </div>
      )}
      {state.stack.length > 0 && <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-violet-700">The stack: the top one resolves first</h2>}
      <ol className="flex flex-col gap-1.5 text-base">
        {[...state.stack].reverse().map((item, i) => (
          <StackEntry key={item.id} state={state} item={item} next={i === 0} actor={actor} />
        ))}
      </ol>
      {left && (
        <div className="flex flex-col gap-1 border-t border-violet-200 pt-2">
          <h3 className="text-sm font-semibold text-violet-700">So far in this chain</h3>
          <ChainSteps steps={chain} />
        </div>
      )}
      {who?.mine && (
        <div className="flex items-center gap-3">
          <button onClick={onPass} className="rounded-lg bg-violet-600 px-4 py-2 text-base font-semibold text-white hover:bg-violet-500">
            {!top ? "Pass (go on)" : state.priority!.passes === 1 ? `Pass: ${top} resolves` : `Pass to ${playerName(OPPONENT[actor])}`}
          </button>
        </div>
      )}
    </section>
  );
}
