import type { ParsedCard } from "../../effects.js";

// Lines of the Mono-Green Stompy deck: undying, Ghalta's discount.

/** Undying: "When this creature dies, if it had no +1/+1 counters on it, return it to the battlefield under its owner's control with a +1/+1 counter on it." */
export function readUndying(line: string, out: ParsedCard): boolean {
  if (line !== "undying") return false;
  out.triggers.push({ event: "dies", effects: [{ type: "returnSelfToBattlefield", counters: 1 }], targets: [], text: "Undying", ifNoCounters: true });
  return true;
}

/** Ghalta, Primal Hunger: "This spell costs {X} less to cast, where X is the total power of creatures you control." */
export function readCostLessByPower(line: string, out: ParsedCard): boolean {
  if (!/^~ costs \{x\} less to cast, where x is the total power of creatures you control$/i.test(line)) return false;
  out.costReduction = { n: 1, per: { kind: "totalPower" } };
  return true;
}
