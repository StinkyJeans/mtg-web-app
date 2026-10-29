import type { CardDef } from "../types.js";

// The Vampire Supreme deck's cards and its sideboard's, with their oracle text, for the tests.

const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, extra: Partial<CardDef> = {}): CardDef => ({
  id,
  name,
  type,
  cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, sym) => n + (/^\{\d+\}$/.test(sym) ? Number(sym.slice(1, -1)) : 1), 0),
  manaCost,
  typeLine,
  text,
  colors: ["W", "U", "B", "R", "G"].filter((c) => manaCost.includes(c)),
  keywords: [],
  ...extra,
});

export const VAMP: Record<string, CardDef> = Object.fromEntries(
  [
    card("knight-of-the-ebon-legion", "Knight of the Ebon Legion", "creature", "{B}", "Creature — Vampire Knight", "{2}{B}: This creature gets +3/+3 and gains deathtouch until end of turn.\nAt the beginning of your end step, if a player lost 4 or more life this turn, put a +1/+1 counter on this creature. (Damage causes loss of life.)", { power: 1, toughness: 2 }),
    card("gifted-aetherborn", "Gifted Aetherborn", "creature", "{B}{B}", "Creature — Aetherborn Vampire", "Deathtouch, lifelink", { power: 2, toughness: 3, keywords: ["lifelink","deathtouch"] }),
    card("bloodtithe-harvester", "Bloodtithe Harvester", "creature", "{B}{R}", "Creature — Vampire", "When this creature enters, create a Blood token. (It's an artifact with \"{1}, {T}, Discard a card, Sacrifice this token: Draw a card.\")\n{T}, Sacrifice this creature: Target creature gets -X/-X until end of turn, where X is twice the number of Blood tokens you control. Activate only as a sorcery.", { power: 3, toughness: 2 }),
    card("vampire-nighthawk", "Vampire Nighthawk", "creature", "{1}{B}{B}", "Creature — Vampire Shaman", "Flying\nDeathtouch (Any amount of damage this deals to a creature is enough to destroy it.)\nLifelink (Damage dealt by this creature also causes you to gain that much life.)", { power: 2, toughness: 3, keywords: ["deathtouch","flying","lifelink"] }),
    card("stromkirk-captain", "Stromkirk Captain", "creature", "{1}{B}{R}", "Creature — Vampire Soldier", "First strike\nOther Vampire creatures you control get +1/+1 and have first strike.", { power: 2, toughness: 2, keywords: ["first strike"] }),
    card("sorin-imperious-bloodlord", "Sorin, Imperious Bloodlord", "planeswalker", "{2}{B}", "Legendary Planeswalker — Sorin", "+1: Target creature you control gains deathtouch and lifelink until end of turn. If it's a Vampire, put a +1/+1 counter on it.\n+1: You may sacrifice a Vampire. When you do, Sorin deals 3 damage to any target and you gain 3 life.\n−3: You may put a Vampire creature card from your hand onto the battlefield.", { loyalty: 4 }),
    card("olivia-voldaren", "Olivia Voldaren", "creature", "{2}{B}{R}", "Legendary Creature — Vampire", "Flying\n{1}{R}: Olivia Voldaren deals 1 damage to another target creature. That creature becomes a Vampire in addition to its other types. Put a +1/+1 counter on Olivia Voldaren.\n{3}{B}{B}: Gain control of target Vampire for as long as you control Olivia Voldaren.", { power: 3, toughness: 3, keywords: ["flying"] }),
    card("vampire-of-the-dire-moon", "Vampire of the Dire Moon", "creature", "{B}", "Creature — Vampire", "Deathtouch (Any amount of damage this deals to a creature is enough to destroy it.)\nLifelink (Damage dealt by this creature also causes you to gain that much life.)", { power: 1, toughness: 1, keywords: ["lifelink","deathtouch"] }),
    card("kalastria-highborn", "Kalastria Highborn", "creature", "{B}{B}", "Creature — Vampire Shaman", "Whenever this creature or another Vampire you control dies, you may pay {B}. If you do, target player loses 2 life and you gain 2 life.", { power: 2, toughness: 2 }),
    card("lightning-bolt", "Lightning Bolt", "instant", "{R}", "Instant", "Lightning Bolt deals 3 damage to any target."),
    card("fatal-push", "Fatal Push", "instant", "{B}", "Instant", "Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent left the battlefield under your control this turn.", { keywords: ["revolt"] }),
    card("cut-down", "Cut Down", "instant", "{B}", "Instant", "Destroy target creature with total power and toughness 5 or less."),
    card("terminate", "Terminate", "instant", "{B}{R}", "Instant", "Destroy target creature. It can't be regenerated."),
    card("blood-crypt", "Blood Crypt", "land", "", "Land — Swamp Mountain", "({T}: Add {B} or {R}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped."),
    card("bloodstained-mire", "Bloodstained Mire", "land", "", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or Mountain card, put it onto the battlefield, then shuffle."),
    card("dragonskull-summit", "Dragonskull Summit", "land", "", "Land", "This land enters tapped unless you control a Swamp or a Mountain.\n{T}: Add {B} or {R}."),
    card("blackcleave-cliffs", "Blackcleave Cliffs", "land", "", "Land", "This land enters tapped unless you control two or fewer other lands.\n{T}: Add {B} or {R}."),
    card("haunted-ridge", "Haunted Ridge", "land", "", "Land", "This land enters tapped unless you control two or more other lands.\n{T}: Add {B} or {R}."),
    card("thoughtseize", "Thoughtseize", "sorcery", "{B}", "Sorcery", "Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life."),
    card("gatekeeper-of-malakir", "Gatekeeper of Malakir", "creature", "{B}{B}", "Creature — Vampire Warrior", "Kicker {B} (You may pay an additional {B} as you cast this spell.)\nWhen this creature enters, if it was kicked, target player sacrifices a creature of their choice.", { power: 2, toughness: 2, keywords: ["kicker"] }),
    card("dreadbore", "Dreadbore", "sorcery", "{B}{R}", "Sorcery", "Destroy target creature or planeswalker."),
    card("go-for-the-throat", "Go for the Throat", "instant", "{1}{B}", "Instant", "Destroy target nonartifact creature."),
    card("cordial-vampire", "Cordial Vampire", "creature", "{B}{B}", "Creature — Vampire", "Whenever this creature or another creature dies, put a +1/+1 counter on each Vampire you control.", { power: 1, toughness: 1 }),
    card("sanctum-seeker", "Sanctum Seeker", "creature", "{2}{B}{B}", "Creature — Vampire Knight", "Whenever a Vampire you control attacks, each opponent loses 1 life and you gain 1 life.", { power: 3, toughness: 4 }),
    card("vampire-sovereign", "Vampire Sovereign", "creature", "{3}{B}{B}", "Creature — Vampire Noble", "Flying\nWhen this creature enters, target opponent loses 3 life and you gain 3 life.", { power: 3, toughness: 4, keywords: ["flying"] }),
  ].map((c) => [c.id, c]),
);
