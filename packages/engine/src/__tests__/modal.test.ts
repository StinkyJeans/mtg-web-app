import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  charm: { id: "charm", name: "Charm", type: "instant", cost: 1, manaCost: "{R}", text: "Choose one —\n• Target creature gets +2/+2 until end of turn.\n• Destroy target artifact.\n• You gain 4 life." },
  twin: { id: "twin", name: "Twin", type: "sorcery", cost: 1, manaCost: "{R}", text: "Choose one or both —\n• Destroy target artifact.\n• Destroy target enchantment." },
  priest: { id: "priest", name: "Priest", type: "creature", cost: 2, manaCost: "{1}{R}", power: 1, toughness: 1, text: "When Priest enters, choose one —\n• You gain 3 life.\n• Draw a card.\n• Priest deals 2 damage to target opponent." },
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
  trinket: { id: "trinket", name: "Trinket", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "" },
  banner: { id: "banner", name: "Banner", type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment", text: "" },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = theirs.map((d, i) => perm(`t${i}`, d, "p2"));
  g.players.p2.hand = [];
  g.phase = "main1";
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => ({ kind: "permanent" as const, iid });

test("modal cards are understood", () => {
  for (const id of ["charm", "twin", "priest"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("a Choose one spell reports its modes and which of them could be chosen right now", () => {
  const g = setup(["charm"], ["bear"]); // no artifact anywhere
  const castable = getCastable(g, "p1")[0];
  assert.deepEqual(castable.modal?.modes.map((m) => m.available), [true, false, true]);
  assert.equal(castable.modal?.max, 1);
});

test("you must choose exactly one mode, and then give that mode's targets", () => {
  const g = setup(["charm"], ["bear"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [] }).ok, false); // no mode chosen
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", modes: [0, 2], targets: [on("m0")] }).ok, false); // two modes
  const pump = act(g, "p1", { type: "castSpell", iid: "h0", modes: [0], targets: [on("m0")] });
  assert.equal(powerOf(pump, find(pump, "m0")!), 4);
  const life = act(g, "p1", { type: "castSpell", iid: "h0", modes: [2], targets: [] });
  assert.equal(life.players.p1.life, 24);
});

test("the destroy mode works on an artifact and refuses a creature", () => {
  const g = setup(["charm"], ["bear"], ["trinket"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", modes: [1], targets: [on("m0")] }).ok, false);
  const s = act(g, "p1", { type: "castSpell", iid: "h0", modes: [1], targets: [on("t0")] });
  assert.equal(find(s, "t0"), undefined);
});

test("Choose one or both: either mode, or both, and each mode's targets line up", () => {
  const g = setup(["twin"], [], ["trinket", "banner"]);
  const art = act(g, "p1", { type: "castSpell", iid: "h0", modes: [0], targets: [on("t0")] });
  assert.equal(find(art, "t0"), undefined);
  assert.ok(find(art, "t1"));
  const ench = act(g, "p1", { type: "castSpell", iid: "h0", modes: [1], targets: [on("t1")] });
  assert.ok(find(ench, "t0"));
  assert.equal(find(ench, "t1"), undefined);
  const both = act(g, "p1", { type: "castSpell", iid: "h0", modes: [0, 1], targets: [on("t0"), on("t1")] });
  assert.equal(find(both, "t0"), undefined);
  assert.equal(find(both, "t1"), undefined);
  // the targets are checked against their own mode: the enchantment can't be the artifact target
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", modes: [0, 1], targets: [on("t1"), on("t0")] }).ok, false);
});

test("a creature that says 'When it enters, choose one' asks which mode when it triggers", () => {
  let g = setup(["priest"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(g.pendingPick?.kind, "mode");
  assert.equal(g.pendingPick?.player, "p1");
  assert.deepEqual(g.pendingPick?.options, ["0", "1", "2"]);
  const library = g.players.p1.library.length;
  g = act(g, "p1", { type: "pick", iid: "1" }); // draw a card
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p1.library.length, library - 1);
  assert.equal(g.players.p1.life, 20);
});

test("the chosen enter mode can have a target", () => {
  let g = setup(["priest"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = act(g, "p1", { type: "pick", iid: "2" }); // 2 damage to target opponent: only one opponent, so no question
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p2.life, 18);
});
