import { ManaText } from "./ManaSymbols";
import { readable } from "./cardText";

/** "{1}{R}, {T}, Sacrifice ~: It deals 2 damage to any target." -> the cost before the colon and the effect after it. */
export function splitAbility(text: string, cardName: string): { cost: string | null; effect: string } {
  const at = text.indexOf(": ");
  // a colon inside a loyalty cost ("+1: ...") or a mode list is not a cost separator
  if (at <= 0 || /^[+-]?\d+$/.test(text.slice(0, at)) || at > 80) return { cost: null, effect: readable(text, cardName).replace(/\bx\b/g, "X") };
  return { cost: text.slice(0, at), effect: readable(text.slice(at + 2), cardName).replace(/\bx\b/g, "X") };
}

/** What you pay, as small chips: mana symbols, "Tap", "Sacrifice ~", "Discard a card"... Reads left to right, then an arrow to the effect. */
export function CostChips({ cost, cardName }: { cost: string; cardName: string }) {
  const parts = cost.split(/,\s*(?![^{]*\})/).map((p) => p.trim()).filter(Boolean);
  const chip = "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[13px] font-semibold leading-none";
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle" aria-label={`Cost: ${cost}`}>
      {parts.map((p, i) => {
        if (/^\{t\}$/i.test(p)) return <span key={i} className={`${chip} border-zinc-400 bg-zinc-100 text-zinc-800`}>⟳ Tap</span>;
        if (/^(\{[^}]+\})+$/.test(p)) return <span key={i} className={`${chip} border-sky-300 bg-sky-50 text-sky-900`}><ManaText text={p} /></span>;
        return <span key={i} className={`${chip} border-rose-300 bg-rose-50 text-rose-900`}>{readable(p, cardName)}</span>;
      })}
      <span aria-hidden="true" className="px-0.5 font-bold text-emerald-700">➜</span>
    </span>
  );
}

/** What to do about an ability that can't be used right now: the engine's reason, turned into a next step. */
export function lockHint(reason: string): string | null {
  if (/tapped/.test(reason)) return "It untaps at the start of your next turn.";
  if (/summoning sick|just arrived/.test(reason)) return "Creatures can use tap abilities from your next turn on.";
  if (/not enough mana/.test(reason)) return "Play a land or untap more mana first.";
  if (/sorcery|main phase/.test(reason)) return "Wait for your main phase, with nothing on the stack.";
  if (/only during your turn/.test(reason)) return "Wait for your own turn.";
  if (/already used this turn/.test(reason)) return "It can be used again next turn.";
  if (/nothing it could target/.test(reason)) return "It needs a legal target on the battlefield first.";
  if (/wait for your turn to respond/.test(reason)) return "You can use it once you have priority.";
  return null;
}
