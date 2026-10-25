import type { GameEvent, GameState, PlayerId } from "@mtg/engine";

// The messages between the website and the live game server (game-server/src/rooms/MatchRoom.ts). Keep the two in step.

export type Stage = "waiting" | "vote" | "decks" | "coin" | "playing" | "over";
export const DECK_SIZES = [20, 40, 60] as const;
/** Close code for a guest the host removed: the browser says so, and doesn't try to reconnect. */
export const KICKED = 4100;

/** What a room looks like to the lobby list. */
export interface LobbyRoomInfo {
  roomId: string;
  name: string;
  host: string;
  players: string[];
  status: Stage;
  turn: number;
  clients: number;
  maxClients: number;
  /** A password is needed to join. */
  locked: boolean;
  /** A room with a computer opponent: nobody else can join it. */
  bot: boolean;
}

/** Where a room stands, as sent to each player in it. */
export interface RoomSnapshot {
  stage: Stage;
  name: string;
  you: PlayerId;
  host: PlayerId;
  locked: boolean;
  size: number | null;
  mismatch: boolean;
  players: { seat: PlayerId; name: string; connected: boolean; voted: number | null; deckReady: boolean; bot?: boolean }[];
  /** `call`, `result` and `winner` stay null until the caller has called heads or tails. */
  coin: { caller: PlayerId; call: "heads" | "tails" | null; result: "heads" | "tails" | null; winner: PlayerId | null; chose: "first" | "second" | null } | null;
  winner: PlayerId | "draw" | null;
  endReason: string | null;
}

/** The match has begun (or the player came back to it): the game as this player sees it. */
export interface StartPayload {
  view: GameState;
  events: GameEvent[];
  you: PlayerId;
  names: Record<PlayerId, string>;
  deckNames: Record<PlayerId, string>;
  summary: string;
  fresh: boolean;
}

export interface UpdatePayload {
  view: GameState;
  events: GameEvent[];
}

export interface ChatLine {
  id: number;
  from: PlayerId;
  name: string;
  text: string;
}
