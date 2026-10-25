"use client";

import { applyAction, getPossibleBlockers, powerOf, toughnessOf } from "@mtg/engine";
import type { GameState, PlayerId } from "@mtg/engine";
import { playerName } from "./log";

/**
 * The blocking step, spelled out: every attacker is listed with whoever is blocking it, and a menu to add a blocker.
 * `blocks` maps blocker iid -> attacker iid (the same thing the board clicks fill in).
 */
export default function BlockPanel({
  state,
  actor,
  blocks,
  onChange,
}: {
  state: GameState;
  actor: PlayerId;
  blocks: Record<string, string>;
  onChange: (blocks: Record<string, string>) => void;
}) {
  const combat = state.combat;
  if (!combat || combat.attackers.length === 0) return null;
  const attackerPlayer = state.active;
  const find = (iid: string) => Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === iid);
  const nameOf = (iid: string) => {
    const p = find(iid);
    return p ? state.cards[p.card.defId].name : iid;
  };
  const mine = getPossibleBlockers(state);

  /** Could this creature block that attacker? One block is tried against the real rules; "needs two blockers" counts as allowed. */
  const check = (blocker: string, attacker: string): { ok: boolean; reason?: string } => {
    const r = applyAction(state, actor, { type: "declareBlockers", blocks: [{ blocker, attacker }] });
    if (r.ok) return { ok: true };
    if (/two or more|more than one/i.test(r.error)) return { ok: true };
    return { ok: false, reason: r.error.replace(/^.*?: /, "") };
  };

  const setBlock = (blocker: string, attacker: string | null) => {
    const next = { ...blocks };
    if (attacker) next[blocker] = attacker;
    else delete next[blocker];
    onChange(next);
  };

  let unblockedDamage = 0;
  for (const a of combat.attackers) {
    const perm = find(a.attacker);
    if (perm && !a.target && !Object.values(blocks).includes(a.attacker)) unblockedDamage += Math.max(0, powerOf(state, perm));
  }
  const life = state.players[actor].life;

  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-sky-400/60 bg-sky-50 px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <h2 className="font-bold text-sky-900">
          🛡️ {playerName(attackerPlayer)} is attacking
          {mine.length === 0 && <span className="ml-2 font-normal text-zinc-600">You have no creature that can block.</span>}
        </h2>
        <span className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 font-semibold ${unblockedDamage >= life ? "bg-red-600 text-white" : "bg-white text-zinc-700"}`}>
            {unblockedDamage >= life ? "Lethal! " : ""}Unblocked: {unblockedDamage} dmg ({life} life)
          </span>
          {Object.keys(blocks).length > 0 && (
            <button onClick={() => onChange({})} className="rounded border border-zinc-400 bg-white px-2 py-0.5 hover:bg-zinc-100">
              Clear blocks
            </button>
          )}
        </span>
      </div>

      <ul className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
        {combat.attackers.map((a) => {
          const perm = find(a.attacker);
          if (!perm) return null;
          const def = state.cards[perm.card.defId];
          const assigned = Object.entries(blocks).filter(([, at]) => at === a.attacker).map(([b]) => b);
          const free = mine.filter((b) => !blocks[b]);
          const walker = a.target ? nameOf(a.target) : null;
          return (
            <li key={a.attacker} className={`flex flex-col gap-1 rounded-lg border px-2 py-1.5 ${assigned.length ? "border-emerald-400 bg-white" : "border-red-300 bg-white"}`}>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-sm font-semibold">{def.name}</span>
                <span className="rounded bg-zinc-200 px-1.5 text-xs font-bold">
                  {powerOf(state, perm)}/{toughnessOf(state, perm)}
                </span>
                {(def.keywords ?? []).map((k) => (
                  <span key={k} className="rounded bg-amber-100 px-1.5 text-xs capitalize text-amber-900">
                    {k}
                  </span>
                ))}
                {walker && <span className="text-zinc-500">→ {walker}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {assigned.length === 0 ? (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">{walker ? "Unblocked" : `Unblocked: −${Math.max(0, powerOf(state, perm))}`}</span>
                ) : (
                  assigned.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                      🛡 {nameOf(b)}
                      <button onClick={() => setBlock(b, null)} aria-label={`Stop blocking with ${nameOf(b)}`} className="rounded px-1 hover:bg-emerald-200">
                        ✕
                      </button>
                    </span>
                  ))
                )}
                {free.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && setBlock(e.target.value, a.attacker)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                    aria-label={`Add a blocker for ${def.name}`}
                  >
                    <option value="">+ Block with…</option>
                    {free.map((b) => {
                      const c = check(b, a.attacker);
                      const bp = find(b)!;
                      return (
                        <option key={b} value={b} disabled={!c.ok}>
                          {nameOf(b)} ({powerOf(state, bp)}/{toughnessOf(state, bp)}){c.ok ? "" : ` — can't: ${c.reason}`}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
