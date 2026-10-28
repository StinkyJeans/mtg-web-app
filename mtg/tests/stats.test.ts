import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CardView from "@/app/play/CardView";
import { targetName } from "@/app/play/cardText";
import { liveCardProps, nameWithStats, ptText } from "@/app/play/stats";
import { board, permanent } from "./fixtures";

test("a creature's power and toughness count its counters and the damage it has taken", () => {
  const bears = permanent("bears", "p2", { counters: 1, damage: 2 });
  const g = board({ theirs: [bears, permanent("forest", "p2")] });
  assert.equal(ptText(g, bears), "3/1");
  assert.equal(nameWithStats(g, bears), "Grizzly Bears 3/1");
  assert.equal(nameWithStats(g, g.players.p2.battlefield[1]), "Forest", "a land has no power and toughness");
  assert.equal(targetName(g, { kind: "permanent", iid: bears.card.iid }), "Grizzly Bears 3/1 (Player 2)");
});

test("a creature on the battlefield always shows its power and toughness, even unchanged", () => {
  const bears = permanent("bears", "p1");
  const hurt = permanent("bears", "p1", { minusCounters: 1 });
  const g = board({ mine: [bears, hurt] });
  const art = { ...g.cards.bears, image: "bears.jpg" }; // with card art, the stats are drawn over it
  const html = renderToStaticMarkup(createElement(CardView, { def: art, ...liveCardProps(g, bears) }));
  assert.match(html, /title="Power 2, toughness 2">2\/2</);
  const inHand = renderToStaticMarkup(createElement(CardView, { def: art }));
  assert.doesNotMatch(inHand, /Power 2/, "a card in hand or in a deck shows only its printed art");
  assert.match(renderToStaticMarkup(createElement(CardView, { def: art, ...liveCardProps(g, hurt) })), /Printed: 2\/2">1\/1</);
});
