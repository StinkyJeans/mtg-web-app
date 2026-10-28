"use client";

import { KEYWORD_RULES } from "@mtg/engine";
import type { CardDef, Keyword } from "@mtg/engine";
import { cardParts, TRIGGERED_KEYWORDS } from "./abilityParts";
import type { CardPart, PartKind } from "./abilityParts";
import { helpForWord } from "./glossary";
import { ManaText } from "./ManaSymbols";

const LOOK: Record<PartKind, { label: string; chip: string; how?: string }> = {
  mana: { label: "Mana", chip: "bg-emerald-100 text-emerald-800", how: "Used by itself when you pay for a spell or ability: you never click it. It is counted in your Mana." },
  activated: { label: "You activate", chip: "bg-sky-100 text-sky-800", how: "You choose when to use it: click the card while it glows." },
  trigger: { label: "Triggers", chip: "bg-violet-100 text-violet-800", how: "Happens on its own when this happens. It goes on the stack first, so players can respond to it." },
  static: { label: "Always on", chip: "bg-zinc-200 text-zinc-700", how: "Works all the time while it is on the battlefield." },
  spell: { label: "Step", chip: "bg-amber-100 text-amber-800" },
  keyword: { label: "Keyword", chip: "bg-zinc-200 text-zinc-700" },
  cost: { label: "Cost", chip: "bg-rose-100 text-rose-800", how: "Paid while you cast it, on top of (or instead of) its mana cost." },
};

function howOf(part: CardPart, def: CardDef): string | undefined {
  const word = part.text.toLowerCase().split(/[ ,]/)[0];
  if (part.kind === "keyword") return KEYWORD_RULES[word as Keyword] ?? helpForWord(part.text);
  if (part.kind === "trigger" && TRIGGERED_KEYWORDS.includes(word)) return helpForWord(word);
  if (part.kind === "cost") return helpForWord(part.text) ?? LOOK.cost.how;
  if (part.kind === "mana" && def.type === "creature") return `${LOOK.mana.how} A creature tapped for mana can't attack or block until it untaps.`;
  return LOOK[part.kind].how;
}

/**
 * A card's text taken apart: what happens by itself (mana, triggers), what you activate, what is always on, and a spell's steps
 * in the order they happen. `skip`: kinds shown elsewhere.
 */
export function CardParts({ def, skip = [], parts = cardParts(def) }: { def: CardDef; skip?: PartKind[]; parts?: CardPart[] }) {
  const shown = parts.filter((p) => !skip.includes(p.kind));
  if (shown.length === 0) return null;
  let step = 0;
  return (
    <ul className="flex flex-col gap-1.5">
      {shown.map((p, i) => {
        const how = howOf(p, def);
        return (
          <li key={i} className="rounded border border-zinc-200 bg-white/80 p-2">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${LOOK[p.kind].chip}`}>{p.kind === "spell" ? `Step ${++step}` : LOOK[p.kind].label}</span>
              <span className="text-[15px] leading-snug">
                <ManaText text={p.text} />
              </span>
            </div>
            {how && <p className="mt-1 text-sm leading-snug text-zinc-600">{how}</p>}
          </li>
        );
      })}
    </ul>
  );
}
