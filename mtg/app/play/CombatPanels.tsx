"use client";

import { OPPONENT } from "@mtg/engine";
import type { GameState, getDamageAssignments, PlayerId } from "@mtg/engine";
import { playerName } from "./log";

/** Which player or planeswalker each attacker attacks, asked only while the opponent has a planeswalker. */
export function AttackTargetsPanel({
  state,
  actor,
  attacking,
  targets,
  onChange,
}: {
  state: GameState;
  actor: PlayerId;
  attacking: string[];
  targets: Record<string, string>; // attacker iid -> planeswalker iid
  onChange: (targets: Record<string, string>) => void;
}) {
  const other = OPPONENT[actor];
  const walkers = state.players[other].battlefield.filter((p) => state.cards[p.card.defId].type === "planeswalker");
  if (state.phase !== "attackers" || attacking.length === 0 || walkers.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-red-400/60 bg-red-50 p-3">
      <h2 className="text-sm font-semibold text-red-800">What does each attacker attack?</h2>
      {attacking.map((iid) => {
        const attacker = state.players[actor].battlefield.find((p) => p.card.iid === iid)!;
        return (
          <label key={iid} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate font-semibold">{state.cards[attacker.card.defId].name}</span>
            <select
              value={targets[iid] ?? ""}
              onChange={(e) => onChange(e.target.value ? { ...targets, [iid]: e.target.value } : Object.fromEntries(Object.entries(targets).filter(([k]) => k !== iid)))}
              className="rounded border border-zinc-300 bg-white px-2 py-1"
            >
              <option value="">{playerName(other)}</option>
              {walkers.map((p) => (
                <option key={p.card.iid} value={p.card.iid}>
                  {state.cards[p.card.defId].name} (loyalty {p.loyalty})
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}

/** Divide an attacker's damage among the creatures blocking it (rule 510.1c). The total always stays equal to its power. */
export function DamagePanel({
  state,
  needed,
  effective,
  onShift,
}: {
  state: GameState;
  needed: ReturnType<typeof getDamageAssignments>;
  effective: (attacker: string) => Record<string, number>;
  onShift: (attacker: string, from: string, to: string) => void;
}) {
  const perm = (iid: string) => Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === iid)!;
  const name = (iid: string) => state.cards[perm(iid).card.defId].name;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-zinc-100 p-3">
      <h2 className="text-xs font-semibold uppercase font-display tracking-wide text-amber-600">Assign combat damage</h2>
      {needed.map(({ attacker, blockers, power, trampleTo }) => {
        const amounts = effective(attacker);
        // A trampler may also put damage on the defending player (after lethal damage on every blocker).
        const targets = trampleTo ? [...blockers, trampleTo] : blockers;
        return (
          <div key={attacker} className="flex flex-col gap-1">
            <div className="text-sm">
              <span className="font-semibold">{name(attacker)}</span> deals {power} damage, divided among its blockers
              {trampleTo ? ` and (trample) ${playerName(trampleTo)}` : ""}:
            </div>
            {targets.map((id) => {
              const others = targets.filter((o) => o !== id);
              const give = others.find((o) => (amounts[o] ?? 0) > 0); // "+" takes one from a target that has some
              const take = others[0]; // "-" gives one to another target
              const isPlayerRow = id === trampleTo;
              const b = isPlayerRow ? null : perm(id);
              const toughnessLeft = b ? (state.cards[b.card.defId].toughness ?? 0) - b.damage : null;
              const label = isPlayerRow ? `${playerName(trampleTo)} (trample)` : name(id);
              return (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate">{label}</span>
                  {toughnessLeft !== null && <span className="text-xs text-zinc-500">toughness {toughnessLeft}</span>}
                  <button
                    disabled={!(amounts[id] > 0) || !take}
                    onClick={() => onShift(attacker, id, take)}
                    className="rounded bg-zinc-300 px-2 hover:bg-zinc-400 disabled:opacity-30"
                    aria-label={`Less damage to ${label}`}
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold">{amounts[id] ?? 0}</span>
                  <button
                    disabled={!give}
                    onClick={() => give && onShift(attacker, give, id)}
                    className="rounded bg-zinc-300 px-2 hover:bg-zinc-400 disabled:opacity-30"
                    aria-label={`More damage to ${label}`}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
