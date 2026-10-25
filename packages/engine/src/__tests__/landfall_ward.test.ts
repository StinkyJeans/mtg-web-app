import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text: string, keywords: string[] = []): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, text, keywords, typeLine: "Creature — Test" });
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  scout: creature("scout", 1, 1, "Landfall — Whenever a land you control enters, this creature gets +2/+2 until end of turn.", ["landfall"]),
  sprout: creature("sprout", 1, 1, "Landfall — Whenever a land you control enters, put a +1/+1 counter on this creature.", ["landfall"]),
  healer: creature("healer", 1, 1, "Landfall — Whenever a land you control enters, you gain 2 life.", ["landfall"]),
  pinger: creature("pinger", 1, 1, "Landfall — Whenever a land you control enters, this creature deals 1 damage to each opponent.", ["landfall"]),
  guarded: creature("guarded", 2, 2, "Ward {2}", ["ward"]),
  winged: creature("winged", 2, 2, "Flying, ward {1}", ["flying", "ward"]),
  bolt: { id: "bolt", name: "Bolt", type: "instant", cost: 1, manaCost: "{R}", text: "Bolt deals 3 damage to any target." },
  zapper: creature("zapper", 1, 1, "{T}: Zapper deals 1 damage to any target."),
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], lands = 4): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 2 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
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
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const withLand = (g: GameState) => {
  g.players.p1.hand.push({ iid: "land", defId: "mountain", owner: "p1" });
  return g;
};

test("landfall and ward texts are understood", () => {
  for (const id of ["scout", "sprout", "healer", "pinger", "guarded", "winged"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("landfall: playing a land triggers it (pump, counter, life, damage)", () => {
  let g = withLand(setup([], ["scout", "sprout", "healer", "pinger"]));
  g = act(g, "p1", { type: "playLand", iid: "land" });
  while (g.pendingChoice || g.priority) g = act(g, g.priority?.holder ?? g.pendingChoice!.player, g.priority ? { type: "passPriority" } : { type: "chooseTargets", targets: [] });
  assert.equal(powerOf(g, find(g, "m0")!), 3); // +2/+2 until end of turn
  assert.equal(find(g, "m1")!.counters, 1);
  assert.equal(g.players.p1.life, 22);
  assert.equal(g.players.p2.life, 19);
});

test("landfall: only lands you control, and not other permanents", () => {
  let g = setup(["bolt"], ["healer"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p1.life, 20);
  // an opponent's land doesn't trigger my landfall
  const o = setup([], ["healer"]);
  o.active = "p2";
  o.players.p2.hand = [{ iid: "oland", defId: "mountain", owner: "p2" }];
  const s = act(o, "p2", { type: "playLand", iid: "oland" });
  assert.equal(s.players.p1.life, 20);
});

test("landfall also happens when a land is put onto the battlefield by an effect", () => {
  const growth: CardDef = { id: "growth", name: "Rampant Growth", type: "sorcery", cost: 2, manaCost: "{1}{R}", text: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle." };
  let g = setup(["growth"], ["healer"]);
  g.cards = { ...g.cards, growth };
  g.players.p1.library = [{ iid: "lib0", defId: "mountain", owner: "p1" }];
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  g = act(g, "p1", { type: "pick", iid: "lib0" });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.players.p1.life, 22);
});

// ───────── ward ─────────

test("ward: targeting it asks you to pay; paying lets the spell resolve", () => {
  let g = setup(["bolt"], [], ["guarded"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  while (g.priority && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.pendingPick?.kind, "ward");
  assert.equal(g.pendingPick?.player, "p1");
  g = act(g, "p1", { type: "pick", iid: "pay" });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(find(g, "t0"), undefined, "the 3 damage killed the 2/2");
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 3); // {R} for the Bolt plus {2} for ward
});

test("ward: refusing to pay counters the spell", () => {
  let g = setup(["bolt"], [], ["guarded"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  while (g.priority && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  g = act(g, "p1", { type: "pick" });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.ok(find(g, "t0"));
  assert.equal(find(g, "t0")!.damage, 0);
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true); // the countered Bolt
});

test("ward: if you can't pay, the spell is countered without asking", () => {
  let g = setup(["bolt"], [], ["guarded"], 2); // {R} for the Bolt leaves only 1 land, ward {2} costs 2
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.pendingPick, null);
  assert.equal(find(g, "t0")!.damage, 0);
});

test("ward also applies to abilities, and not to your own permanents", () => {
  let g = setup([], ["zapper"], ["winged"]);
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("t0") });
  while (g.priority && !g.pendingPick) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(g.pendingPick?.kind, "ward");
  assert.equal(g.pendingPick?.wardCost, "{1}");
  g = act(g, "p1", { type: "pick" });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(find(g, "t0")!.damage, 0);

  // targeting your own warded creature costs nothing extra
  let own = setup(["bolt"], ["guarded"]);
  own = act(own, "p1", { type: "castSpell", iid: "h0", targets: on("m0") });
  assert.equal(own.pendingPick, null);
});
