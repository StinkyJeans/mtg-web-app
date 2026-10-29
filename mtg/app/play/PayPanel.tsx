"use client";

import { useState } from "react";
import { manaSources } from "@mtg/engine";
import type { Action, GameState, PlayerId } from "@mtg/engine";
import { ManaSymbol } from "./ManaSymbols";
import { cardNameAnywhere, paymentOf } from "./castInfo";

/** What is being paid for, waiting for the player to say which lands to tap. */
export interface PayChoice {
  action: Action;
  as: PlayerId;
  /** The lands the game would tap by itself: the first selection. */
  tap: string[];
}

/**
 * "Pay with": every land and mana creature that can pay right now, the ones the game would use already ticked. The player ticks the
 * ones they want; the rest are kept untapped. Nothing is taken from the lands that are not ticked.
 */
export function PayPanel({ state, choice, onPay, onCancel }: { state: GameState; choice: PayChoice; onPay: (spare: string[]) => void; onCancel: () => void }) {
  const [picked, setPicked] = useState<string[]>(choice.tap);
  const usable = manaSources(state, choice.as).filter((s) => !s.tapped && !s.sick);
  const spare = usable.map((s) => s.iid).filter((iid) => !picked.includes(iid));
  const check = paymentOf(state, choice.action, choice.as, spare);
  const name = "iid" in choice.action && choice.action.iid ? cardNameAnywhere(state, choice.action.iid) : "this";
  return (
    <section className="panel-in flex flex-col gap-2 rounded-lg border border-emerald-400/60 p-3 text-white" style={{ background: "#022c22", color: "#fff" }}>
      <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Pay for {name} with…</h2>
      <p className="text-sm" style={{ color: "#d1fae5" }}>Tick the lands you want to tap. The ones you leave unticked stay untapped.</p>
      <div className="flex flex-wrap gap-2">
        {usable.map((s) => {
          const on = picked.includes(s.iid);
          return (
            <button
              key={s.iid}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.iid) : [...p, s.iid]))}
              className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold ${on ? "border-amber-300 bg-amber-400/25 ring-2 ring-amber-300" : "border-white/25 bg-white/10 opacity-70"}`}
            >
              <span aria-hidden="true">{on ? "☑" : "☐"}</span>
              <span className="flex items-center gap-px">
                {(s.colors.length === 5 ? ["W", "U", "B", "R", "G"] : s.colors).map((c) => (
                  <ManaSymbol key={c} symbol={c} />
                ))}
              </span>
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>
      {!check.ok && <p className="text-sm font-semibold text-amber-200">These lands cannot pay for it: tick another one.</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onPay(spare)} disabled={!check.ok} className="min-h-11 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 text-sm font-extrabold text-black disabled:opacity-40">
          Pay with these
        </button>
        <button onClick={onCancel} className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </section>
  );
}
