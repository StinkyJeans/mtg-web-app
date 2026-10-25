import type { CardInstance, PlayerId } from "./types.js";
import type { Keyword } from "./keywords.js";
import type { ManaColor } from "./mana.js";

// ───────── what a card can do, as data ─────────
// Card text is turned into these structures by oracle.ts. The engine only ever runs these, never raw text.

/** Who or what an effect applies to. */
export type Ref =
  | { t: "target"; i: number } // the i-th target chosen when the spell/ability was put on the stack
  | { t: "self" } // the permanent the ability belongs to
  | { t: "you" } // the controller
  | { t: "opp" } // the controller's opponent
  | { t: "eachPlayer" }
  | { t: "allCreatures"; scope: "all" | "yours" | "opponents"; except?: number; noFlying?: boolean; subtype?: string } // `except`: not the i-th target
  | { t: "allPlaneswalkers" }
  | { t: "ownerOf"; i: number } // the owner of the i-th target ("its owner gains 4 life")
  | { t: "controllerOf"; i: number } // the controller of the i-th target, as it was when the spell resolved
  | { t: "enchanted" } // the permanent this Aura is attached to
  | { t: "attackingCreatures"; other?: boolean } // every creature attacking right now (`other`: not the permanent itself)
  | { t: "other" } // "that creature": the creature that blocked this one, or that this one blocked
  | { t: "creaturesOf"; i: number }; // every creature controlled by the i-th target (a player)

/** A number printed on the card, or "X": the value chosen when the spell was cast. */
export type Amount = number | "X" | { count: CountSpec; times?: number };

export type Effect =
  | { type: "damage"; amount: Amount; to: Ref }
  | { type: "draw"; amount: Amount; who: Ref }
  | { type: "gainLife"; amount: Amount; who: Ref }
  | { type: "loseLife"; amount: Amount; who: Ref }
  | { type: "destroy"; what: Ref }
  | { type: "exile"; what: Ref }
  | { type: "bounce"; what: Ref }
  | { type: "tap"; what: Ref }
  | { type: "untap"; what: Ref }
  | { type: "pump"; power: number; toughness: number; what: Ref; per?: CountSpec } // until end of turn (`per`: for each of something)
  | { type: "grant"; keyword: Keyword; what: Ref } // until end of turn
  | { type: "counter"; what: Ref }
  | { type: "topOfLibrary"; what: Ref } // "put target creature on top of its owner's library"
  | { type: "reanimate"; what: Ref; to: "battlefield" | "hand"; tapped?: boolean } // a creature card from a graveyard
  // The next three ask a player to choose cards, so a card that has one can't have any other effect (see PendingPick).
  | { type: "discard"; who: Ref; amount: number; chooser: "victim" | "you" | "random" } // "target player discards two cards" / "you choose a card from their hand"
  | { type: "lookPick"; mode: "toHand" | "toGraveyard" | "arrange"; n: number; who?: Ref } // look at the top cards of a library
  // "Look at the top five cards. You may reveal a creature card from among them and put it into your hand. Put the rest on the bottom."
  | { type: "revealToHand"; n: number; filter: CardFilter; random: boolean; required?: boolean; restTo?: "bottom" | "graveyard"; reveal?: boolean }
  // Search your library for a card (a basic land card, or any card): onto the battlefield (tapped) or into your hand, then shuffle.
  | { type: "search"; tapped?: boolean; for?: "basicLand" | "any"; to?: "hand" | "battlefield"; who?: Ref; reveal?: boolean }
  | { type: "scry"; n: number } // look at the top n cards; any of them may go to the bottom (see PendingPick)
  | { type: "mill"; amount: Amount; who: Ref } // the top cards of the library go to the graveyard
  | { type: "regenerate"; what: Ref } // a regeneration shield until end of turn
  | { type: "revealPut"; n: number; filter: CardFilter; maxMV: number } // reveal the top cards: put every match onto the battlefield, the rest on the bottom in a random order
  | { type: "grantIfPowerBelow"; keyword: Keyword } // "Creatures you control with power less than ~'s power gain indestructible"
  | { type: "doubleDamage" } // damage your sources deal to an opponent is doubled this turn
  | { type: "exileTop"; playIfAttacked?: boolean } // exile the top card of your library; "during any turn you attacked with ~, you may play that card"
  | { type: "blink"; what: Ref }
  | { type: "sacOnDamage"; what: Ref } // until end of turn: "When this creature deals combat damage, sacrifice it"
  | { type: "tapForBonus" } // "you may tap any number of untapped creatures you control. This gets +1/+1 for each"
  | { type: "assignByToughness"; what: Ref } // assigns combat damage equal to its toughness this turn
  | { type: "ifSubtypeGrant"; what: Ref; subtype: string; keyword: Keyword } // "If that creature is a Cat, it gains first strike"
  | { type: "libraryChoice"; what: Ref } // the owner puts it on the top or the bottom of their library // exile it, then return it to the battlefield
  | { type: "scryIfMV"; what: Ref; max: number; n: number } // "if its mana value was 3 or less, scry 1"
  | { type: "noGroundBlock" } // creatures without flying can't block this turn
  | { type: "setBase"; what: Ref; power: number; toughness: number } // becomes N/N until end of turn
  | { type: "loseDefender"; what: Ref }
  | { type: "winGame" }
  | { type: "mayPay"; cost: string; then: Effect[]; thenSpecs?: TargetSpec[] } // "When you do, ... target ...": the targets are chosen after paying // "you may pay {1}. If you do, ..."
  | { type: "drawUnlessPay"; cost: string } // "you may draw a card unless that player pays {1}" (the opponent who cast the spell)
  | { type: "tapOrUntap"; what: Ref } // you may tap or untap target permanent
  | { type: "bounceOwn"; other: boolean } // "return a creature you control to its owner's hand": the player chooses
  | { type: "sacrifice"; what: Ref } // sacrifice a permanent ("when this becomes the target of a spell or ability, sacrifice it")
  | { type: "stun"; what: Ref } // a stun counter
  | { type: "unblockable"; what: Ref } // can't be blocked this turn
  | { type: "exileUntilLeaves"; what: Ref } // exile target permanent until this one leaves the battlefield
  | { type: "fog" } // prevent all combat damage this turn
  | { type: "rummage"; toBottom?: boolean } // you may discard a card; if you do, draw a card (waits for the player)
  | { type: "returnFromYard" } // "when this dies, return it to its owner's hand"
  | { type: "counterUnlessPay"; what: Ref; cost: string } // counter target spell unless its controller pays
  | { type: "noRegen" } // "it can't be regenerated": the destroy/damage of the same spell can't be saved by a shield
  | { type: "addCounters"; amount: Amount; what: Ref; kind?: "minus" } // +1/+1 counters (or -1/-1 with kind "minus")
  | { type: "fight"; a: Ref; b: Ref } // each deals damage equal to its power to the other
  | { type: "bite"; from: Ref; to: Ref } // "target creature you control deals damage equal to its power to target creature"
  | { type: "gainControl"; what: Ref } // until end of turn
  | { type: "cantBlockThisTurn"; what: Ref }
  | { type: "crewed" } // this Vehicle becomes an artifact creature until end of turn
  | { type: "wardCheck"; cost: string; itemId: string } // ward: counter the spell or ability unless its controller pays
  | { type: "ifKicked"; then: Effect[]; otherwise?: Effect[] } // "if this spell was kicked, ..." (and "... instead")
  | { type: "surveil"; n: number } // like scry, but the cards you don't keep go to the graveyard
  | { type: "attach"; what: Ref } // equip: attach this permanent to the target
  | { type: "createToken"; token: TokenSpec; amount: Amount; who?: Ref };

/** Which cards a "reveal a ... card" effect may take: any of the types, or any of the creature types (subtypes), or any nonland card. */
export interface CardFilter {
  types?: string[];
  subtypes?: string[];
  colors?: string[];
  nonland?: boolean;
  /** Any card at all ("put one of them into your hand"). */
  all?: boolean;
}

/** A token the game makes up while playing: a Treasure, or "a 1/1 white Soldier creature token". */
export interface TokenSpec {
  name: string;
  type: "creature" | "artifact";
  power?: number;
  toughness?: number;
  colors: string[];
  /** Printed after the dash, e.g. "Soldier". */
  subtypes: string;
  keywords: Keyword[];
  text: string;
  /** An artifact creature token (a Thopter). */
  artifact?: boolean;
  /** "...that's tapped and attacking": it joins the combat. */
  tappedAttacking?: boolean;
}

/** Everything an effect needs to know about where it came from. Kept with a pending choice so the rest of the effects can run later. */
export interface RunContext {
  controller: PlayerId;
  /** The card or permanent the effect comes from. */
  sourceId: string;
  sourceName: string;
  targets: TargetChoice[];
  specs: TargetSpec[];
  /** The spell's own stack id, so a spell can't target itself. */
  stackId?: string;
  /** The X chosen when the spell was cast. */
  x?: number;
  /** The spell was cast with its kicker paid. */
  kicked?: boolean;
  /** Who controlled each targeted permanent when the effects started (so "its controller" still works after it is destroyed). */
  lki?: Record<string, PlayerId>;
  /** The card definition the effects come from (for protection: its colors and whether it is an artifact). */
  sourceDefId?: string;
  /** "That creature": the creature a blocker blocked, or that blocked it. */
  other?: string;
}

/** The qualities of a source that protection looks at. */
export interface SourceQuality {
  colors: string[];
  artifact: boolean;
}

/** What a target may be. Chosen when the spell is cast or the ability is put on the stack. */
export interface TargetSpec {
  /**
   * "any" = a creature or a player. "land" and "artifactOrLand" are permanents. "graveyardCreature" is a creature
   * card in a graveyard (see `controller` for whose).
   */
  kind: "creature" | "player" | "any" | "spell" | "permanent" | "graveyardSpell" | "land" | "artifact" | "artifactOrLand" | "enchantment" | "artifactOrEnchantment" | "graveyardCreature" | "planeswalker" | "creatureOrPlaneswalker" | "playerOrPlaneswalker";
  /** "with power 4 or greater" / "with power 2 or less". */
  power?: { n: number; op: "min" | "max" };
  /** "nonartifact": not an artifact. */
  notArtifact?: boolean;
  /** "with flying" / "without flying". */
  keyword?: { name: Keyword; has: boolean };
  /** For creatures: only ones in this state ("target tapped creature", "target attacking or blocking creature"). */
  filter?: "tapped" | "attacking" | "blocking" | "attackingOrBlocking";
  /** For creatures: only ones this player controls (relative to the controller of the spell). */
  controller?: "you" | "opponent";
  /** "nonblack" etc.: colors the creature must not have. */
  notColors?: string[];
  /** For players: only the controller's opponent. */
  opponentOnly?: boolean;
  /** For "permanent" targets: "target nonland permanent". */
  nonland?: boolean;
  /** "target creature or enchantment": a permanent of any of these types ("creature", "enchantment", "artifact", "land", "planeswalker"). */
  types?: string[];
  /** "non-Angel creature". */
  notSubtype?: string;
  /** "target Goblin you control": a creature of this type. */
  subtype?: string;
  /** "target spell or permanent": a spell on the stack is also allowed. */
  orSpell?: boolean;
  /** "Up to one target ...": the player may choose no target at all (a "none" choice). */
  optional?: boolean;
  /** "another target ...": not the permanent the ability belongs to (filled in as `except` when the ability is put on the stack). */
  other?: boolean;
  except?: string;
  /** "with mana value 2 or greater" / "with toughness 4 or greater". */
  mv?: { n: number; op: "min" | "max" };
  toughness?: { n: number; op: "min" | "max" };
  /** For spells: "target creature spell" / "target noncreature spell". */
  spellKind?: "creature" | "noncreature" | "artifactOrCreature";
  /** The printed phrase, shown to players, e.g. "target creature an opponent controls". */
  label: string;
  /** What the spell or ability that targets is (its colors, artifact or not): protection can stop it from targeting. */
  source?: SourceQuality;
}

/**
 * A continuous effect printed on a permanent: "Enchanted creature gets +2/+2 and has flying", "Creatures you control
 * get +1/+1". It is not stored anywhere: it is worked out from the battlefield whenever it matters.
 */
export interface StaticEffect {
  scope: "enchanted" | "yours" | "opponents" | "all" | "self";
  /** "Attacking creatures you control get +1/+0". */
  attackingOnly?: boolean;
  /** "Other Goblin creatures you control attack each combat if able." */
  mustAttack?: boolean;
  /** "As long as you've drawn two or more cards this turn". */
  cond?: { drawnAtLeast?: number; lifeAtLeast?: number; yourTurn?: boolean };
  /** "Can't be blocked" while it applies. */
  unblockable?: boolean;
  /** "Other creatures you control": not the permanent itself. */
  other?: boolean;
  /** "Other Minotaur creatures you control get +1/+1": only creatures with one of these types. */
  subtypes?: string[];
  power: number;
  toughness: number;
  keywords: Keyword[];
  cantAttack?: boolean;
  cantBlock?: boolean;
  noUntap?: boolean;
  /** "Its activated abilities can't be activated unless they're mana abilities." */
  noActivated?: boolean;
}

/**
 * What a "*" power and toughness is counted from: "equal to the number of creatures you control", "...cards in your hand".
 * It is recomputed every time it matters, so it always follows the board.
 */
export type CountSpec =
  | { kind: "permanents"; what: "creature" | "land" | "artifact" | "enchantment" | "landType" | "subtype"; landType?: string; subtype?: string; nontoken?: boolean; other?: boolean; scope: "you" | "opponents" | "all" }
  | { kind: "hand" }
  | { kind: "graveyard"; creaturesOnly: boolean; spellsOnly?: boolean }
  | { kind: "attackers"; subtype?: string; other?: boolean } // creatures you control that are attacking
  | { kind: "toughnessGtPower" } // creatures you control with toughness greater than power
  | { kind: "opponents" } // the number of opponents you have
  | { kind: "selfPower" } // the power of the permanent the ability belongs to
  | { kind: "selfCounters" } // counters on it
  | { kind: "targetPower"; i: number } // the power of the i-th target
  | { kind: "otherToughness" } // the toughness of "that creature" (the one that entered)
  | { kind: "otherPower" }
  | { kind: "ifOtherSubtype"; subtype: string; yes: number; no: number }; // "put a counter on it. If it's a Unicorn, two instead"

/** One choice of a "Choose one —" spell or ability: its effects, and what it targets. */
export interface ModeSpec {
  effects: Effect[];
  targets: TargetSpec[];
  /** The printed text of the mode, shown on its button. */
  text: string;
}

export interface SpellAbility {
  effects: Effect[];
  targets: TargetSpec[];
  /** "Choose one —" (min 1, max 1) or "Choose one or both —" (min 1, max 2). The effects and targets above are then empty. */
  modal?: { min: number; max: number; modes: ModeSpec[] };
}

export interface TriggeredAbility {
  /** "When this enters, choose one —": the mode is chosen when the ability triggers. */
  modes?: ModeSpec[];
  /** "When this enters, if it was kicked, ...": only triggers when it was cast kicked. */
  ifKicked?: boolean;
  event: "enters" | "dies" | "attacks" | "noncreatureSpell" | "instantOrSorcery" | "landfall" | "lifeGained" | "allyEnters" | "combatDamagePlayer" | "blocks" | "blocked" | "damagedDies" | "drawCard" | "drawSecond" | "battalion" | "attackTwo" | "becomesTarget"
    | "upkeep" | "upkeepEach" | "endStep" | "endStepEach" | "beginCombat" | "allyLeaves" | "anyCreatureEnters" | "youCast" | "opponentCasts" | "youAttack" | "hostDamagesPlayer" | "drawFifth";
  /** An "intervening if": the trigger only happens when this is true as the event occurs. */
  cond?: { lifeGainedAtLeast?: number; lifeAtLeast?: number; controlsTypes?: string[]; enchantedUntapped?: boolean; attackPowerAtLeast?: number };
  /** "Whenever another nontoken creature you control enters". */
  nontoken?: boolean;
  /** "Whenever another Angel or Cleric you control enters": only creatures of these types. */
  subtypes?: string[];
  /** "...becomes the target of a spell or ability an opponent controls". */
  byOpponent?: boolean;
  /** "Whenever one or more Goblins you control attack": the attackers must include one of these types. */
  attackerSubtypes?: string[];
  /** "Whenever you cast a spell during an opponent's turn" / "your first spell during each opponent's turn". */
  opponentTurnOnly?: boolean;
  firstOnly?: boolean;
  /** "This ability triggers only once each turn." */
  oncePerTurn?: boolean;
  /** The effects say "that creature" (the other side of a block): such a trigger happens once per blocker, others once per attacker. */
  usesOther?: boolean;
  /** For "allyEnters": "another creature you control" (not itself), and "with power 2 or less". */
  other?: boolean;
  maxPower?: number;
  effects: Effect[];
  targets: TargetSpec[];
  text: string;
}

export interface LoyaltyAbility {
  /** What it does to loyalty: +1, 0, -3. */
  cost: number;
  effects: Effect[];
  targets: TargetSpec[];
  text: string;
}

export interface ActivatedAbility {
  /** "{T}, Sacrifice this land: ..." : the permanent is sacrificed as part of the cost. */
  sacrifice?: boolean;
  /** "Activate only as a sorcery." */
  sorceryOnly?: boolean;
  /** "Activate only if you have at least 7 life more than your starting life total": the life needed. */
  minLife?: number;
  /** "Exile two cards from your graveyard" as a cost. */
  exileFromYard?: number;
  /** "Tap two untapped creatures you control that share a creature type" as a cost. */
  tapTwoSharing?: boolean;
  /** "Activate only during your turn." */
  yourTurnOnly?: boolean;
  /** The ability works from the hand or the graveyard ("{1}{U}, discard this card: ..."), not from the battlefield. */
  zone?: "hand" | "graveyard";
  /** "Discard a card" or "Sacrifice a creature" as part of the cost: the player chooses which card when activating. */
  costCard?: { kind: "discard" | "sacrifice"; filter?: CardFilter; other?: boolean; label: string };
  /** Costs of such abilities: discard this card / exile this card from your graveyard / pay life. */
  discardSelf?: boolean;
  exileSelf?: boolean;
  payLife?: number;
  /** "Activate only once each turn." */
  oncePerTurn?: boolean;
  /** Tap the permanent as part of the cost ({T}). */
  tap: boolean;
  /** Mana to pay, as printed, e.g. "{1}{R}". Empty string = none. */
  mana: string;
  effects: Effect[];
  targets: TargetSpec[];
  text: string;
}

/** Everything the engine understood on a card. `ok` is false if any printed text was not understood. */
export interface ParsedCard {
  ok: boolean;
  spell?: SpellAbility;
  triggers: TriggeredAbility[];
  activated: ActivatedAbility[];
  /** "{T}: Add {G} or {W}": the permanent can be tapped for one mana of any of these colors. */
  manaColors?: ManaColor[];
  /** "This creature can't block." */
  cantBlock?: boolean;
  /** "This creature can't be blocked." */
  cantBeBlocked?: boolean;
  /** "This land enters tapped." */
  entersTapped?: boolean;
  /** "~'s power and toughness are each equal to ...": a creature printed with * / *. */
  dynamicStats?: CountSpec;
  /** Planeswalker abilities: "+1: ...", "-3: ...", "0: ...". */
  loyaltyAbilities?: LoyaltyAbility[];
  /** "Crew 3": a Vehicle. Tapping creatures with total power 3 or more makes it a creature until end of turn. */
  crew?: number;
  /** "Ward {2}": whoever targets this with a spell or ability pays this or it is countered. */
  ward?: string;
  /** "Protection from red": colors, and whether it is also protected from artifacts. */
  protection?: { colors: string[]; artifacts: boolean };
  /** "Flashback {2}{R}": the cost to cast this from the graveyard. */
  flashback?: string;
  /** "Kicker {2}": the extra mana that may be paid when casting. */
  kicker?: string;
  /** "If this creature was kicked, it enters with two +1/+1 counters on it." */
  kickedCounters?: number;
  /** "This spell can't be countered." */
  cantBeCountered?: boolean;
  /** "This creature attacks each combat if able." */
  mustAttack?: boolean;
  /** "Swampwalk" etc.: unblockable while the defender controls a land of this type ("swamp"). */
  landwalk?: string[];
  /** "As an additional cost to cast this, sacrifice a creature." */
  extraSacrifice?: boolean;
  /** "As this enters, choose a color (other than blue)." */
  chooseColor?: { except?: string };
  /** "{T}: Add {U} or one mana of the chosen color." */
  manaChosen?: boolean;
  /** "Can't be blocked except by walls and/or creatures with flying": only these can block it. */
  blockedOnlyBy?: { subtypes: string[]; keywords: Keyword[]; colors: string[]; artifact: boolean };
  /** "This land enters tapped unless ...": the conditions under which it enters untapped. */
  entersTappedUnless?: { basics?: number; otherLands?: number; fewerOtherLands?: number; planeswalker?: boolean; lifeAtMost?: number; opponentLands?: number; never?: boolean };
  /** "Can't be blocked by creatures with power 2 or less / 4 or greater." */
  cantBeBlockedByPower?: { n: number; op: "max" | "min" };
  /** "This creature can't attack unless defending player controls an Island." */
  attackOnlyIfDefenderControls?: string;
  /** "All creatures able to block this creature do so." */
  lureAll?: boolean;
  /** "Spells your opponents cast that target this cost {2} more to cast." */
  targetTax?: number;
  /** "Enchanted creature has 'Whenever you gain life, put that many +1/+1 counters on this creature'." */
  hostGainLifeCounters?: boolean;
  /** "Prevent all noncombat damage that would be dealt to you and creatures you control." */
  preventNoncombat?: boolean;
  /** "If you would draw a card except the first one you draw in each of your draw steps, draw two cards instead." */
  drawDouble?: boolean;
  /** "If you would gain life, you gain that much life plus 1 / twice that much instead." */
  lifeGainPlus?: number;
  lifeGainDouble?: boolean;
  /** "~ costs {1} less to cast if you control a Wizard" / "for each spell your opponents have cast this turn" / "if you control a creature with flying". */
  costReduction?: { n: number; ifControl?: string; ifFlyer?: boolean; perOpponentSpell?: boolean };
  /** Permanents that make your spells cost less: "Goblin spells you cast cost {1} less", "during turns other than yours...". */
  costMods?: { n: number; subtype?: string; minMV?: number; otherTurn?: boolean }[];
  /** "Spells you cast with mana value 5 or greater can't be countered." */
  uncounterableMinMV?: number;
  /** "As an additional cost to cast this spell, sacrifice a Goblin." */
  extraSacrificeType?: string;
  /** "Can't attack unless you control more creatures than defending player" / "can't block unless ...". */
  attackIfMoreCreatures?: boolean;
  blockIfMoreCreatures?: boolean;
  /** "Can't be blocked by red creatures." */
  cantBeBlockedByColors?: string[];
  /** "This creature can block only creatures with flying." */
  blocksOnlyFlying?: boolean;
  /** "This creature can't attack or block alone." */
  cantAttackAlone?: boolean;
  /** "All creatures able to block this creature do so." */
  lure?: boolean;
  /** "This creature can't be blocked by more than one creature." */
  maxBlockers?: number;
  /** "Cycling {2}": the mana to pay to discard this card from hand and draw a card. */
  cycling?: string;
  /** "Basic landcycling {1}{G}": pay, discard, and search for a basic land card. */
  landcycling?: string;
  /** "~ enters with two -1/-1 counters on it." */
  entersWithMinus?: number;
  /** "~ enters with two +1/+1 counters on it" (or X). */
  entersWithCounters?: number | "X";
  /** "Enchant creature": the card is an Aura and needs a target when it is cast. */
  aura?: TargetSpec;
  statics?: StaticEffect[];
  /** Lines of rules text that were not understood (empty when `ok`). */
  unsupported: string[];
}

// ───────── the stack ─────────

/** A choice of target made by a player. */
export type TargetChoice =
  | { kind: "player"; id: PlayerId }
  | { kind: "permanent"; iid: string }
  | { kind: "card"; iid: string } // a card in a graveyard
  | { kind: "stack"; id: string }
  | { kind: "none" }; // "up to one" target: chosen nothing

export type StackItem =
  | {
      kind: "spell";
      id: string;
      controller: PlayerId;
      card: CardInstance;
      effects: Effect[];
      targets: TargetChoice[];
      specs: TargetSpec[];
      /** The X chosen for the spell (0 when its cost has no X). */
      x: number;
      /** Cast with its kicker paid. */
      kicked?: boolean;
      /** Cast from the graveyard with flashback: it is exiled afterwards, not put back in the graveyard. */
      flashback?: boolean;
    }
  | {
      kind: "ability";
      id: string;
      controller: PlayerId;
      /** The permanent (or card) that the ability came from. */
      source: string;
      sourceName: string;
      effects: Effect[];
      targets: TargetChoice[];
      specs: TargetSpec[];
      text: string;
      /** "That creature" for a block trigger: the creature on the other side of the block. */
      other?: string;
      /** A number remembered when the ability was activated (the power of a creature that was sacrificed as its cost). */
      x?: number;
    };

/** An open round of priority: `holder` may respond or pass. When both pass in a row, the top item resolves. */
export interface PriorityRound {
  holder: PlayerId;
  /** Consecutive passes so far. */
  passes: number;
  /** What to do when the stack is empty and both players pass: carry on with combat damage. */
  then: "afterBlockers" | "afterAttackers" | null;
}

/**
 * A choice among cards, waiting for a player: which card to discard, which of the top cards to keep, which basic
 * land to fetch, or the order of the top of the library. The game stands still until it is answered.
 */
export interface PendingPick {
  /** Who chooses. */
  player: PlayerId;
  /** The card the choice comes from. A resolving spell is already in the graveyard, so this is how both players see what is going on. */
  source?: { iid: string; name: string; defId?: string };
  prompt: string;
  kind: "discard" | "bounceOwn" | "tapSome" | "topBottom" | "rummage" | "mayPay" | "tax" | "toggle" | "toHand" | "toGraveyard" | "searchLand" | "searchAny" | "revealToHand" | "arrange" | "scry" | "surveil" | "ward" | "crew" | "mode" | "color";
  /** The cards to choose between (instance ids). They are shown to the chooser. */
  options: string[];
  /** The player may decline (eye spy, a search that finds nothing). */
  optional: boolean;
  /** Whose hand (discard) or library (look, search, arrange) the cards are in. */
  owner: PlayerId;
  /** How many more cards are to be chosen (discard two cards). */
  remaining: number;
  /** Arrange: the cards already placed, top first. */
  ordered: string[];
  /** Ward: the spell or ability on the stack that is countered unless the cost is paid, and the cost. */
  wardItem?: string;
  wardCost?: string;
  /** Crew: the Vehicle being crewed. */
  vehicle?: string;
  /** Color: the permanent that is choosing a color as it enters. */
  colorFor?: string;
  /** Search: the land enters tapped. */
  entersTapped?: boolean;
  /** Search or look, to hand: the card text reveals the chosen card, so the opponent may learn its name. */
  reveal?: boolean;
  /** Reveal-to-hand / tutor: where the card goes, and what happens to the rest of the looked-at cards. */
  bottomIids?: string[];
  randomBottom?: boolean;
  restToGraveyard?: boolean;
  /** MayPay: the effects that happen if the cost is paid. Tax: who draws if it isn't. */
  thenEffects?: Effect[];
  thenCtx?: RunContext;
  thenSpecs?: TargetSpec[];
  taxFor?: PlayerId;
  /** Toggle: the permanent that may be tapped or untapped. */
  toggleIid?: string;
  /** Mode: the choices (the options are their indexes as text) and the ability waiting for one. */
  modes?: ModeSpec[];
  modeItem?: Extract<StackItem, { kind: "ability" }>;
  /** The effects that come after this choice on the same card ("Scry 2, then draw a card"), run once it is answered. */
  rest?: Effect[];
  ctx?: RunContext;
}

/** A triggered ability that needs its controller to choose targets before it goes on the stack. */
export interface PendingChoice {
  player: PlayerId;
  item: Extract<StackItem, { kind: "ability" }>;
  specs: TargetSpec[];
}
