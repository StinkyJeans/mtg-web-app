import type { PlayerId } from "@mtg/engine";

let names: Record<PlayerId, string> = { p1: "Player 1", p2: "Player 2" };
/** Online, players are shown by their account names; with nothing given it is "Player 1" and "Player 2" again. */
export const setPlayerNames = (given?: Partial<Record<PlayerId, string>>) => {
  names = { p1: given?.p1 || "Player 1", p2: given?.p2 || "Player 2" };
};
export const playerName = (p: PlayerId) => names[p];
