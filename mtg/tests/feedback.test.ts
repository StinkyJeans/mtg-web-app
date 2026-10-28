import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "@mtg/engine";
import type { Action, CardDef, GameEvent, GameState, PlayerId } from "@mtg/engine";
import { cardParts } from "@/app/play/abilityParts";
import { announcementsFrom, mergeAnnouncements } from "@/app/play/log";
import { manaNotes } from "@/app/play/manaInfo";
import { board, permanent } from "./fixtures";

const def = (name: string, type: CardDef["type"], text: string, keywords: string[] = []): CardDef => ({ id: name, name, type, cost: 1, text, keywords });
const kinds = (d: CardDef) => cardParts(d).map((p) => [p.kind, p.text]);

test("a mana creature with exalted: one part triggers on its own, the other is mana paid by itself", () => {
  const hierarch = def("Noble Hierarch", "creature", "Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.)\n{T}: Add {G}, {W}, or {U}.", ["Exalted"]);
  assert.deepEqual(kinds(hierarch), [
    ["trigger", "Exalted"],
    ["mana", "{T}: Add {G}, {W}, or {U}."],
  ]);
});

test("a creature land: its mana and the ability you activate are told apart", () => {
  const nexus = def("Inkmoth Nexus", "land", "{T}: Add {C}.\n{1}: Inkmoth Nexus becomes a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect until end of turn. It's still a land. (It deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.)");
  assert.deepEqual(kinds(nexus), [
    ["mana", "{T}: Add {C}."],
    ["activated", "{1}: Inkmoth Nexus becomes a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect until end of turn. It's still a land."],
  ]);
});

test("a kicker spell: the extra cost, then each sentence as a step in order", () => {
  const vines = def("Vines of Vastwood", "instant", "Kicker {G} (You may pay an additional {G} as you cast this spell.)\nTarget creature can't be the target of spells or abilities your opponents control this turn. If this spell was kicked, that creature gets +4/+4 until end of turn.", ["Kicker"]);
  assert.deepEqual(kinds(vines), [
    ["keyword", "Kicker {G}"],
    ["spell", "Target creature can't be the target of spells or abilities your opponents control this turn."],
    ["spell", "If this spell was kicked, that creature gets +4/+4 until end of turn."],
  ]);
});

test("an Aura: what it gives is always on, and its return to hand is a trigger", () => {
  const rancor = def("Rancor", "enchantment", "Enchant creature\nEnchanted creature gets +2/+0 and has trample.\nWhen Rancor is put into a graveyard from the battlefield, return Rancor to its owner's hand.", ["Enchant"]);
  assert.deepEqual(
    kinds(rancor).map(([k]) => k),
    ["keyword", "static", "trigger"],
  );
});

function played(g: GameState, moves: [PlayerId, Action][]): { g: GameState; events: GameEvent[][] } {
  const events: GameEvent[][] = [];
  for (const [who, a] of moves) {
    const r = applyAction(g, who, a);
    assert.ok(r.ok, r.ok ? "" : r.error);
    events.push(r.events);
    g = r.state;
  }
  return { g, events };
}

test("a spell that resolves at once is told with what was paid and what it did", () => {
  const g = board({ mine: [permanent("mountain", "p1")], hand: ["shock"] });
  const { g: after, events } = played(g, [["p1", { type: "castSpell", iid: g.players.p1.hand[0].iid, targets: [{ kind: "player", id: "p2" }] }]]);
  const [told] = announcementsFrom(events[0], after).map(({ id, ...rest }) => (void id, rest));
  assert.deepEqual(told, {
    kind: "spell",
    player: "p1",
    iid: g.players.p1.hand[0].iid,
    defId: "shock",
    turn: after.turn,
    title: "Player 1 cast Shock",
    lines: ["Paid {R}: Mountain {R}"],
    done: "resolved",
    result: ["Player 2 loses 2 life (now 18)"],
  });
});

test("a spell that waited on the stack gets what it did added when it resolves later", () => {
  const g = board({ mine: [permanent("mountain", "p1")], theirs: [permanent("mountain", "p2")], hand: ["shock"] });
  g.players.p2.hand = [{ iid: "their-shock", defId: "shock", owner: "p2" }]; // so the round waits for them
  const iid = g.players.p1.hand[0].iid;
  const { g: after, events } = played(g, [
    ["p1", { type: "castSpell", iid, targets: [{ kind: "player", id: "p2" }] }],
    ["p2", { type: "passPriority" }],
  ]);
  const cast = announcementsFrom(events[0], after);
  assert.equal(cast[0].done, undefined, "still on the stack");
  const merged = mergeAnnouncements(cast, announcementsFrom(events[1], after));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, "Player 1 cast Shock");
  assert.deepEqual([merged[0].done, merged[0].result], ["resolved", ["Player 2 loses 2 life (now 18)"]]);
});

test("a triggered ability is told on its own, with why it triggered and what it did", () => {
  const g = board({ mine: [permanent("forest", "p1"), permanent("forest", "p1")], hand: ["healer"] });
  g.cards.healer = { id: "healer", name: "Healer", type: "creature", cost: 2, power: 1, toughness: 1, manaCost: "{1}{G}", text: "When Healer enters, you gain 3 life." };
  const { g: after, events } = played(g, [["p1", { type: "castCreature", iid: g.players.p1.hand[0].iid }]]);
  const told = announcementsFrom(events[0], after);
  assert.deepEqual(
    told.map((a) => [a.kind, a.title, a.done, a.result]),
    [
      ["spell", "Player 1 cast Healer", "resolved", []],
      ["trigger", "Player 1's Healer triggered", "resolved", ["Player 1 gains 3 life (now 23)"]],
    ],
  );
  assert.match(told[1].lines[0], /^When Healer enters/);
});

test("the mana a player has left goes down by what they paid, and says for what", () => {
  const g = board({ mine: [permanent("mountain", "p1"), permanent("forest", "p1")], hand: ["shock"] });
  const { g: after, events } = played(g, [["p1", { type: "castSpell", iid: g.players.p1.hand[0].iid, targets: [{ kind: "player", id: "p2" }] }]]);
  const notes = manaNotes(g, after, events[0]);
  assert.deepEqual([notes.p1?.delta, notes.p1?.why, notes.p2], [-1, "paid for Shock", undefined]);
});

test("a pump says each change once: the board changes, not the spell's own messages as well", () => {
  const elf = permanent("bears", "p1");
  const g = board({ mine: [permanent("forest", "p1"), elf], hand: ["defense"] });
  g.cards.defense = { id: "defense", name: "Blossoming Defense", type: "instant", cost: 1, manaCost: "{G}", text: "Target creature you control gets +2/+2 and gains hexproof until end of turn." };
  const { g: after, events } = played(g, [["p1", { type: "castSpell", iid: g.players.p1.hand[0].iid, targets: [{ kind: "permanent", iid: elf.card.iid }] }]]);
  assert.deepEqual(announcementsFrom(events[0], after)[0].result, ["Grizzly Bears gets +2/+2 (now 4/4)", "Grizzly Bears gains hexproof"]);
});
