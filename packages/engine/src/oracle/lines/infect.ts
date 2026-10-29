import type { ParsedCard } from "../../effects.js";
import { parseStatic } from "../abilities.js";
import { keywordList } from "../words.js";
import { newCtx } from "../targets.js";
import { parseEffectText } from "../effectText.js";

// Lines of the Mono-Black Infect deck: Hand of the Praetors.

/** "Other creatures you control with infect get +1/+1." */
export function readKeywordLord(line: string, out: ParsedCard): boolean {
  const m = /^(other )?creatures you control with ([a-z ]+?) ((?:get|have) .+)$/.exec(line);
  const keyword = m ? keywordList(m[2]) : null;
  if (!m || keyword?.length !== 1) return false;
  const st = parseStatic(`creatures you control ${m[3]}`);
  if (!st) return false;
  (out.statics ??= []).push({ ...st, ...(m[1] ? { other: true } : {}), withKeyword: keyword[0] });
  return true;
}

/** "Whenever you cast a creature spell, ..." / "Whenever you cast a creature spell with infect, ..." */
export function readCreatureSpellCast(line: string, out: ParsedCard): boolean {
  const m = /^whenever you cast a creature spell(?: with ([a-z ]+?))?, (.+)$/.exec(line);
  if (!m) return false;
  const keyword = m[1] ? keywordList(m[1]) : [];
  const ctx = newCtx(true);
  const effects = parseEffectText(m[2], ctx);
  if (keyword?.length === (m[1] ? 1 : 0) && effects && effects.length > 0) {
    out.triggers.push({ event: "youCast", effects, targets: ctx.targets, text: line, spellCreature: true, ...(keyword![0] ? { spellKeyword: keyword![0] } : {}) });
    return true;
  }
  out.unsupported.push(line);
  return true;
}
