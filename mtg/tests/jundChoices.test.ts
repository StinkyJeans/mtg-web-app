import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CardDef } from "@mtg/engine";
import { PickPanel } from "@/app/play/PickPanel";
import { LandFacePanel } from "@/app/play/ChoicePanels";
import { board } from "./fixtures";

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
