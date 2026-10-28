import type { CardDef } from "../types.js";

// The Jund Sacrifice deck's cards and its sideboard's, with their oracle text, for the tests.

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

export const JUND: Record<string, CardDef> = Object.fromEntries(
  [
    card("cauldron-familiar", "Cauldron Familiar", "creature", "{B}", "Creature — Cat", "When this creature enters, each opponent loses 1 life and you gain 1 life.\nSacrifice a Food: Return this card from your graveyard to the battlefield.", { power: 1, toughness: 1 }),
    card("eyetwitch", "Eyetwitch", "creature", "{B}", "Creature — Eye Bat", "Flying\nWhen this creature dies, learn. (You may reveal a Lesson card you own from outside the game and put it into your hand, or discard a card to draw a card.)", { power: 1, toughness: 1, keywords: ["flying", "learn"] }),
    card("sackville", "The Sackville-Bagginses", "creature", "{1}{B}", "Legendary Creature — Halfling Citizen", "When The Sackville-Bagginses enter, you may sacrifice another creature or artifact. If you do, draw a card and create a Treasure token.\nWhenever you sacrifice a token, target opponent loses 1 life.", { power: 2, toughness: 2 }),
    card("bloodtithe", "Bloodtithe Harvester", "creature", "{B}{R}", "Creature — Vampire", 'When this creature enters, create a Blood token. (It\'s an artifact with "{1}, {T}, Discard a card, Sacrifice this token: Draw a card.")\n{T}, Sacrifice this creature: Target creature gets -X/-X until end of turn, where X is twice the number of Blood tokens you control. Activate only as a sorcery.', { power: 3, toughness: 2 }),
    card("mayhem-devil", "Mayhem Devil", "creature", "{1}{B}{R}", "Creature — Devil", "Whenever a player sacrifices a permanent, this creature deals 1 damage to any target.", { power: 3, toughness: 3 }),
    card("fatal-push", "Fatal Push", "instant", "{B}", "Instant", "Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent left the battlefield under your control this turn.", { keywords: ["revolt"] }),
    card("deadly-dispute", "Deadly Dispute", "instant", "{1}{B}", "Instant", 'As an additional cost to cast this spell, sacrifice an artifact or creature.\nDraw two cards and create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")'),
    card("witchs-oven", "Witch's Oven", "artifact", "{1}", "Artifact", '{T}, Sacrifice a creature: Create a Food token. If the sacrificed creature\'s toughness was 4 or greater, create two Food tokens instead. (They\'re artifacts with "{2}, {T}, Sacrifice this token: You gain 3 life.")'),
    card("scavengers-talent", "Scavenger's Talent", "enchantment", "{B}", "Enchantment — Class", "(Gain the next level as a sorcery to add its ability.)\nWhenever one or more creatures you control die, create a Food token. This ability triggers only once each turn.\n{1}{B}: Level 2\nWhenever you sacrifice a permanent, target player mills two cards.\n{2}{B}: Level 3\nAt the beginning of your end step, you may sacrifice three other nonland permanents. If you do, return a creature card from your graveyard to the battlefield with a finality counter on it."),
    card("fable", "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki", "enchantment", "{2}{R}", "Enchantment — Saga // Enchantment Creature — Goblin Shaman", '(As this Saga enters and after your draw step, add a lore counter.)\nI — Create a 2/2 red Goblin Shaman creature token with "Whenever this token attacks, create a Treasure token."\nII — You may discard up to two cards. If you do, draw that many cards.\nIII — Exile this Saga, then return it to the battlefield transformed under your control.\n//\n{1}, {T}: Create a token that\'s a copy of another target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step.', { keywords: ["transform"] }),
    card("takenuma", "Takenuma, Abandoned Mire", "land", "", "Legendary Land", "{T}: Add {B}.\nChannel — {3}{B}, Discard this card: Mill three cards, then return a creature or planeswalker card from your graveyard to your hand. This ability costs {1} less to activate for each legendary creature you control.", { keywords: ["channel"] }),
    card("pathway", "Blightstep Pathway // Searstep Pathway", "land", "", "Land // Land", "{T}: Add {B}.\n//\n{T}: Add {R}."),
    card("den", "Den of the Bugbear", "land", "", "Land", 'If you control two or more other lands, this land enters tapped.\n{T}: Add {R}.\n{3}{R}: Until end of turn, this land becomes a 3/2 red Goblin creature with "Whenever this creature attacks, create a 1/1 red Goblin creature token that\'s tapped and attacking." It\'s still a land.'),
    card("sokenzan", "Sokenzan, Crucible of Defiance", "land", "", "Legendary Land", "{T}: Add {R}.\nChannel — {3}{R}, Discard this card: Create two 1/1 colorless Spirit creature tokens. They gain haste until end of turn. This ability costs {1} less to activate for each legendary creature you control.", { keywords: ["channel"] }),
    card("thoughtseize", "Thoughtseize", "sorcery", "{B}", "Sorcery", "Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life."),
    card("abandon-attachments", "Abandon Attachments", "instant", "{1}{U/R}", "Instant — Lesson", "You may discard a card. If you do, draw two cards.", { colors: ["U", "R"] }),
    card("go-blank", "Go Blank", "sorcery", "{2}{B}", "Sorcery", "Target player discards two cards. Then exile that player's graveyard."),
    card("ozais-cruelty", "Ozai's Cruelty", "sorcery", "{2}{B}", "Sorcery — Lesson", "Ozai's Cruelty deals 2 damage to target player. That player discards two cards."),
    card("ruinous-waterbending", "Ruinous Waterbending", "sorcery", "{1}{B}{B}", "Sorcery — Lesson", "As an additional cost to cast this spell, you may waterbend {4}. (While paying a waterbend cost, you can tap your artifacts and creatures to help. Each one pays for {1}.)\nAll creatures get -2/-2 until end of turn. If this spell's additional cost was paid, whenever a creature dies this turn, you gain 1 life.", { keywords: ["waterbend"] }),
    card("roku", "The Legend of Roku // Avatar Roku", "enchantment", "{2}{R}{R}", "Enchantment — Saga // Legendary Creature — Avatar", "(As this Saga enters and after your draw step, add a lore counter.)\nI — Exile the top three cards of your library. Until the end of your next turn, you may play those cards.\nII — Add one mana of any color.\nIII — Exile this Saga, then return it to the battlefield transformed under your control.\n//\nFirebending 4 (Whenever this creature attacks, add {R}{R}{R}{R}. This mana lasts until end of combat.)\n{8}: Create a 4/4 red Dragon creature token with flying and firebending 4.", { keywords: ["firebending", "transform"] }),
    card("decorum", "Decorum Dissertation", "sorcery", "{3}{B}{B}", "Sorcery — Lesson", "Target player draws two cards and loses 2 life.\nParadigm (Then exile this spell. After you first resolve a spell with this name, you may cast a copy of it from exile without paying its mana cost at the beginning of each of your first main phases.)", { keywords: ["paradigm"] }),
  ].map((c) => [c.id, c]),
);
