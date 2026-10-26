import { test } from "node:test";
import assert from "node:assert/strict";
import { soundsFor } from "@/app/play/gameSounds";

const names = (list: { sound: string }[]) => list.map((s) => s.sound);

test("each kind of event has its sound, once per update", () => {
  const sounds = soundsFor(
    [
      { type: "landPlayed", player: "p1", iid: "a" },
      { type: "creatureCast", player: "p1", iid: "b", tapped: [] },
      { type: "creatureDied", player: "p2", iid: "c" },
      { type: "creatureDied", player: "p2", iid: "d" },
    ],
    "p1",
  );
  assert.deepEqual(names(sounds), ["land", "creature", "die"]);
  assert.deepEqual(sounds.map((s) => s.at), [0, 0.1, 0.2]);
});

test("draws play up to three times, a moment apart", () => {
  const draws = Array.from({ length: 5 }, (_, i) => ({ type: "cardDrawn" as const, player: "p1" as const, iid: `c${i}` }));
  assert.deepEqual(names(soundsFor(draws, "p1")), ["draw", "draw", "draw"]);
});

test("combat damage is left to the attack animation", () => {
  const fought = soundsFor(
    [
      { type: "attackersDeclared", player: "p1", attackers: ["a"] },
      { type: "combatDamage", source: "a", target: "p2", amount: 3 },
      { type: "lifeLost", player: "p2", amount: 3 },
    ],
    "p2",
  );
  assert.deepEqual(names(fought), []);
  assert.deepEqual(names(soundsFor([{ type: "attackersDeclared", player: "p1", attackers: ["a"] }], "p2")), ["attack"]);
  assert.deepEqual(names(soundsFor([{ type: "lifeLost", player: "p2", amount: 1 }], "p2")), ["lifeLoss"]);
});

test("your turn and your win are cheered; the opponent's are not", () => {
  assert.deepEqual(names(soundsFor([{ type: "turnStarted", player: "p2", turn: 3 }], "p1")), []);
  assert.deepEqual(names(soundsFor([{ type: "turnStarted", player: "p1", turn: 3 }], "p1")), ["turn"]);
  assert.deepEqual(names(soundsFor([{ type: "gameWon", player: "p2" }], "p1")), ["lose"]);
  assert.deepEqual(names(soundsFor([{ type: "gameWon", player: "p2" }], null)), ["win"]);
});
