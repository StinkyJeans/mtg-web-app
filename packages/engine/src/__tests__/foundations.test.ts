import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, castCostOf, createGame, getActivatable, getCastable, isSupportedCard, legalTargets, payMana, powerOf, toughnessOf } from "../index.js";
import { kw as kwOf, subtypesOf } from "../core.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The cards of the Foundations Jumpstart packs that needed new rules, with their real text.
const card = (id: string, name: string, type: CardDef["type"], manaCost: string, typeLine: string, text: string, keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id, name, type, cost: (manaCost.match(/\{[^}]+\}/g) ?? []).reduce((n, s) => n + (/^\{\d+\}$/.test(s) ? Number(s.slice(1, -1)) : s === "{X}" ? 0 : 1), 0), manaCost, typeLine, text, keywords, ...extra,
});
const creature = (id: string, power: number, toughness: number, typeLine = "Creature — Bear", text = "", keywords: string[] = []): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{G}", power, toughness, typeLine, text, keywords });
const body = (power: number, toughness: number) => ({ power, toughness });

const FDN: Record<string, CardDef> = {
  smite: card("smite", "Elspeth's Smite", "instant", "{W}", "Instant", "Elspeth's Smite deals 3 damage to target attacking or blocking creature. If that creature would die this turn, exile it instead."),
  jazal: card("jazal", "Jazal Goldmane", "creature", "{2}{W}{W}", "Legendary Creature — Cat Warrior", "First strike (This creature deals combat damage before creatures without first strike.)\n{3}{W}{W}: Attacking creatures you control get +X/+X until end of turn, where X is the number of attacking creatures.", ["first strike"], body(4, 4)),
  vanguard: card("vanguard", "Leonin Vanguard", "creature", "{W}", "Creature — Cat Soldier", "At the beginning of combat on your turn, if you control three or more creatures, this creature gets +1/+1 until end of turn and you gain 1 life.", [], body(1, 1)),
  wings: card("wings", "Broken Wings", "instant", "{2}{G}", "Instant", "Destroy target artifact, enchantment, or creature with flying."),
  elite: card("elite", "Dwynen's Elite", "creature", "{1}{G}", "Creature — Elf Warrior", "When this creature enters, if you control another Elf, create a 1/1 green Elf Warrior creature token.", [], body(2, 2)),
  archdruid: card("archdruid", "Elvish Archdruid", "creature", "{1}{G}{G}", "Creature — Elf Druid", "Other Elf creatures you control get +1/+1.\n{T}: Add {G} for each Elf you control.", [], body(2, 2)),
  regrower: card("regrower", "Elvish Regrower", "creature", "{2}{G}{G}", "Creature — Elf Druid", "When this creature enters, return target permanent card from your graveyard to your hand.", [], body(4, 3)),
  felling: card("felling", "Felling Blow", "sorcery", "{2}{G}", "Sorcery", "Put a +1/+1 counter on target creature you control. Then that creature deals damage equal to its power to target creature an opponent controls."),
  joraga: card("joraga", "Joraga Invocation", "sorcery", "{4}{G}{G}", "Sorcery", "Each creature you control gets +3/+3 until end of turn and must be blocked this turn if able."),
  ancestor: card("ancestor", "Ancestor Dragon", "creature", "{4}{W}{W}", "Creature — Dragon", "Flying\nWhenever one or more creatures you control attack, you gain 1 life for each attacking creature.", ["flying"], body(5, 6)),
  prayer: card("prayer", "Prayer of Binding", "enchantment", "{3}{W}", "Enchantment", "Flash\nWhen this enchantment enters, exile up to one target nonland permanent an opponent controls until this enchantment leaves the battlefield. You gain 2 life.", ["flash"]),
  katana: card("katana", "Quick-Draw Katana", "artifact", "{2}", "Artifact — Equipment", "During your turn, equipped creature gets +2/+0 and has first strike. (It deals combat damage before creatures without first strike.)\nEquip {2} ({2}: Attach to target creature you control. Equip only as a sorcery.)", ["equip"]),
  paladin: card("paladin", "Twinblade Paladin", "creature", "{3}{W}", "Creature — Human Knight", "Whenever you gain life, put a +1/+1 counter on this creature.\nAs long as you have 25 or more life, this creature has double strike. (It deals both first-strike and regular combat damage.)", [], body(3, 3)),
  orb: card("orb", "Carnelian Orb of Dragonkind", "artifact", "{2}{R}", "Artifact", "{T}: Add {R}. If that mana is spent on a Dragon creature spell, it gains haste until end of turn."),
  annihilation: card("annihilation", "Fiery Annihilation", "instant", "{2}{R}", "Instant", "Fiery Annihilation deals 5 damage to target creature. Exile up to one target Equipment attached to that creature. If that creature would die this turn, exile it instead."),
  whelp: card("whelp", "Firespitter Whelp", "creature", "{2}{R}", "Creature — Dragon", "Flying\nWhenever you cast a noncreature or Dragon spell, this creature deals 1 damage to each opponent.", ["flying"], body(2, 2)),
  dragonrider: card("dragonrider", "Kargan Dragonrider", "creature", "{1}{R}", "Creature — Human Warrior", "As long as you control a Dragon, this creature has flying.", [], body(2, 2)),
  dragonfire: card("dragonfire", "Scorching Dragonfire", "instant", "{1}{R}", "Instant", "Scorching Dragonfire deals 3 damage to target creature or planeswalker. If that creature or planeswalker would die this turn, exile it instead."),
  spoils: card("spoils", "Seize the Spoils", "sorcery", "{2}{R}", "Sorcery", "As an additional cost to cast this spell, discard a card.\nDraw two cards and create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")", ["treasure"]),
  piranhas: card("piranhas", "Eaten by Piranhas", "enchantment", "{1}{U}", "Enchantment — Aura", "Flash (You may cast this spell any time you could cast an instant.)\nEnchant creature\nEnchanted creature loses all abilities and is a black Skeleton creature with base power and toughness 1/1. (It loses all other colors, card types, and creature types.)", ["enchant", "flash"]),
  corsair: card("corsair", "Kitesail Corsair", "creature", "{1}{U}", "Creature — Human Pirate", "This creature has flying as long as it's attacking.", [], body(2, 1)),
  cutlass: card("cutlass", "Pirate's Cutlass", "artifact", "{3}", "Artifact — Equipment", "When this Equipment enters, attach it to target Pirate you control.\nEquipped creature gets +2/+1.\nEquip {2} ({2}: Attach to target creature you control. Equip only as a sorcery.)", ["equip"]),
  buccaneer: card("buccaneer", "Skyship Buccaneer", "creature", "{3}{U}{U}", "Creature — Human Pirate", "Flying\nRaid — When this creature enters, if you attacked this turn, draw a card.", ["flying", "raid"], body(4, 3)),
  spy: card("spy", "Storm Fleet Spy", "creature", "{2}{U}", "Creature — Human Pirate", "Raid — When this creature enters, if you attacked this turn, draw a card.", ["raid"], body(2, 2)),
  terror: card("terror", "Tolarian Terror", "creature", "{6}{U}", "Creature — Serpent", "This spell costs {1} less to cast for each instant and sorcery card in your graveyard.\nWard {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)", ["ward"], body(5, 5)),
  upgrade: card("upgrade", "Biogenic Upgrade", "sorcery", "{4}{G}{G}", "Sorcery", "Distribute three +1/+1 counters among one, two, or three target creatures, then double the number of +1/+1 counters on each of those creatures.", ["double"]),
  bite: card("bite", "Bite Down", "instant", "{1}{G}", "Instant", "Target creature you control deals damage equal to its power to target creature or planeswalker you don't control."),
  librarian: card("librarian", "Mild-Mannered Librarian", "creature", "{G}", "Creature — Human", "{3}{G}: This creature becomes a Werewolf. Put two +1/+1 counters on it and you draw a card. Activate only once.", [], body(1, 1)),
  horizons: card("horizons", "New Horizons", "enchantment", "{2}{G}", "Enchantment — Aura", "Enchant land\nWhen this Aura enters, put a +1/+1 counter on target creature you control.\nEnchanted land has \"{T}: Add two mana of any one color.\"", ["enchant"]),
  scourge: card("scourge", "Wildwood Scourge", "creature", "{X}{G}", "Creature — Hydra", "This creature enters with X +1/+1 counters on it.\nWhenever one or more +1/+1 counters are put on another non-Hydra creature you control, put a +1/+1 counter on this creature.", [], body(0, 0)),
  recruitment: card("recruitment", "Cemetery Recruitment", "sorcery", "{1}{B}", "Sorcery", "Return target creature card from your graveyard to your hand. If it's a Zombie card, draw a card."),
  crow: card("crow", "Crow of Dark Tidings", "creature", "{2}{B}", "Creature — Zombie Bird", "Flying\nWhen this creature enters or dies, mill two cards. (Put the top two cards of your library into your graveyard.)", ["flying", "mill"], body(2, 1)),
  plot: card("plot", "Deadly Plot", "instant", "{3}{B}", "Instant", "Choose one —\n• Destroy target creature or planeswalker.\n• Return target Zombie creature card from your graveyard to the battlefield tapped."),
  baron: card("baron", "Death Baron", "creature", "{1}{B}{B}", "Creature — Zombie Wizard", "Skeletons you control and other Zombies you control get +1/+1 and have deathtouch. (Any amount of damage they deal to a creature is enough to destroy it.)", [], body(2, 2)),
  eaten: card("eaten", "Eaten Alive", "sorcery", "{B}", "Sorcery", "As an additional cost to cast this spell, sacrifice a creature or pay {3}{B}.\nExile target creature or planeswalker."),
  skeleton: card("skeleton", "Reassembling Skeleton", "creature", "{1}{B}", "Creature — Skeleton Warrior", "{1}{B}: Return this card from your graveyard to the battlefield tapped.", [], body(1, 1)),
  malice: card("malice", "Undying Malice", "instant", "{B}", "Instant", "Until end of turn, target creature gains \"When this creature dies, return it to the battlefield tapped under its owner's control with a +1/+1 counter on it.\""),
  collector: card("collector", "Bloodtithe Collector", "creature", "{4}{B}", "Creature — Vampire Noble", "Flying\nWhen this creature enters, if an opponent lost life this turn, each opponent discards a card.", ["flying"], body(3, 4)),
  troublemakers: card("troublemakers", "Crossway Troublemakers", "creature", "{5}{B}", "Creature — Vampire", "Attacking Vampires you control have deathtouch and lifelink. (Any amount of damage they deal to a creature is enough to destroy it. Damage dealt by those creatures also causes their controller to gain that much life.)\nWhenever a Vampire you control dies, you may pay 2 life. If you do, draw a card.", [], body(5, 5)),
  bloodthief: card("bloodthief", "Stromkirk Bloodthief", "creature", "{2}{B}", "Creature — Vampire Rogue", "At the beginning of your end step, if an opponent lost life this turn, put a +1/+1 counter on target Vampire you control.", [], body(2, 2)),
  bloodwitch: card("bloodwitch", "Vengeful Bloodwitch", "creature", "{1}{B}", "Creature — Vampire Warlock", "Whenever this creature or another creature you control dies, target opponent loses 1 life and you gain 1 life.", [], body(1, 1)),
};

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  ...FDN,
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" },
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 4, 4),
  elf: creature("elf", 1, 1, "Creature — Elf Warrior"),
  zombie: creature("zombie", 2, 2, "Creature — Zombie"),
  vampire: creature("vampire", 2, 2, "Creature — Vampire"),
  bird: creature("bird", 1, 1, "Creature — Bird", "Flying", ["flying"]),
  dragon: { ...creature("dragon", 4, 4, "Creature — Dragon", "Flying", ["flying"]), manaCost: "{3}{R}", cost: 4 },
  lion: creature("lion", 2, 2, "Creature — Cat", "Vigilance", ["vigilance"]),
  shock: card("shock", "Shock", "instant", "{R}", "Instant", "Shock deals 2 damage to any target."),
  pacifism: card("pacifism", "Pacifism", "enchantment", "{1}{W}", "Enchantment — Aura", "Enchant creature\nEnchanted creature can't attack or block.", ["enchant"]),
  murder: card("murder", "Murder", "instant", "{B}", "Instant", "Destroy target creature."),
  disenchant: card("disenchant", "Disenchant", "instant", "{W}", "Instant", "Destroy target artifact or enchantment."),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], land = "mountain", lands = 7): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: lands }, (_, i) => perm(`l${i}`, land)), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 3 }, (_, i) => perm(`k${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
/** Lands that make every color: a test can cast anything. */
const rainbow = (g: GameState) => {
  g.cards.mountain = { ...g.cards.mountain, text: "{T}: Add {W}, {U}, {B}, {R}, or {G}." };
  return g;
};
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => ({ kind: "permanent" as const, iid });
const inYard = (iid: string) => ({ kind: "card" as const, iid });
const none = { kind: "none" as const };
const settle = (g: GameState) => {
  while (g.priority && !g.pendingChoice && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
type Target = ReturnType<typeof on> | ReturnType<typeof inYard> | typeof none;
const cast = (g: GameState, iid: string, targets: Target[] = [], extra: Partial<Extract<Action, { type: "castSpell" }>> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets, ...extra }));
const answer = (g: GameState, targets: Target[]) => settle(act(g, "p1", { type: "chooseTargets", targets }));
const attack = (g: GameState, attackers: string[], blocks: { blocker: string; attacker: string }[] = []) => {
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers }));
  if (blocks.length === 0 && g.phase !== "blockers") return g; // nothing could block
  return settle(act(g, "p2", { type: "declareBlockers", blocks }));
};

test("every Foundations card that needed new rules is understood", () => {
  for (const def of Object.values(FDN)) assert.equal(isSupportedCard(def), true, def.name);
});

test("exile it instead: Scorching Dragonfire and Elspeth's Smite exile what they kill, and its dies triggers don't happen", () => {
  let g = rainbow(setup(["dragonfire"], [], ["crow"]));
  g = cast(g, "h0", [on("t0")]);
  assert.equal(find(g, "t0"), undefined);
  assert.ok(g.players.p2.exile.some((c) => c.iid === "t0"));
  assert.equal(g.players.p2.graveyard.length, 0); // no "dies, mill two cards" either
  // the Smite only targets an attacking or blocking creature
  g = rainbow(setup(["smite"], [], ["bear"]));
  assert.equal(getCastable(g, "p1").some((c) => c.iid === "h0"), false);
  // damage that doesn't kill: it stays, and the replacement ends with the turn
  g = rainbow(setup(["dragonfire"], [], ["ogre"]));
  g = cast(g, "h0", [on("t0")]);
  assert.equal(find(g, "t0")!.exileOnDeath, true);
});

test("Fiery Annihilation exiles an Equipment attached to that creature, and only one attached to it", () => {
  let g = rainbow(setup(["annihilation"], [], ["ogre", "katana", "bear", "katana"]));
  find(g, "t1")!.attachedTo = "t0";
  find(g, "t3")!.attachedTo = "t2";
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0"), on("t3")] }).ok, false);
  g = cast(g, "h0", [on("t0"), on("t1")]);
  assert.ok(g.players.p2.exile.some((c) => c.iid === "t0"));
  assert.ok(g.players.p2.exile.some((c) => c.iid === "t1"));
  // no Equipment: "up to one" can be nothing
  g = rainbow(setup(["annihilation"], [], ["bear"]));
  g = cast(g, "h0", [on("t0"), none]);
  assert.ok(g.players.p2.exile.some((c) => c.iid === "t0"));
});

test("Bite Down and Felling Blow: only a creature or planeswalker you don't control is bitten", () => {
  let g = rainbow(setup(["bite"], ["ogre", "bear"], ["bear"]));
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("m0"), on("m1")] }).ok, false);
  g = cast(g, "h0", [on("m0"), on("t0")]);
  assert.equal(find(g, "t0"), undefined);
  g = rainbow(setup(["felling"], ["bear"], ["ogre"]));
  g = cast(g, "h0", [on("m0"), on("t0")]);
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(find(g, "t0")!.damage, 3); // the counter came first
});

test("Broken Wings: an artifact, an enchantment, or a creature with flying, never a creature without it", () => {
  const g = rainbow(setup(["wings"], [], ["bear", "bird", "pacifism", "katana"]));
  const spec = g.cards.wings && getCastable(g, "p1").find((c) => c.iid === "h0")!.specs[0];
  const legal = legalTargets(g, spec!, "p1").map((t) => (t.kind === "permanent" ? t.iid : ""));
  assert.deepEqual(legal.filter((iid) => iid.startsWith("t")).sort(), ["t1", "t2", "t3"]);
});

test("graveyard cards: Cemetery Recruitment draws for a Zombie, Deadly Plot returns only a Zombie, Elvish Regrower takes any permanent card", () => {
  let g = rainbow(setup(["recruitment", "recruitment"]));
  g.players.p1.graveyard = [{ iid: "y0", defId: "zombie", owner: "p1" }, { iid: "y1", defId: "bear", owner: "p1" }, { iid: "y2", defId: "shock", owner: "p1" }, { iid: "y3", defId: "forest", owner: "p1" }];
  const hand = g.players.p1.hand.length;
  g = cast(g, "h0", [inYard("y0")]);
  assert.equal(g.players.p1.hand.length, hand - 1 + 2); // the Zombie and a card
  g = cast(g, "h1", [inYard("y1")]);
  assert.equal(g.players.p1.hand.length, hand - 2 + 3); // just the Bear
  g = rainbow(setup(["plot"]));
  g.players.p1.graveyard = [{ iid: "y0", defId: "zombie", owner: "p1" }, { iid: "y1", defId: "bear", owner: "p1" }];
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [inYard("y1")], modes: [1] }).ok, false);
  g = cast(g, "h0", [inYard("y0")], { modes: [1] });
  assert.equal(find(g, "y0")!.tapped, true);
  g = rainbow(setup(["regrower"]));
  g.players.p1.graveyard = [{ iid: "y0", defId: "shock", owner: "p1" }, { iid: "y1", defId: "forest", owner: "p1" }, { iid: "y2", defId: "pacifism", owner: "p1" }];
  g = cast(g, "h0");
  assert.ok(g.pendingChoice);
  assert.equal(applyAction(g, "p1", { type: "chooseTargets", targets: [inYard("y0")] }).ok, false);
  g = answer(g, [inYard("y1")]);
  assert.ok(g.players.p1.hand.some((c) => c.iid === "y1"));
});

test("raid: Storm Fleet Spy draws only after you attacked this turn", () => {
  let g = rainbow(setup(["spy", "buccaneer"], ["lion"], [], "mountain", 9));
  const hand = g.players.p1.hand.length;
  g = cast(g, "h0");
  assert.equal(g.players.p1.hand.length, hand - 1);
  g = attack(g, ["m0"]);
  g.phase = "main2";
  g = cast(g, "h1");
  assert.equal(g.players.p1.hand.length, hand - 2 + 1);
});

test("an opponent lost life this turn: Bloodtithe Collector and Stromkirk Bloodthief", () => {
  let g = rainbow(setup(["collector", "shock", "collector"], [], [], "mountain", 11));
  g.players.p2.hand = [{ iid: "o0", defId: "bear", owner: "p2" }, { iid: "o1", defId: "bear", owner: "p2" }];
  g = cast(g, "h0");
  assert.equal(g.players.p2.hand.length, 2);
  g = cast(g, "h1", [{ kind: "player", id: "p2" } as unknown as Target]);
  g = cast(g, "h2");
  if (g.pendingPick?.player === "p2") g = settle(act(g, "p2", { type: "pick", iid: "o0" }));
  assert.equal(g.players.p2.hand.length, 1);
  // the end step trigger
  g = rainbow(setup([], ["bloodthief"]));
  g.players.p2.lifeLostThisTurn = 1;
  g.phase = "main2";
  g = act(g, "p1", { type: "passPhase" });
  if (g.pendingChoice) g = answer(g, [on("m0")]);
  g = settle(g);
  assert.equal(find(g, "m0")!.counters, 1);
});

test("intervening ifs about your creatures: Dwynen's Elite needs another Elf, Leonin Vanguard three creatures", () => {
  let g = rainbow(setup(["elite", "elite"]));
  g = cast(g, "h0");
  assert.equal(g.players.p1.battlefield.length, 8);
  g = cast(g, "h1");
  assert.equal(g.players.p1.battlefield.length, 10); // the second Elite and an Elf Warrior token
  g = setup([], ["vanguard", "bear"]);
  g = settle(act(g, "p1", { type: "passPhase" }));
  assert.equal(powerOf(g, find(g, "m0")!), 1);
  g = setup([], ["vanguard", "bear", "bear"]);
  const life = g.players.p1.life;
  g = settle(act(g, "p1", { type: "passPhase" }));
  assert.equal(powerOf(g, find(g, "m0")!), 2);
  assert.equal(g.players.p1.life, life + 1);
});

test("Crow of Dark Tidings mills two when it enters and two when it dies", () => {
  let g = rainbow(setup(["crow", "murder"]));
  g = cast(g, "h0");
  assert.equal(g.players.p1.graveyard.length, 2);
  g = cast(g, "h1", [on("h0")]);
  assert.equal(g.players.p1.graveyard.filter((c) => c.defId === "mountain").length, 4);
});

test("Crossway Troublemakers: attacking Vampires have deathtouch and lifelink, and a Vampire dying offers a card for 2 life", () => {
  let g = rainbow(setup(["murder"], ["troublemakers", "vampire", "bear"]));
  assert.equal(kwOf(g, find(g, "m1")!, "deathtouch"), false);
  g.combat = { attackers: [{ attacker: "m1", blockers: [] }, { attacker: "m2", blockers: [] }] };
  assert.equal(kwOf(g, find(g, "m1")!, "deathtouch"), true);
  assert.equal(kwOf(g, find(g, "m1")!, "lifelink"), true);
  assert.equal(kwOf(g, find(g, "m2")!, "lifelink"), false);
  g.combat = null;
  const [life, hand] = [g.players.p1.life, g.players.p1.hand.length];
  g = cast(g, "h0", [on("m1")]);
  assert.equal(g.pendingPick?.kind, "mayPay");
  g = settle(act(g, "p1", { type: "pick", iid: "pay" }));
  assert.equal(g.players.p1.life, life - 2);
  assert.equal(g.players.p1.hand.length, hand - 1 + 1);
});

test("Vengeful Bloodwitch drains when it dies and when another creature of yours dies", () => {
  let g = rainbow(setup(["murder", "murder"], ["bloodwitch", "bear"]));
  const life = g.players.p2.life;
  g = cast(g, "h0", [on("m1")]);
  if (g.pendingChoice) g = answer(g, [{ kind: "player", id: "p2" } as unknown as Target]);
  assert.equal(g.players.p2.life, life - 1);
  g = cast(g, "h1", [on("m0")]);
  if (g.pendingChoice) g = answer(g, [{ kind: "player", id: "p2" } as unknown as Target]);
  assert.equal(g.players.p2.life, life - 2);
});

test("Death Baron: Skeletons and other Zombies get +1/+1 and deathtouch, the Baron itself doesn't", () => {
  const g = setup([], ["baron", "zombie", "skeleton", "bear"]);
  assert.equal(powerOf(g, find(g, "m0")!), 2);
  assert.equal(powerOf(g, find(g, "m1")!), 3);
  assert.equal(kwOf(g, find(g, "m2")!, "deathtouch"), true);
  assert.equal(powerOf(g, find(g, "m3")!), 2);
});

test("Eaten Alive: sacrifice a creature, or pay {3}{B} instead", () => {
  let g = rainbow(setup(["eaten"], ["bear"], ["ogre"]));
  const c = getCastable(g, "p1").find((x) => x.iid === "h0")!;
  assert.deepEqual(c.sacrifice, ["m0"]);
  assert.equal(c.orPay, "{3}{B}");
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [on("t0")] }).ok, false);
  const paid = cast(g, "h0", [on("t0")], { sacrifice: "pay" });
  assert.ok(find(paid, "m0"));
  assert.equal(paid.players.p1.battlefield.filter((p) => p.tapped).length, 5);
  g = cast(g, "h0", [on("t0")], { sacrifice: "m0" });
  assert.equal(find(g, "m0"), undefined);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 1);
  // with no creature, only paying is offered
  g = rainbow(setup(["eaten"], [], ["ogre"]));
  assert.deepEqual(getCastable(g, "p1").find((x) => x.iid === "h0")!.sacrifice, []);
});

test("Seize the Spoils: a card is discarded as it is cast, then two are drawn and a Treasure made", () => {
  let g = rainbow(setup(["spoils"]));
  assert.equal(getCastable(g, "p1").some((c) => c.iid === "h0"), false); // nothing to discard
  g = rainbow(setup(["spoils", "bear"]));
  assert.deepEqual(getCastable(g, "p1").find((c) => c.iid === "h0")!.discard, ["h1"]);
  g = cast(g, "h0", [], { sacrifice: "h1" });
  assert.ok(g.players.p1.graveyard.some((c) => c.iid === "h1"));
  assert.equal(g.players.p1.hand.length, 2);
  assert.ok(g.players.p1.battlefield.some((p) => g.cards[p.card.defId].name === "Treasure"));
});

test("Eaten by Piranhas: the creature is a black 1/1 Skeleton with no abilities until the Aura is gone", () => {
  let g = rainbow(setup(["piranhas", "disenchant"], [], ["whelp"]));
  g = cast(g, "h0", [on("t0")]);
  const whelp = find(g, "t0")!;
  assert.equal(powerOf(g, whelp), 1);
  assert.equal(kwOf(g, whelp, "flying"), false);
  assert.deepEqual(subtypesOf(g, whelp), ["skeleton"]);
  assert.deepEqual(g.cards[whelp.card.defId].colors, ["B"]);
  g = cast(g, "h1", [on("h0")]);
  assert.equal(powerOf(g, find(g, "t0")!), 2);
  assert.equal(kwOf(g, find(g, "t0")!, "flying"), true);
  assert.equal(find(g, "t0")!.card.defId, "whelp");
});

test("mana: Elvish Archdruid makes {G} for each Elf, New Horizons two of one color, the Orb gives a Dragon haste", () => {
  let g = setup([], ["archdruid", "elf", "elf"], [], "mountain", 0);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { G: 3 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { G: 4 } }).ok, false);
  assert.equal(powerOf(g, find(g, "m1")!), 2); // and the other Elves are bigger
  g = setup([], ["horizons"], [], "forest", 1);
  find(g, "m0")!.attachedTo = "l0";
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 2 } }).ok, true);
  assert.equal(payMana(g, "p1", { generic: 0, colored: { U: 1, B: 1 } }).ok, false);
  g = setup(["dragon", "bear"], ["orb"], [], "mountain", 3);
  g = cast(g, "h0");
  assert.equal(find(g, "h0")!.tempKeywords?.includes("haste"), true);
  g = setup(["bear"], ["orb"], [], "forest", 0);
  g.cards.bear = { ...g.cards.bear, manaCost: "{R}" };
  g = cast(g, "h0");
  assert.equal(kwOf(g, find(g, "h0")!, "haste"), false);
});

test("Firespitter Whelp: noncreature spells and Dragon spells ping, other creature spells don't", () => {
  let g = rainbow(setup(["shock", "dragon", "bear"], ["whelp"]));
  const life = g.players.p2.life;
  g = cast(g, "h0", [{ kind: "player", id: "p2" } as unknown as Target]);
  assert.equal(g.players.p2.life, life - 3);
  g = cast(g, "h1");
  assert.equal(g.players.p2.life, life - 4);
  g = cast(g, "h2");
  assert.equal(g.players.p2.life, life - 4);
});

test("statics with conditions: Kargan Dragonrider, Kitesail Corsair, Twinblade Paladin, Quick-Draw Katana", () => {
  let g = setup([], ["dragonrider", "corsair", "paladin", "katana", "bear"]);
  assert.equal(kwOf(g, find(g, "m0")!, "flying"), false);
  g.players.p1.battlefield.push(perm("m9", "dragon"));
  assert.equal(kwOf(g, find(g, "m0")!, "flying"), true);
  assert.equal(kwOf(g, find(g, "m1")!, "flying"), false);
  g.combat = { attackers: [{ attacker: "m1", blockers: [] }] };
  assert.equal(kwOf(g, find(g, "m1")!, "flying"), true);
  assert.equal(kwOf(g, find(g, "m2")!, "double strike"), false);
  g.players.p1.life = 25;
  assert.equal(kwOf(g, find(g, "m2")!, "double strike"), true);
  find(g, "m3")!.attachedTo = "m4";
  assert.equal(powerOf(g, find(g, "m4")!), 4);
  assert.equal(kwOf(g, find(g, "m4")!, "first strike"), true);
  g.active = "p2";
  assert.equal(powerOf(g, find(g, "m4")!), 2);
});

test("Mild-Mannered Librarian becomes a Werewolf once, with two counters and a card", () => {
  let g = rainbow(setup([], ["librarian"]));
  const hand = g.players.p1.hand.length;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }));
  const lib = find(g, "m0")!;
  assert.deepEqual(subtypesOf(g, lib), ["werewolf"]);
  assert.equal(lib.counters, 2);
  assert.equal(g.players.p1.hand.length, hand + 1);
  assert.equal(getActivatable(g, "p1").some((a) => a.iid === "m0"), false);
  assert.equal(applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }).ok, false);
});

test("Pirate's Cutlass attaches to a Pirate as it enters; Prayer of Binding may exile nothing and still gains 2 life", () => {
  let g = rainbow(setup(["cutlass"], ["corsair", "bear", "spy"]));
  g = cast(g, "h0");
  assert.equal(applyAction(g, "p1", { type: "chooseTargets", targets: [on("m1")] }).ok, false); // not a Pirate
  g = answer(g, [on("m0")]);
  assert.equal(find(g, "h0")!.attachedTo, "m0");
  assert.equal(powerOf(g, find(g, "m0")!), 4);
  g = rainbow(setup(["prayer"], [], ["ogre"]));
  const life = g.players.p1.life;
  g = cast(g, "h0");
  g = answer(g, [none]);
  assert.equal(g.players.p1.life, life + 2);
  assert.ok(find(g, "t0"));
});

test("Reassembling Skeleton comes back from the graveyard tapped; Undying Malice brings a creature back with a counter", () => {
  let g = rainbow(setup([]));
  g.players.p1.graveyard = [{ iid: "y0", defId: "skeleton", owner: "p1" }];
  assert.ok(getActivatable(g, "p1").some((a) => a.iid === "y0"));
  g = settle(act(g, "p1", { type: "activateAbility", iid: "y0", index: 0 }));
  assert.equal(find(g, "y0")!.tapped, true);
  g = rainbow(setup(["malice", "murder"], ["bear"]));
  g = cast(g, "h0", [on("m0")]);
  g = cast(g, "h1", [on("m0")]);
  const back = find(g, "m0")!;
  assert.equal(back.tapped, true);
  assert.equal(back.counters, 1);
  assert.equal(back.diesReturn, undefined); // a new object: the ability is gone
});

test("Tolarian Terror costs {1} less for each instant and sorcery card in your graveyard", () => {
  const g = rainbow(setup(["terror"]));
  g.players.p1.graveyard = [{ iid: "y0", defId: "shock", owner: "p1" }, { iid: "y1", defId: "murder", owner: "p1" }, { iid: "y2", defId: "bear", owner: "p1" }];
  assert.equal(castCostOf(g, "p1", g.cards.terror)!.generic, 4);
});

test("Biogenic Upgrade splits three counters by the targets chosen, then doubles; Wildwood Scourge grows with them", () => {
  let g = rainbow(setup(["upgrade"], ["bear", "ogre", "scourge"]));
  find(g, "m2")!.counters = 1;
  g = cast(g, "h0", [on("m0"), on("m1"), none]);
  assert.equal(find(g, "m0")!.counters, 4);
  assert.equal(find(g, "m1")!.counters, 2);
  assert.equal(find(g, "m2")!.counters, 1 + 4); // one for each time counters were put on another creature
  g = rainbow(setup(["upgrade"], ["bear", "scourge"]));
  find(g, "m1")!.counters = 1;
  g = cast(g, "h0", [on("m1"), none, none]);
  assert.equal(find(g, "m1")!.counters, (1 + 3) * 2); // counters on itself don't grow it further
});

test("Joraga Invocation: each creature must be blocked if able", () => {
  let g = rainbow(setup(["joraga"], ["bear", "lion"], ["ogre"]));
  g = cast(g, "h0");
  assert.equal(powerOf(g, find(g, "m0")!), 5);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1"] }));
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [] }).ok, false);
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m1" }] }).ok, true);
});

test("Jazal Goldmane and Ancestor Dragon count the attackers", () => {
  let g = rainbow(setup([], ["jazal", "ancestor", "bear"]));
  const life = g.players.p1.life;
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0", "m1", "m2"] });
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }));
  assert.equal(g.players.p1.life, life + 3);
  assert.equal(powerOf(g, find(g, "m2")!), 5);
  assert.equal(toughnessOf(g, find(g, "m2")!), 5);
});
