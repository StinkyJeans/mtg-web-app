import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { applyAction, playerToAct } from "@mtg/engine";
import type { Action, CardDef, GameState } from "@mtg/engine";
import { PickPanel } from "@/app/play/PickPanel";
import { LandFacePanel } from "@/app/play/ChoicePanels";
import { GraveyardDialog } from "@/app/play/Piles";
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
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

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
