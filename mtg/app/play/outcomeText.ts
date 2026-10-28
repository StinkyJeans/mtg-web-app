import type { GameEvent, Outcome } from "@mtg/engine";
import { playerName } from "./players";

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const LEFT_TO: Record<Extract<Outcome, { k: "left" }>["to"], string> = {
  graveyard: "goes to the graveyard",
  exile: "is exiled",
  hand: "returns to its owner's hand",
  library: "is put into its owner's library",
  gone: "leaves the battlefield",
};

function countersLine(o: Extract<Outcome, { k: "counters" }>): string {
  const parts = [
    o.plus > 0 ? `gets ${plural(o.plus, "+1/+1 counter")}` : o.plus < 0 ? `loses ${plural(-o.plus, "+1/+1 counter")}` : "",
    o.minus > 0 ? `gets ${plural(o.minus, "-1/-1 counter")}` : o.minus < 0 ? `loses ${plural(-o.minus, "-1/-1 counter")}` : "",
  ].filter(Boolean);
  return `${o.name} ${parts.join(" and ")} (now ${o.power}/${o.toughness})`;
}

/** One thing a spell or ability did, in plain words: "Glistener Elf gets +2/+2 (now 3/3)". */
export function outcomeLine(o: Outcome): string {
  switch (o.k) {
    case "pump":
      return `${o.name} gets ${sign(o.dp)}/${sign(o.dt)} (now ${o.power}/${o.toughness})`;
    case "counters":
      return countersLine(o);
    case "keywords":
      return [o.gained.length > 0 ? `${o.name} gains ${o.gained.join(", ")}` : "", o.lost.length > 0 ? `${o.name} loses ${o.lost.join(", ")}` : ""].filter(Boolean).join("; ");
    case "shielded":
      return `${o.name} can't be the target of ${playerName(o.from)}'s spells or abilities this turn`;
    case "animated":
      return `${o.name} becomes a ${o.power}/${o.toughness} creature`;
    case "tapped":
      return `${o.name} is tapped`;
    case "untapped":
      return `${o.name} untaps`;
    case "damaged":
      return `${o.name} is dealt ${o.n} damage`;
    case "entered":
      return `${o.name} enters the battlefield (${playerName(o.player)})`;
    case "left":
      return `${o.name} ${LEFT_TO[o.to]}`;
    case "control":
      return `${playerName(o.player)} gains control of ${o.name}`;
    case "life":
      return `${playerName(o.player)} ${o.to > o.from ? "gains" : "loses"} ${Math.abs(o.to - o.from)} life (now ${o.to})`;
    case "poison":
      return `${playerName(o.player)} gets ${plural(o.to - o.from, "poison counter")} (${o.to} of 10)`;
    case "drew":
      return `${playerName(o.player)} draws ${plural(o.n, "card")}`;
  }
}

/** "Paid {G}{U}: Forest {G}, Noble Hierarch {U}" (a permanent that made several mana is named once). */
export function paymentLine(e: Extract<GameEvent, { type: "manaPaid" }>): string {
  const bySource = new Map<string, { name: string; colors: string }>();
  for (const m of e.made) {
    const seen = bySource.get(m.iid);
    bySource.set(m.iid, { name: m.name, colors: `${seen?.colors ?? ""}{${m.color}}` });
  }
  const all = e.made.map((m) => `{${m.color}}`).join("");
  return `Paid ${all}: ${[...bySource.values()].map((s) => `${s.name} ${s.colors}`).join(", ")}`;
}
