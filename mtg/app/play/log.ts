import { OPPONENT } from "@mtg/engine";
import type { GameEvent, GameState, PlayerId } from "@mtg/engine";

let names: Record<PlayerId, string> = { p1: "Player 1", p2: "Player 2" };
/** Online, players are shown by their account names; with nothing given it is "Player 1" and "Player 2" again. */
export const setPlayerNames = (given?: Partial<Record<PlayerId, string>>) => {
  names = { p1: given?.p1 || "Player 1", p2: given?.p2 || "Player 2" };
};
export const playerName = (p: PlayerId) => names[p];

function nameOf(state: GameState, iid: string): string {
  for (const p of Object.values(state.players)) {
    const all = [...p.hand, ...p.graveyard, ...p.library, ...p.battlefield.map((x) => x.card)];
    const card = all.find((c) => c.iid === iid);
    if (card) return state.cards[card.defId].name;
  }
  return iid;
}

/** Turn engine events into log lines. `state` is the state AFTER the events. */
export function describeEvents(events: GameEvent[], state: GameState): string[] {
  const lines: string[] = [];
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
        lines.push(`${playerName(e.player)} cast ${nameOf(state, e.iid)}.`);
        break;
      case "abilityActivated":
        lines.push(`${playerName(e.player)} used ${e.name}: ${e.text}`);
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
      case "effect":
        lines.push(e.text);
        break;
      case "countered":
        lines.push(`${e.name} is countered.`);
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
        const target = e.target === "p1" || e.target === "p2" ? playerName(e.target) : nameOf(state, e.target);
        lines.push(`${nameOf(state, e.source)} deals ${e.amount} to ${target}.`);
        break;
      }
      case "lifeGained":
        lines.push(`${playerName(e.player)} gains ${e.amount} life.`);
        break;
      case "creatureDied":
        lines.push(`${nameOf(state, e.iid)} died.`);
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
  return state.players[loser].life <= 0 ? `${playerName(loser)} ran out of life.` : `${playerName(loser)} ran out of cards to draw.`;
}

export interface Announcement {
  id: number;
  /** The card behind it (for a thumbnail) and the turn it happened in. */
  defId?: string;
  turn: number;
  kind: "spell" | "ability";
  /** The player who cast the spell or used the ability: it is shown on their side of the board. */
  player: PlayerId;
  title: string;
  lines: string[];
}

let nextAnnouncement = 1;

/**
 * What the player and their opponent should be told when spells or abilities are cast: one announcement per cast or
 * ability, saying what it was and everything that happened because of it ("Player 2 loses 3 life.").
 * `state` is the state AFTER the events.
 */
function defIdOf(state: GameState, iid: string): string | undefined {
  for (const p of Object.values(state.players)) {
    const card = [...p.hand, ...p.graveyard, ...p.library, ...p.exile, ...p.battlefield.map((x) => x.card)].find((c) => c.iid === iid);
    if (card) return card.defId;
  }
  const item = state.stack.find((i) => i.kind === "spell" && i.card.iid === iid);
  return item && item.kind === "spell" ? item.card.defId : undefined;
}

export function announcementsFrom(events: GameEvent[], state: GameState): Announcement[] {
  const groups: { player: PlayerId; title: string; defId?: string; kind: "spell" | "ability"; events: GameEvent[] }[] = [];
  for (const e of events) {
    if (e.type === "spellCast" || e.type === "creatureCast") {
      groups.push({ player: e.player, title: `${playerName(e.player)} cast ${nameOf(state, e.iid)}`, defId: defIdOf(state, e.iid), kind: "spell", events: [] });
    } else if (e.type === "abilityActivated") {
      const text = e.text.replace(/~/g, e.name).replace(/^./, (c) => c.toUpperCase());
      groups.push({ player: e.player, title: `${playerName(e.player)} used ${e.name}`, defId: defIdOf(state, e.iid), kind: "ability", events: [{ ...e, text }] });
    } else if (groups.length > 0 && e.type !== "phaseChanged" && e.type !== "turnStarted") {
      groups[groups.length - 1].events.push(e);
    }
  }
  return groups.map((g) => {
    const first = g.events[0];
    const detail = first?.type === "abilityActivated" ? [first.text] : [];
    // A damage event is followed by the matching "loses N life" event: say it once.
    const rest = g.events.filter((e, i) => !(e.type === "lifeLost" && g.events.slice(0, i).some((p) => p.type === "damage" && p.target === e.player && p.amount === e.amount)));
    const lines = [...detail, ...describeEvents(rest.filter((e) => e.type !== "abilityActivated"), state)];
    return { id: nextAnnouncement++, player: g.player, title: g.title, lines, defId: g.defId, turn: state.turn, kind: g.kind };
  });
}
