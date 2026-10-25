import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, getCastable, isSupportedCard, powerOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const spell = (id: string, name: string, text: string, manaCost = "{R}"): CardDef => ({ id, name, type: "sorcery", cost: 1, manaCost, text, keywords: ["kicker"] });
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  blink: spell("blink", "Blink", "Kicker {1}\nReturn target creature to its owner's hand. If this spell was kicked, draw a card."),
  roil: spell("roil", "Roil", "Kicker {2}\nRoil deals 2 damage to any target. If this spell was kicked, it deals 5 damage instead."),
  might: spell("might", "Might", "Kicker {1}\nTarget creature gets +1/+1 until end of turn. If this spell was kicked, that creature gets +4/+4 until end of turn instead."),
  recluse: { id: "recluse", name: "Recluse", type: "creature", cost: 2, manaCost: "{1}{R}", power: 1, toughness: 1, keywords: ["kicker"], text: "Kicker {2}\nIf this creature was kicked, it enters with two +1/+1 counters on it." },
  sergeant: { id: "sergeant", name: "Sergeant", type: "creature", cost: 2, manaCost: "{1}{R}", power: 1, toughness: 1, keywords: ["kicker"], text: "Kicker {2}\nWhen this creature enters, if it was kicked, create two 1/1 white Soldier creature tokens." },
  bear: { id: "bear", name: "Bear", type: "creature", cost: 1, manaCost: "{R}", power: 2, toughness: 2 },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });

function setup(hand: string[], lands: number, theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.battlefield = Array.from({ length: lands }, (_, i) => perm(`l${i}`, "mountain"));
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
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
const on = (iid: string) => [{ kind: "permanent" as const, iid }];

test("kicker cards are understood", () => {
  for (const id of ["blink", "roil", "might", "recluse", "sergeant"]) assert.equal(isSupportedCard(DEFS[id]), true, id);
});

test("kicker is offered only when you can pay for it too", () => {
  assert.equal(getCastable(setup(["recluse"], 2), "p1")[0].kicker, undefined); // {1}{R} only
  assert.equal(getCastable(setup(["recluse"], 4), "p1")[0].kicker, "{2}");
});

test("a kicked spell costs more, and you can't kick without the mana", () => {
  const g = setup(["roil"], 2, ["bear"]);
  const r = applyAction(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0"), kicked: true });
  assert.equal(r.ok, false); // {R} + kicker {2} = 3 mana, only 2 lands
  const ok = act(setup(["roil"], 3, ["bear"]), "p1", { type: "castSpell", iid: "h0", targets: on("t0"), kicked: true });
  assert.equal(ok.players.p1.battlefield.filter((p) => p.tapped).length, 3);
});

test("'If this spell was kicked, it deals 5 damage instead'", () => {
  const plain = act(setup(["roil"], 3), "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }] });
  assert.equal(plain.players.p2.life, 18);
  const kicked = act(setup(["roil"], 3), "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], kicked: true });
  assert.equal(kicked.players.p2.life, 15);
});

test("'If this spell was kicked, draw a card' adds an effect", () => {
  const library = setup(["blink"], 2, ["bear"]).players.p1.library.length;
  const plain = act(setup(["blink"], 2, ["bear"]), "p1", { type: "castSpell", iid: "h0", targets: on("t0") });
  assert.equal(plain.players.p1.library.length, library);
  const kicked = act(setup(["blink"], 2, ["bear"]), "p1", { type: "castSpell", iid: "h0", targets: on("t0"), kicked: true });
  assert.equal(kicked.players.p1.library.length, library - 1);
  assert.equal(kicked.players.p2.hand.length, 1); // the bounce happened either way
});

test("'that creature gets +4/+4 instead'", () => {
  const mine = (kicked: boolean) => {
    const g = setup(["might"], 2);
    g.players.p1.battlefield.push(perm("m0", "bear"));
    const s = act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0"), ...(kicked ? { kicked } : {}) });
    return powerOf(s, s.players.p1.battlefield.find((p) => p.card.iid === "m0")!);
  };
  assert.equal(mine(false), 3);
  assert.equal(mine(true), 6);
});

test("a kicked creature enters with counters", () => {
  const plain = act(setup(["recluse"], 4), "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(powerOf(plain, plain.players.p1.battlefield.find((p) => p.card.iid === "h0")!), 1);
  const kicked = act(setup(["recluse"], 4), "p1", { type: "castSpell", iid: "h0", targets: [], kicked: true });
  assert.equal(powerOf(kicked, kicked.players.p1.battlefield.find((p) => p.card.iid === "h0")!), 3);
});

test("a kicked enter-trigger only happens when it was kicked", () => {
  const plain = act(setup(["sergeant"], 4), "p1", { type: "castSpell", iid: "h0", targets: [] });
  assert.equal(plain.players.p1.battlefield.filter((p) => p.card.defId.startsWith("token-")).length, 0);
  const kicked = act(setup(["sergeant"], 4), "p1", { type: "castSpell", iid: "h0", targets: [], kicked: true });
  assert.equal(kicked.players.p1.battlefield.filter((p) => p.card.defId.startsWith("token-")).length, 2);
});
