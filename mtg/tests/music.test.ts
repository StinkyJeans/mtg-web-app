import { test } from "node:test";
import assert from "node:assert/strict";
import { compileTrack, noteMidi, parseChord } from "@/lib/music/theory";
import { TRACKS, trackById } from "@/lib/music/tracks";

test("every track is whole bars, with a bass note and a chord in every bar", () => {
  for (const track of TRACKS) {
    const song = compileTrack(track);
    const per = track.grid * 4;
    assert.equal(song.length, track.harmony.length * per, track.name);
    for (let bar = 0; bar < track.harmony.length; bar++) {
      const steps = song.slice(bar * per, (bar + 1) * per).flat();
      assert.ok(steps.some((h) => h.voice === track.bass.voice), `${track.name} bar ${bar + 1} has a bass note`);
      assert.ok(steps.some((h) => h.voice === track.chords.voice), `${track.name} bar ${bar + 1} has a chord`);
    }
    assert.ok(song.flat().every((h) => Number.isFinite(h.freq) && h.freq >= 0 && Number.isFinite(h.dur)), track.name);
  }
});

test("track ids are distinct, and an unknown id falls back to the first track", () => {
  assert.equal(new Set(TRACKS.map((t) => t.id)).size, TRACKS.length);
  assert.equal(trackById("nope").id, TRACKS[0].id);
});

test("notes and chords are read from their names", () => {
  assert.equal(noteMidi("A4"), 69);
  assert.equal(noteMidi("C#4"), 61);
  assert.throws(() => noteMidi("H2"));
  assert.deepEqual(parseChord("Em7"), { root: 4, intervals: [0, 3, 7, 10] });
  assert.deepEqual(parseChord("Bb"), { root: 10, intervals: [0, 4, 7] });
  assert.throws(() => parseChord("Cfoo"));
});
