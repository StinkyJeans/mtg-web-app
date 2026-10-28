import { test } from "node:test";
import assert from "node:assert/strict";
import { getActivatable, getCastable, getLegalActions, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { GameState } from "../index.js";
import { act, choose, fails, find, hand, library, named, on, plain, settle, setup, toNextTurn, yard } from "./marvelKit.js";
import type { Setup } from "./marvelKit.js";
import { JUND } from "./jundCards.js";

// The Jund Sacrifice deck (and its sideboard), card by card.

const OGRE = plain("ogre", "Ogre", "{3}{R}", 4, 4, "", "Creature — Ogre", ["R"]);
const game = (s: Setup = {}) => setup({ ...s, extra: { ...JUND, ogre: OGRE, ...(s.extra ?? {}) } });
const cast = (g: GameState, iid: string, more: Record<string, unknown> = {}) => settle(act(g, "p1", { type: "castSpell", iid, targets: [], ...more }));
const pick = (g: GameState, iid?: string) => settle(act(g, g.pendingPick!.player, { type: "pick", ...(iid ? { iid } : {}) }));
const abilityOf = (g: GameState, iid: string, text: RegExp) => getActivatable(g, "p1").find((a) => a.iid === iid && new RegExp(text.source, "i").test(a.text));
const use = (g: GameState, iid: string, text: RegExp, more: Record<string, unknown> = {}) => {
  const a = abilityOf(g, iid, text);
  assert.ok(a, `no usable ability ${text} on ${iid}`);
  return settle(act(g, "p1", { type: "activateAbility", iid, index: a.index, targets: [], ...more }));
};
const life = (g: GameState) => [g.players.p1.life, g.players.p2.life];

test("every card of the deck and its sideboard is playable", () => {
  for (const def of Object.values(JUND)) assert.ok(isSupportedCard(def), def.name);
});

test("Fatal Push: mana value 2 or less; 4 or less once a permanent of yours left the battlefield this turn", () => {
  let g = game({ hand: ["fatal-push", "fatal-push"], mine: ["witchs-oven", "bear"], theirs: ["bear", "ogre"] });
  g = cast(g, "h0", { targets: on("t1") });
  assert.ok(find(g, "t1"), "the Ogre (mana value 4) survives without revolt");
  g = use(g, "m0", /Sacrifice a creature/, { payWith: "m1" });
  assert.equal(g.players.p1.leftThisTurn, 1);
  g = cast(g, "h1", { targets: on("t1") });
  assert.equal(find(g, "t1"), undefined, "revolt: mana value 4 or less");
  g = toNextTurn(g);
  assert.equal(g.players.p1.leftThisTurn, undefined, "revolt starts over each turn");
});

test("Deadly Dispute: sacrifice an artifact or a creature, draw two and make a Treasure", () => {
  let g = game({ hand: ["deadly-dispute"], mine: ["witchs-oven"] });
  const option = getCastable(g, "p1").find((c) => c.iid === "h0");
  assert.deepEqual(option?.sacrifice, ["m0"], "the Oven (an artifact) can pay");
  g = cast(g, "h0", { sacrifice: "m0" });
  assert.equal(find(g, "m0"), undefined);
  assert.equal(hand(g).length, 2);
  assert.equal(named(g, "p1", "Treasure").length, 1);
});

test("Witch's Oven: one Food, or two for a creature with toughness 4 or greater", () => {
  let g = game({ mine: ["witchs-oven", "witchs-oven", "elf", "ogre"] });
  g = use(g, "m0", /Sacrifice a creature/, { payWith: "m2" });
  assert.equal(named(g, "p1", "Food").length, 1);
  g = use(g, "m1", /Sacrifice a creature/, { payWith: "m3" });
  assert.equal(named(g, "p1", "Food").length, 3);
});

test("Cauldron Familiar: comes back from the graveyard for a Food, and drains 1 as it enters", () => {
  let g = game({ yard: ["cauldron-familiar"], mine: ["witchs-oven", "elf"] });
  assert.equal(abilityOf(g, "y0", /Sacrifice a Food/), undefined, "no Food yet");
  g = use(g, "m0", /Sacrifice a creature/, { payWith: "m1" });
  const food = named(g, "p1", "Food")[0].card.iid;
  g = use(g, "y0", /Sacrifice a Food/, { payWith: food });
  assert.equal(named(g, "p1", "Cauldron Familiar").length, 1);
  assert.equal(named(g, "p1", "Food").length, 0);
  assert.deepEqual(life(g), [21, 19]);
});

test("Mayhem Devil: whenever any player sacrifices a permanent, 1 damage to any target", () => {
  let g = game({ mine: ["mayhem-devil", "witchs-oven", "elf"] });
  g = act(g, "p1", { type: "activateAbility", iid: "m1", index: 0, targets: [], payWith: "m2" });
  assert.ok(g.pendingChoice, "the Devil's trigger waits for its target");
  g = choose(g, "p1", [{ kind: "player", id: "p2" }]);
  assert.equal(g.players.p2.life, 19);
});

test("The Sackville-Bagginses: sacrifice another creature or artifact to draw and make a Treasure; a sacrificed token drains 1", () => {
  let g = game({ hand: ["sackville", "deadly-dispute"], mine: ["witchs-oven", "elf"] });
  g = cast(g, "h0");
  assert.equal(g.pendingPick?.kind, "mayCost");
  assert.deepEqual([...g.pendingPick!.options].sort(), ["m0", "m1"], "the Oven or the Elf, not itself");
  g = pick(g, "m1");
  assert.equal(hand(g).length, 2);
  assert.equal(named(g, "p1", "Treasure").length, 1);
  assert.equal(g.players.p2.life, 20, "the Elf wasn't a token");
  g = cast(g, "h1", { sacrifice: named(g, "p1", "Treasure")[0].card.iid });
  assert.equal(g.players.p2.life, 19, "the Treasure was a token (the only opponent is the target)");
});

test("Bloodtithe Harvester: a Blood token, then -2/-2 for each Blood token", () => {
  let g = game({ hand: ["bloodtithe"], theirs: ["ogre"] });
  g = cast(g, "h0");
  assert.equal(named(g, "p1", "Blood").length, 1);
  const harvester = named(g, "p1", "Bloodtithe Harvester")[0];
  harvester.summoningSick = false;
  g = use(g, harvester.card.iid, /Target creature gets/, { targets: on("t0") });
  const ogre = find(g, "t0")!;
  assert.equal(toughnessOf(g, ogre), 2, "-2/-2 for the one Blood token");
  const blood = named(g, "p1", "Blood")[0].card.iid;
  g.players.p1.hand.push({ iid: "x1", defId: "plains", owner: "p1" });
  g = use(g, blood, /Draw a card/, { payWith: "x1" });
  assert.equal(named(g, "p1", "Blood").length, 0);
  assert.deepEqual(hand(g), ["Plains"]);
});

test("Scavenger's Talent: a Food when creatures die, then levels 2 and 3", () => {
  let g = game({ mine: ["scavengers-talent", "witchs-oven", "witchs-oven", "elf", "bear", "giant"], yard: ["ogre"] });
  g = use(g, "m1", /Sacrifice a creature/, { payWith: "m3" });
  assert.equal(named(g, "p1", "Food").length, 2, "the Oven's Food and the Talent's");
  g = use(g, "m2", /Sacrifice a creature/, { payWith: "m4" });
  assert.equal(named(g, "p1", "Food").length, 3, "only once each turn");
  assert.equal(abilityOf(g, "m0", /Level 3/), undefined, "level 3 waits for level 2");
  g = use(g, "m0", /Level 2/);
  assert.equal(find(g, "m0")!.classLevel, 2);
  const food = named(g, "p1", "Food")[0].card.iid;
  g = use(g, food, /gain 3 life/);
  assert.ok(g.pendingChoice, "level 2: sacrificing a permanent makes a player mill two");
  g = choose(g, "p1", [{ kind: "player", id: "p1" }]);
  assert.equal(library(g).length, 3);
  g = use(g, "m0", /Level 3/);
  while (g.phase !== "end") g = act(g, "p1", { type: "passPhase" });
  g = settle(g);
  assert.equal(g.pendingPick?.kind, "mayCost");
  for (const iid of g.pendingPick!.options.slice(0, 3)) g = pick(g, iid);
  if (g.pendingPick?.kind === "fromYard") g = pick(g, g.pendingPick.options.find((o) => g.players.p1.graveyard.find((c) => c.iid === o)?.defId === "ogre"));
  const ogre = named(g, "p1", "Ogre")[0];
  assert.ok(ogre, "level 3: a creature back from the graveyard");
  assert.equal(ogre.finality, true);
});

test("Fable of the Mirror-Breaker: a Goblin that makes Treasure, a rummage, then Reflection of Kiki-Jiki", () => {
  let g = game({ hand: ["fable", "plains", "plains"], mine: ["ogre"], library: Array(8).fill("swamp") });
  g = cast(g, "h0");
  const goblin = named(g, "p1", "Goblin Shaman")[0];
  assert.ok(goblin);
  assert.equal(powerOf(g, goblin), 2);
  g = settle(toNextTurn(g));
  assert.equal(g.pendingPick?.kind, "discardDraw", "chapter II");
  const before = hand(g).length;
  g = pick(g, g.pendingPick!.options[0]);
  g = pick(g, g.pendingPick!.options[0]);
  assert.equal(hand(g).length, before, "two discarded, two drawn");
  assert.equal(yard(g).length, 2);
  g = settle(toNextTurn(g));
  const kiki = named(g, "p1", "Reflection of Kiki-Jiki")[0];
  assert.ok(kiki, "chapter III: it returns transformed");
  assert.equal(named(g, "p1", "Fable of the Mirror-Breaker").length, 0);
  kiki.summoningSick = false;
  g = use(g, kiki.card.iid, /copy/, { targets: on("m0") });
  const copies = named(g, "p1", "Ogre").filter((p) => p.card.iid !== "m0");
  assert.equal(copies.length, 1, "a token copy of the Ogre");
  assert.ok(getLegalActions(g, "p1").some((a) => a.type === "passPhase"));
  while (g.phase !== "end") g = act(g, "p1", { type: "passPhase" });
  g = settle(g);
  assert.equal(named(g, "p1", "Ogre").length, 1, "the copy is sacrificed at the end step");
});

test("Reflection of Kiki-Jiki can't copy a legendary creature", () => {
  let g = game({ hand: ["fable"], mine: ["sackville"] });
  g = cast(g, "h0");
  g.players.p1.battlefield = g.players.p1.battlefield.filter((p) => g.cards[p.card.defId].name !== "Goblin Shaman");
  g = settle(toNextTurn(g));
  if (g.pendingPick) g = pick(g);
  g = settle(toNextTurn(g));
  const kiki = named(g, "p1", "Reflection of Kiki-Jiki")[0];
  kiki.summoningSick = false;
  assert.equal(abilityOf(g, kiki.card.iid, /copy/), undefined, "the only other creature is legendary");
});

test("Eyetwitch: when it dies, learn a Lesson from the sideboard", () => {
  let g = game({ mine: ["eyetwitch", "witchs-oven"] });
  g.players.p1.sideboard = [{ iid: "sb0", defId: "abandon-attachments", owner: "p1" }, { iid: "sb1", defId: "thoughtseize", owner: "p1" }];
  g = use(g, "m1", /Sacrifice a creature/, { payWith: "m0" });
  assert.equal(g.pendingPick?.kind, "learn");
  assert.deepEqual(g.pendingPick!.options, ["sb0"], "a Lesson (Thoughtseize isn't one)");
  g = pick(g, "sb0");
  assert.deepEqual(hand(g), ["Abandon Attachments"]);
  assert.deepEqual(g.players.p1.sideboard?.map((c) => c.iid), ["sb1"]);
});

test("Takenuma: channel from the hand, cheaper for each legendary creature", () => {
  let g = game({ hand: ["takenuma"], mine: ["sackville"], yard: ["ogre"], library: ["plains", "elf", "plains", "plains"], lands: 0 });
  g.players.p1.battlefield.push(...["s1", "s2", "s3"].map((iid) => ({ card: { iid, defId: "swamp", owner: "p1" as const }, tapped: false, summoningSick: false, damage: 0 })));
  g = use(g, "h0", /Mill three/);
  assert.ok(g.players.p1.battlefield.filter((p) => p.card.defId === "swamp").every((p) => p.tapped), "{3}{B} less {1}: three Swamps");
  assert.equal(g.pendingPick?.kind, "fromYard");
  g = pick(g, "y0");
  assert.deepEqual(hand(g), ["Ogre"]);
  assert.ok(yard(g).includes("Elf") && yard(g).includes("Takenuma, Abandoned Mire"));
});

test("Sokenzan: two 1/1 Spirits with haste this turn", () => {
  let g = game({ hand: ["sokenzan"] });
  g = use(g, "h0", /Spirit/);
  const spirits = named(g, "p1", "Spirit");
  assert.equal(spirits.length, 2);
  assert.ok(spirits.every((p) => p.tempKeywords?.includes("haste")));
});

test("Blightstep Pathway: played as either face", () => {
  let g = game({ hand: ["pathway"], lands: 0 });
  const plays = getLegalActions(g, "p1").filter((a) => a.type === "playLand");
  assert.equal(plays.length, 2);
  g = act(g, "p1", { type: "playLand", iid: "h0", back: true });
  assert.equal(g.cards[g.players.p1.battlefield[0].card.defId].name, "Searstep Pathway");
  g.players.p1.battlefield[0].summoningSick = false;
  const red = game({ hand: ["mayhem-devil"], lands: 0 });
  red.players.p1.battlefield = g.players.p1.battlefield;
  red.players.p1.battlefield.push({ card: { iid: "s9", defId: "swamp", owner: "p1" }, tapped: false, summoningSick: false, damage: 0 }, { card: { iid: "s8", defId: "swamp", owner: "p1" }, tapped: false, summoningSick: false, damage: 0 });
  assert.ok(getCastable(red, "p1").some((c) => c.iid === "h0"), "the back face makes {R}");
});

test("Den of the Bugbear: tapped with two other lands; attacks as a 3/2 that brings a Goblin", () => {
  let g = game({ hand: ["den"], lands: 1 });
  g = act(g, "p1", { type: "playLand", iid: "h0" });
  const den = g.players.p1.battlefield.find((p) => p.card.iid === "h0")!;
  assert.equal(den.tapped, true);
  den.tapped = false;
  den.summoningSick = false;
  g = use(g, "h0", /becomes a 3\/2/);
  assert.equal(powerOf(g, find(g, "h0")!), 3);
  while (g.phase !== "attackers") g = act(g, "p1", { type: "passPhase" });
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["h0"] }));
  assert.equal(named(g, "p1", "Goblin").length, 1, "a 1/1 Goblin token, tapped and attacking");
  assert.equal(g.players.p2.life, 16, "3 from the Den and 1 from the Goblin");
});

test("Thoughtseize: you choose a nonland card; you lose 2 life", () => {
  let g = game({ hand: ["thoughtseize"], oppHand: ["bear", "plains"] });
  g = cast(g, "h0", { targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.pendingPick?.player, "p1");
  assert.deepEqual(g.pendingPick?.options, ["oh0"], "the land can't be chosen");
  g = pick(g, "oh0");
  assert.deepEqual(hand(g, "p2"), ["Plains"]);
  assert.equal(g.players.p1.life, 18);
});

test("Abandon Attachments: discard a card, draw two", () => {
  let g = game({ hand: ["abandon-attachments", "plains"] });
  g = cast(g, "h0");
  g = pick(g, "h1");
  assert.equal(hand(g).length, 2);
});

test("Go Blank: discard two, then that player's graveyard is exiled; Ozai's Cruelty: 2 damage and two discards", () => {
  let g = game({ hand: ["go-blank", "ozais-cruelty"], oppHand: ["bear", "bear", "bear", "bear", "bear"] });
  g.players.p2.graveyard = [{ iid: "og", defId: "ogre", owner: "p2" }];
  g = cast(g, "h0", { targets: [{ kind: "player", id: "p2" }] });
  while (g.pendingPick) g = pick(g, g.pendingPick.options[0]);
  assert.equal(g.players.p2.hand.length, 3);
  assert.equal(g.players.p2.graveyard.length, 0);
  assert.equal(g.players.p2.exile.length, 3);
  g = cast(g, "h1", { targets: [{ kind: "player", id: "p2" }] });
  while (g.pendingPick) g = pick(g, g.pendingPick.options[0]);
  assert.equal(g.players.p2.life, 18);
  assert.equal(g.players.p2.hand.length, 1);
});

test("Ruinous Waterbending: waterbend taps artifacts first; paid, creature deaths gain life this turn", () => {
  let g = game({ hand: ["ruinous-waterbending"], mine: ["witchs-oven", "witchs-oven", "elf"], theirs: ["bear", "elf"], lands: 2 });
  const option = getCastable(g, "p1").find((c) => c.iid === "h0");
  assert.equal(option?.kickerName, "waterbend");
  g = cast(g, "h0", { kicked: true });
  assert.ok(find(g, "m0")!.tapped && find(g, "m1")!.tapped, "the two Ovens helped pay");
  assert.equal(find(g, "t0"), undefined);
  assert.equal(g.players.p1.life, 23, "three creatures died");
  g = toNextTurn(g);
  assert.equal(g.players.p1.deathLife, undefined);
});

test("The Legend of Roku: three cards to play, a mana of any color, then Avatar Roku with firebending", () => {
  let g = game({ hand: ["roku"], library: ["bear", "plains", "elf", "swamp", "swamp", "swamp"] });
  g = cast(g, "h0");
  assert.equal(g.players.p1.exile.length, 3);
  assert.equal(g.players.p1.mayPlay?.length, 3);
  g = act(g, "p1", { type: "playLand", iid: "c1" });
  g = settle(toNextTurn(g));
  assert.equal(g.pendingPick?.kind, "color");
  g = pick(g, "G");
  assert.equal(g.players.p1.pool?.length, 1, "{G} floats");
  g = cast(g, "c2", { from: "exile" });
  assert.equal(named(g, "p1", "Elf").length, 1, "paid with the floating {G} (and cast from exile through the end of this turn)");
  g = settle(toNextTurn(g));
  const roku = named(g, "p1", "Avatar Roku")[0];
  assert.ok(roku);
  roku.summoningSick = false;
  while (g.phase !== "attackers") g = act(g, "p1", { type: "passPhase" });
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: [roku.card.iid] }));
  assert.equal(g.players.p1.pool?.filter((m) => m.color === "R").length, 4, "firebending 4");
});

test("Decorum Dissertation: exiled as it resolves, then a free copy at the beginning of each of your first main phases", () => {
  let g = game({ hand: ["decorum"], library: Array(8).fill("plains") });
  g = cast(g, "h0", { targets: [{ kind: "player", id: "p1" }] });
  assert.equal(g.players.p1.life, 18);
  assert.deepEqual(g.players.p1.exile.map((c) => c.iid), ["h0"]);
  g = settle(toNextTurn(g));
  assert.equal(g.pendingPick?.kind, "mayPay");
  g = pick(g, "pay");
  g = choose(g, "p1", [{ kind: "player", id: "p2" }]);
  assert.equal(g.players.p2.life, 18, "the copy");
  assert.equal(g.players.p2.hand.length >= 2, true);
  assert.deepEqual(g.players.p1.exile.map((c) => c.iid), ["h0"], "still in exile");
  assert.equal(fails(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], from: "exile" }).length > 0, true, "the card itself can't be cast");
});
