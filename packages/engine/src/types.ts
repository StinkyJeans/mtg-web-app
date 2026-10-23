// Pure game types. No imports from React/Next/Colyseus/Supabase.

export type PlayerId = "p1" | "p2";

export type Phase =
  | "mulligan" // before turn 1: each player keeps or mulligans (rule 103.5)
  | "untap"
  | "draw"
  | "main1"
  | "attackers" // active player declares attackers
  | "blockers" // defending player declares blockers
  | "damage" // active player divides damage among multiple blockers (rule 510.1c)
  | "main2"
  | "end"
  | "cleanup"; // active player discards down to the maximum hand size (rule 514.1)

export interface Combat {
  /** `blockers` are the iids of the creatures blocking this attacker (empty = unblocked). */
  attackers: { attacker: string; blockers: string[] }[];
}

export type CardType =
  | "land"
  | "creature"
  | "instant"
  | "sorcery"
  | "enchantment"
  | "artifact"
  | "planeswalker"
  | "battle"
  | "other";

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  /** Generic mana cost (colors come later). Lands cost 0. */
  cost: number;
  power?: number;
  toughness?: number;
  /** Path of the card art inside the Supabase "card-art" bucket (optional). */
  image?: string;
  /** false = the card exists but the engine can't play it yet (has abilities, other types...). */
  playable?: boolean;
  /** Display-only details, e.g. "Creature — Bear", "{1}{G}", rules text. */
  typeLine?: string;
  manaCost?: string;
  text?: string;
  colors?: string[];
  rarity?: string;
  /** Scryfall printing id, used to load a high-resolution image for the card detail view. */
  scryfallId?: string;
}

/** One physical card in a game. `iid` is unique per game; `defId` points at a CardDef. */
export interface CardInstance {
  iid: string;
  defId: string;
  owner: PlayerId;
}

export interface Permanent {
  card: CardInstance;
  tapped: boolean;
  summoningSick: boolean;
  damage: number;
}

export interface PlayerState {
  id: PlayerId;
  life: number;
  library: CardInstance[]; // index 0 = top
  hand: CardInstance[];
  battlefield: Permanent[];
  graveyard: CardInstance[];
  landsPlayedThisTurn: number;
}

export interface GameState {
  /** Definitions of every card used in this game, so the state is self-contained. */
  cards: Record<string, CardDef>;
  players: Record<PlayerId, PlayerState>;
  /** The player who takes the first turn (rule 103.1). */
  startingPlayer: PlayerId;
  /** Mulligan progress; null once the game has started. */
  opening: { taken: Record<PlayerId, number>; kept: Record<PlayerId, boolean> } | null;
  active: PlayerId;
  turn: number;
  phase: Phase;
  combat: Combat | null;
  /** Seeded RNG state so shuffles are reproducible (and replayable). */
  rng: number;
  winner: PlayerId | null;
}

export const OPPONENT: Record<PlayerId, PlayerId> = { p1: "p2", p2: "p1" };
