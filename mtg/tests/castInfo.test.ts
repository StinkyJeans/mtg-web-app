import { test } from "node:test";
import assert from "node:assert/strict";
import { cardNameAnywhere, paymentOf, phyrexianChoices, preparedSpell } from "@/app/play/castInfo";
import { board, permanent } from "./fixtures";

const castFirst = (g: ReturnType<typeof board>) => ({ type: "castCreature" as const, iid: g.players.p1.hand[0].iid });

test("paying with lands asks nothing", () => {
  const g = board({ mine: [permanent("forest", "p1"), permanent("mountain", "p1")], hand: ["bears"] });
  assert.deepEqual(paymentOf(g, castFirst(g), "p1", []), { ok: true, life: 0, ask: [] });
});

test("tapping a creature for mana is asked first, since it could attack or block instead", () => {
  const elf = permanent("elf", "p1");
  const g = board({ mine: [elf, permanent("mountain", "p1")], hand: ["bears"] });
  assert.deepEqual(paymentOf(g, castFirst(g), "p1", []), { ok: true, life: 0, ask: [elf.card.iid] });
});

test("keeping that creature untapped leaves the spell unpaid when nothing else makes the mana", () => {
  const elf = permanent("elf", "p1");
  const g = board({ mine: [elf, permanent("mountain", "p1")], hand: ["bears"] });
  assert.equal(paymentOf(g, castFirst(g), "p1", [elf.card.iid]).ok, false);
});

test("Phyrexian mana with no matching mana costs 2 life", () => {
  const g = board({ mine: [permanent("mountain", "p1")], hand: ["mutagen"] });
  assert.deepEqual(paymentOf(g, castFirst(g), "p1", []), { ok: true, life: 2, ask: [] });
});

test("Phyrexian mana with the mana to pay it: the player chooses mana or 2 life", () => {
  const g = board({ mine: [permanent("forest", "p1")], hand: ["mutagen"] });
  const cast = { type: "castSpell" as const, iid: g.players.p1.hand[0].iid, targets: [] };
  const choices = phyrexianChoices(g, cast, "p1", []);
  assert.deepEqual(choices.map((c) => [c.life, c.mana]), [[0, "{G}"], [2, ""]]);
  assert.deepEqual(paymentOf(g, choices[1].action, "p1", []), { ok: true, life: 2, ask: [] });
  assert.deepEqual(phyrexianChoices(g, choices[1].action, "p1", []), [], "already chosen");

  const noGreen = board({ mine: [permanent("mountain", "p1")], hand: ["mutagen"] });
  assert.deepEqual(phyrexianChoices(noGreen, { ...cast, iid: noGreen.players.p1.hand[0].iid }, "p1", []), [], "only life can pay it");
});

test("actions that cost nothing are always paid", () => {
  const g = board();
  assert.deepEqual(paymentOf(g, { type: "passPhase" }, "p1", []), { ok: true, life: 0, ask: [] });
});

test("a prepared creature offers its spell, under the creature's front name", () => {
  const prepared = permanent("adventure", "p1", { prepared: "shock" });
  const plain = permanent("bears", "p1");
  const g = board({ mine: [prepared, plain] });
  const found = preparedSpell(g, "p1", prepared.card.iid);
  assert.equal(found?.spell.name, "Shock");
  assert.equal(found?.creature, "Bonecrusher Giant");
  assert.equal(preparedSpell(g, "p1", plain.card.iid), null);
});

test("a card's name is found on the battlefield, in a hand or in a graveyard", () => {
  const bears = permanent("bears", "p2");
  const g = board({ theirs: [bears], hand: ["giant"] });
  g.players.p2.graveyard = [{ iid: "dead", defId: "drake", owner: "p2" }];
  assert.equal(cardNameAnywhere(g, bears.card.iid), "Grizzly Bears");
  assert.equal(cardNameAnywhere(g, g.players.p1.hand[0].iid), "Hill Giant");
  assert.equal(cardNameAnywhere(g, "dead"), "Wind Drake");
  assert.equal(cardNameAnywhere(g, "nowhere"), "a card");
});
