"use client";

import { getDamageAssignments, MAX_HAND_SIZE, MAX_MULLIGANS, OPPONENT, powerOf, STARTING_HAND } from "@mtg/engine";
import type { Action, GameState, PlayerId } from "@mtg/engine";
import { playerName } from "./log";
import { PLAYER_STYLE } from "./theme";
import { shufflePending } from "./shuffleStep";
import Tip from "./Tip";

const PHASES = [
  ["mulligan", "Mulligan"],
  ["main1", "Main 1"],
  ["attackers", "Attack"],
  ["blockers", "Block"],
  ["damage", "Damage"],
  ["main2", "Main 2"],
  ["end", "End"],
  ["cleanup", "Cleanup"],
] as const;

const PASS_LABEL: Record<string, string> = {
  main1: "Go to combat",
  main2: "Go to end step",
  end: "Pass turn",
};

const PHASE_TEXT: Record<string, string> = {
  mulligan: "keeps or mulligans",
  blockers: "chooses blockers",
  damage: "assigns combat damage",
  end: "ends the turn",
  cleanup: "discards to hand size",
};

const NO_COMBAT_TIP = "You have no cards on your battlefield yet, so there is nothing to attack with. Play a land or a creature from your hand first, or end your turn.";

export interface Primary {
  label: string;
  action: Action;
}

/** What the player has chosen so far in this step, which the big button submits. */
export interface Selection {
  handPick: string[]; // cards to bottom (mulligan) or discard (cleanup)
  attacking: string[];
  attackTargets: Record<string, string>; // attacker iid -> planeswalker iid
  blocks: Record<string, string>; // blocker iid -> attacker iid, including the blocks the rules force
  damageTo: (attacker: string) => Record<string, number>;
}

/** The one big button that moves the game on, or null while something else has to be answered first. */
export function primaryAction(state: GameState, actor: PlayerId, mine: boolean, sel: Selection): Primary | null {
  if (state.winner || state.priority || state.pendingChoice || state.pendingPick || !mine || shufflePending(state)) return null;
  const mulligansTaken = state.opening?.taken[actor] ?? 0;
  if (state.phase === "mulligan") {
    return {
      label: mulligansTaken ? `Keep and bottom ${sel.handPick.length}/${mulligansTaken}` : "Keep hand",
      action: { type: "keepHand", bottom: sel.handPick },
    };
  }
  if (state.phase === "cleanup") {
    const excess = Math.max(0, state.players[actor].hand.length - MAX_HAND_SIZE);
    return { label: `Discard ${sel.handPick.length}/${excess}`, action: { type: "discard", iids: sel.handPick } };
  }
  if (state.phase === "damage") {
    const assignments = getDamageAssignments(state).flatMap((d) =>
      [...d.blockers, ...(d.trampleTo ? [d.trampleTo] : [])].map((blocker) => ({
        attacker: d.attacker,
        blocker,
        amount: sel.damageTo(d.attacker)[blocker] ?? 0,
      })),
    );
    return { label: "Deal damage", action: { type: "assignDamage", assignments } };
  }
  if (state.phase === "attackers") {
    const targets = Object.entries(sel.attackTargets).filter(([a]) => sel.attacking.includes(a));
    return sel.attacking.length
      ? {
          label: `Attack with ${sel.attacking.length}`,
          action: { type: "declareAttackers", attackers: sel.attacking, ...(Object.keys(sel.attackTargets).length ? { targets: Object.fromEntries(targets) } : {}) },
        }
      : { label: "Skip attack", action: { type: "passPhase" } };
  }
  if (state.phase === "blockers") {
    const list = Object.entries(sel.blocks).map(([blocker, attacker]) => ({ blocker, attacker }));
    return {
      label: list.length ? `Confirm ${list.length} block${list.length > 1 ? "s" : ""}` : "No blocks",
      action: { type: "declareBlockers", blocks: list },
    };
  }
  return { label: PASS_LABEL[state.phase], action: { type: "passPhase" } };
}

interface Props {
  state: GameState;
  actor: PlayerId;
  mine: boolean;
  primary: Primary | null;
  /** The big button would give up an attack or blocks that could be made, so it asks once more. */
  skipping: boolean;
  confirmSkip: boolean;
  onConfirmSkip: (asking: boolean) => void;
  onAct: (action: Action) => void;
  /** First main phase with nothing on the battlefield: there is no combat to go to. */
  noCombatYet: boolean;
  showEndTurn: boolean;
  onlyLandsLeft: boolean;
  onEndTurn: () => void;
}

/** The command bar: whose turn, which step, and the one big button to move on. */
export default function CommandBar({ state, actor, mine, primary, skipping, confirmSkip, onConfirmSkip, onAct, noCombatYet, showEndTurn, onlyLandsLeft, onEndTurn }: Props) {
  const mulligansTaken = state.opening?.taken[actor] ?? 0;
  return (
    <section className={`shrink-0 overflow-hidden rounded-xl border bg-white shadow-md ${PLAYER_STYLE[actor].border}`}>
      <div className={`h-1 bg-gradient-to-r ${PLAYER_STYLE[actor].gradient}`} />
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2 py-1 lg:gap-y-1.5 lg:px-3 lg:py-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 px-2.5 py-0.5 text-center text-white shadow">
            <div className="text-[8px] uppercase font-display tracking-widest text-zinc-400">Turn</div>
            <div className="text-lg font-extrabold leading-none">{state.turn}</div>
          </div>
          <div className="leading-tight max-lg:hidden">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PLAYER_STYLE[actor].chip}`}>{playerName(actor)}</span>
            <div className="mt-0.5 text-xs font-semibold text-zinc-800">{PHASE_TEXT[state.phase] ?? "to act"}</div>
          </div>
        </div>
        <PhaseSteps phase={state.phase} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {primary &&
            (skipping && confirmSkip ? (
              <SkipConfirm state={state} actor={actor} onYes={() => onAct(primary.action)} onBack={() => onConfirmSkip(false)} />
            ) : (
              <PrimaryButton
                primary={primary}
                tip={state.phase === "mulligan" ? keepHandTip(mulligansTaken) : noCombatYet ? NO_COMBAT_TIP : undefined}
                disabled={noCombatYet}
                onClick={() => (skipping ? onConfirmSkip(true) : onAct(primary.action))}
              />
            ))}
          {showEndTurn && !state.winner && (
            <Tip text={onlyLandsLeft ? "Nothing but lands left to play: skip the rest of this turn and pass it to your opponent." : "Skip the rest of this turn and pass it to your opponent."}>
              <button onClick={onEndTurn} className="rounded-xl border-2 border-zinc-300 bg-white px-3 py-1 text-sm font-semibold text-zinc-700 max-lg:min-h-11 transition hover:border-zinc-400 hover:bg-zinc-50">
                {onlyLandsLeft ? "Pass turn" : "End turn"}
              </button>
            </Tip>
          )}
          {mine && state.phase === "mulligan" && !shufflePending(state) && (
            <Tip text={mulliganTip(mulligansTaken)}>
              <button
                onClick={() => onAct({ type: "mulligan" })}
                disabled={mulligansTaken >= MAX_MULLIGANS}
                className="rounded-xl border-2 border-indigo-300 bg-white px-3 py-1 text-sm font-semibold text-indigo-800 max-lg:min-h-11 transition hover:bg-indigo-50 disabled:opacity-40"
              >
                Mulligan
              </button>
            </Tip>
          )}
        </div>
      </div>
    </section>
  );
}

/** The steps of the turn, the current one highlighted and the ones before it ticked. */
function PhaseSteps({ phase }: { phase: GameState["phase"] }) {
  const steps = PHASES.filter(([id]) => id !== "mulligan" || phase === "mulligan");
  const at = steps.findIndex(([id]) => id === phase);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {steps.map(([id, label], i) => (
        <li
          key={id}
          className={`font-display flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tracking-wide transition ${
            i === at ? "bg-amber-400 text-black shadow ring-2 ring-amber-300" : i < at ? "bg-emerald-100 text-emerald-700 max-lg:hidden" : "bg-zinc-100 text-zinc-400 max-lg:hidden"
          }`}
        >
          {i < at && <span aria-hidden="true">✓</span>}
          {label}
        </li>
      ))}
    </ol>
  );
}

function PrimaryButton({ primary, tip, disabled, onClick }: { primary: Primary; tip?: string; disabled: boolean; onClick: () => void }) {
  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-sm font-extrabold max-lg:min-h-11 text-black shadow-md shadow-amber-500/40 transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
    >
      {primary.label}
    </button>
  );
  return tip ? <Tip text={tip}>{button}</Tip> : button;
}

/** "Skip attack" and "No blocks" ask once more while a creature could attack or block. */
function SkipConfirm({ state, actor, onYes, onBack }: { state: GameState; actor: PlayerId; onYes: () => void; onBack: () => void }) {
  const blocking = state.phase === "blockers";
  const other = OPPONENT[actor];
  const incoming = (state.combat?.attackers ?? []).reduce((n, a) => {
    const perm = a.target ? undefined : state.players[other].battlefield.find((x) => x.card.iid === a.attacker);
    return n + (perm ? Math.max(0, powerOf(state, perm)) : 0);
  }, 0);
  return (
    <span role="group" aria-label={blocking ? "No blocks?" : "Skip attack?"} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">
      {blocking ? `No blocks? You'll take ${incoming} damage.` : "Skip attack? Your creatures won't attack this turn."}
      <button onClick={onYes} className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 font-extrabold text-black">
        {blocking ? "Yes, no blocks" : "Yes, skip"}
      </button>
      <button onClick={onBack} className="rounded-lg border border-zinc-400 bg-white px-3 py-1 hover:bg-zinc-100">
        Back
      </button>
    </span>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// What the two opening-hand buttons do, shown when the mouse is over them.
const keepHandTip = (taken: number) =>
  taken
    ? `Keep this hand and start the game. You took ${plural(taken, "mulligan")}, so first click ${plural(taken, "card")} in your hand to put on the bottom of your library. You will start with ${STARTING_HAND - taken} cards.`
    : `Keep your starting ${STARTING_HAND} cards and start the game. Choose this if the hand has a good mix of lands and creatures you can cast.`;

const mulliganTip = (taken: number) =>
  `Don't like this hand, for example too few lands or nothing you can cast? Shuffle it back into your library and draw ${STARTING_HAND} new cards. ` +
  `The catch: when you finally keep, you put one card per mulligan on the bottom of your library, so you start with fewer cards (${STARTING_HAND}, then ${STARTING_HAND - 1}, then ${STARTING_HAND - 2}...).` +
  (taken ? ` You have taken ${taken} so far; another would leave you with ${STARTING_HAND - taken - 1} cards.` : "");
