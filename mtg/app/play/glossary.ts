// A plain-English reference for abilities and effects, so a player can see what a card or button really does.
// `helpFor(text)` looks through some rules text (a card, an ability, a stack item) and returns an explanation of each
// special term or effect it finds.

interface Rule {
  /** What to look for in the text (case-insensitive). */
  match: RegExp;
  /** What it means. */
  help: string;
}

const RULES: Rule[] = [
  { match: /\bcycling\b/i, help: "Cycling: pay the cost and discard this card from your hand to draw a card. You can do it any time you have priority, even if you couldn't cast the card." },
  { match: /\bcrew \d+/i, help: "Crew N: tap any untapped creatures you control with total power N or more. This Vehicle then becomes an artifact creature until end of turn (it can attack and block, and be hit by creature spells)." },
  { match: /\bequip\b/i, help: "Equip: pay the cost to attach this Equipment to a creature you control. Only in your main phase with an empty stack. It stays attached (giving its bonus) until you move it; if the creature leaves, the Equipment stays." },
  { match: /\bflashback\b/i, help: "Flashback: you may cast this from your graveyard by paying its flashback cost. It is exiled afterwards (even if it is countered)." },
  { match: /\bprepared\b/i, help: "Prepared: while this creature is prepared, you may cast a copy of the spell printed beside it (paying that spell's cost, at that spell's timing). Doing so unprepares the creature. The copy goes nowhere afterwards." },
  { match: /\braid\b/i, help: "Raid: this ability does something only if you attacked with a creature this turn." },
  { match: /\beerie\b/i, help: "Eerie: triggers whenever an enchantment you control enters (an Aura, or an enchantment creature, counts)." },
  { match: /\bwarp\b/i, help: "Warp: you may cast this from your hand for its warp cost instead. It is exiled at the beginning of the next end step, and you may cast it from exile (for its normal cost) on a later turn." },
  { match: /\boffspring\b/i, help: "Offspring: you may pay the offspring cost as well when you cast this creature. If you do, when it enters you also get a 1/1 token copy of it." },
  { match: /\bblight \d+/i, help: "Blight N: put N -1/-1 counters on a creature you control. As an optional additional cost, it makes the spell do more." },
  { match: /\bexplores?\b/i, help: "Explore: reveal the top card of your library. A land goes into your hand. Otherwise this creature gets a +1/+1 counter, and you choose to keep that card on top or put it into your graveyard." },
  { match: /\binfusion\b/i, help: "Infusion: the extra effect happens only if you gained life this turn." },
  { match: /\bfinality counter\b/i, help: "Finality counter: if this permanent would go to the graveyard from the battlefield, it is exiled instead." },
  { match: /\bto solve\b/i, help: "Case: if the \"To solve\" condition is true at the beginning of your end step, the Case becomes solved for good, and its \"Solved\" ability can be used from then on." },
  { match: /\bward—pay \d+ life\b/i, help: "Ward—Pay N life: when this becomes the target of a spell or ability an opponent controls, that spell or ability is countered unless its controller pays N life." },
  { match: /\bstun counters?\b/i, help: "Stun counter: if the permanent would untap, one stun counter is removed from it instead." },
  { match: /\bkicker\b|\bkicked\b/i, help: "Kicker: when casting, you may pay the extra kicker cost. If you do, the parts that say \"if this was kicked\" happen too." },
  { match: /\bward\b/i, help: "Ward: when an opponent's spell or ability targets this, it is countered unless that player pays the ward cost." },
  { match: /\blandfall\b|whenever a land (you control )?enters/i, help: "Landfall: triggers every time a land enters the battlefield under your control (playing a land counts)." },
  { match: /\bexalted\b/i, help: "Exalted: whenever a creature you control attacks alone, it gets +1/+1 until end of turn. Each instance of exalted you control triggers, so they add up." },
  { match: /\bdelve\b/i, help: "Delve: while casting it, you may exile cards from your graveyard. Each card exiled pays for {1} of its cost." },
  { match: /\btoxic\b/i, help: "Toxic N: whenever this creature deals combat damage to a player, that player also gets N poison counters. Ten poison counters and they lose." },
  { match: /\binfect\b/i, help: "Infect: deals its damage to creatures as -1/-1 counters and to players as poison counters (no life is lost). Ten poison counters and they lose." },
  { match: /\bferocious\b/i, help: "Ferocious: the extra effect happens only if you control a creature with power 4 or greater when it resolves." },
  { match: /\{[wubrg]\/p\}/i, help: "Phyrexian mana ({G/P}, {B/P}...): pay it with mana of that color, or with 2 life instead. You choose when you cast it." },
  { match: /\bprowess\b/i, help: "Prowess: whenever you cast a noncreature spell, this gets +1/+1 until end of turn." },
  { match: /\bregenerate\b/i, help: "Regenerate: creates a shield until end of turn. The next time the creature would be destroyed, it is instead tapped, healed of all damage and removed from combat." },
  { match: /\bscry\b/i, help: "Scry: look at the top cards of your library; you may put any of them on the bottom, the rest stay on top." },
  { match: /\bsurveil\b/i, help: "Surveil: look at the top cards of your library; you may put any of them into your graveyard, the rest stay on top." },
  { match: /\bmills?\b/i, help: "Mill: the top cards of a library are put into its owner's graveyard." },
  { match: /protection from/i, help: "Protection: it can't be damaged, enchanted or equipped, blocked, or targeted by anything with the stated quality (a color, or artifacts)." },
  { match: /\bhexproof\b/i, help: "Hexproof: can't be the target of spells or abilities your opponents control." },
  { match: /\bshroud\b/i, help: "Shroud: can't be the target of any spells or abilities." },
  { match: /enchant (creature|permanent|land)|\baura\b/i, help: "Aura: cast on a target. It stays attached to it and changes it. If the thing it enchants leaves, the Aura goes to the graveyard." },
  { match: /\btreasure\b/i, help: "Treasure: an artifact token. Tap it and sacrifice it to add one mana of any color." },
  { match: /\bfights?\b/i, help: "Fight: the two creatures each deal damage equal to their power to the other." },
  { match: /deals damage equal to its power/i, help: "One-sided fight: the first creature deals damage equal to its power to the target; the target deals none back." },
  { match: /\bdevoid\b/i, help: "Devoid: this card has no color." },
  { match: /\bpartner\b/i, help: "Partner: lets two commanders be used together. It has no effect in this game." },
  { match: /\bchangeling\b/i, help: "Changeling: counts as every creature type." },
  { match: /\b(plains|island|swamp|mountain|forest)walk\b/i, help: "Landwalk: this creature can't be blocked while the defending player controls a land of that type." },
  { match: /can't be blocked except by/i, help: "Evasion: only the kinds of creatures named can block this creature." },
  { match: /can't be blocked by more than one/i, help: "Only one creature can block it." },
  { match: /can't block/i, help: "It can't be declared as a blocker." },
  { match: /\bhaste\b/i, help: "Haste: can attack and use {T} abilities the turn it comes under your control." },
  { match: /gain control of/i, help: "Control change: you control the creature until end of turn, then it goes back to its owner. It can't attack unless it has haste." },
  { match: /counter target spell/i, help: "Counter: the spell is removed from the stack and does nothing; it goes to its owner's graveyard." },
  { match: /return .* to its owner's hand/i, help: "Bounce: the permanent goes back to its owner's hand (tokens just disappear)." },
  { match: /\bdestroy\b/i, help: "Destroy: the permanent goes to the graveyard (not if it is indestructible, or has a regeneration shield)." },
  { match: /\bexile\b/i, help: "Exile: removed from the game; it does not go to the graveyard." },
  { match: /\bsacrifice\b/i, help: "Sacrifice: you put your own permanent into the graveyard. When it is a cost, it is paid up front and can't be responded to." },
  { match: /\+1\/\+1 counter/i, help: "+1/+1 counter: stays on the permanent (it doesn't wear off) and adds +1 power and +1 toughness. A -1/-1 counter cancels one." },
  { match: /-1\/-1 counter/i, help: "-1/-1 counter: stays on the permanent and gives -1/-1. It cancels out a +1/+1 counter if there is one." },
  { match: /until end of turn/i, help: "Until end of turn: the effect lasts through this turn only, and wears off at the start of the next one." },
  { match: /activate only as a sorcery/i, help: "Sorcery speed: can only be used in your own main phase with nothing on the stack." },
  { match: /activate only once each turn/i, help: "Once per turn: after you use it, you can't use it again until next turn." },
  { match: /^\s*\{t\}|\{T\}:/, help: "{T}: tap this permanent as part of the cost. It can't be used if it is already tapped, or (for a creature) if it just arrived." },
  { match: /\bloyalty\b|^[+\-−]\d+:/i, help: "Planeswalker ability: the number is added to (or removed from) its loyalty. You may use only one per planeswalker each turn, in your main phase. At 0 loyalty it dies." },
  { match: /draws? (a|\d+|two|three) cards?/i, help: "Draw: the player takes cards from the top of their library into their hand. Drawing from an empty library loses the game." },
  { match: /gain (\d+|x) life|gains (\d+|x) life/i, help: "Gain life: the player's life total goes up by that much." },
  { match: /deals? (\d+|x) damage/i, help: "Damage: a creature is destroyed when it has damage equal to its toughness. Damage to a player lowers their life; to a planeswalker lowers its loyalty. Damage wears off at end of turn." },
  { match: /\buntap\b/i, help: "Untap: the permanent can be used again (tapped creatures can attack/block again)." },
  { match: /\bchoose (one|a color)\b|choose one/i, help: "Choice: you pick when it is cast or enters (one mode, or a color). The unchosen options do nothing." },
];

/** Plain-English explanations for every special term or effect found in `text`, without repeats. */
export function helpFor(text: string | undefined | null, max = 4): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const rule of RULES) {
    if (rule.match.test(text) && !out.includes(rule.help)) out.push(rule.help);
    if (out.length >= max) break;
  }
  return out;
}

/** Help for one word, such as a keyword chip on a card ("cycling", "ward"). */
export function helpForWord(word: string): string | undefined {
  return RULES.find((r) => r.match.test(word))?.help;
}
