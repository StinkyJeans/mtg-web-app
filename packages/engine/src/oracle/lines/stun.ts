import type { ParsedCard } from "../../effects.js";
import { parseEffectText } from "../effectText.js";
import { newCtx } from "../targets.js";
import { toNumber } from "../words.js";

// Lines of the Azorius Stun deck: Sleep-Cursed Faerie, Sharae of Numbing Depths, Solitary Sanctuary.

/** Sleep-Cursed Faerie: "This creature enters tapped with three stun counters on it." */
export function readEntersStunned(line: string, out: ParsedCard): boolean {
  const m = /^~ enters tapped with (a|one|two|three|four|five) stun counters? on it$/.exec(line);
  const n = m ? toNumber(m[1]) : null;
  if (!n) return false;
  out.entersTapped = true;
  out.entersWithStun = n;
  return true;
}

/** "Whenever you tap an untapped creature an opponent controls, ..." / "Whenever you tap one or more untapped creatures your opponents control, ..." */
export function readYouTapOpp(line: string, out: ParsedCard): boolean {
  const m = /^whenever you tap (?:an untapped creature an opponent controls|one or more untapped creatures your opponents control),? (.+)$/.exec(line);
  if (!m) return false;
  const ctx = newCtx(true);
  const effects = parseEffectText(m[1], ctx);
  if (effects && effects.length > 0) out.triggers.push({ event: "youTapOpp", effects, targets: ctx.targets, text: line });
  else out.unsupported.push(line);
  return true;
}
