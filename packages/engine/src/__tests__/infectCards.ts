import type { CardDef } from "../types.js";

// The Mono-Black Infect deck's cards, its sideboard's and a few other proliferate cards, with their oracle text, for the tests.

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

export const INFECT: Record<string, CardDef> = Object.fromEntries(
  [
    card("bilious-skulldweller", "Bilious Skulldweller", "creature", "{B}", "Creature — Phyrexian Insect", "Deathtouch\nToxic 1 (Players dealt combat damage by this creature also get a poison counter.)", { power: 1, toughness: 1, keywords: ["toxic", "deathtouch"] }),
    card("plague-stinger", "Plague Stinger", "creature", "{1}{B}", "Creature — Phyrexian Insect Horror", "Flying\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)", { power: 1, toughness: 1, keywords: ["flying", "infect"] }),
    card("blightbelly-rat", "Blightbelly Rat", "creature", "{1}{B}", "Creature — Phyrexian Rat", "Toxic 1 (Players dealt combat damage by this creature also get a poison counter.)\nWhen this creature dies, proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)", { power: 2, toughness: 2, keywords: ["toxic", "proliferate"] }),
    card("phyrexian-crusader", "Phyrexian Crusader", "creature", "{1}{B}{B}", "Creature — Phyrexian Zombie Knight", "First strike, protection from red and from white\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)", { power: 2, toughness: 2, keywords: ["first strike", "protection", "infect"] }),
    card("ichor-rats", "Ichor Rats", "creature", "{1}{B}{B}", "Creature — Phyrexian Rat", "Infect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\nWhen this creature enters, each player gets a poison counter.", { power: 2, toughness: 1, keywords: ["infect"] }),
    card("hand-of-the-praetors", "Hand of the Praetors", "creature", "{3}{B}", "Creature — Phyrexian Zombie", "Infect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\nOther creatures you control with infect get +1/+1.\nWhenever you cast a creature spell with infect, target player gets a poison counter.", { power: 3, toughness: 2, keywords: ["infect"] }),
    card("skithiryx", "Skithiryx, the Blight Dragon", "creature", "{3}{B}{B}", "Legendary Creature — Phyrexian Dragon Skeleton", "Flying\nInfect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\n{B}: Skithiryx gains haste until end of turn.\n{B}{B}: Regenerate Skithiryx.", { power: 4, toughness: 4, keywords: ["flying", "regenerate", "infect"] }),
    card("tainted-strike", "Tainted Strike", "instant", "{B}", "Instant", "Target creature gets +1/+0 and gains infect until end of turn. (It deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)"),
    card("fatal-push", "Fatal Push", "instant", "{B}", "Instant", "Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent left the battlefield under your control this turn.", { keywords: ["revolt"] }),
    card("grim-affliction", "Grim Affliction", "instant", "{2}{B}", "Instant", "Put a -1/-1 counter on target creature, then proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)", { keywords: ["proliferate"] }),
    card("drown-in-ichor", "Drown in Ichor", "sorcery", "{1}{B}", "Sorcery", "Target creature gets -4/-4 until end of turn. Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)", { keywords: ["proliferate"] }),
    card("vraskas-fall", "Vraska's Fall", "instant", "{2}{B}", "Instant", "Each opponent sacrifices a creature or planeswalker of their choice and gets a poison counter."),
    card("dismember", "Dismember", "instant", "{1}{B/P}{B/P}", "Instant", "({B/P} can be paid with either {B} or 2 life.)\nTarget creature gets -5/-5 until end of turn."),
    card("inkmoth-nexus", "Inkmoth Nexus", "land", "", "Land", "{T}: Add {C}.\n{1}: This land becomes a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect until end of turn. It's still a land. (It deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)"),
    card("thoughtseize", "Thoughtseize", "sorcery", "{B}", "Sorcery", "Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life."),
    card("go-for-the-throat", "Go for the Throat", "instant", "{1}{B}", "Instant", "Destroy target nonartifact creature."),
    card("phyrexian-arena", "Phyrexian Arena", "enchantment", "{1}{B}{B}", "Enchantment", "At the beginning of your upkeep, you draw a card and lose 1 life."),
    card("infectious-inquiry", "Infectious Inquiry", "sorcery", "{2}{B}", "Sorcery", "You draw two cards and you lose 2 life. Each opponent gets a poison counter."),
    card("necropede", "Necropede", "creature", "{2}", "Artifact Creature — Phyrexian Insect", "Infect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\nWhen this creature dies, you may put a -1/-1 counter on target creature.", { power: 1, toughness: 1, keywords: ["infect"] }),
    card("vector-asp", "Vector Asp", "creature", "{1}", "Artifact Creature — Phyrexian Snake", "{B}: This creature gains infect until end of turn. (It deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)", { power: 1, toughness: 1 }),
    card("pestilent-syphoner", "Pestilent Syphoner", "creature", "{1}{B}", "Creature — Phyrexian Insect", "Flying\nToxic 1 (Players dealt combat damage by this creature also get a poison counter.)", { power: 1, toughness: 1, keywords: ["flying", "toxic"] }),
    card("contagion-clasp", "Contagion Clasp", "artifact", "{2}", "Artifact", "When this artifact enters, put a -1/-1 counter on target creature.\n{4}, {T}: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)", { keywords: ["proliferate"] }),
    card("throne-of-geth", "Throne of Geth", "artifact", "{2}", "Artifact", "{T}, Sacrifice an artifact: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)", { keywords: ["proliferate"] }),
    card("phyrexian-vatmother", "Phyrexian Vatmother", "creature", "{2}{B}{B}", "Creature — Phyrexian Horror", "Infect (This creature deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)\nAt the beginning of your upkeep, you get a poison counter.", { power: 4, toughness: 5, keywords: ["infect"] }),
  ].map((c) => [c.id, c]),
);
