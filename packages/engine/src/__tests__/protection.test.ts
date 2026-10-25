import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getPossibleBlockers, isSupportedCard } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text: string, colors: string[], keywords: string[] = [], extra: Partial<CardDef> = {}): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost: 1,
  manaCost: "{R}",
  power,
  toughness,
  text,
  colors,
  keywords,
  typeLine: "Creature — Test",
  ...extra,
});
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  knight: creature("knight", 2, 2, "Protection from red", ["W"], ["protection"]),
  flyingKnight: creature("flyingKnight", 2, 2, "Flying, protection from red", ["W"], ["flying", "protection"]),
  paladin: creature("paladin", 2, 2, "Protection from white and from blue", ["R"], ["protection"]),
  tin: creature("tin", 2, 2, "Protection from artifacts", ["W"], ["protection"]),
  redbear: creature("redbear", 2, 2, "", ["R"]),
  greenbear: creature("greenbear", 2, 2, "", ["G"]),
  proGreen: creature("proGreen", 1, 3, "Protection from green", ["W"], ["protection"]),
  golem: creature("golem", 2, 2, "", [], [], { typeLine: "Artifact Creature — Golem" }),
  redbolt: { id: "redbolt", name: "Redbolt", type: "instant", cost: 1, manaCost: "{R}", colors: ["R"], text: "Redbolt deals 3 damage to any target." },
  greenbolt: { id: "greenbolt", name: "Greenbolt", type: "instant", cost: 1, manaCost: "{R}", colors: ["G"], text: "Greenbolt deals 3 damage to any target." },
  redstorm: { id: "redstorm", name: "Redstorm", type: "sorcery", cost: 1, manaCost: "{R}", colors: ["R"], text: "Redstorm deals 3 damage to each creature." },
  redaura: { id: "redaura", name: "Redaura", type: "enchantment", cost: 1, manaCost: "{R}", colors: ["R"], typeLine: "Enchantment — Aura", keywords: ["enchant"], text: "Enchant creature\nEnchanted creature gets +1/+1." },
  rock: { id: "rock", name: "Rock", type: "artifact", cost: 1, manaCost: "{R}", typeLine: "Artifact", text: "{T}: Add {R}." },
  rockzap: { id: "rockzap", name: "Rockzap", type: "artifact", cost: 1, manaCost: "{R}", typeLine: "Artifact", text: "{T}: Rockzap deals 1 damage to any target." },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p1.battlefield = [...Array.from({ length: 4 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
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

test("protection texts are understood", () => {
  for (const id of ["knight", "flyingKnight", "paladin", "tin"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("protection: can't be targeted by a spell of that color, but can by other colors", () => {
  const g = setup(["redbolt", "greenbolt"], [], ["knight"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }).ok, false);
  const ok = act(g, "p1", { type: "castSpell", iid: "h1", targets: on("t0") });
  assert.equal(find(ok, "t0"), undefined); // 3 damage from a green spell kills the 2/2
});

test("protection: damage from a source of that color that doesn't target is prevented", () => {
  const g = setup(["redstorm"], ["redbear"], ["knight"]);
  const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.ok(find(s, "t0"), "the protected creature survived");
  assert.equal(find(s, "t0")!.damage, 0);
  assert.equal(find(s, "m0"), undefined); // an unprotected red bear died
});

test("protection from two colors (and from ...)", () => {
  const g = setup([], [], ["paladin"]);
  assert.equal(g.cards.paladin.text, "Protection from white and from blue");
  // a white or blue source can't target it: use stamped targeting through spells
  const white = { ...DEFS.redbolt, id: "whitebolt", colors: ["W"], name: "Whitebolt", text: "Whitebolt deals 3 damage to any target." };
  const blue = { ...DEFS.redbolt, id: "bluebolt", colors: ["U"], name: "Bluebolt", text: "Bluebolt deals 3 damage to any target." };
  const h = setup(["whitebolt", "bluebolt", "redbolt"], [], ["paladin"]);
  h.cards = { ...h.cards, whitebolt: white, bluebolt: blue };
  assert.equal(applyAction(h, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }).ok, false);
  assert.equal(applyAction(h, "p1", { type: "castSpell", iid: "h1", targets: on("t0") }).ok, false);
  assert.equal(applyAction(h, "p1", { type: "castSpell", iid: "h2", targets: on("t0") }).ok, true);
});

test("protection: a creature of that color can't block it", () => {
  const g = setup([], ["knight"], ["redbear", "greenbear"]);
  g.phase = "attackers";
  const s = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.deepEqual(getPossibleBlockers(s).sort(), ["t0", "t1"]); // the list only filters tapped creatures; the rule is enforced on declaring
  assert.equal(applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false); // red
  assert.equal(applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t1", attacker: "m0" }] }).ok, true); // green
});

test("protection: combat damage from that color is prevented", () => {
  const g = setup([], ["greenbear"], ["proGreen"]);
  g.phase = "attackers";
  let s = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  s = act(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] });
  assert.equal(find(s, "t0")!.damage, 0); // the 2 damage from the green bear was prevented
  assert.equal(find(s, "m0")!.damage, 1); // the blocker still hits back
});

test("protection from artifacts: artifact creatures can't block it, and artifact abilities can't target it", () => {
  const g = setup([], ["tin"], ["golem", "redbear"]);
  g.phase = "attackers";
  const s = act(g, "p1", { type: "declareAttackers", attackers: ["m0"] });
  assert.equal(applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);
  assert.equal(applyAction(s, "p2", { type: "declareBlockers", blocks: [{ blocker: "t1", attacker: "m0" }] }).ok, true);
  const h = setup([], ["rockzap"], ["tin"]);
  assert.equal(applyAction(h, "p1", { type: "activateAbility", iid: "m0", index: 0, targets: on("t0") }).ok, false);
});

test("an Aura of a color the creature is protected from can't be put on it", () => {
  const g = setup(["redaura"], [], ["knight"]);
  assert.equal(applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }).ok, false);
});
