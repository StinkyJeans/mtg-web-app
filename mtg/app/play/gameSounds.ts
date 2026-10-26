import type { GameEvent, PlayerId } from "@mtg/engine";
import { playSound } from "@/lib/sound";
import type { Sound } from "@/lib/sound";

const GAP = 0.1; // seconds between different sounds in one update, so each can be heard
const DRAW_GAP = 0.12;
const MAX_DRAWS = 3;

/**
 * The sounds for one update of the game, in order, with when each starts (in seconds). Each kind plays once,
 * except draws (up to three). Combat damage is left out: the attack animation plays it at the moment of impact.
 * So is a mulligan: dealing the new hand shuffles.
 * `viewer`: whose screen this is, or null on a shared (hot-seat) screen, where every turn and every win is cheered.
 */
export function soundsFor(events: GameEvent[], viewer: PlayerId | null): { sound: Sound; at: number }[] {
  const fought = events.some((e) => e.type === "combatDamage");
  const hurt = fought || events.some((e) => e.type === "damage");
  const out: { sound: Sound; at: number }[] = [];
  let at = 0;
  let draws = 0;
  const add = (sound: Sound) => {
    if (out.some((s) => s.sound === sound)) return;
    out.push({ sound, at });
    at += GAP;
  };
  for (const e of events) {
    switch (e.type) {
      case "cardDrawn":
        if (draws >= MAX_DRAWS) break;
        out.push({ sound: "draw", at: at + draws * DRAW_GAP });
        draws++;
        break;
      case "landPlayed":
        add("land");
        break;
      case "creatureCast":
        add("creature");
        break;
      case "spellCast":
        add("cast");
        break;
      case "abilityActivated":
        add("ability");
        break;
      case "attackersDeclared":
        if (!fought) add("attack"); // fought at once: the charge animation has its own sound
        break;
      case "blockersDeclared":
        if (e.blocks.length > 0) add("block");
        break;
      case "damage":
        add("burn");
        break;
      case "lifeGained":
        add("lifeGain");
        break;
      case "lifeLost":
        if (!hurt) add("lifeLoss");
        break;
      case "countered":
        add("counter");
        break;
      case "creatureDied":
        add("die");
        break;
      case "cardsDiscarded":
        add("discard");
        break;
      case "turnStarted":
        if (viewer === null || e.player === viewer) add("turn");
        break;
      case "gameWon":
        add(viewer === null || e.player === viewer ? "win" : "lose");
        break;
    }
  }
  return out;
}

export function playGameSounds(events: GameEvent[], viewer: PlayerId | null): void {
  for (const { sound, at } of soundsFor(events, viewer)) playSound(sound, at);
}
