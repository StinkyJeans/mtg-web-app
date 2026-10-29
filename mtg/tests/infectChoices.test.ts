import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { applyAction, playerToAct } from "@mtg/engine";
import type { Action, CardDef, GameState } from "@mtg/engine";
import { PickPanel } from "@/app/play/PickPanel";
import { describeEvents } from "@/app/play/log";
import { helpFor } from "@/app/play/glossary";
import { board, permanent } from "./fixtures";

const FALL: CardDef = {
  id: "fall", name: "Vraska's Fall", type: "instant", cost: 3, manaCost: "{2}{B}", typeLine: "Instant", colors: ["B"],
  text: "Each opponent sacrifices a creature or planeswalker of their choice and gets a poison counter.",
};
const DROWN: CardDef = {
  id: "drown", name: "Drown in Ichor", type: "sorcery", cost: 2, manaCost: "{1}{B}", typeLine: "Sorcery", colors: ["B"], keywords: ["proliferate"],
  text: "Target creature gets -4/-4 until end of turn. Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)",
};
const SWAMP: CardDef = { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp" };
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

function play(hand: string[], theirs: ReturnType<typeof permanent>[]) {
  let g: GameState = board({ mine: Array.from({ length: 3 }, () => permanent("swamp", "p1")), theirs, hand });
  Object.assign(g.cards, { fall: FALL, drown: DROWN, swamp: SWAMP });
  g.players.p2.hand = [];
  const log: string[] = [];
  const step = (a: Action) => {
    const r = applyAction(g, playerToAct(g), a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    g = r.state;
    log.push(...describeEvents(r.events, g));
  };
  return { get: () => g, set: (next: GameState) => (g = next), log, step };
}

test("Vraska's Fall: the opponent is asked which creature to sacrifice, and the log says what they sacrificed and the poison", () => {
  const giant = permanent("giant", "p2");
  const bears = permanent("bears", "p2");
  const run = play(["fall"], [giant, bears]);
  run.step({ type: "castSpell", iid: run.get().players.p1.hand[0].iid, targets: [] });
  const g = run.get();
  assert.equal(g.pendingPick?.player, "p2");
  const html = plainText(renderToStaticMarkup(createElement(PickPanel, { state: g, onPick: () => {}, onZoom: () => {} })));
  assert.match(html, /Resolving Vraska's Fall Player 2: Choose a creature or planeswalker you control to sacrifice/);
  assert.match(html, /Hill Giant/);
  assert.match(html, /Grizzly Bears/);
  run.step({ type: "pick", iid: bears.card.iid });
  assert.ok(run.log.includes("Player 2 sacrificed Grizzly Bears."), run.log.join("\n"));
  assert.ok(run.log.includes("Player 2 gets 1 poison counter (1 of 10)."), run.log.join("\n"));
});

test("proliferate: the log lists each counter added, and the glossary explains it", () => {
  const giant = permanent("giant", "p2", { minusCounters: 1 });
  const run = play(["drown"], [giant]);
  run.get().players.p2.poison = 5;
  run.step({ type: "castSpell", iid: run.get().players.p1.hand[0].iid, targets: [{ kind: "permanent", iid: giant.card.iid }] });
  assert.ok(run.log.includes("Player 1 proliferates: a poison counter on Player 2, a -1/-1 counter on Hill Giant."), run.log.join("\n"));
  assert.ok(run.log.includes("Player 2 gets 1 poison counter (6 of 10)."), run.log.join("\n"));
  assert.match(helpFor(DROWN.text).join(" "), /Proliferate: one more counter of each kind/);
});
