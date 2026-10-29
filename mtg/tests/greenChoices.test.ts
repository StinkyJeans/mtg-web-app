import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, getActivatable, playerToAct } from "@mtg/engine";
import type { CardDef, GameState } from "@mtg/engine";
import { describeEvents } from "@/app/play/log";
import { helpFor } from "@/app/play/glossary";
import { board, permanent } from "./fixtures";

const VILLAGE: CardDef = {
  id: "village", name: "Treetop Village", type: "land", cost: 0, typeLine: "Land",
  text: "This land enters tapped.\n{T}: Add {G}.\n{1}{G}: This land becomes a 3/3 green Ape creature with trample until end of turn. It's still a land. (It can deal excess combat damage to the player or planeswalker it's attacking.)",
};
const FOREST: CardDef = { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" };

test("Treetop Village: the log says it is a green Ape creature with trample, not an artifact", () => {
  const village = permanent("village", "p1");
  let g: GameState = board({ mine: [village, permanent("forest", "p1"), permanent("forest", "p1")] });
  Object.assign(g.cards, { village: VILLAGE, forest: FOREST });
  const ability = getActivatable(g, "p1").find((a) => a.iid === village.card.iid && /becomes a 3\/3/i.test(a.text));
  assert.ok(ability);
  const r = applyAction(g, playerToAct(g), { type: "activateAbility", iid: village.card.iid, index: ability.index, targets: [] });
  assert.ok(r.ok, r.ok ? "" : r.error);
  g = r.state;
  const log = describeEvents(r.events, g);
  for (let i = 0; i < 5 && g.stack.length > 0; i++) {
    const next = applyAction(g, playerToAct(g), { type: "passPriority" });
    assert.ok(next.ok);
    g = next.state;
    log.push(...describeEvents(next.events, g));
  }
  assert.ok(log.includes("Treetop Village is a green Ape creature until end of turn."), log.join("\n"));
  assert.ok(log.includes("Treetop Village gains trample until end of turn."), log.join("\n"));
});

test("the glossary explains undying, devotion and pack tactics", () => {
  assert.match(helpFor("Haste\nUndying").join(" "), /Undying: when it dies, if it had no \+1\/\+1 counters/);
  assert.match(helpFor("where X is your devotion to green").join(" "), /Devotion to green/);
  assert.match(helpFor("Pack tactics — Whenever this creature attacks").join(" "), /Pack tactics/);
});
