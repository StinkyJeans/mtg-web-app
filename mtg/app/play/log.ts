import { OPPONENT } from "@mtg/engine";
import type { GameEvent, GameState, Outcome, PlayerId } from "@mtg/engine";
import { defNamed, printedLine, readable } from "./cardText";
import { outcomeLine, paymentLine } from "./outcomeText";
import { playerName, setPlayerNames } from "./players";

export { playerName, setPlayerNames };

/** A card's name wherever it is, the stack included. */
export function nameOf(state: GameState, iid: string): string {
  const spell = state.stack.find((i) => i.kind === "spell" && i.card.iid === iid);
  if (spell?.kind === "spell") return state.cards[spell.card.defId].name;
  for (const p of Object.values(state.players)) {
    const all = [...p.hand, ...p.graveyard, ...p.library, ...p.exile, ...p.battlefield.map((x) => x.card)];
    const card = all.find((c) => c.iid === iid);
    if (card) return state.cards[card.defId].name;
  }
  return iid;
}

// What a resolution did that its own events already put in the log (damage, life, poison, cards drawn, creatures arriving).
const LOGGED_ELSEWHERE = new Set<Outcome["k"]>(["damaged", "life", "poison", "drew", "entered"]);

/** Turn engine events into log lines. `state` is the state AFTER the events. */
/** What was cast: a copy is gone from the stack once it resolves, so it is named by the card it copies. */
function castName(state: GameState, e: Extract<GameEvent, { type: "spellCast" | "creatureCast" }>): string {
  const copyOf = e.type === "spellCast" ? e.copyOf : undefined;
  return copyOf ? `a copy of ${state.cards[copyOf]?.name ?? "a spell"}` : nameOf(state, e.iid);
}

const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** "Player 1 sacrificed Blood." / "Grizzly Bears died." / "Witch's Oven was put into the graveyard." */
function diedLine(state: GameState, e: Extract<GameEvent, { type: "creatureDied" }>): string {
  const name = e.name ?? nameOf(state, e.iid);
  if (e.sacrificed) return `${playerName(e.player)} sacrificed ${name}.`;
  return e.noncreature ? `${name} was put into the graveyard.` : `${name} died.`;
}

/** "Player 1 draws 2 cards." said right after those cards were drawn: each is in the log already ("drew a card"). */
const drawsAgain = (events: GameEvent[]) =>
  new Set(events.filter((e, i) => e.type === "effect" && /^Player [12] draws \d+ cards?\.$/.test(e.text) && events[i - 1]?.type === "cardDrawn"));

export function describeEvents(events: GameEvent[], state: GameState): string[] {
  const lines: string[] = [];
  const drawSummed = drawsAgain(events);
  for (const e of events) {
    switch (e.type) {
      case "mulliganTaken":
        lines.push(`${playerName(e.player)} takes a mulligan (${e.count}).`);
        break;
      case "handKept":
        lines.push(
          e.bottomed
            ? `${playerName(e.player)} keeps their hand and puts ${e.bottomed} card${e.bottomed > 1 ? "s" : ""} on the bottom.`
            : `${playerName(e.player)} keeps their hand.`,
        );
        break;
      case "cardsDiscarded":
        lines.push(`${playerName(e.player)} discards ${e.iids.map((i) => nameOf(state, i)).join(", ")}.`);
        break;
      case "conceded":
        lines.push(`${playerName(e.player)} concedes.`);
        break;
      case "landPlayed":
        lines.push(`${playerName(e.player)} played ${nameOf(state, e.iid)}.`);
        break;
      case "creatureCast":
        lines.push(`${playerName(e.player)} cast ${nameOf(state, e.iid)}.`);
        break;
      case "spellCast":
        lines.push(`${playerName(e.player)} cast ${castName(state, e)}.`);
        break;
      case "abilityActivated":
        lines.push(`${playerName(e.player)} used ${e.name}: ${sentence(readable(printedLine(e.text, defNamed(state, e.name)), e.name))}`);
        break;
      case "permanentEntered":
        break;
      case "damage": {
        const target = e.target === "p1" || e.target === "p2" ? playerName(e.target) : nameOf(state, e.target);
        lines.push(`${nameOf(state, e.source)} deals ${e.amount} damage to ${target}.`);
        break;
      }
      case "lifeLost":
        lines.push(`${playerName(e.player)} loses ${e.amount} life.`);
        break;
      case "poisoned":
        lines.push(`${playerName(e.player)} gets ${e.amount} poison counter${e.amount === 1 ? "" : "s"} (${state.players[e.player].poison ?? 0} of 10).`);
        break;
      case "effect":
        if (!drawSummed.has(e)) lines.push(e.text);
        break;
      case "countered":
        lines.push(`${playerName(e.controller)}'s ${e.name} is countered${e.by ? ` by ${e.by}` : ""}.`);
        break;
      case "resolved":
        if (e.fizzled) lines.push(`${playerName(e.controller)}'s ${e.name} does nothing (it fizzles): ${e.fizzled}.`);
        else if (e.trigger) lines.push(`${playerName(e.controller)}'s ${e.name.replace(/'s ability$/, "")} triggered.`);
        else if (!e.ability) lines.push(`${playerName(e.controller)}'s ${e.name} resolves.`);
        lines.push(...(e.did ?? []).filter((o) => !LOGGED_ELSEWHERE.has(o.k) && !(o.k === "left" && o.to === "graveyard")).map((o) => `${outcomeLine(o)}.`));
        break;
      case "manaPaid":
        lines.push(`${playerName(e.player)} ${paymentLine(e).replace(/^Paid/, "paid")}.`);
        break;
      case "turnStarted":
        lines.push(`— Turn ${e.turn}: ${playerName(e.player)} —`);
        break;
      case "cardDrawn":
        lines.push(`${playerName(e.player)} drew a card.`);
        break;
      case "attackersDeclared":
        lines.push(`${playerName(e.player)} attacks with ${e.attackers.map((i) => nameOf(state, i)).join(", ")}.`);
        break;
      case "blockersDeclared":
        lines.push(
          e.blocks.length
            ? e.blocks.map((b) => `${nameOf(state, b.blocker)} blocks ${nameOf(state, b.attacker)}.`).join(" ")
            : `${playerName(e.player)} doesn't block.`,
        );
        break;
      case "combatDamage": {
        const toPlayer = e.target === "p1" || e.target === "p2";
        const target = toPlayer ? playerName(e.target as PlayerId) : nameOf(state, e.target);
        lines.push(`${nameOf(state, e.source)} deals ${e.amount} to ${target}${e.infect && !toPlayer ? " as -1/-1 counters" : ""}.`);
        break;
      }
      case "lifeGained":
        lines.push(`${playerName(e.player)} gains ${e.amount} life.`);
        break;
      case "creatureDied":
        lines.push(diedLine(state, e));
        break;
      case "gameWon":
        lines.push(`${playerName(e.player)} wins!`);
        break;
      case "gameDrawn":
        lines.push("Both players lost at the same time: the game is a draw.");
        break;
      case "phaseChanged":
        break;
    }
  }
  return lines;
}

/** One line saying how the game ended, for the win popup. Null if these events didn't end it. */
export function endReason(events: GameEvent[], state: GameState): string | null {
  if (events.some((e) => e.type === "gameDrawn")) return "Both players ran out of life at the same time.";
  const resigned = events.find((e) => e.type === "conceded");
  if (resigned) return `${playerName(resigned.player)} resigned.`;
  const won = events.find((e) => e.type === "gameWon");
  if (!won) return null;
  const loser = OPPONENT[won.player];
  if ((state.players[loser].poison ?? 0) >= 10) return `${playerName(loser)} got ten poison counters.`;
  return state.players[loser].life <= 0 ? `${playerName(loser)} ran out of life.` : `${playerName(loser)} ran out of cards to draw.`;
}

export interface Announcement {
  id: number;
  /** The card behind it (for a thumbnail) and the turn it happened in. */
  defId?: string;
  turn: number;
  kind: "spell" | "ability" | "trigger";
  /** The spell's card, or the permanent whose ability it was. */
  iid?: string;
  /** The player who cast the spell or used the ability: it is shown on their side of the board. */
  player: PlayerId;
  title: string;
  /** What was paid and anything said while it was cast. */
  lines: string[];
  /** How it left the stack, once it did, and what it did ("Glistener Elf gets +2/+2 (now 3/3)") or why it did nothing. */
  done?: "resolved" | "fizzled" | "countered";
  result?: string[];
  /** Only a result: what was cast in an earlier action, to be added to that announcement (see mergeAnnouncements). */
  later?: true;
}

let nextAnnouncement = 1;

function defIdOf(state: GameState, iid: string): string | undefined {
  for (const p of Object.values(state.players)) {
    const card = [...p.hand, ...p.graveyard, ...p.library, ...p.exile, ...p.battlefield.map((x) => x.card)].find((c) => c.iid === iid);
    if (card) return card.defId;
  }
  const item = state.stack.find((i) => i.kind === "spell" && i.card.iid === iid);
  return item && item.kind === "spell" ? item.card.defId : undefined;
}

// Events that end what a spell or ability is doing, and events its result already says ("Player 2 loses 3 life (now 17)").
const OUTSIDE = new Set<GameEvent["type"]>(["phaseChanged", "turnStarted", "attackersDeclared", "blockersDeclared", "combatDamage"]);
const IN_RESULT = new Set<GameEvent["type"]>(["damage", "lifeLost", "lifeGained", "poisoned", "creatureDied", "cardDrawn", "permanentEntered"]);

const unfinished = (list: Announcement[], iid: string) => [...list].reverse().find((a) => a.iid === iid && !a.done && a.kind !== "trigger");

/** What a spell or ability did when it resolved: added to its announcement, or a new one (a triggered ability, or one cast earlier). */
function resolution(out: Announcement[], e: Extract<GameEvent, { type: "resolved" }>, state: GameState): Announcement {
  const did = (e.did ?? []).filter((o) => !(o.k === "entered" && o.iid === e.iid)); // a creature spell entering says nothing new
  const result = e.fizzled ? [`Did nothing: ${e.fizzled}`] : did.map(outcomeLine);
  const done = e.fizzled ? "fizzled" : "resolved";
  const cast = e.trigger ? undefined : unfinished(out, e.iid);
  if (cast) return Object.assign(cast, { done, result });
  const source = e.name.replace(/'s ability$/, "");
  const a: Announcement = {
    id: nextAnnouncement++,
    turn: state.turn,
    kind: e.trigger ? "trigger" : e.ability ? "ability" : "spell",
    iid: e.iid,
    defId: defIdOf(state, e.iid),
    player: e.controller,
    title: e.trigger ? `${playerName(e.controller)}'s ${source} triggered` : `${playerName(e.controller)} ${e.ability ? "used" : "cast"} ${source}`,
    lines: e.trigger && e.text ? [e.text.replace(/~/g, source).replace(/^./, (c) => c.toUpperCase())] : [],
    done,
    result,
    ...(e.trigger ? {} : { later: true as const }),
  };
  out.push(a);
  return a;
}

/** A countered spell or ability: said on what countered it, and on its own announcement. */
function countering(out: Announcement[], e: Extract<GameEvent, { type: "countered" }>, by: Announcement | null, state: GameState): void {
  if (by) (by.done ? (by.result ??= []) : by.lines).push(`Counters ${playerName(e.controller)}'s ${e.name}`);
  const result = [`Countered${e.by ? ` by ${e.by}` : ""}`];
  const cast = unfinished(out, e.iid);
  if (cast) {
    Object.assign(cast, { done: "countered", result });
    return;
  }
  const ability = e.name.endsWith("'s ability");
  const name = e.name.replace(/'s ability$/, "");
  out.push({ id: nextAnnouncement++, turn: state.turn, kind: ability ? "ability" : "spell", iid: e.iid, defId: defIdOf(state, e.iid), player: e.controller, title: `${playerName(e.controller)} ${ability ? "used" : "cast"} ${name}`, lines: [], done: "countered", result, later: true });
}

/**
 * What the players should be told about the spells and abilities in one action: one announcement per spell cast or ability used
 * (what it was, what was paid), what each did when it resolved, and triggered abilities with why they triggered.
 * `state` is the state AFTER the events.
 */
export function announcementsFrom(events: GameEvent[], state: GameState): Announcement[] {
  const out: Announcement[] = [];
  let open: Announcement | null = null; // what later events belong to
  let paid: string | null = null; // a payment comes just before the spell or ability it paid for
  let shown: Announcement | null = null; // a resolution whose result already says what changed: its own messages would repeat it
  const start = (a: Omit<Announcement, "id" | "turn" | "lines">, first: string[] = []) => {
    open = { id: nextAnnouncement++, turn: state.turn, ...a, lines: [...first, ...(paid ? [paid] : [])] };
    paid = null;
    out.push(open);
  };
  for (const e of events) {
    if (e.type === "manaPaid") paid = paymentLine(e);
    else if (e.type === "spellCast" || e.type === "creatureCast") start({ kind: "spell", player: e.player, iid: e.iid, defId: (e.type === "spellCast" ? e.copyOf : undefined) ?? defIdOf(state, e.iid), title: `${playerName(e.player)} cast ${castName(state, e)}` });
    else if (e.type === "abilityActivated") start({ kind: "ability", player: e.player, iid: e.iid, defId: defIdOf(state, e.iid), title: `${playerName(e.player)} used ${e.name}` }, [e.text.replace(/~/g, e.name).replace(/^./, (c) => c.toUpperCase())]);
    else if (e.type === "resolved") {
      open = resolution(out, e, state);
      shown = (e.did ?? []).length > 0 ? open : null;
    }
    else if (e.type === "countered") countering(out, e, open, state);
    else if (OUTSIDE.has(e.type)) open = null;
    else if (open && !IN_RESULT.has(e.type) && !(e.type === "effect" && open === shown)) {
      const at: Announcement = open;
      (at.done ? (at.result ??= []) : at.lines).push(...describeEvents([e], state));
    }
  }
  if (paid && out.length > 0) out[out.length - 1].lines.push(paid); // paid during a resolution ("you may pay {1}", ward)
  return out;
}

/**
 * Adds one action's announcements to a list. A result for something announced earlier goes onto that announcement, which moves
 * to the end (shown again, now with what it did); anything else is added.
 */
export function mergeAnnouncements(list: Announcement[], told: Announcement[]): Announcement[] {
  let next = [...list];
  for (const t of told) {
    const i = t.later && t.iid ? next.findLastIndex((a) => a.iid === t.iid && !a.done && a.kind !== "trigger") : -1;
    if (i < 0) {
      next.push(t);
      continue;
    }
    const merged = { ...next[i], done: t.done, result: t.result };
    next = [...next.slice(0, i), ...next.slice(i + 1), merged];
  }
  return next;
}

/** Worth showing on the board once it has left the stack: it did something, did nothing, or was countered (a creature just arriving is seen). */
export const worthTelling = (a: Announcement) => !!a.done && (a.done !== "resolved" || (a.result ?? []).length > 0 || a.kind === "trigger");
