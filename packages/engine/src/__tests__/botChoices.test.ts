import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, botAction, CARDS, createGame, playerToAct, viewFor } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

// The bot's choices in the moments a game hands it: discarding at cleanup, choosing a trigger's target,
// aiming a removal spell, answering a scry, and responding (or not) to a spell.

const creature = (id: string, power: number, toughness: number, text = "", cost = 2): CardDef => ({
  id,
  name: id,
  type: "creature",
  cost,
  manaCost: `{${cost - 1}}{R}`,
  power,
  toughness,
  typeLine: "Creature — Test",
  text,
});
const DEFS: Record<string, CardDef> = {
  ...CARDS,
  bear: creature("bear", 2, 2),
  ogre: creature("ogre", 3, 3, "", 3),
  archer: creature("archer", 1, 1, "When this creature enters, it deals 2 damage to target creature.", 3),
  zap: { id: "zap", name: "Zap", type: "instant", cost: 1, manaCost: "{R}", text: "Zap deals 2 damage to target creature.", typeLine: "Instant" },
  brace: { id: "brace", name: "Brace", type: "instant", cost: 1, manaCost: "{R}", text: "Target creature gets +2/+2 until end of turn.", typeLine: "Instant" },
  glimpse: { id: "glimpse", name: "Glimpse", type: "instant", cost: 1, manaCost: "{R}", text: "Scry 1.\nDraw a card.", typeLine: "Instant" },
};

let n = 0;
const card = (defId: string, owner: PlayerId): CardInstance => ({ iid: `${defId}-${n++}`, defId, owner });
const perm = (defId: string, owner: PlayerId) => ({ card: card(defId, owner), tapped: false, summoningSick: false, damage: 0 });
const lands = (owner: PlayerId, count: number) => Array.from({ length: count }, () => perm("mountain", owner));

/** p1's first main phase, the bot playing p1. */
function setup(mine: ReturnType<typeof perm>[] = [], theirs: ReturnType<typeof perm>[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 5, DEFS);
  g.cards = { ...DEFS };
  g.players.p1.hand = [];
  g.players.p2.hand = [];
  g.players.p1.battlefield = mine;
  g.players.p2.battlefield = theirs;
  g.phase = "main1";
  g.active = "p1";
  return g;
}

const bot = (g: GameState, seat: PlayerId = playerToAct(g)) => botAction(viewFor(g, seat), seat);

function act(g: GameState, who: PlayerId, action: Action): GameState {
  const r = applyAction(g, who, action);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
}

/** Passes priority until the game waits on something other than a pass (a target, a pick) or the stack is empty. */
function settle(g: GameState): GameState {
  for (let i = 0; i < 10 && g.priority && !g.pendingChoice && !g.pendingPick; i++) g = act(g, playerToAct(g), { type: "passPriority" });
  return g;
}

test("the bot never moves out of turn, or once the game is over", () => {
  const g = setup();
  assert.equal(botAction(viewFor(g, "p2"), "p2"), null);
  g.winner = "p2";
  assert.equal(botAction(viewFor(g, "p1"), "p1"), null);
});

test("at cleanup the bot discards down to seven, and with plenty of lands in play it throws lands away first", () => {
  const g = setup(lands("p1", 6));
  g.phase = "cleanup";
  g.players.p1.hand = [card("mountain", "p1"), card("mountain", "p1"), card("bear", "p1"), card("ogre", "p1"), card("bear", "p1"), card("ogre", "p1"), card("bear", "p1"), card("ogre", "p1"), card("bear", "p1")];
  const action = bot(g);
  assert.equal(action?.type, "discard");
  const discarded = action?.type === "discard" ? action.iids : [];
  assert.equal(discarded.length, 2);
  assert.deepEqual(discarded.map((iid) => g.players.p1.hand.find((c) => c.iid === iid)?.defId), ["mountain", "mountain"]);
});

test("a trigger that deals damage goes at the opponent's creature, not the bot's own", () => {
  const mine = perm("ogre", "p1");
  const theirs = perm("bear", "p2");
  let g = setup([...lands("p1", 3), mine], [theirs]);
  const archer = card("archer", "p1");
  g.players.p1.hand = [archer];
  g = settle(act(g, "p1", { type: "castCreature", iid: archer.iid }));
  assert.equal(g.pendingChoice?.player, "p1", "the trigger waits for its target");
  assert.deepEqual(bot(g, "p1"), { type: "chooseTargets", targets: [{ kind: "permanent", iid: theirs.card.iid }] });
});

test("the bot aims removal at the opponent's creature", () => {
  const mine = perm("bear", "p1");
  const theirs = perm("bear", "p2");
  const g = setup([...lands("p1", 1), mine], [theirs]);
  const zap = card("zap", "p1");
  g.players.p1.hand = [zap];
  assert.deepEqual(bot(g), { type: "castSpell", iid: zap.iid, targets: [{ kind: "permanent", iid: theirs.card.iid }] });
});

test("scrying with six lands in play, the bot sends a land on top to the bottom", () => {
  let g = setup(lands("p1", 6));
  const glimpse = card("glimpse", "p1");
  g.players.p1.hand = [glimpse];
  g.players.p1.library[0] = { ...g.players.p1.library[0], defId: "mountain" };
  g = settle(act(g, "p1", { type: "castSpell", iid: glimpse.iid, targets: [] }));
  assert.equal(g.pendingPick?.kind, "scry");
  assert.deepEqual(bot(g, "p1"), { type: "pick", iid: g.players.p1.library[0].iid });
});

/** p2 zaps p1's Bear while the bot (p1) holds `held` and a Mountain to cast it with. */
function zapped(held: string): { g: GameState; bear: string; held: string } {
  const bear = perm("bear", "p1");
  let g = setup([bear, ...lands("p1", 1)], lands("p2", 1));
  g.active = "p2";
  const zap = card("zap", "p2");
  const answer = card(held, "p1");
  g.players.p2.hand = [zap];
  g.players.p1.hand = [answer];
  g = act(g, "p2", { type: "castSpell", iid: zap.iid, targets: [{ kind: "permanent", iid: bear.card.iid }] });
  assert.equal(playerToAct(g), "p1", "the bot gets the chance to respond");
  return { g, bear: bear.card.iid, held: answer.iid };
}

test("the bot saves its creature from damage with a pump spell in response", () => {
  const { g, bear, held } = zapped("brace");
  assert.deepEqual(bot(g, "p1"), { type: "castSpell", iid: held, targets: [{ kind: "permanent", iid: bear }] });
});

test("the bot doesn't respond when its only answer would hurt itself", () => {
  const { g } = zapped("zap"); // its own Zap could only hit its own Bear
  assert.deepEqual(bot(g, "p1"), { type: "passPriority" });
});
