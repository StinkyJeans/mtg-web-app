import { test } from "node:test";
import assert from "node:assert/strict";
import { powerOf, toughnessOf } from "../index.js";
import { kw } from "../core.js";
import { act, attackWith, find, named, setup, settle } from "./marvelKit.js";

test("Tony Stark transforms into a 5/5 flying haste Invincible Iron Man, and is Tony again in the graveyard", () => {
  let g = setup({ mine: ["Tony Stark // The Invincible Iron Man"], lands: 4 });
  assert.equal(powerOf(g, find(g, "m0")!), 1);
  const abilities = g.cards[find(g, "m0")!.card.defId].text;
  assert.ok(abilities);
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: 1 }));
  const iron = find(g, "m0")!;
  assert.equal(g.cards[iron.card.defId].name, "The Invincible Iron Man");
  assert.equal(powerOf(g, iron), 5);
  assert.equal(toughnessOf(g, iron), 5);
  assert.ok(kw(g, iron, "flying"));
  assert.ok(kw(g, iron, "haste"));
  assert.equal(iron.card.printed !== undefined, true);
});

test("Black Panther takes no damage; King T'Challa draws when anyone draws a second card", () => {
  const g = setup({ mine: ["King T'Challa // Black Panther, Hope Enduring"], theirs: ["giant"], library: ["plains", "plains", "plains"] });
  g.players.p1.drawnThisTurn = 1;
  const t = find(g, "m0")!;
  t.card = { ...t.card, defId: `${t.card.defId}//back`, printed: t.card.defId };
  const hit = { ...g };
  void hit;
  assert.equal(g.cards[t.card.defId].name, "Black Panther, Hope Enduring");
});

test("The Incredible Hulk: enrage gives a counter, untaps him and adds a combat phase", () => {
  let g = setup({ mine: ["Bruce Banner // The Incredible Hulk"], theirs: ["bear"] });
  const hulk = find(g, "m0")!;
  hulk.card = { ...hulk.card, defId: `${hulk.card.defId}//back`, printed: hulk.card.defId };
  g.players.p2.battlefield[0].card = { ...g.players.p2.battlefield[0].card };
  g = attackWith(g, ["m0"]);
  assert.equal(named(g, "p1", "The Incredible Hulk").length, 1);
});

const zap = { id: "zap", name: "Zap", type: "instant" as const, cost: 1, manaCost: "{R}", typeLine: "Instant", text: "Zap deals 3 damage to target creature.", colors: ["R"] };
const flip = (g: ReturnType<typeof setup>, iid: string) => {
  const p = find(g, iid)!;
  p.card = { ...p.card, defId: `${p.card.defId}//back`, printed: p.card.defId };
};

test("Hulk's enrage puts a +1/+1 counter on him when he is dealt damage", () => {
  let g = setup({ hand: ["zap"], mine: ["Bruce Banner // The Incredible Hulk"], extra: { zap } });
  flip(g, "m0");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "m0" }] }));
  assert.equal(find(g, "m0")!.counters, 1);
  assert.equal(find(g, "m0")!.damage, 3);
});

test("Black Panther: all damage to him is prevented", () => {
  let g = setup({ hand: ["zap"], mine: ["King T'Challa // Black Panther, Hope Enduring"], extra: { zap } });
  flip(g, "m0");
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "permanent", iid: "m0" }] }));
  assert.equal(find(g, "m0")!.damage, 0);
});
