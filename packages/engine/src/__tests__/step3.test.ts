import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCyclable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", keywords: string[] = [], manaCost = "{R}"): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost, power, toughness, text, keywords });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  cycler: { id: "cycler", name: "Cycler", type: "creature", cost: 3, manaCost: "{3}{R}", power: 3, toughness: 3, text: "Cycling {2}", keywords: ["cycling"] },
  spellcycler: { id: "spellcycler", name: "Spellcycler", type: "instant", cost: 1, manaCost: "{R}", text: "Spellcycler deals 1 damage to any target.\nCycling {1}", keywords: ["cycling"] },
  trog: creature("trog", 2, 2, "{R}: Regenerate Trog.", ["regenerate"]),
  bear: creature("bear", 2, 2),
  giant: creature("giant", 3, 3),
  grow: { id: "grow", name: "Grow", type: "instant", cost: 1, manaCost: "{R}", text: "Put a +1/+1 counter on target creature." },
  grow2: { id: "grow2", name: "Grow Two", type: "instant", cost: 1, manaCost: "{R}", text: "Put two +1/+1 counters on target creature you control." },
  slay: { id: "slay", name: "Slay", type: "instant", cost: 1, manaCost: "{R}", text: "Destroy target creature." },
  slayfinal: { id: "slayfinal", name: "Slay Final", type: "instant", cost: 1, manaCost: "{R}", text: "Destroy target creature. It can't be regenerated." },
  shock: { id: "shock", name: "Shock", type: "instant", cost: 1, manaCost: "{R}", text: "Shock deals 3 damage to any target." },
  lasher: creature("lasher", 1, 1, "When this creature enters, put a +1/+1 counter on it."),
  hydra: { id: "hydra", name: "Hydra", type: "creature", cost: 1, manaCost: "{X}{R}", power: 0, toughness: 0, text: "Hydra enters with X +1/+1 counters on it." },
  sapling: creature("sapling", 1, 1, "{R}: Put a +1/+1 counter on Sapling."),
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = [], opponentHand: string[] = [], lands = 4): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = opponentHand.map((d, i) => ({ iid: `o${i}`, defId: d, owner: "p2" }));
  g.players.p1.battlefield = [...Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  return g;
}
function act(s: GameState, p: PlayerId, a: Action): GameState {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid)!;
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("the new texts are understood", () => {
  for (const id of ["cycler", "spellcycler", "trog", "grow", "grow2", "slayfinal", "lasher", "hydra", "sapling"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

// ───────── cycling ─────────

test("cycling: pay the cost, discard the card, draw a card", () => {
  let g = setup(["cycler"]);
  g.phase = "main1";
  assert.deepEqual(getCyclable(g, "p1").map((c) => c.iid), ["h0"]);
  const library = g.players.p1.library.length;
  g = act(g, "p1", { type: "cycle", iid: "h0" });
  assert.equal(g.players.p1.graveyard.some((c) => c.iid === "h0"), true);
  assert.equal(g.players.p1.library.length, library - 1);
  assert.equal(g.players.p1.hand.length, 1); // the cycled card is replaced by the drawn one
  assert.equal(g.players.p1.battlefield.filter((p) => p.tapped).length, 2); // {2}
});

test("you can't cycle without the mana, or a card without cycling", () => {
  const g = setup(["cycler", "bear"], [], [], [], 1);
  assert.equal(applyAction(g, "p1", { type: "cycle", iid: "h0" }).ok, false); // {2} with one land
  const h = setup(["bear"]);
  assert.equal(applyAction(h, "p1", { type: "cycle", iid: "h0" }).ok, false);
});

test("an instant can be cycled too, and its other text is read as before", () => {
  let g = setup(["spellcycler"]);
  g = act(g, "p1", { type: "cycle", iid: "h0" });
  assert.equal(g.players.p1.graveyard.length, 1);
});

// ───────── regeneration ─────────

test("a regeneration shield saves the creature from lethal damage: it is tapped and healed", () => {
  let g = setup(["shock"], ["trog"], [], [], 3);
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.equal(find(g, "m0").regenShield, 1);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }); // 3 damage to a 2/2, but the shield saves it
  const trog = find(g, "m0");
  assert.ok(trog, "still on the battlefield");
  assert.equal(trog.tapped, true);
  assert.equal(trog.damage, 0);
  assert.equal(trog.regenShield, 0);
});

test("a regeneration shield also saves from a destroy effect, once", () => {
  let g = setup(["slay"], [], ["trog"]);
  g.players.p2.battlefield[g.players.p2.battlefield.length - 1].regenShield = 1;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  g = act(g, "p2", { type: "passPriority" }); // the opponent could regenerate again: they pass
  assert.ok(find(g, "t0"));
  assert.equal(find(g, "t0").tapped, true);
  g.players.p1.hand = [{ iid: "h1", defId: "slay", owner: "p1" }];
  g = act(g, "p1", { type: "castSpell", iid: "h1", targets: on("t0") });
  g = act(g, "p2", { type: "passPriority" });
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "t0"), false); // the shield was used up
});

test("'It can't be regenerated' beats the shield", () => {
  let g = setup(["slayfinal"], [], ["trog"]);
  g.players.p2.battlefield[g.players.p2.battlefield.length - 1].regenShield = 1;
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  g = act(g, "p2", { type: "passPriority" });
  assert.equal(g.players.p2.battlefield.some((p) => p.card.iid === "t0"), false);
});

test("a regenerated attacker survives and is taken out of combat", () => {
  let g = setup([], ["trog"], ["giant"]);
  g.players.p1.hand = [];
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" }); // the attacker may act first, here nothing is done
  g = act(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] });
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] }); // regenerate before damage
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  const trog = find(g, "m0");
  assert.ok(trog, "the 2/2 survived a 3/3 blocker");
  assert.equal(trog.tapped, true);
  assert.equal(trog.damage, 0);
  assert.equal(g.phase, "main2");
});

test("a shield wears off at the end of the turn", () => {
  let g = setup([], ["trog"]);
  g.players.p1.hand = [];
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.equal(find(g, "m0").regenShield, 1);
  g.phase = "end";
  g = act(g, "p1", { type: "passPhase" });
  assert.equal(find(g, "m0").regenShield ?? 0, 0);
});

// ───────── +1/+1 counters ─────────

test("put a +1/+1 counter on a creature: it stays, and changes power and toughness", () => {
  let g = setup(["grow"], ["bear"]);
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") });
  assert.equal(powerOf(g, find(g, "m0")), 3);
  assert.equal(toughnessOf(g, find(g, "m0")), 3);
  assert.equal(find(g, "m0").counters, 1);

  let h = setup(["grow2"], ["bear"]);
  h = act(h, "p1", { type: "castSpell", iid: "h0", targets: on("m0") });
  assert.equal(powerOf(h, find(h, "m0")), 4);
  // Not your creature: illegal.
  const bad = setup(["grow2"], [], ["bear"]);
  assert.equal(applyAction(bad, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }).ok, false);
});

test("a creature that puts a counter on itself when it enters", () => {
  let g = setup(["lasher"]);
  g.phase = "main1";
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(powerOf(g, find(g, "h0")), 2);
});

test("a creature that enters with X counters: X is paid when it is cast", () => {
  let g = setup(["hydra"]);
  g.phase = "main1";
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: [], x: 3 });
  assert.equal(powerOf(g, find(g, "h0")), 3);
  assert.equal(toughnessOf(g, find(g, "h0")), 3);
});

test("a counter ability can be used again and again", () => {
  let g = setup([], ["sapling"]);
  g.players.p1.hand = [];
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  g = act(g, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: [] });
  assert.equal(find(g, "m0").counters, 2);
  assert.equal(powerOf(g, find(g, "m0")), 3);
});

// ───────── -1/-1 counters ─────────

test("-1/-1 counters shrink a creature, cancel +1/+1 counters, and can kill it", () => {
  const defs = {
    wither: { id: "wither", name: "Wither", type: "instant", cost: 1, manaCost: "{R}", text: "Put a -1/-1 counter on target creature." },
    ghost: { id: "ghost", name: "Ghost", type: "creature", cost: 1, manaCost: "{R}", power: 3, toughness: 3, text: "Ghost enters with two -1/-1 counters on it." },
  } as Record<string, CardDef>;
  let g = setup(["wither", "wither", "ghost"], ["bear"]);
  g.cards = { ...g.cards, ...defs };
  g = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") });
  assert.equal(powerOf(g, find(g, "m0")), 1);
  assert.equal(find(g, "m0").minusCounters, 1);
  // a +1/+1 counter cancels it
  find(g, "m0").counters = 1;
  g = act(g, "p1", { type: "castSpell", iid: "h1", targets: on("m0") });
  assert.equal(find(g, "m0").minusCounters, 1); // two -1/-1 and one +1/+1: one pair cancels, one -1/-1 is left
  assert.equal(find(g, "m0").counters ?? 0, 0);
  // a creature that enters with -1/-1 counters
  g = act(g, "p1", { type: "castSpell", iid: "h2", targets: [] });
  assert.equal(powerOf(g, find(g, "h2")), 1);
  assert.equal(toughnessOf(g, find(g, "h2")), 1);
});

test("an instant cast after attackers are declared affects them: 'attacking creatures get +2/+0'", () => {
  let g = setup([], ["trog"], ["giant"]);
  g.cards.rally = { id: "rally", name: "Rally", type: "instant", cost: 0, manaCost: "", text: "Attacking creatures get +2/+0 until end of turn." };
  g.players.p1.hand = [{ iid: "h9", defId: "rally", owner: "p1" }];
  g.phase = "attackers";
  g = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.equal(g.priority?.holder, "p1", "the attacker gets to act before blockers");
  g = act(g, "p1", { type: "castSpell", iid: "h9", targets: [] });
  while (g.priority) g = act(g, g.priority.holder, { type: "passPriority" });
  assert.equal(find(g, "m0")?.powerBonus, 2);
});
