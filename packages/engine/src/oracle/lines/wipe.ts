import type { ParsedCard } from "../../effects.js";
import { parseEffectText } from "../effectText.js";
import { newCtx } from "../targets.js";

// Lines of the Orzhov Board Wipes deck: Massacre Wurm.

/** Massacre Wurm: "Whenever a creature an opponent controls dies, that player loses 2 life." */
export function readOppCreatureDies(line: string, out: ParsedCard): boolean {
  const m = /^whenever a creature an opponent controls dies,? (.+)$/.exec(line);
  if (!m) return false;
  const ctx = newCtx(true);
  const effects = parseEffectText(m[1].replace(/^that player /, "each opponent "), ctx);
  if (effects && effects.length > 0) out.triggers.push({ event: "oppCreatureDies", effects, targets: ctx.targets, text: line });
  else out.unsupported.push(line);
  return true;
}
