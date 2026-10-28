import type { GameEvent, GameState, TargetChoice } from "@mtg/engine";
import { targetName } from "./cardText";
import { nameOf, playerName } from "./log";

/** One step of a chain of spells and abilities: something put on the stack, or how it left it. */
export interface ChainStep {
  tone: "cast" | "resolved" | "countered" | "fizzled";
  text: string;
}

/** The chain steps in one action's events. Targets are named as they were before it (`before`), spells as they are after. */
export function chainSteps(events: GameEvent[], before: GameState, after: GameState): ChainStep[] {
  const aimed = (targets?: TargetChoice[]) => (targets?.length ? ` → ${targets.map((t) => targetName(before, t)).join(", ")}` : "");
  return events.flatMap((e): ChainStep[] => {
    switch (e.type) {
      case "spellCast":
        return [{ tone: "cast", text: `${playerName(e.player)} cast ${nameOf(after, e.iid)}${aimed(e.targets)}` }];
      case "creatureCast":
        return [{ tone: "cast", text: `${playerName(e.player)} cast ${nameOf(after, e.iid)}` }];
      case "abilityActivated":
        return [{ tone: "cast", text: `${playerName(e.player)} used ${e.name}${aimed(e.targets)}` }];
      case "countered":
        return [{ tone: "countered", text: `${playerName(e.controller)}'s ${e.name} was countered${e.by ? ` by ${e.by}` : ""}` }];
      case "resolved":
        return [e.fizzled ? { tone: "fizzled", text: `${playerName(e.controller)}'s ${e.name} did nothing: ${e.fizzled}` } : { tone: "resolved", text: `${playerName(e.controller)}'s ${e.name} resolved` }];
      default:
        return [];
    }
  });
}

/** Worth a summary once it is over: more than one spell or ability went on the stack, or something was countered or did nothing. */
export const eventfulChain = (steps: ChainStep[]) => steps.filter((s) => s.tone === "cast").length > 1 || steps.some((s) => s.tone === "countered" || s.tone === "fizzled");

/** The current chain: its steps, and whether it is over (and worth a summary). */
export interface Chain {
  steps: ChainStep[];
  over: boolean;
}

/** The chain after one more action. A new one starts with the first thing put on an empty stack; until then the last summary stays. */
export function nextChain(chain: Chain, steps: ChainStep[], before: GameState | null, after: GameState): Chain {
  const fresh = !before || before.stack.length === 0;
  if (fresh && steps.length === 0) return chain;
  const all = fresh ? steps : [...chain.steps, ...steps];
  return { steps: all, over: after.stack.length === 0 && eventfulChain(all) };
}
