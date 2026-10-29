import type { CardDef } from "../types.js";

// The Mono-Green Stompy deck's cards and its sideboard's, with their oracle text, for the tests.

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

export const GREEN: Record<string, CardDef> = Object.fromEntries(
  [
    card("noble-hierarch", "Noble Hierarch", "creature", "{G}", "Creature — Human Druid", "Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.)\n{T}: Add {G}, {W}, or {U}.", { power: 0, toughness: 1, keywords: ["exalted"] }),
    card("llanowar-elves", "Llanowar Elves", "creature", "{G}", "Creature — Elf Druid", "{T}: Add {G}.", { power: 1, toughness: 1 }),
    card("strangleroot-geist", "Strangleroot Geist", "creature", "{G}{G}", "Creature — Spirit", "Haste\nUndying (When this creature dies, if it had no +1/+1 counters on it, return it to the battlefield under its owner's control with a +1/+1 counter on it.)", { power: 2, toughness: 1, keywords: ["undying", "haste"] }),
    card("steel-leaf-champion", "Steel Leaf Champion", "creature", "{G}{G}{G}", "Creature — Elf Knight", "This creature can't be blocked by creatures with power 2 or less.", { power: 5, toughness: 4 }),
    card("werewolf-pack-leader", "Werewolf Pack Leader", "creature", "{G}{G}", "Creature — Human Werewolf", "Pack tactics — Whenever this creature attacks, if you attacked with creatures with total power 6 or greater this combat, draw a card.\n{3}{G}: Until end of turn, this creature has base power and toughness 5/3, gains trample, and isn't a Human.", { power: 3, toughness: 3, keywords: ["pack tactics"] }),
    card("hooting-mandrills", "Hooting Mandrills", "creature", "{5}{G}", "Creature — Ape", "Delve (Each card you exile from your graveyard while casting this spell pays for {1}.)\nTrample", { power: 4, toughness: 4, keywords: ["delve", "trample"] }),
    card("ghalta", "Ghalta, Primal Hunger", "creature", "{10}{G}{G}", "Legendary Creature — Elder Dinosaur", "This spell costs {X} less to cast, where X is the total power of creatures you control.\nTrample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)", { power: 12, toughness: 12, keywords: ["trample"] }),
    card("craterhoof-behemoth", "Craterhoof Behemoth", "creature", "{5}{G}{G}{G}", "Creature — Beast", "Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.", { power: 5, toughness: 5, keywords: ["haste"] }),
    card("rancor", "Rancor", "enchantment", "{G}", "Enchantment — Aura", "Enchant creature\nEnchanted creature gets +2/+0 and has trample.\nWhen this Aura is put into a graveyard from the battlefield, return it to its owner's hand.", { keywords: ["enchant"] }),
    card("aspect-of-hydra", "Aspect of Hydra", "instant", "{G}", "Instant", "Target creature gets +X/+X until end of turn, where X is your devotion to green. (Each {G} in the mana costs of permanents you control counts toward your devotion to green.)"),
    card("garruks-uprising", "Garruk's Uprising", "enchantment", "{2}{G}", "Enchantment", "When this enchantment enters, if you control a creature with power 4 or greater, draw a card.\nCreatures you control have trample. (Each of those creatures can deal excess combat damage to the player or planeswalker it's attacking.)\nWhenever a creature you control with power 4 or greater enters, draw a card."),
    card("blossoming-defense", "Blossoming Defense", "instant", "{G}", "Instant", "Target creature you control gets +2/+2 and gains hexproof until end of turn. (It can't be the target of spells or abilities your opponents control.)"),
    card("ram-through", "Ram Through", "instant", "{1}{G}", "Instant", "Target creature you control deals damage equal to its power to target creature you don't control. If the creature you control has trample, excess damage is dealt to that creature's controller instead."),
    card("treetop-village", "Treetop Village", "land", "", "Land", "This land enters tapped.\n{T}: Add {G}.\n{1}{G}: This land becomes a 3/3 green Ape creature with trample until end of turn. It's still a land. (It can deal excess combat damage to the player or planeswalker it's attacking.)"),
    card("horizon-canopy", "Horizon Canopy", "land", "", "Land", "{T}, Pay 1 life: Add {G} or {W}.\n{1}, {T}, Sacrifice this land: Draw a card."),
    card("pendelhaven", "Pendelhaven", "land", "", "Legendary Land", "{T}: Add {G}.\n{T}: Target 1/1 creature gets +1/+2 until end of turn."),
    card("snakeskin-veil", "Snakeskin Veil", "instant", "{G}", "Instant", "Put a +1/+1 counter on target creature you control. It gains hexproof until end of turn. (It can't be the target of spells or abilities your opponents control.)"),
    card("vines-of-vastwood", "Vines of Vastwood", "instant", "{G}", "Instant", "Kicker {G} (You may pay an additional {G} as you cast this spell.)\nTarget creature can't be the target of spells or abilities your opponents control this turn. If this spell was kicked, that creature gets +4/+4 until end of turn.", { keywords: ["kicker"] }),
    card("thrun", "Thrun, the Last Troll", "creature", "{2}{G}{G}", "Legendary Creature — Troll Shaman", "This spell can't be countered.\nHexproof (This creature can't be the target of spells or abilities your opponents control.)\n{1}{G}: Regenerate Thrun.", { power: 4, toughness: 4, keywords: ["hexproof", "regenerate"] }),
    card("thrashing-brontodon", "Thrashing Brontodon", "creature", "{1}{G}{G}", "Creature — Dinosaur", "{1}, Sacrifice this creature: Destroy target artifact or enchantment.", { power: 3, toughness: 4 }),
    card("dismember", "Dismember", "instant", "{1}{B/P}{B/P}", "Instant", "({B/P} can be paid with either {B} or 2 life.)\nTarget creature gets -5/-5 until end of turn."),
    card("sentinel-of-the-nameless-city", "Sentinel of the Nameless City", "creature", "{2}{G}", "Creature — Merfolk Warrior Scout", "Vigilance\nWhenever this creature enters or attacks, create a Map token. (It's an artifact with \"{1}, {T}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery.\")", { power: 3, toughness: 4, keywords: ["vigilance", "explore"] }),
    card("overrun", "Overrun", "sorcery", "{2}{G}{G}{G}", "Sorcery", "Creatures you control get +3/+3 and gain trample until end of turn. (Each of those creatures can deal excess combat damage to the player or planeswalker it's attacking.)"),
    card("overwhelming-stampede", "Overwhelming Stampede", "sorcery", "{3}{G}{G}", "Sorcery", "Until end of turn, creatures you control gain trample and get +X/+X, where X is the greatest power among creatures you control."),
    card("tyrranax-rex", "Tyrranax Rex", "creature", "{4}{G}{G}{G}", "Creature — Phyrexian Dinosaur", "This spell can't be countered.\nTrample, ward {4}, haste\nToxic 4 (Players dealt combat damage by this creature also get four poison counters.)", { power: 8, toughness: 8, keywords: ["toxic", "haste", "trample", "ward"] }),
  ].map((c) => [c.id, c]),
);
