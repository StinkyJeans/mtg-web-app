import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, createGame, isSupportedCard, parseCard } from "../index.js";
import type { CardDef, GameState, PlayerId } from "../index.js";

// "Target player draws a card, then discards a card": both halves belong to the target player, not to whoever used the ability.

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  scholar: { id: "scholar", name: "Reckless Scholar", type: "creature", cost: 3, manaCost: "{2}{U}", power: 2, toughness: 1, text: "{T}: Target player draws a card, then discards a card.", typeLine: "Creature — Human Wizard", colors: ["U"], keywords: [] },
  revelation: { id: "revelation", name: "Horrifying Revelation", type: "instant", cost: 1, manaCost: "{B}", text: "Target player discards a card, then mills a card.", colors: ["B"], keywords: [] },
  c1: { id: "c1", name: "Card One", type: "sorcery", cost: 1, manaCost: "{R}", text: "", colors: ["R"], keywords: [] },
  c2: { id: "c2", name: "Card Two", type: "sorcery", cost: 1, manaCost: "{R}", text: "", colors: ["R"], keywords: [] },
  swamp: { id: "swamp", name: "Swamp", type: "land", cost: 0, typeLine: "Basic Land — Swamp", text: "({T}: Add {B}.)" },
  scrying: { id: "scrying", name: "Sylvan Scrying", type: "sorcery", cost: 2, manaCost: "{1}{G}", text: "Search your library for a land card, reveal it, and put it into your hand. Then shuffle your library.", colors: ["G"], keywords: [] },
};
const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner }, tapped: false, summoningSick: false, damage: 0 });
function base(): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 3);
  g.cards = DEFS;
  g.phase = "main1";
  g.active = "p1";
  g.opening = null;
  g.players.p1.hand = [{ iid: "h1", defId: "c1", owner: "p1" }, { iid: "h2", defId: "c2", owner: "p1" }];
  g.players.p2.hand = [{ iid: "o1", defId: "c1", owner: "p2" }, { iid: "o2", defId: "c2", owner: "p2" }];
  return g;
}
function settle(s: GameState): GameState {
  let st = s;
  for (let i = 0; i < 6 && st.priority; i++) {
    const r = applyAction(st, st.priority.holder, { type: "passPriority" });
    if (!r.ok) break;
    st = r.state;
  }
  return st;
}

test("Reckless Scholar on the opponent: the opponent draws and the opponent discards", () => {
  const g = base();
  g.players.p1.battlefield = [perm("s1", "scholar")];
  const r = applyAction(g, "p1", { type: "activateAbility", iid: "s1", index: 0, targets: [{ kind: "player", id: "p2" }] });
  assert.ok(r.ok);
  const s = settle(r.state);
  assert.equal(s.players.p2.hand.length, 3, "the opponent drew");
  assert.equal(s.players.p1.hand.length, 2, "the player drew nothing");
  assert.equal(s.pendingPick?.player, "p2", "the opponent is the one who discards");
});

test("Reckless Scholar on itself: the player draws and discards", () => {
  const g = base();
  g.players.p1.battlefield = [perm("s1", "scholar")];
  const r = applyAction(g, "p1", { type: "activateAbility", iid: "s1", index: 0, targets: [{ kind: "player", id: "p1" }] });
  assert.ok(r.ok);
  const s = settle(r.state);
  assert.equal(s.players.p1.hand.length, 3);
  assert.equal(s.pendingPick?.player, "p1");
});

test("Horrifying Revelation: the target player mills, not the caster", () => {
  const g = base();
  g.players.p1.hand = [{ iid: "rv", defId: "revelation", owner: "p1" }];
  g.players.p1.battlefield = [perm("b1", "swamp")];
  const r = applyAction(g, "p1", { type: "castSpell", iid: "rv", targets: [{ kind: "player", id: "p2" }] });
  assert.ok(r.ok);
  let s = settle(r.state);
  if (s.pendingPick) {
    const x = applyAction(s, s.pendingPick.player, { type: "pick", iid: s.pendingPick.options[0] });
    assert.ok(x.ok);
    s = settle(x.state);
  }
  assert.equal(s.players.p2.graveyard.length, 2, "one discarded, one milled");
  assert.equal(s.players.p1.graveyard.length, 1, "the caster only has the spell");
});

test("an older search wording (\"..., reveal it, and put it into your hand. Then shuffle your library.\") is understood", () => {
  assert.equal(isSupportedCard(DEFS.scrying), true);
  assert.equal(parseCard(DEFS.scrying).spell?.effects[0]?.type, "search");
});
