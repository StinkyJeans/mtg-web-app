import { createGame } from "@mtg/engine";
import type { CardDef, GameState, Permanent, PlayerId } from "@mtg/engine";

const basic = (id: string, name: string): CardDef => ({ id, name, type: "land", cost: 0, typeLine: `Basic Land — ${name}` });

export const DEFS: Record<string, CardDef> = {
  mountain: basic("mountain", "Mountain"),
  forest: basic("forest", "Forest"),
  bears: { id: "bears", name: "Grizzly Bears", type: "creature", cost: 2, power: 2, toughness: 2, manaCost: "{1}{G}", colors: ["G"] },
  giant: { id: "giant", name: "Hill Giant", type: "creature", cost: 4, power: 3, toughness: 3, manaCost: "{3}{R}", colors: ["R"] },
  elf: { id: "elf", name: "Llanowar Elves", type: "creature", cost: 1, power: 1, toughness: 1, manaCost: "{G}", colors: ["G"], text: "{T}: Add {G}." },
  drake: { id: "drake", name: "Wind Drake", type: "creature", cost: 3, power: 2, toughness: 2, manaCost: "{2}{U}", colors: ["U"], keywords: ["flying"] },
  spider: { id: "spider", name: "Giant Spider", type: "creature", cost: 4, power: 2, toughness: 4, manaCost: "{3}{G}", colors: ["G"], keywords: ["reach"] },
  mutagen: { id: "mutagen", name: "Phyrexian Bear", type: "creature", cost: 1, power: 2, toughness: 2, manaCost: "{G/P}", colors: ["G"] },
  shock: { id: "shock", name: "Shock", type: "instant", cost: 1, manaCost: "{R}", colors: ["R"], text: "Shock deals 2 damage to any target." },
  adventure: { id: "adventure", name: "Bonecrusher Giant // Stomp", type: "creature", cost: 3, power: 4, toughness: 3, manaCost: "{2}{R}", colors: ["R"] },
  walker: { id: "walker", name: "Test Walker", type: "planeswalker", cost: 3, loyalty: 3, manaCost: "{2}{R}", colors: ["R"] },
};

let next = 0;

/** A permanent ready to act: untapped, not summoning sick, undamaged. */
export function permanent(defId: string, owner: PlayerId, extra: Partial<Permanent> = {}): Permanent {
  return { card: { iid: `${defId}-${next++}`, defId, owner }, tapped: false, summoningSick: false, damage: 0, ...extra };
}

/** p1's first main phase, with these permanents on each side and these cards in p1's hand. */
export function board({ mine = [], theirs = [], hand = [] }: { mine?: Permanent[]; theirs?: Permanent[]; hand?: string[] } = {}): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1, DEFS);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = mine;
  g.players.p2.battlefield = theirs;
  g.players.p1.hand = hand.map((defId) => ({ iid: `${defId}-${next++}`, defId, owner: "p1" as const }));
  return g;
}

/** p1 attacks with `attackers`, and it is p2's turn to choose blockers. */
export function blocking(attackers: Permanent[], blockers: Permanent[]): GameState {
  const g = board({ mine: attackers, theirs: blockers });
  g.phase = "blockers";
  g.combat = { attackers: attackers.map((a) => ({ attacker: a.card.iid, blockers: [] })) };
  return g;
}
