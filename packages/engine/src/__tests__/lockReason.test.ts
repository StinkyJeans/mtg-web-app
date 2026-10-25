import { test } from "node:test";
import assert from "node:assert/strict";
import { abilityLockReason, applyAction, CARDS, createGame, getActivatable } from "../index.js";
import type { CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const speaker: CardDef = { id: "speaker", name: "Speaker of the Heavens", type: "creature", cost: 3, manaCost: "{2}{W}", power: 2, toughness: 2, typeLine: "Creature — Human Cleric", colors: ["W"], text: "{T}: Create a 4/4 white Angel creature token with flying. Activate only if you have at least 7 life more than your starting life total and only as a sorcery." };
const pinger: CardDef = { id: "pinger", name: "Pinger", type: "creature", cost: 1, manaCost: "{1}", power: 1, toughness: 1, typeLine: "Creature — Test", text: "{T}: You gain 1 life." };

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(life: number, id: string): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...CARDS, speaker, pinger };
  g.players.p1.hand = [];
  g.players.p1.battlefield = [perm("l0", "mountain"), perm("m0", id)];
  g.players.p1.life = life;
  g.phase = "main1";
  g.active = "p1";
  return g;
}

test("a {T} ability can be used and taps the permanent", () => {
  const g = setup(20, "pinger");
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0");
  assert.ok(a, "listed as usable");
  assert.equal(abilityLockReason(g, "p1", g.players.p1.battlefield[1], a.index), null);
  const r = applyAction(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] });
  assert.ok(r.ok);
  assert.equal(r.ok && r.state.players.p1.battlefield[1].tapped, true);
});

test("an ability with a life requirement says so, and works once the life is there", () => {
  const low = setup(20, "speaker");
  assert.equal(getActivatable(low, "p1").some((x) => x.iid === "m0"), false);
  assert.equal(abilityLockReason(low, "p1", low.players.p1.battlefield[1], 0), "you need at least 27 life (you have 20)");
  const high = setup(27, "speaker");
  assert.ok(getActivatable(high, "p1").some((x) => x.iid === "m0"));
  assert.equal(abilityLockReason(high, "p1", high.players.p1.battlefield[1], 0), null);
});

test("the reasons for a locked ability: tapped, just arrived, wrong time", () => {
  const g = setup(30, "speaker");
  const p = g.players.p1.battlefield[1];
  p.tapped = true;
  assert.equal(abilityLockReason(g, "p1", p, 0), "it is tapped");
  p.tapped = false;
  p.summoningSick = true;
  assert.equal(abilityLockReason(g, "p1", p, 0), "it just arrived (summoning sick)");
  p.summoningSick = false;
  g.phase = "attackers";
  assert.equal(abilityLockReason(g, "p1", p, 0), "only in your main phase with an empty stack");
});
