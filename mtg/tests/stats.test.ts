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

test("stun counters and ward show on the card", () => {
  const faerie = permanent("faerie", "p1", { tapped: true, stun: 3 });
  const g = board({ mine: [faerie] });
  g.cards.faerie = {
    id: "faerie", name: "Sleep-Cursed Faerie", type: "creature", cost: 1, manaCost: "{U}", power: 3, toughness: 3, typeLine: "Creature — Faerie Wizard", image: "faerie.jpg", keywords: ["flying", "ward"],
    text: "Flying, ward {2}\nThis creature enters tapped with three stun counters on it.\n{1}{U}: Untap this creature.",
  };
  const props = liveCardProps(g, faerie);
  assert.equal(props.ward, "Ward {2}");
  const html = renderToStaticMarkup(createElement(CardView, { def: g.cards.faerie, ...props }));
  assert.match(html, /❄ Stun ×3/);
  assert.match(html, /next 3 untaps/);
  assert.match(html, /Ward \{2\}: when an opponent/);
  assert.equal(liveCardProps(g, permanent("bears", "p1")).ward, undefined, "no ward chip without ward");
});
