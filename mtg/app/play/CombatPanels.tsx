"use client";

import { hasKeywordNow, OPPONENT, parseCard, toughnessOf } from "@mtg/engine";
import type { GameState, getDamageAssignments, Permanent, PlayerId } from "@mtg/engine";
import { playerName } from "./log";
import { nameWithStats, ptText } from "./stats";

/** How its damage lands: as poison with infect, plus poison counters with toxic. */
function damageKind(state: GameState, attacker: Permanent): string {
  const toxic = parseCard(state.cards[attacker.card.defId]).toxic ?? 0;
  if (hasKeywordNow(state, attacker, "infect")) return " (infect: -1/-1 counters on creatures, poison counters on a player)";
  return toxic > 0 ? ` (toxic ${toxic}: a player it damages also gets ${toxic === 1 ? "a poison counter" : `${toxic} poison counters`})` : "";
}

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
            <span className="w-28 truncate font-semibold sm:w-40">{state.cards[attacker.card.defId].name}</span>
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
  const name = (iid: string) => nameWithStats(state, perm(iid));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-zinc-100 p-3">
      <h2 className="text-xs font-semibold uppercase font-display tracking-wide text-amber-600">Assign combat damage</h2>
      {needed.map(({ attacker, blockers, power, trampleTo }) => {
        const amounts = effective(attacker);
        const attackerPerm = perm(attacker);
        const deathtouch = hasKeywordNow(state, attackerPerm, "deathtouch");
        // A trampler may also put damage on the defending player (after lethal damage on every blocker).
        const targets = trampleTo ? [...blockers, trampleTo] : blockers;
        return (
          <div key={attacker} className="flex flex-col gap-1">
            <div className="text-sm">
              <span className="font-semibold">{name(attacker)}</span> deals {power} damage{damageKind(state, attackerPerm)}, divided among its blockers
              {trampleTo ? ` and (trample) ${playerName(trampleTo)}` : ""}:
            </div>
            {targets.map((id) => {
              const others = targets.filter((o) => o !== id);
              const give = others.find((o) => (amounts[o] ?? 0) > 0); // "+" takes one from a target that has some
              const take = others[0]; // "-" gives one to another target
              const isPlayerRow = id === trampleTo;
              const b = isPlayerRow ? null : perm(id);
              // Lethal damage: what is left of its toughness, or 1 from a deathtouch attacker.
              const lethal = b ? (deathtouch ? 1 : Math.max(0, toughnessOf(state, b) - b.damage)) : null;
              const label = b ? state.cards[b.card.defId].name : `${playerName(trampleTo!)} (trample)`;
              return (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-28 truncate sm:w-40">{label}</span>
                  {b && <span className="rounded bg-zinc-900 px-1.5 text-xs font-bold text-white" title="Power / toughness now">{ptText(state, b)}</span>}
                  {lethal !== null && <span className="text-xs text-zinc-500">{lethal} kills it</span>}
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
