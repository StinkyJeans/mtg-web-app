import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getPossibleBlockers, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// Real card texts from the official decks. Costs are all {R} so a Mountain can pay for any of them.
const spell = (id: string, type: "instant" | "sorcery", text: string, name = id): CardDef => ({ id, name, type, cost: 1, manaCost: "{R}", text });
const creature = (id: string, text: string, keywords: string[] = [], power = 2, toughness = 2): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost: 1,
  manaCost: "{R}",
  power,
  toughness,
  text,
  keywords,
});

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  vengeance: spell("vengeance", "sorcery", "Destroy target tapped creature."),
  verdict: spell("verdict", "instant", "Destroy target attacking or blocking creature."),
  timing: spell("timing", "instant", "Impeccable Timing deals 3 damage to target attacking or blocking creature.", "Impeccable Timing"),
  ebb: spell("ebb", "sorcery", "Put target creature on top of its owner's library."),
  breath: spell("breath", "sorcery", "Return target creature card from your graveyard to the battlefield."),
  disentomb: spell("disentomb", "sorcery", "Return target creature card from your graveyard to your hand."),
  stonerain: spell("stonerain", "sorcery", "Destroy target land."),
  demolish: spell("demolish", "sorcery", "Destroy target artifact or land."),
  incinerate: spell("incinerate", "instant", "Incinerate deals 3 damage to any target. A creature dealt damage this way can't be regenerated this turn."),
  radiating: spell("radiating", "instant", "Radiating Lightning deals 3 damage to target player and 1 damage to each creature that player controls.", "Radiating Lightning"),
  trumpet: spell("trumpet", "instant", "Attacking creatures get +2/+0 until end of turn."),
  raider: creature("raider", "This creature can't block."),
  cat: creature("cat", "Whenever this creature attacks, it gets +1/+1 until end of turn."),
  archer: creature("archer", "When this creature enters, it deals 1 damage to any target."),
  herald: creature("herald", "Flying\nWhenever this creature attacks, attacking creatures gain flying and lifelink until end of turn.", ["flying"], 4, 4),
  gravedigger: creature("gravedigger", "When this creature enters, you may return target creature card from your graveyard to your hand."),
  gravewaker: creature("gravewaker", "Flying (This creature can't be blocked except by creatures with flying or reach.)\n{5}{B}{B}: Return target creature card from your graveyard to the battlefield tapped.", ["flying"], 5, 5),
  bear: creature("bear", ""),
  artifact: { ...creature("artifact", ""), typeLine: "Artifact Creature — Construct" },
};

test("the card texts from the official decks are all understood", () => {
  for (const id of ["vengeance", "verdict", "timing", "ebb", "breath", "disentomb", "stonerain", "demolish", "incinerate", "radiating", "trumpet", "raider", "cat", "archer", "herald", "gravedigger"]) {
    assert.equal(isSupportedCard(DEFS[id]), true, id);
  }
  // Gravewaker's ability costs {5}{B}{B}: that parses too.
  assert.equal(isSupportedCard(DEFS.gravewaker), true);
});

const perm = (iid: string, defId: string, owner: PlayerId, tapped = false) => ({
  card: { iid, defId, owner } as CardInstance,
  tapped,
  summoningSick: false,
  damage: 0,
});

function setup(hand: string[] = [], opponentHand: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = opponentHand.map((d, i) => ({ iid: `o${i}`, defId: d, owner: "p2" }));
  g.players.p1.battlefield = Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain", "p1"));
  g.players.p2.battlefield = Array.from({ length: 4 }, (_, i) => perm(`m${i}`, "mountain", "p2"));
  return g;
}

function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const refused = (s: GameState, p: PlayerId, a: Action) => {
  const r = applyAction(s, p, a);
  assert.equal(r.ok, false);
};
type Pick = { player?: PlayerId; perm?: string; card?: string };
const cast = (s: GameState, iid: string, ...targets: Pick[]) => act(s, "p1", { type: "castSpell", iid, targets: targets.map(targetOf) });
function targetOf(t: Pick) {
  if (t.player) return { kind: "player" as const, id: t.player };
  if (t.card) return { kind: "card" as const, iid: t.card };
  return { kind: "permanent" as const, iid: t.perm! };
}

test("destroy target tapped creature: only a tapped one is a legal target", () => {
  let g = setup(["vengeance"]);
  g.players.p2.battlefield.push(perm("a", "bear", "p2", true), perm("b", "bear", "p2", false));
  refused(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "b" }] });
  g = cast(g, "h0", { perm: "a" });
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "a"), false);
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "b"), true);
});

test("attacking or blocking creature spells need a creature in combat", () => {
  let g = setup(["verdict"]);
  g.players.p2.battlefield.push(perm("a", "bear", "p2"));
  g.phase = "attackers";
  refused(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "a" }] });
  g.combat = { attackers: [{ attacker: "a", blockers: [] }] };
  g = cast(g, "h0", { perm: "a" });
  assert.equal(g.players.p2.graveyard.length, 1);
});

test("put target creature on top of its owner's library", () => {
  let g = setup(["ebb"]);
  g.players.p2.battlefield.push(perm("a", "bear", "p2"));
  g = cast(g, "h0", { perm: "a" });
  assert.equal(g.players.p2.library[0].iid, "a");
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "a"), false);
});

test("return a creature card from your graveyard to the battlefield, or to your hand", () => {
  let g = setup(["breath"]);
  g.players.p1.graveyard = [{ iid: "dead", defId: "bear", owner: "p1" }];
  g = cast(g, "h0", { card: "dead" });
  assert.equal(g.players.p1.battlefield.some((p) => p.card.iid === "dead"), true);
  assert.equal(g.players.p1.graveyard.length, 1); // the spell itself

  let h = setup(["disentomb"]);
  h.players.p1.graveyard = [{ iid: "dead", defId: "bear", owner: "p1" }];
  h = cast(h, "h0", { card: "dead" });
  assert.equal(h.players.p1.hand.some((c) => c.iid === "dead"), true);
  // Only your own graveyard counts.
  const other = setup(["disentomb"]);
  other.players.p2.graveyard = [{ iid: "theirs", defId: "bear", owner: "p2" }];
  refused(other, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "card", iid: "theirs" }] });
});

test("destroy target land, and artifact or land", () => {
  let g = setup(["stonerain"]);
  g = cast(g, "h0", { perm: "m0" });
  assert.equal(g.players.p2.battlefield.length, 3);

  let h = setup(["demolish"]);
  h.players.p2.battlefield.push(perm("a", "artifact", "p2"), perm("b", "bear", "p2"));
  refused(h, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "b" }] }); // a plain creature isn't an artifact
  h = cast(h, "h0", { perm: "a" });
  assert.equal(h.players.p2.battlefield.some((p) => p.card.iid === "a"), false);
});

test("damage to a player and to each creature that player controls", () => {
  let g = setup(["radiating"]);
  g.players.p2.battlefield.push(perm("a", "bear", "p2"), perm("b", "bear", "p2"));
  g.players.p1.battlefield.push(perm("mine", "bear", "p1"));
  g = cast(g, "h0", { player: "p2" });
  assert.equal(g.players.p2.life, 17);
  assert.equal(g.players.p2.battlefield.find((p) => p.card.iid === "a")!.damage, 1);
  assert.equal(g.players.p1.battlefield.find((p) => p.card.iid === "mine")!.damage, 0);
});

test("attacking creatures get +2/+0", () => {
  let g = setup(["trumpet"]);
  g.players.p1.battlefield.push(perm("a", "bear", "p1"));
  g.players.p1.battlefield.push(perm("idle", "bear", "p1"));
  g.phase = "attackers";
  g.combat = { attackers: [{ attacker: "a", blockers: [] }] };
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.state.players.p1.battlefield.find((p) => p.card.iid === "a")!.powerBonus, 2);
    assert.equal(r.state.players.p1.battlefield.find((p) => p.card.iid === "idle")!.powerBonus ?? 0, 0);
  }
});

test("a creature that can't block is not offered as a blocker and can't be declared one", () => {
  const g = setup();
  g.players.p1.battlefield.push(perm("att", "bear", "p1"));
  g.players.p2.battlefield.push(perm("r", "raider", "p2"), perm("b", "bear", "p2"));
  g.phase = "blockers";
  g.active = "p1";
  g.combat = { attackers: [{ attacker: "att", blockers: [] }] };
  assert.deepEqual(getPossibleBlockers(g).sort(), ["b"]);
  refused(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "r", attacker: "att" }] });
});

test("'it' in a trigger means the creature itself: the archer pings what you choose", () => {
  let g = setup(["archer"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.ok(g.pendingChoice, "the trigger asks for a target");
  g = act(g, "p1", { type: "chooseTargets", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(g.players.p2.life, 19);
});

// ───────── X spells ─────────

const blaze: CardDef = { id: "blaze", name: "Blaze", type: "sorcery", cost: 1, manaCost: "{X}{R}", text: "Blaze deals X damage to any target." };
const brainstorm: CardDef = { id: "stir", name: "Stir", type: "sorcery", cost: 1, manaCost: "{X}{R}", text: "You draw X cards and you lose X life." };

test("an X spell is paid with X generic mana on top of the printed cost, and X sets the damage", async () => {
  const { getCastable } = await import("../index.js");
  let g = setup(["x"]);
  g.cards = { ...g.cards, x: blaze };
  assert.equal(isSupportedCard(blaze), true);
  assert.equal(getCastable(g, "p1").find((c) => c.iid === "h0")!.maxX, 3); // four Mountains: {R} plus X = 3
  refused(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], x: 4 });
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], x: 3 });
  assert.equal(g.players.p2.life, 17);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 4);
});

test("X can be 0, and a spell without X in its cost refuses an X", () => {
  let g = setup(["x", "bolt"]);
  g.cards = { ...g.cards, x: blaze, bolt: spell("bolt", "instant", "Bolt deals 3 damage to any target.") };
  refused(g, "p1", { type: "castSpell", iid: "h1", targets: [{ kind: "player", id: "p2" }], x: 2 });
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], x: 0 });
  assert.equal(g.players.p2.life, 20);
});

test("X also works for drawing cards and losing life", () => {
  let g = setup(["x"]);
  g.cards = { ...g.cards, x: brainstorm };
  const lib = g.players.p1.library.length;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], x: 2 });
  assert.equal(g.players.p1.library.length, lib - 2);
  assert.equal(g.players.p1.life, 18);
});
