"use client";

import { MAX_HAND_SIZE, MAX_LANDS_PER_TURN, playerToAct } from "@mtg/engine";
import type { GameState, PlayerId } from "@mtg/engine";
import { playerName } from "./log";
import { ManaText } from "./ManaSymbols";
import { BANNER } from "./theme";
import type { BannerMode } from "./theme";
import { shufflePending } from "./shuffleStep";
import Tip from "./Tip";

interface Props {
  state: GameState;
  actor: PlayerId;
  /** Online, while the other player is to act. */
  waiting: boolean;
  error: string | null;
  abilityCount: number;
  abilityLocked: number;
  onOpenAbilities: () => void;
}

/** What to do now, in the color of the step, with the last error and the land and ability counters. */
export default function StepBanner({ state, actor, waiting, error, abilityCount, abilityLocked, onOpenAbilities }: Props) {
  if (state.winner) return null;
  const b = BANNER[bannerMode(state)];
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-sm ${b.box}`}>
      <span className="text-2xl" aria-hidden="true">
        {b.icon}
      </span>
      <div className="min-w-0 flex-1 text-[15px] leading-snug">
        <span className="mr-2.5 text-xs font-extrabold uppercase font-display tracking-widest">{b.label}</span>
        <span className="font-semibold">{hintFor(state, actor, waiting)}</span>
      </div>
      {error && (
        <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow">
          <ManaText text={error} />
        </span>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {state.phase !== "mulligan" && <LandsPlayed state={state} actor={actor} />}
        {state.phase !== "mulligan" && (abilityCount > 0 || abilityLocked > 0) && (
          <Tip text={abilityCount > 0 ? "Open the list of abilities you can use right now." : "Abilities that can't be used yet, and why."}>
            <button
              onClick={onOpenAbilities}
              className={`rounded-full px-3 py-1 text-xs font-bold ${abilityCount > 0 ? "bg-emerald-500 text-white shadow ring-2 ring-emerald-300" : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-300"}`}
            >
              ⚡ Abilities{abilityCount > 0 ? ` (${abilityCount})` : ""}
            </button>
          </Tip>
        )}
      </div>
    </div>
  );
}

function bannerMode(state: GameState): BannerMode {
  if (state.pendingPick || state.pendingChoice) return "choice";
  if (state.priority) return "stack";
  if (state.phase === "attackers") return "attack";
  if (state.phase === "blockers") return "block";
  if (state.phase === "damage") return "damage";
  if (state.phase === "mulligan") return "mulligan";
  if (state.phase === "cleanup") return "cleanup";
  return "main";
}

function hintFor(state: GameState, actor: PlayerId, waiting: boolean): string {
  const mulligansTaken = state.opening?.taken[actor] ?? 0;
  if (waiting) return `Waiting for ${playerName(playerToAct(state))}…`;
  if (state.pendingPick) return "Choose a card.";
  if (state.pendingChoice) return "Choose a target for the triggered ability.";
  if (state.priority) return state.stack.length === 0 ? "Before combat damage: cast an instant or use an ability, or pass to continue." : "Something is on the stack. Respond or pass.";
  if (shufflePending(state)) return "Shuffle time: each player shuffles the other's deck. Click the deck on your mat to shuffle it.";
  if (state.phase === "mulligan") {
    return mulligansTaken
      ? `Click ${mulligansTaken} card${mulligansTaken > 1 ? "s" : ""} in your hand to put on the bottom of your library, then keep.`
      : "Keep this hand, or take a mulligan: draw 7 new cards, then bottom one.";
  }
  if (state.phase === "cleanup") return `You have too many cards. Click ${Math.max(0, state.players[actor].hand.length - MAX_HAND_SIZE)} to discard.`;
  if (state.phase === "damage") return "Your attacker was blocked by several creatures: divide its damage among them.";
  if (state.phase === "attackers") return "Glowing creatures can attack: click one to move it to the attack zone. ★ free hit · ✓ safe · ⚠ could die.";
  if (state.phase === "blockers") return "Click a glowing creature, then the attacker to block (or use the panel below). ★ great block · ✓ safe · ⚔ trade · 💔 chump. Then confirm.";
  return "Click a card in your hand to play it.";
}

function LandsPlayed({ state, actor }: { state: GameState; actor: PlayerId }) {
  const played = state.players[actor].landsPlayedThisTurn;
  const used = played >= MAX_LANDS_PER_TURN;
  const hasLand = state.players[actor].hand.some((c) => state.cards[c.defId].type === "land");
  return (
    <Tip text={used ? `${playerName(actor)} already played a land this turn. Only ${MAX_LANDS_PER_TURN} land can be played per turn.` : `You can still play ${MAX_LANDS_PER_TURN - played} land this turn${hasLand ? "" : " (but there is no land in your hand)"}.`}>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${used ? "bg-zinc-300 text-zinc-700" : hasLand ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400" : "bg-zinc-100 text-zinc-500"}`}>
        <i className="ms ms-land" aria-hidden="true" />
        Land played: {played}/{MAX_LANDS_PER_TURN} {used ? "✓" : ""}
      </span>
    </Tip>
  );
}
