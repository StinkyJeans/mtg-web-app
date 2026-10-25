import type { CardDef } from "./types.js";

/** Combat keywords the engine implements. A creature with any other keyword isn't playable yet. */
export const SUPPORTED_KEYWORDS = [
  "flying",
  "reach",
  "first strike",
  "double strike",
  "deathtouch",
  "lifelink",
  "trample",
  "vigilance",
  "haste",
  "defender",
  "menace",
  "indestructible",
  "flash",
  "hexproof",
  "prowess",
  "fear",
  "intimidate",
] as const;

export type Keyword = (typeof SUPPORTED_KEYWORDS)[number];

const SUPPORTED = new Set<string>(SUPPORTED_KEYWORDS);

/** What each keyword does, in plain words (shown to players). */
export const KEYWORD_RULES: Record<Keyword, string> = {
  flying: "Can be blocked only by creatures with flying or reach.",
  reach: "Can block creatures with flying.",
  "first strike": "Deals combat damage before creatures without first strike.",
  "double strike": "Deals combat damage twice: once with first strike and once with regular damage.",
  deathtouch: "Any amount of damage this deals to a creature is enough to destroy it.",
  lifelink: "Damage dealt by this also gains its controller that much life.",
  trample: "If blocked, assigns lethal damage to the blockers and the rest to the defending player.",
  vigilance: "Attacking doesn't cause it to tap.",
  haste: "Can attack the turn it comes into play.",
  defender: "Can't attack.",
  menace: "Can't be blocked except by two or more creatures.",
  indestructible: "Isn't destroyed by lethal damage or deathtouch.",
  flash: "Can be cast any time you could cast an instant.",
  hexproof: "Can't be the target of spells or abilities your opponents control.",
  prowess: "Whenever you cast a noncreature spell, this gets +1/+1 until end of turn.",
  fear: "Can't be blocked except by artifact creatures and/or black creatures.",
  intimidate: "Can't be blocked except by artifact creatures and/or creatures that share a color with it.",
};

export const hasKeyword = (def: CardDef, keyword: Keyword): boolean =>
  (def.keywords ?? []).some((k) => k.toLowerCase() === keyword);

/** Keywords that are just labels for a line the text reader handles itself ("Enchant creature"). */
const LABELS = new Set([
  "enchant", "cycling", "regenerate", "scry", "mill", "surveil", "devoid", "partner", "changeling", "landwalk",
  "treasure", "battalion", "pack tactics", "double", "food", "investigate", "equip", "landcycling", "typecycling", "basic landcycling", "kicker", "flashback", "protection", "landfall", "ward", "crew",
  "heal", "fight", "swampwalk", "islandwalk", "forestwalk", "mountainwalk", "plainswalk",
  "eerie", "prepared", "raid",
  "explore", "solved", "infusion", "warp", "blight", "offspring",
]);

/** True if every keyword printed on the card is one the engine implements. */
export const keywordsSupported = (def: CardDef): boolean => (def.keywords ?? []).every((k) => SUPPORTED.has(k.toLowerCase()) || LABELS.has(k.toLowerCase()));
