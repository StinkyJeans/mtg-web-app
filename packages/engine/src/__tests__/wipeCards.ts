import type { CardDef } from "../types.js";

// The Orzhov Board Wipes deck's cards and its sideboard's, with their oracle text, for the tests.

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

export const WIPE: Record<string, CardDef> = Object.fromEntries(
  [
    card("wrath-of-god", "Wrath of God", "sorcery", "{2}{W}{W}", "Sorcery", "Destroy all creatures. They can't be regenerated."),
    card("kaya-s-wrath", "Kaya's Wrath", "sorcery", "{W}{W}{B}{B}", "Sorcery", "Destroy all creatures. You gain life equal to the number of creatures you controlled that were destroyed this way."),
    card("damnation", "Damnation", "sorcery", "{2}{B}{B}", "Sorcery", "Destroy all creatures. They can't be regenerated."),
    card("fumigate", "Fumigate", "sorcery", "{3}{W}{W}", "Sorcery", "Destroy all creatures. You gain 1 life for each creature destroyed this way."),
    card("elspeth-sun-s-champion", "Elspeth, Sun's Champion", "planeswalker", "{4}{W}{W}", "Legendary Planeswalker — Elspeth", "+1: Create three 1/1 white Soldier creature tokens.\n−3: Destroy all creatures with power 4 or greater.\n−7: You get an emblem with \"Creatures you control get +2/+2 and have flying.\"", { loyalty: 4 }),
    card("grave-titan", "Grave Titan", "creature", "{4}{B}{B}", "Creature — Giant", "Deathtouch\nWhenever this creature enters or attacks, create two 2/2 black Zombie creature tokens.", { power: 6, toughness: 6, keywords: ["deathtouch"] }),
    card("massacre-wurm", "Massacre Wurm", "creature", "{3}{B}{B}{B}", "Creature — Phyrexian Wurm", "When this creature enters, creatures your opponents control get -2/-2 until end of turn.\nWhenever a creature an opponent controls dies, that player loses 2 life.", { power: 6, toughness: 5 }),
    card("lingering-souls", "Lingering Souls", "sorcery", "{2}{W}", "Sorcery", "Create two 1/1 white Spirit creature tokens with flying.\nFlashback {1}{B} (You may cast this card from your graveyard for its flashback cost. Then exile it.)", { keywords: ["flashback"] }),
    card("kitchen-finks", "Kitchen Finks", "creature", "{1}{G/W}{G/W}", "Creature — Ouphe", "When this creature enters, you gain 2 life.\nPersist (When this creature dies, if it had no -1/-1 counters on it, return it to the battlefield under its owner's control with a -1/-1 counter on it.)", { power: 3, toughness: 2, keywords: ["persist"] }),
    card("fatal-push", "Fatal Push", "instant", "{B}", "Instant", "Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent left the battlefield under your control this turn.", { keywords: ["revolt"] }),
    card("infernal-grasp", "Infernal Grasp", "instant", "{1}{B}", "Instant", "Destroy target creature. You lose 2 life."),
    card("vindicate", "Vindicate", "sorcery", "{1}{W}{B}", "Sorcery", "Destroy target permanent."),
    card("thoughtseize", "Thoughtseize", "sorcery", "{B}", "Sorcery", "Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life."),
    card("night-s-whisper", "Night's Whisper", "sorcery", "{1}{B}", "Sorcery", "You draw two cards and lose 2 life."),
    card("read-the-bones", "Read the Bones", "sorcery", "{2}{B}", "Sorcery", "Scry 2, then draw two cards. You lose 2 life. (To scry 2, look at the top two cards of your library, then put any number of them on the bottom and the rest on top in any order.)", { keywords: ["scry"] }),
    card("timely-reinforcements", "Timely Reinforcements", "sorcery", "{2}{W}", "Sorcery", "If you have less life than an opponent, you gain 6 life. If you control fewer creatures than an opponent, create three 1/1 white Soldier creature tokens."),
    card("godless-shrine", "Godless Shrine", "land", "", "Land — Plains Swamp", "({T}: Add {W} or {B}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped."),
    card("isolated-chapel", "Isolated Chapel", "land", "", "Land", "This land enters tapped unless you control a Plains or a Swamp.\n{T}: Add {W} or {B}."),
    card("concealed-courtyard", "Concealed Courtyard", "land", "", "Land", "This land enters tapped unless you control two or fewer other lands.\n{T}: Add {W} or {B}."),
    card("shadowy-backstreet", "Shadowy Backstreet", "land", "", "Land — Plains Swamp", "({T}: Add {W} or {B}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)", { keywords: ["surveil"] }),
    card("scoured-barrens", "Scoured Barrens", "land", "", "Land", "This land enters tapped.\nWhen this land enters, you gain 1 life.\n{T}: Add {W} or {B}."),
    card("marsh-flats", "Marsh Flats", "land", "", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Plains or Swamp card, put it onto the battlefield, then shuffle."),
    card("castle-ardenvale", "Castle Ardenvale", "land", "", "Land", "This land enters tapped unless you control a Plains.\n{T}: Add {W}.\n{2}{W}{W}, {T}: Create a 1/1 white Human creature token."),
    card("castle-locthwain", "Castle Locthwain", "land", "", "Land", "This land enters tapped unless you control a Swamp.\n{T}: Add {B}.\n{1}{B}{B}, {T}: Draw a card, then you lose life equal to the number of cards in your hand."),
    card("languish", "Languish", "sorcery", "{2}{B}{B}", "Sorcery", "All creatures get -4/-4 until end of turn."),
    card("ritual-of-soot", "Ritual of Soot", "sorcery", "{2}{B}{B}", "Sorcery", "Destroy all creatures with mana value 3 or less."),
    card("path-to-exile", "Path to Exile", "instant", "{W}", "Instant", "Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle."),
    card("anguished-unmaking", "Anguished Unmaking", "instant", "{1}{W}{B}", "Instant", "Exile target nonland permanent. You lose 3 life."),
    card("despark", "Despark", "instant", "{W}{B}", "Instant", "Exile target permanent with mana value 4 or greater."),
    card("cast-out", "Cast Out", "enchantment", "{3}{W}", "Enchantment", "Flash\nWhen this enchantment enters, exile target nonland permanent an opponent controls until this enchantment leaves the battlefield.\nCycling {W} ({W}, Discard this card: Draw a card.)", { keywords: ["flash","cycling"] }),
    card("archangel-of-thune", "Archangel of Thune", "creature", "{3}{W}{W}", "Creature — Angel", "Flying\nLifelink (Damage dealt by this creature also causes you to gain that much life.)\nWhenever you gain life, put a +1/+1 counter on each creature you control.", { power: 3, toughness: 4, keywords: ["flying","lifelink"] }),
    card("spectral-procession", "Spectral Procession", "sorcery", "{2/W}{2/W}{2/W}", "Sorcery", "Create three 1/1 white Spirit creature tokens with flying.", { cost: 6 }),
  ].map((c) => [c.id, c]),
);
