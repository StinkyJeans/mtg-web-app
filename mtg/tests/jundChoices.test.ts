import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { applyAction, getActivatable, getCastable, playerToAct } from "@mtg/engine";
import type { Action, CardDef, GameState } from "@mtg/engine";
import { PickPanel } from "@/app/play/PickPanel";
import { LandFacePanel } from "@/app/play/ChoicePanels";
import { GraveyardDialog } from "@/app/play/Piles";
import CastPlanPanels from "@/app/play/CastPlanPanels";
import { StackPanel } from "@/app/play/StackPanel";
import { PlayersPanel } from "@/app/play/SidePanels";
import { AbilityPanel } from "@/app/play/AbilityPanel";
import { describeEvents } from "@/app/play/log";
import { readable } from "@/app/play/cardText";
import { board, permanent } from "./fixtures";

const LESSON: CardDef = { id: "lesson", name: "Abandon Attachments", type: "instant", cost: 2, manaCost: "{1}{U/R}", typeLine: "Instant — Lesson", text: "You may discard a card. If you do, draw two cards." };

test("learn: a Lesson from the sideboard and the hand's cards are offered, each marked where it is", () => {
  const g = board({ hand: ["shock"] });
  g.cards.lesson = LESSON;
  g.players.p1.sideboard = [{ iid: "sb0", defId: "lesson", owner: "p1" }];
  const hand = g.players.p1.hand[0].iid;
  g.pendingPick = { player: "p1", prompt: "Learn", kind: "learn", options: ["sb0", hand], optional: true, owner: "p1", remaining: 1, ordered: [] };
  const html = renderToStaticMarkup(createElement(PickPanel, { state: g, onPick: () => {}, onZoom: () => {} }));
  assert.match(html, /Sideboard Lesson/);
  assert.match(html, /In your hand/);
  assert.match(html, /Don&#x27;t learn/);
});

test("a modal land asks which face to play it with", () => {
  const g = board({ hand: ["pathway"] });
  g.cards.pathway = { id: "pathway", name: "Blightstep Pathway", type: "land", cost: 0, typeLine: "Land", text: "{T}: Add {B}." };
  g.cards["pathway//back"] = { id: "pathway//back", name: "Searstep Pathway", type: "land", cost: 0, typeLine: "Land", text: "{T}: Add {R}." };
  const html = renderToStaticMarkup(createElement(LandFacePanel, { state: g, actor: "p1", iid: g.players.p1.hand[0].iid, onPlay: () => {}, onCancel: () => {} }));
  assert.match(html, /Blightstep Pathway/);
  assert.match(html, /Searstep Pathway/);
});

const DECORUM: CardDef = {
  id: "decorum", name: "Decorum Dissertation", type: "sorcery", cost: 5, manaCost: "{3}{B}{B}", typeLine: "Sorcery — Lesson", keywords: ["paradigm"],
  text: "Target player draws two cards and loses 2 life.\nParadigm (Then exile this spell. After you first resolve a spell with this name, you may cast a copy of it from exile without paying its mana cost at the beginning of each of your first main phases.)",
};
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

test("paradigm: the free copy is asked with the card in view, its target says what it does, and the log names the copy", () => {
  let g: GameState = board({ mine: Array.from({ length: 5 }, () => permanent("swamp", "p1")), hand: ["decorum"] });
  g.cards.decorum = DECORUM;
  g.cards.swamp = { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" };
  g.players.p2.hand = [];
  const log: string[] = [];
  const step = (a: Action) => {
    const r = applyAction(g, playerToAct(g), a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    g = r.state;
    log.push(...describeEvents(r.events, g));
  };
  step({ type: "castSpell", iid: g.players.p1.hand[0].iid, targets: [{ kind: "player", id: "p1" }] });
  for (let i = 0; i < 100 && !g.pendingPick; i++) step(g.priority ? { type: "passPriority" } : { type: "passPhase" });
  assert.equal(g.phase, "main1");
  const ask = plainText(renderToStaticMarkup(createElement(PickPanel, { state: g, onPick: () => {}, onZoom: () => {} })));
  assert.match(ask, /cast a copy of Decorum Dissertation for free\?/);
  assert.match(ask, /Target player draws two cards and loses 2 life/, "the card is shown with what it does");
  step({ type: "pick", iid: "pay" });
  assert.ok(g.pendingChoice);
  assert.equal(readable(g.pendingChoice.item.text, g.pendingChoice.item.sourceName), "Paradigm: cast a copy of Decorum Dissertation without paying its mana cost. Target player draws two cards and loses 2 life.");
  step({ type: "chooseTargets", targets: [{ kind: "player", id: "p1" }] });
  assert.ok(log.includes("Player 1 cast a copy of Decorum Dissertation."), log.join(" / "));
  const exile = plainText(renderToStaticMarkup(createElement(GraveyardDialog, { state: g, owner: "p1", zone: "exile", onClose: () => {}, onZoom: () => {} })));
  assert.match(exile, /Paradigm: a free copy each turn/);
});

const RUINOUS: CardDef = {
  id: "ruinous", name: "Ruinous Waterbending", type: "sorcery", cost: 3, manaCost: "{1}{B}{B}", typeLine: "Sorcery — Lesson", keywords: ["waterbend"],
  text: "As an additional cost to cast this spell, you may waterbend {4}. (While paying a waterbend cost, you can tap your artifacts and creatures to help. Each one pays for {1}.)\nAll creatures get -2/-2 until end of turn. If this spell's additional cost was paid, whenever a creature dies this turn, you gain 1 life.",
};

/** p1 with four Swamps, two Witch's Ovens and a Grizzly Bears that could attack; p2 with a Grizzly Bears, and a Shock to answer with (so the spell waits on the stack). */
function waterbendBoard(): GameState {
  const g = board({ mine: [...Array.from({ length: 4 }, () => permanent("swamp", "p1")), permanent("oven", "p1"), permanent("oven", "p1"), permanent("bears", "p1")], theirs: [permanent("bears", "p2"), permanent("mountain", "p2")], hand: ["ruinous"] });
  g.cards.ruinous = RUINOUS;
  g.cards.swamp = { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" };
  g.cards.oven = { id: "oven", name: "Witch's Oven", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact" };
  g.players.p2.hand = [{ iid: "p2-shock", defId: "shock", owner: "p2" }];
  return g;
}

test("waterbend: the choice says what tapping pays and what paying adds, the stack says whether it was paid, the log how", () => {
  let g = waterbendBoard();
  const iid = g.players.p1.hand[0].iid;
  const castable = getCastable(g, "p1").find((c) => c.iid === iid)!;
  const plan = { iid, name: RUINOUS.name, castable };
  const ask = plainText(renderToStaticMarkup(createElement(CastPlanPanels, { state: g, actor: "p1", plan, modePick: [], onModePick: () => {}, xValue: 0, onX: () => {}, onAdvance: () => {}, onCancel: () => {} })));
  assert.match(ask, /Cast it normally, without: Whenever a creature dies this turn, you gain 1 life\./);
  assert.match(ask, /tap Witch's Oven, Witch's Oven and Grizzly Bears \( each\) and pay with mana\./, ask);
  assert.match(ask, /Then also: Whenever a creature dies this turn, you gain 1 life\./);
  assert.match(ask, /Grizzly Bears can't attack this turn then/, "a creature that could attack is only tapped when the mana runs short, and says so");

  const log: string[] = [];
  const step = (a: Action) => {
    const r = applyAction(g, playerToAct(g), a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    g = r.state;
    log.push(...describeEvents(r.events, g));
  };
  step({ type: "castSpell", iid, targets: [], kicked: true });
  assert.deepEqual(log, ["Player 1 paid {B}{B}{B}{B}: Swamp {B}, Swamp {B}, Swamp {B}, Swamp {B}.", "Player 1 cast Ruinous Waterbending.", "Player 1 paid waterbend {4} for Ruinous Waterbending: tapped Witch's Oven, Witch's Oven and Grizzly Bears ({1} each) and {1} of mana."]);
  const stack = plainText(renderToStaticMarkup(createElement(StackPanel, { state: g, actor: "p1", onPass: () => {} })));
  assert.match(stack, /Waterbend paid: Whenever a creature dies this turn, you gain 1 life\./);
  for (let i = 0; i < 20 && g.stack.length > 0; i++) step({ type: "passPriority" });
  assert.equal(g.players.p1.life, 22, "both Bears died");
  const players = plainText(renderToStaticMarkup(createElement(PlayersPanel, { state: g, order: ["p1", "p2"], actor: "p1" })));
  assert.match(players, /Creature dies: \+1 life \(this turn\)/);
});

test("waterbend not paid: the stack says the part that needs it won't happen", () => {
  let g = waterbendBoard();
  g.players.p1.battlefield = g.players.p1.battlefield.filter((p) => p.card.defId === "swamp");
  const r = applyAction(g, "p1", { type: "castSpell", iid: g.players.p1.hand[0].iid, targets: [] });
  assert.ok(r.ok, r.ok ? "" : r.error);
  g = r.state;
  const stack = plainText(renderToStaticMarkup(createElement(StackPanel, { state: g, actor: "p2", onPass: () => {} })));
  assert.match(stack, /Waterbend not paid, so this won't happen: Whenever a creature dies this turn, you gain 1 life\./);
});

const HARVESTER: CardDef = {
  id: "harvester", name: "Bloodtithe Harvester", type: "creature", cost: 2, manaCost: "{B}{R}", power: 3, toughness: 2, typeLine: "Creature — Vampire",
  text: 'When this creature enters, create a Blood token. (It\'s an artifact with "{1}, {T}, Discard a card, Sacrifice this token: Draw a card.")\n{T}, Sacrifice this creature: Target creature gets -X/-X until end of turn, where X is twice the number of Blood tokens you control. Activate only as a sorcery.',
};

test("Blood: the token and Bloodtithe Harvester read in the card's words, -X/-X is worked out, and the log names the sacrificed token", () => {
  let g: GameState = board({ mine: [permanent("swamp", "p1"), permanent("swamp", "p1"), permanent("mountain", "p1"), permanent("mountain", "p1")], theirs: [permanent("bears", "p2"), permanent("mountain", "p2")], hand: ["harvester", "shock"] });
  g.cards.swamp = { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" };
  g.cards.harvester = HARVESTER;
  g.players.p2.hand = [{ iid: "p2-shock", defId: "shock", owner: "p2" }];
  const log: string[] = [];
  const step = (a: Action) => {
    const r = applyAction(g, playerToAct(g), a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    g = r.state;
    log.push(...describeEvents(r.events, g));
  };
  const stack = () => plainText(renderToStaticMarkup(createElement(StackPanel, { state: g, actor: "p1", onPass: () => {} })));
  const abilities = () => plainText(renderToStaticMarkup(createElement(AbilityPanel, { state: g, abilities: getActivatable(g, "p1"), onUse: () => {} })));

  step({ type: "castCreature", iid: g.players.p1.hand[0].iid });
  step({ type: "passPriority" });
  assert.match(stack(), /When Bloodtithe Harvester enters, create a Blood token/);
  for (let i = 0; i < 20 && g.stack.length > 0; i++) step({ type: "passPriority" });
  const blood = g.players.p1.battlefield.find((p) => g.cards[p.card.defId].name === "Blood")!;
  const harvester = g.players.p1.battlefield.find((p) => p.card.defId === "harvester")!;
  harvester.summoningSick = false;
  const before = abilities();
  assert.match(before, /Target creature gets -X\/-X until end of turn, where X is twice the number of Blood tokens you control\. Activate only as a sorcery/);
  assert.match(before, /Right now: -2\/-2 \(Blood ×1\)/);
  assert.match(before, /Discard a card Sacrifice Blood ➜ Draw a card/);

  log.length = 0;
  const use = getActivatable(g, "p1").find((a) => a.iid === blood.card.iid)!;
  step({ type: "activateAbility", iid: use.iid, index: use.index, targets: [], payWith: g.players.p1.hand[0].iid });
  assert.deepEqual(log, ["Player 1 paid {B}: Swamp {B}.", "Player 1 discards Shock.", "Player 1 sacrificed Blood.", "Player 1 used Blood: {1}, {T}, Discard a card, Sacrifice Blood: Draw a card."]);
  assert.match(stack(), /\{1\}, \{T\}, Discard a card, Sacrifice Blood: Draw a card/);
  for (let i = 0; i < 20 && g.stack.length > 0; i++) step({ type: "passPriority" });
  assert.deepEqual(log.slice(4), ["Player 1 drew a card."], "the draw is said once");
  assert.match(abilities(), /Right now: -0\/-0 \(Blood ×0\): it would do nothing/);
});
