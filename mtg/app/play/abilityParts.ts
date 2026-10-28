import type { CardDef } from "@mtg/engine";

/** What a part of a card's text is: it decides who uses it and when. */
export type PartKind = "keyword" | "mana" | "activated" | "trigger" | "static" | "spell" | "cost";

export interface CardPart {
  kind: PartKind;
  text: string;
}

const TRIGGER = /^(when|whenever|at the beginning|at end of|at the end)\b/i;
const MANA = /(^|: )add (\{|one mana|two mana|three mana|x mana|an amount)/i;
const COST = /^(kicker|multikicker|flashback|buyback|convoke|cycling|as an additional cost)\b/i;
const ACTIVATED = /^([^:"]*\{[^}]+\}[^:"]*|[+−-]\d+|(sacrifice|discard|pay|exile|remove|tap|untap|return)[^:"]*):/i;
// Keywords that are triggered abilities: they happen on their own.
export const TRIGGERED_KEYWORDS = ["exalted", "prowess"];

const isKeywordLine = (line: string, def: CardDef) =>
  line.split(/,\s*/).every((w) => (def.keywords ?? []).some((k) => w.toLowerCase() === k.toLowerCase() || w.toLowerCase().startsWith(`${k.toLowerCase()} `)));

function kindOf(line: string, def: CardDef): PartKind {
  if (isKeywordLine(line, def)) return TRIGGERED_KEYWORDS.includes(line.toLowerCase()) ? "trigger" : "keyword";
  if (COST.test(line)) return "cost";
  if (def.type === "instant" || def.type === "sorcery") return "spell";
  if (MANA.test(line)) return "mana";
  if (TRIGGER.test(line)) return "trigger";
  if (ACTIVATED.test(line)) return "activated";
  return "static";
}

/** A card's rules text in parts: each line (reminder text left out), and each sentence of a spell, with the kind of part it is. */
export function cardParts(def: CardDef): CardPart[] {
  return (def.text ?? "").split("\n").flatMap((raw): CardPart[] => {
    const line = raw.replace(/\s*\([^)]*\)/g, "").trim();
    if (!line || line === "//") return [];
    const kind = kindOf(line, def);
    return kind === "spell" ? line.split(/(?<=\.)\s+(?=[A-Z])/).map((text) => ({ kind, text })) : [{ kind, text: line }];
  });
}

/** Worth taking apart: more than one part, or a part that works differently from what clicking suggests (mana, triggers). */
export const worthParts = (parts: CardPart[]) => parts.length > 1 || parts.some((p) => p.kind === "mana" || p.kind === "trigger" || p.kind === "activated" || p.kind === "cost");
