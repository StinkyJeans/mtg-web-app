import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getLegalActions } from "@mtg/engine";
import HandRow from "@/app/play/HandRow";
import { board, permanent } from "./fixtures";

test("a card Expressive Iteration exiled sits with the hand's playable cards, marked as from exile", () => {
  const g = board({ mine: [permanent("mountain", "p1")] });
  g.players.p1.exile = [{ iid: "x1", defId: "shock", owner: "p1" }];
  g.players.p1.mayPlay = [{ iid: "x1", source: "thisTurn", throughTurn: g.turn }];
  const playable = new Set(getLegalActions(g, "p1").flatMap((a) => (a.type === "castSpell" || a.type === "playLand" ? [a.iid] : [])));
  assert.ok(playable.has("x1"), "the engine lets it be cast");
  const props = { state: g, actor: "p1" as const, mine: true, playable, exiled: g.players.p1.exile, handPick: [], onClick: () => {}, onPreview: () => {}, onUnpreview: () => {}, onInspect: () => {}, onZoom: () => {} };
  const html = renderToStaticMarkup(createElement(HandRow, props));
  assert.match(html, /Can play now \(1\)/);
  assert.match(html, /From exile/);
  assert.match(html, /you may play it this turn/);
});
