import type { GameState } from "@mtg/engine";

/** The shuffle step before keep or mulligan: each player shuffles the OTHER player's library. True until both have. */
export const shufflePending = (state: GameState): boolean => {
  const s = state.opening?.shuffled;
  return state.phase === "mulligan" && !!s && !(s.p1 && s.p2);
};
