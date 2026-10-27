import { test } from "node:test";
import assert from "node:assert/strict";
import { getCastable, parseCard } from "../index.js";
import type { Action } from "../index.js";
import { act, fails, find, hand, named, on, plain, realCard, setup, settle } from "./marvelKit.js";

// Teamwork: tap creatures with total power N or more as an additional cost; the spell then does more.

const cast = (g: ReturnType<typeof setup>, iid: string, rest: Partial<Extract<Action, { type: "castSpell" }>> = {}) => act(g, "p1", { type: "castSpell", iid, ...rest });

test("teamwork is read as a cost, not as text", () => {
  const p = parseCard(realCard("Go Nuts!"));
  assert.equal(p.ok, true);
  assert.equal(p.teamwork, 3);
  assert.equal(p.spell?.modal?.bothIfKicked, true);
  assert.equal(p.spell?.modal?.max, 1);
});

test("Go Nuts!: one mode normally, both with teamwork", () => {
  const g0 = setup({ hand: ["Go Nuts!"], mine: ["bear", "giant"], theirs: ["bear"] });
  // m0 = Bear, m1 = Giant (power 6), t0 = their Bear
  assert.match(fails(g0, "p1", { type: "castSpell", iid: "h0", modes: [0, 1], targets: [...on("m0"), ...on("m0"), ...on("t0")] }), /choose one mode/);
  const one = settle(cast(g0, "h0", { modes: [0], targets: on("m0") }));
  assert.equal(find(one, "m0")!.counters, 1);
  assert.equal(find(one, "m1")!.tapped, false);

  const both = settle(cast(g0, "h0", { modes: [0, 1], teamwork: ["m1"], targets: [...on("m0"), ...on("m0"), ...on("t0")] }));
  assert.equal(find(both, "m1")!.tapped, true, "the Giant was tapped for teamwork");
  assert.equal(find(both, "m0")!.counters, 1);
  assert.equal(find(both, "t0"), undefined, "the fight killed their Bear");
});

test("teamwork needs enough total power and untapped creatures", () => {
  const g0 = setup({ hand: ["Go Nuts!"], mine: ["bear", "elf"], theirs: ["bear"] });
  assert.match(fails(g0, "p1", { type: "castSpell", iid: "h0", modes: [0], teamwork: ["m0"], targets: on("m0") }), /total power 3/);
  g0.players.p1.battlefield.find((p) => p.card.iid === "m1")!.tapped = true;
  assert.match(fails(g0, "p1", { type: "castSpell", iid: "h0", modes: [0], teamwork: ["m0", "m1"], targets: on("m0") }), /untapped creatures/);
  const ok = setup({ hand: ["Go Nuts!"], mine: ["bear", "elf"], theirs: ["bear"] });
  const done = settle(cast(ok, "h0", { modes: [0], teamwork: ["m0", "m1"], targets: on("m0") }));
  assert.equal(find(done, "m0")!.tapped && find(done, "m1")!.tapped, true);
});

test("getCastable offers teamwork only when the creatures are enough", () => {
  const few = setup({ hand: ["Repulsor Blast"], mine: ["elf"], theirs: ["bear"] });
  assert.equal(getCastable(few, "p1").find((c) => c.iid === "h0")?.teamwork, undefined);
  const enough = setup({ hand: ["Repulsor Blast"], mine: ["bear"], theirs: ["bear"] });
  assert.deepEqual(getCastable(enough, "p1").find((c) => c.iid === "h0")?.teamwork, { n: 2, options: ["m0"] });
});

test("Repulsor Blast: 5 damage, and 2 more to the controller with teamwork", () => {
  const g0 = setup({ hand: ["Repulsor Blast"], mine: ["bear"], theirs: ["giant"] });
  const plainCast = settle(cast(g0, "h0", { targets: on("t0") }));
  assert.equal(plainCast.players.p2.life, 20);
  assert.equal(find(plainCast, "t0")!.damage, 5);
  const team = settle(cast(g0, "h0", { teamwork: ["m0"], targets: on("t0") }));
  assert.equal(team.players.p2.life, 18);
  assert.equal(find(team, "m0")!.tapped, true);
});

test("Team Tactics: double strike, and trample too with teamwork", () => {
  const g0 = setup({ hand: ["Team Tactics"], mine: ["elf", "bear"] });
  const a = settle(cast(g0, "h0", { targets: on("m0") }));
  assert.deepEqual(find(a, "m0")!.tempKeywords, ["double strike"]);
  const b = settle(cast(g0, "h0", { teamwork: ["m1"], targets: on("m0") }));
  assert.deepEqual([...(find(b, "m0")!.tempKeywords ?? [])].sort(), ["double strike", "trample"]);
});

test("Helicarrier Strike: 2 damage, 4 with teamwork", () => {
  const base = setup({ hand: ["Helicarrier Strike"], mine: ["bear"], theirs: ["giant"] });
  base.phase = "blockers";
  // an attacking creature of theirs is needed: make the Giant attack
  base.combat = { attackers: [{ attacker: "t0", blockers: [] }] };
  base.active = "p2";
  base.priority = { holder: "p1", passes: 0, then: null };
  const a = settle(cast(base, "h0", { targets: on("t0") }));
  assert.equal(find(a, "t0")!.damage, 2);
  const b = settle(cast(base, "h0", { teamwork: ["m0"], targets: on("t0") }));
  assert.equal(find(b, "t0")!.damage, 4);
});

test("Widow's Bite: one mode, or both with teamwork", () => {
  const g0 = setup({ hand: ["Widow's Bite"], mine: ["giant"], theirs: ["bear"] });
  const both = settle(cast(g0, "h0", { modes: [0, 1], teamwork: ["m0"], targets: [...on("m0"), ...on("t0")] }));
  assert.ok(find(both, "m0")!.tempKeywords?.includes("deathtouch"));
  assert.equal(find(both, "t0"), undefined, "-2/-2 killed their Bear");
});

test("Cruel Alliance: mana value 3 or less, any creature with teamwork (and 3 life)", () => {
  const g0 = setup({ hand: ["Cruel Alliance"], mine: ["bear"], theirs: ["giant"] });
  // the Giant has mana value 5: not a legal target without teamwork
  assert.equal(getCastable(setup({ hand: ["Cruel Alliance"], theirs: ["giant"] }), "p1").some((c) => c.iid === "h0"), false);
  assert.equal(getCastable(g0, "p1").some((c) => c.iid === "h0"), true, "castable because teamwork could be used");
  assert.match(fails(g0, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }), /target/i);
  const done = settle(cast(g0, "h0", { teamwork: ["m0"], targets: on("t0") }));
  assert.equal(find(done, "t0"), undefined);
  assert.equal(done.players.p1.life, 23);
  // a cheap creature needs no teamwork and gains no life
  const cheap = setup({ hand: ["Cruel Alliance"], theirs: ["bear"] });
  const plainCast = settle(cast(cheap, "h0", { targets: on("t0") }));
  assert.equal(find(plainCast, "t0"), undefined);
  assert.equal(plainCast.players.p1.life, 20);
});

test("We Say Thee Nay!: counter unless {2}, or unless {4} with teamwork", () => {
  const mk = (spare: number) => {
    const g = setup({ hand: ["We Say Thee Nay!"], mine: ["bear"], oppHand: ["bear"], lands: 3 });
    // p2 casts a Bear (a creature spell) and p1 responds
    g.active = "p2";
    g.phase = "main1";
    g.players.p2.battlefield = Array.from({ length: spare + 2 }, (_, i) => ({ card: { iid: `pl${i}`, defId: "plains", owner: "p2" as const }, tapped: false, summoningSick: false, damage: 0 }));
    return act(g, "p2", { type: "castSpell", iid: "oh0", targets: [] });
  };
  const respond = (g: ReturnType<typeof setup>, rest: Partial<Extract<Action, { type: "castSpell" }>>) => {
    const spell = g.stack[g.stack.length - 1].id;
    return settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "stack", id: spell }], ...rest }));
  };
  assert.ok(realCard("We Say Thee Nay!").text, "has text");
  // Their Bear costs {2}: with 4 lands they have 2 spare, which pays {2} but not {4}
  const plainCast = respond(mk(2), {});
  assert.equal(plainCast.pendingPick?.kind, "ward", "they are asked to pay {2}");
  const paid = settle(act(plainCast, "p2", { type: "pick", iid: "pay" }));
  assert.equal(named(paid, "p2", "Bear").length, 1, "they paid {2}: the Bear is not countered");
  const teamed = respond(mk(2), { teamwork: ["m0"] });
  assert.equal(named(teamed, "p2", "Bear").length, 0, "{4} could not be paid: the Bear is countered");
  assert.deepEqual(hand(teamed, "p1"), []);
});

test("Agent Maria Hill: tapped for teamwork, she grows and draws", () => {
  const g0 = setup({ hand: ["Repulsor Blast"], mine: ["Agent Maria Hill"], theirs: ["bear"] });
  const done = settle(cast(g0, "h0", { teamwork: ["m0"], targets: on("t0") }));
  assert.equal(find(done, "m0")!.counters, 1);
  assert.equal(done.players.p1.hand.length, 1, "she drew a card");
});

test("a spell with teamwork but no creatures to tap is still castable normally", () => {
  const g0 = setup({ hand: ["Murdock's Crusade"], theirs: ["giant"] });
  const c = getCastable(g0, "p1").find((x) => x.iid === "h0");
  assert.ok(c);
  assert.equal(c!.teamwork, undefined);
  const done = settle(cast(g0, "h0", { modes: [0], targets: on("t0") }));
  assert.equal(find(done, "t0"), undefined, "Street Justice exiled the Giant (toughness 6)");
  void plain;
});
