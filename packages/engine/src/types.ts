// Pure game types. No imports from React/Next/Colyseus/Supabase.

import type { ModeSpec, PendingChoice, PendingPick, PriorityRound, StackItem, TargetSpec } from "./effects.js";
import type { Keyword } from "./keywords.js";

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
  attackers: { attacker: string; blockers: string[]; /** The planeswalker it attacks (missing: it attacks the player). */ target?: string }[];
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
  /** Planeswalkers: starting loyalty. (The database keeps it in the toughness column; the card loader copies it here.) */
  loyalty?: number;
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
  /** Keyword abilities printed on the card, lowercase, e.g. ["flying", "first strike"]. */
  keywords?: string[];
}

/** One physical card in a game. `iid` is unique per game; `defId` points at a CardDef. */
export interface CardInstance {
  iid: string;
  defId: string;
  owner: PlayerId;
  /** On the battlefield, the card's own definition while it is something else (a copy of another creature, or an enchantment instead of a creature). */
  printed?: string;
}

export interface Permanent {
  card: CardInstance;
  tapped: boolean;
  summoningSick: boolean;
  damage: number;
  /** Dealt damage by a deathtouch source this turn, so it is destroyed even without lethal damage. */
  deathtouched?: boolean;
  /** "Until end of turn" changes, cleared when the turn ends. */
  /** The spells and abilities behind the "until end of turn" changes below (names and card ids), so the board can show where they come from. */
  tempFrom?: { name: string; defId?: string }[];
  /** Permanents that dealt damage to this one this turn ("whenever a creature dealt damage by ~ this turn dies"). */
  damagedBy?: string[];
  /** Stun counters: instead of untapping, remove one. */
  stun?: number;
  /** "Can't be blocked this turn." */
  unblockableTurn?: boolean;
  /** "Becomes 4/4 until end of turn", "loses defender until end of turn". */
  tempBase?: { power: number; toughness: number };
  tempNoDefender?: boolean;
  /** "Assigns combat damage equal to its toughness rather than its power this turn." */
  damageByToughness?: boolean;
  /** "When this creature deals combat damage, sacrifice it" (until end of turn). */
  sacOnDamage?: boolean;
  /** It attacked this turn. */
  attackedThisTurn?: boolean;
  /** Cards this permanent keeps in exile until it leaves the battlefield (Banishing Light), and ones exiled from a hand (Deep-Cavern Bat). */
  held?: CardInstance[];
  heldFromHand?: CardInstance[];
  powerBonus?: number;
  toughnessBonus?: number;
  tempKeywords?: Keyword[];
  /** An Aura: the iid of the permanent it is attached to. */
  attachedTo?: string;
  /** +1/+1 counters. */
  counters?: number;
  /** -1/-1 counters. A +1/+1 and a -1/-1 counter on the same permanent cancel each other out. */
  minusCounters?: number;
  /** It was cast with its kicker paid. */
  kicked?: boolean;
  /** A Vehicle that has been crewed this turn: it is an artifact creature until end of turn. */
  crewed?: boolean;
  /** The creatures that crewed it this turn. */
  crewedBy?: string[];
  /** Regeneration shields (until end of turn): the next time it would be destroyed it is tapped and healed instead. */
  regenShield?: number;
  /** Hit by something that says it "can't be regenerated" this turn. */
  noRegen?: boolean;
  /** "As this enters, choose a color": the color that was chosen. */
  chosenColor?: "W" | "U" | "B" | "R" | "G";
  /** "As this land enters, choose a creature type": the type that was chosen (lowercase). */
  chosenType?: string;
  /** Control was taken "until end of turn": the player it goes back to. */
  controlReturn?: PlayerId;
  /** "Target creature can't block this turn." */
  cantBlockTurn?: boolean;
  /** Planeswalkers: loyalty counters. At 0 the planeswalker is put into the graveyard. */
  loyalty?: number;
  /** Planeswalkers: a loyalty ability was already activated this turn (only one per turn). */
  loyaltyUsed?: boolean;
  /** Indexes of its activated abilities already used this turn (for "activate only once each turn"). */
  usedAbilities?: number[];
  /** The turn it entered, for "as long as this Aura entered this turn". */
  enteredTurn?: number;
  /** The X paid for it, for "when this enters, tap X target creatures". */
  xPaid?: number;
  /** Prepared: the card id of its spell, a copy of which may be cast (and that unprepares it). */
  prepared?: string;
  /** "Choose one that hasn't been chosen": the modes already chosen. */
  chosenModes?: number[];
  /** "If that creature would die this turn, exile it instead." */
  exileOnDeath?: boolean;
  /** "Must be blocked this turn if able." */
  mustBeBlocked?: boolean;
  /** "~ becomes a Werewolf": its creature types now. */
  subtypesOverride?: string[];
  /** Indexes of its "activate only once" abilities that were used. */
  usedOnce?: number[];
  /** Until end of turn: "When this creature dies, return it to the battlefield tapped under its owner's control with a +1/+1 counter on it." */
  diesReturn?: boolean;
  /** Until end of turn: "whenever that creature deals combat damage to a player this turn, you draw a card": who draws, and the card that said so. */
  damageDraws?: { player: PlayerId; source: string }[];
  /** A finality counter: if it would die, it is exiled instead. */
  finality?: boolean;
  /** Cast for its warp cost: exiled at the beginning of the next end step. */
  warped?: boolean;
  /** A Case that has been solved. */
  solved?: boolean;
}

export interface PlayerState {
  id: PlayerId;
  life: number;
  library: CardInstance[]; // index 0 = top
  hand: CardInstance[];
  battlefield: Permanent[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  landsPlayedThisTurn: number;
  /** Cards drawn so far this turn ("whenever you draw your second card each turn"). */
  drawnThisTurn?: number;
  /** Life gained and spells cast so far this turn ("if you gained 3 or more life this turn", "your first spell"). */
  lifeGainedThisTurn?: number;
  spellsCastThisTurn?: number;
  /** Life lost this turn ("if an opponent lost life this turn"), and whether the player attacked (raid). */
  lifeLostThisTurn?: number;
  attackedThisTurn?: boolean;
  /** Cards in exile that may be played: "During any turn you attacked with ~, you may play that card", or a warped card from turn `fromTurn` on. */
  /** `tax`: a spell cast this way costs that much more; `tappedLand`: a land played this way enters tapped (Lightstall Inquisitor). */
  /** `throughTurn`: playable up to and including the end of that turn ("until the end of your next turn"). `always` + `payGeneric`: airbend, playable while it stays exiled, for that much generic mana instead of its cost. */
  mayPlay?: { iid: string; source: string; fromTurn?: number; untilTurn?: number; throughTurn?: number; always?: boolean; payGeneric?: number; tax?: number; tappedLand?: boolean }[];
  /** Creature cards in the graveyard that may be cast from there until end of turn. */
  yardCastable?: string[];
  /** "If a source you control would deal damage to an opponent this turn, it deals double that damage instead." */
  doubleDamage?: boolean;
  /** Permanents the player chose not to tap for mana: payments skip them. Only set around one action, and cleared as a turn begins. */
  spareMana?: string[];
  /** Tried to draw from an empty library: loses the game when state-based actions are next checked. */
  drewFromEmpty?: boolean;
}

export interface GameState {
  /** Definitions of every card used in this game, so the state is self-contained. */
  cards: Record<string, CardDef>;
  /** The excess of the last damage dealt to a creature (damage beyond what it took to destroy it): "you gain life equal to the excess damage dealt this way". */
  lastExcess?: number;
  players: Record<PlayerId, PlayerState>;
  /** The player who takes the first turn (rule 103.1). */
  startingPlayer: PlayerId;
  /** Mulligan progress; null once the game has started. */
  /** `shuffled`: the shuffle step before keeping or mulliganing: each player shuffles the OTHER player's library (set with the `shuffleStep` option). */
  opening: { taken: Record<PlayerId, number>; kept: Record<PlayerId, boolean>; shuffled?: Record<PlayerId, boolean> } | null;
  active: PlayerId;
  turn: number;
  phase: Phase;
  combat: Combat | null;
  /** Seeded RNG state so shuffles are reproducible (and replayable). */
  rng: number;
  /** The player who won, "draw" when both players lost at the same time, or null while the game goes on. */
  winner: PlayerId | "draw" | null;
  /** Spells and abilities waiting to resolve. The last item is on top and resolves first. */
  stack: StackItem[];
  /** An open round of priority (players may respond to the top of the stack), or null. */
  priority: PriorityRound | null;
  /** A triggered ability whose controller must choose its targets before it goes on the stack. */
  pendingChoice: PendingChoice | null;
  /** A choice among cards that the game is waiting for (see effects.ts). */
  pendingPick: PendingPick | null;
  /** "Prevent all combat damage that would be dealt this turn." Cleared as the next turn begins. */
  preventCombat?: boolean;
  /** "Creatures without flying can't block this turn." */
  noGroundBlock?: boolean;
  /** Triggers that have happened and are about to go on the stack. */
  triggerQueue: { item: Extract<StackItem, { kind: "ability" }>; specs: TargetSpec[]; modes?: ModeSpec[]; /** "Choose one that hasn't been chosen". */ unchosen?: boolean }[];
  /** Counter used to give every stack item a unique id. */
  nextId: number;
}

export const OPPONENT: Record<PlayerId, PlayerId> = { p1: "p2", p2: "p1" };
