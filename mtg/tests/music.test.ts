import { test } from "node:test";
import assert from "node:assert/strict";
import { compileSong, freqOf } from "@/lib/music";

test("the tune is whole bars, with a chord and a beat in every bar", () => {
  const song = compileSong();
  assert.equal(song.length % 8, 0);
  for (let bar = 0; bar < song.length / 8; bar++) {
    assert.ok(song[bar * 8].some((h) => h.voice === "bass"), `bar ${bar + 1} has a bass note`);
    assert.ok(song[bar * 8 + 2].some((h) => h.voice === "chord"), `bar ${bar + 1} has a chord`);
  }
  assert.ok(song.flat().every((h) => Number.isFinite(h.freq) && Number.isFinite(h.dur)));
});

test("notes are played a fifth lower, in F: written A4 sounds as D4", () => {
  assert.equal(Math.round(freqOf("A4")), 294);
  assert.throws(() => freqOf("H2"));
});
