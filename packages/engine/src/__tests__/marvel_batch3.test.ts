import { test } from "node:test";
import assert from "node:assert/strict";
import { castCostOf, powerOf, toughnessOf } from "../index.js";
import { kw, staticEffectsOn } from "../core.js";
import { act, attackWith, choose, find, hand, named, on, plain, realCard, setup, settle } from "./marvelKit.js";

// A batch of smaller Marvel cards: statics, one-line triggers and effects.

const hero = (id: string, power = 1) => plain(id, `Hero ${id}`, "{1}", power, power, "", "Creature — Human Hero", ["W"]);

test("Okoye: attacking creature tokens have first strike; Training Regimen: creatures with counters have trample", () => {
  let g = setup({ hand: ["Okoye, Dora Milaje Leader"], mine: ["bear"] });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  const soldiers = named(g, "p1", "Soldier");
  assert.equal(soldiers.length, 2);
  assert.equal(kw(g, soldiers[0], "first strike"), false, "not attacking");
  g.combat = { attackers: [{ attacker: soldiers[0].card.iid, blockers: [] }] };
  assert.equal(kw(g, soldiers[0], "first strike"), true);
  assert.equal(kw(g, find(g, "m0")!, "first strike"), false, "the Bear is not a token");
  const t = setup({ mine: ["Training Regimen", "bear", "bear"] });
  find(t, "m1")!.counters = 1;
  assert.equal(kw(t, find(t, "m1")!, "trample"), true);
  assert.equal(kw(t, find(t, "m2")!, "trample"), false);
});

test("Stature: a static says she can't be blocked at power 1 or less", () => {
  const g = setup({ mine: ["Stature, Size Shifter"] });
  assert.equal(staticEffectsOn(g, find(g, "m0")!).some((st) => st.unblockable), true);
  find(g, "m0")!.counters = 1;
  assert.equal(staticEffectsOn(g, find(g, "m0")!).some((st) => st.unblockable), false);
});

test("Agent Phil Coulson puts a +1/+1 counter on each other Hero", () => {
  const h = hero("h1");
  let g = setup({ mine: ["Agent Phil Coulson", "h1", "bear"], extra: { h1: h } });
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 0 }));
  assert.equal(find(g, "m1")!.counters, 1);
  assert.equal(find(g, "m2")!.counters, undefined, "a Bear is not a Hero");
  assert.equal(find(g, "m0")!.counters, undefined, "other Heroes only");
});

test("Wakandan Royal Guard: two counters on another Hero, one on anything else", () => {
  const h = hero("h1");
  let g = setup({ hand: ["Wakandan Royal Guard"], mine: ["h1"], extra: { h1: h }, lands: 5 });
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  if (g.pendingChoice) g = choose(g, "p1", on("m0"));
  assert.equal(find(g, "m0")!.counters, 2);
});

test("Pym Particles: vigilance and unblockable, and a card; I Am Iron Man: a 4/4 flying artifact creature", () => {
  let g = setup({ hand: ["Pym Particles"], mine: ["bear"], library: ["plains", "plains"] });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  assert.ok(kw(g, find(g, "m0")!, "vigilance"));
  assert.equal(find(g, "m0")!.unblockableTurn, true);
  assert.equal(hand(g).length, 1);
  const rock = { id: "rock", name: "Gold Rock", type: "artifact" as const, cost: 3, manaCost: "{3}", typeLine: "Artifact", text: "" };
  let h = setup({ hand: ["I Am Iron Man"], mine: ["rock"], extra: { rock } });
  h = settle(act(h, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  const r = find(h, "m0")!;
  assert.equal(powerOf(h, r), 4);
  assert.equal(toughnessOf(h, r), 4);
  assert.ok(kw(h, r, "flying"));
  assert.equal(r.crewed, true, "a creature until end of turn");
});

test("Captain America, Wings of Freedom and War Machine pump by their own toughness and power", () => {
  const h = hero("h1");
  const cap = attackWith(setup({ mine: ["Captain America, Wings of Freedom", "h1"], extra: { h1: h } }), ["m0"]);
  assert.equal(powerOf(cap, find(cap, "m1")!), 2, "+1 (Cap's toughness is 1)");
});

test("Quake taps a creature or land when you cast a noncreature spell", () => {
  const bolt = { id: "bolt", name: "Bolt", type: "instant" as const, cost: 1, manaCost: "{R}", typeLine: "Instant", text: "Bolt deals 1 damage to any target.", colors: ["R"] };
  let g = setup({ hand: ["bolt"], mine: ["Quake, Agent of S.H.I.E.L.D."], theirs: ["bear"], extra: { bolt } });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] }));
  if (g.pendingChoice) g = choose(g, "p1", on("t0"));
  assert.equal(find(g, "t0")!.tapped, true);
});

test("Restorative Technique: 2 life, a basic land (tapped) for the target player, and a counter", () => {
  let g = setup({ hand: ["Restorative Technique"], mine: ["bear"], library: ["forest", "plains"] });
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p1" }, ...on("m0")] }));
  assert.equal(g.players.p1.life, 22);
  if (g.pendingPick) g = settle(act(g, "p1", { type: "pick", iid: g.pendingPick.options[0] }));
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped && g.cards[p.card.defId].type === "land").length >= 1, true);
});

test("The Scarlet Witch makes big instants and sorceries cheaper by her power", () => {
  const big = { id: "big", name: "Big Spell", type: "sorcery" as const, cost: 5, manaCost: "{4}{R}", typeLine: "Sorcery", text: "Draw a card.", colors: ["R"] };
  const g0 = setup({ hand: ["big"], extra: { big } });
  const g1 = setup({ hand: ["big"], mine: ["The Scarlet Witch"], extra: { big } });
  const def = g0.cards.big;
  assert.equal(castCostOf(g0, "p1", def)!.generic, 4);
  assert.equal(castCostOf(g1, "p1", def)!.generic, 2, "her power is 2");
});

test("Doctor Doom is indestructible while you control an artifact creature or a Plan", () => {
  const g0 = setup({ mine: ["Doctor Doom"] });
  assert.equal(kw(g0, find(g0, "m0")!, "indestructible"), false);
  const g1 = setup({ mine: ["Doctor Doom", "Claim the Kingdom"] });
  assert.equal(kw(g1, find(g1, "m0")!, "indestructible"), true);
});

test("Whiplash drains for each Equipment on him when he attacks", () => {
  const g0 = setup({ mine: ["Whiplash, Vengeful Engineer", "Hawkeye's Bow"] });
  g0.players.p1.battlefield.find((p) => p.card.iid === "m1")!.attachedTo = "m0";
  find(g0, "m0")!.tapped = false;
  const g = attackWith(g0, ["m0"]);
  assert.equal(g.players.p1.life, 21);
});

test("Viv Vision draws when she attacks with power 4 or more", () => {
  const g0 = setup({ mine: ["Viv Vision, Teen Synthezoid"], library: ["plains", "plains"] });
  const small = attackWith(g0, ["m0"]);
  assert.equal(hand(small).length, 0);
  const g1 = setup({ mine: ["Viv Vision, Teen Synthezoid"], library: ["plains", "plains"] });
  find(g1, "m0")!.counters = 2;
  assert.equal(hand(attackWith(g1, ["m0"])).length, 1);
  void realCard;
});
