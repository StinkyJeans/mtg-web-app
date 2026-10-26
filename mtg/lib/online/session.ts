"use client";

import { useSyncExternalStore } from "react";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import { createClient } from "@/lib/supabase/client";
import { setPlayerNames } from "@/app/play/log";
import { KICKED, MATCH_GONE } from "./protocol";
import type { ChatLine, FriendStatus, LobbyRoomInfo, RoomSnapshot, StartPayload, UpdatePayload } from "./protocol";

// The browser's one connection to the live game server: the lobby (the list of rooms) and, at most, one match room.
// It lives outside React so it survives moving from the dashboard to the play screen.

export interface OnlineState {
  lobby: "off" | "connecting" | "on";
  rooms: LobbyRoomInfo[];
  /** The match room this player is in, as the server last described it. */
  snapshot: RoomSnapshot | null;
  /** Set once the match has started. */
  game: StartPayload | null;
  /** The last match room joined. Kept after leaving it, so the play screen is rebuilt only when a new match begins. */
  matchId: string | null;
  chat: ChatLine[];
  error: string | null;
  /** The connection to the match was lost (or the server restarted) and the browser is getting back in. */
  reconnecting: boolean;
  /** The connection that tells friends this player is online (and tells this player how the friends are). */
  social: "off" | "on";
  /** How each friend is doing, by account id. */
  friends: Record<string, FriendStatus>;
  /** Short messages for the play screen, such as "Sam is spectating your game". */
  notices: Notice[];
}

export interface Notice {
  id: number;
  text: string;
}

const empty: OnlineState = { lobby: "off", rooms: [], snapshot: null, game: null, matchId: null, chat: [], error: null, reconnecting: false, social: "off", friends: {}, notices: [] };
let state: OnlineState = empty;
const listeners = new Set<() => void>();
const set = (patch: Partial<OnlineState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let client: Client | null = null;
let lobbyRoom: Room | null = null;
let matchRoom: Room | null = null;
let chatId = 0;

/** Where the game server runs: set NEXT_PUBLIC_GAME_SERVER_URL, or it is the same computer as the website, port 2567. */
export function serverUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (configured) return configured;
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:2567`;
}

async function accessToken(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  return token;
}

function getClient(): Client {
  client ??= new Client(serverUrl());
  return client;
}

let errorTimer: ReturnType<typeof setTimeout> | undefined;
/** Shows a message from the server, and lets it go after a few seconds. */
function flash(message: string) {
  clearTimeout(errorTimer);
  set({ error: message });
  errorTimer = setTimeout(() => set({ error: null }), 5000);
}

const explain = (e: unknown) => (e instanceof Error && e.message ? e.message : typeof e === "string" ? e : "Could not reach the game server.");

// ───────── the lobby: the list of rooms ─────────
const LOBBY_RETRY_MS = 4000;
let wantLobby = false; // the dashboard is open: a lost lobby connection (a server restart) is picked up again

export async function connectLobby(): Promise<void> {
  wantLobby = true;
  if (lobbyRoom || state.lobby === "connecting") return;
  set({ lobby: "connecting", error: null });
  try {
    const room = await getClient().joinOrCreate("lobby", {});
    lobbyRoom = room;
    const info = (r: Record<string, unknown>): LobbyRoomInfo => {
      const meta = (r.metadata ?? {}) as Partial<LobbyRoomInfo>;
      return {
        roomId: String(r.roomId),
        name: meta.name ?? "Room",
        host: meta.host ?? "",
        players: meta.players ?? [],
        status: meta.status ?? "waiting",
        turn: meta.turn ?? 0,
        bot: meta.bot === true,
        spectators: Number(meta.spectators ?? 0),
        clients: Number(r.clients ?? 0),
        maxClients: Number(r.maxClients ?? 2),
        locked: meta.locked === true,
      };
    };
    room.onMessage("rooms", (rooms: Record<string, unknown>[]) => set({ rooms: [...new Map(rooms.filter((r) => r.name === "match").map((r) => [String(r.roomId), info(r)])).values()] }));
    room.onMessage("+", ([id, r]: [string, Record<string, unknown>]) => {
      if (r.name !== "match") return;
      set({ rooms: [...state.rooms.filter((x) => x.roomId !== id), info(r)] });
    });
    room.onMessage("-", (id: string) => set({ rooms: state.rooms.filter((x) => x.roomId !== id) }));
    room.onLeave(() => {
      lobbyRoom = null;
      set({ lobby: "off", rooms: [] });
      if (wantLobby) setTimeout(() => void connectLobby(), LOBBY_RETRY_MS);
    });
    set({ lobby: "on" });
  } catch (e) {
    lobbyRoom = null;
    set({ lobby: "off", error: `${explain(e)} (Is the game server running?)` });
    if (wantLobby) setTimeout(() => void connectLobby(), LOBBY_RETRY_MS);
  }
}

export function disconnectLobby(): void {
  wantLobby = false;
  void lobbyRoom?.leave(true);
  lobbyRoom = null;
  set({ lobby: "off", rooms: [] });
}

// ───────── a match room ─────────
const updateListeners = new Set<(u: UpdatePayload) => void>();
const queued: UpdatePayload[] = []; // updates that arrived while no game screen was listening

const TICKET = "mtg-reconnect";
const keep = (token: string | null) => {
  try {
    if (token) sessionStorage.setItem(TICKET, token);
    else sessionStorage.removeItem(TICKET);
  } catch {
    // private window: a refresh then simply can't rejoin
  }
};

function attach(room: Room, spectating = false) {
  matchRoom = room;
  rejoinFor = null;
  keep(spectating ? null : room.reconnectionToken); // a refreshed page can use this to come back to the same seat (a watcher has none)
  queued.length = 0;
  // back in the same match (after a server restart): the screen keeps showing it until the server's copy arrives
  const same = room.roomId === state.matchId;
  set({ ...(same ? {} : { snapshot: null, game: null, chat: [] }), matchId: room.roomId, reconnecting: false, error: null });
  room.onMessage("room", (s: RoomSnapshot) => set({ snapshot: s }));
  room.onMessage("start", (g: StartPayload) => {
    setPlayerNames(g.names); // the account names are used from the very first frame
    set({ game: g });
  });
  room.onMessage("update", (u: UpdatePayload) => {
    if (updateListeners.size === 0) queued.push(u);
    else updateListeners.forEach((l) => l(u));
  });
  room.onMessage("chat", (m: { from: ChatLine["from"]; name: string; text: string }) => set({ chat: [...state.chat, { id: chatId++, ...m }].slice(-80) }));
  room.onMessage("error", (m: { message: string }) => flash(m.message));
  room.onMessage("closed", (m: { message: string }) => flash(m.message));
  // someone started watching this match: a friend is announced as one
  room.onMessage("spectator", (m: { name: string; friend: boolean }) => notify(m.friend ? `Your friend ${m.name} is spectating your game right now.` : `${m.name} is spectating your game.`));
  room.onDrop(() => set({ reconnecting: true })); // the SDK first tries to get the same connection back by itself
  room.onReconnect(() => set({ reconnecting: false }));
  room.onLeave((code: number) => {
    if (matchRoom !== room) return;
    matchRoom = null;
    if (!spectating && code !== 4000 && code !== KICKED) {
      void rejoin(room.roomId); // the connection was lost, or the server restarted
      return;
    }
    keep(null); // a deliberate leave: nothing to come back to
    set({ snapshot: null, game: null, chat: [] });
    if (code === KICKED) flash("The host removed you from this room.");
  });
  room.send("hello"); // handlers are ready: now ask where things stand
}

/** An empty password leaves the room open to anyone. */
export async function createRoom(name: string, password = ""): Promise<void> {
  set({ error: null });
  try {
    attach(await getClient().create("match", { token: await accessToken(), name, password }));
  } catch (e) {
    set({ error: explain(e) });
  }
}

/** True once inside the room; false (with the reason in `error`) when refused, e.g. a wrong password. */
export async function joinRoom(roomId: string, password?: string): Promise<boolean> {
  set({ error: null });
  try {
    attach(await getClient().joinById(roomId, { token: await accessToken(), password }));
    return true;
  } catch (e) {
    set({ error: explain(e) });
    return false;
  }
}

/** Watching a match that is being played: free in an open room, with the password in a locked one. True once watching. */
export async function spectateRoom(roomId: string, password?: string): Promise<boolean> {
  set({ error: null });
  try {
    attach(await getClient().joinById(roomId, { token: await accessToken(), spectate: true, password }), true);
    return true;
  } catch (e) {
    set({ error: explain(e) });
    return false;
  }
}

export function leaveRoom(): void {
  keep(null);
  rejoinFor = null;
  const room = matchRoom;
  matchRoom = null;
  setPlayerNames();
  set({ snapshot: null, game: null, chat: [], reconnecting: false });
  void room?.leave(true);
}

// ───────── messages for the play screen ─────────
let noticeId = 0;
export function notify(text: string): void {
  const id = noticeId++;
  set({ notices: [...state.notices, { id, text }].slice(-4) });
  setTimeout(() => dismissNotice(id), 9000);
}
export const dismissNotice = (id: number) => set({ notices: state.notices.filter((n) => n.id !== id) });

// ───────── who is online: the friends' status ─────────
const SOCIAL_RETRY_MS = 4000;
const SOCIAL_POLL_MS = 12_000; // also what keeps this player showing as online
let socialRoom: Room | null = null;
let wantSocial = false;
let connectingSocial = false;
let friendIds: string[] = [];
let pollTimer: ReturnType<typeof setInterval> | undefined;

const poll = () => socialRoom?.send("statuses", { ids: friendIds });

/** Stays connected on every page while signed in: that is what makes this player show as online to their friends. */
export async function connectSocial(): Promise<void> {
  wantSocial = true;
  if (socialRoom || connectingSocial) return;
  connectingSocial = true;
  try {
    const room = await getClient().joinOrCreate("social", { token: await accessToken() });
    socialRoom = room;
    room.onMessage("statuses", (list: FriendStatus[]) => set({ friends: Object.fromEntries(list.map((s) => [s.id, s])) }));
    room.onLeave(() => {
      socialRoom = null;
      clearInterval(pollTimer);
      set({ social: "off" });
      if (wantSocial) setTimeout(() => void connectSocial(), SOCIAL_RETRY_MS);
    });
    set({ social: "on" });
    poll();
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, SOCIAL_POLL_MS);
  } catch {
    if (wantSocial) setTimeout(() => void connectSocial(), SOCIAL_RETRY_MS);
  } finally {
    connectingSocial = false;
  }
}

export function disconnectSocial(): void {
  wantSocial = false;
  clearInterval(pollTimer);
  void socialRoom?.leave(true);
  socialRoom = null;
  friendIds = [];
  set({ social: "off", friends: {} });
}

/** The friends whose status to ask for (their account ids). */
export function watchFriends(ids: string[]): void {
  friendIds = ids;
  poll();
}

// ───────── getting back into a match ─────────
const REJOIN_FOR_MS = 120_000; // long enough for a deploy to finish
let rejoinFor: string | null = null; // the match being got back into; cleared once in, or when the player leaves it

/** The room again: still running, or brought back from the server's saved copy after a restart. */
async function findRoom(roomId: string): Promise<Room> {
  const token = await accessToken();
  try {
    return await getClient().joinById(roomId, { token });
  } catch (e) {
    if (!(e instanceof Error) || !/not found/.test(e.message)) throw e;
    return getClient().create("match", { token, restore: roomId });
  }
}

/** After a lost connection or a server restart: keeps trying to get back in, with the match still on screen. */
async function rejoin(roomId: string): Promise<void> {
  rejoinFor = roomId;
  set({ reconnecting: true });
  let ended = false;
  for (let wait = 1000, until = Date.now() + REJOIN_FOR_MS; Date.now() < until; wait = Math.min(wait * 2, 8000)) {
    try {
      const room = await findRoom(roomId);
      if (rejoinFor !== roomId || matchRoom) {
        void room.leave(true); // the player moved on while this was on its way
        return;
      }
      attach(room);
      return;
    } catch (e) {
      if ((e as { code?: number }).code === MATCH_GONE) {
        ended = true;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, wait));
    if (rejoinFor !== roomId) return;
  }
  if (rejoinFor !== roomId) return;
  rejoinFor = null;
  keep(null);
  set({ snapshot: null, game: null, chat: [], reconnecting: false });
  flash(ended ? "That match has ended." : "Lost the connection to the match.");
}

let rejoining = false;
/** After a page refresh: go back to the match this browser was in (the server holds the seat for a minute). */
export async function tryReconnect(): Promise<void> {
  if (matchRoom || rejoining) return;
  let ticket: string | null = null;
  try {
    ticket = sessionStorage.getItem(TICKET);
  } catch {
    return;
  }
  if (!ticket) return;
  rejoining = true;
  try {
    attach(await getClient().reconnect(ticket));
  } catch {
    // the server may have restarted since (a deploy): the ticket starts with the room id, and the match can be brought back
    try {
      attach(await findRoom(ticket.split(":")[0]));
    } catch {
      keep(null); // too late: the seat was given up, or the match is over
    }
  } finally {
    rejoining = false;
  }
}

export function send(type: string, payload?: unknown): void {
  matchRoom?.send(type, payload);
}

export const clearError = () => set({ error: null });

/** The game screen listens for updates here; anything that arrived earlier is handed over first. */
export function onGameUpdate(listener: (u: UpdatePayload) => void): () => void {
  updateListeners.add(listener);
  for (const u of queued.splice(0)) listener(u);
  return () => {
    updateListeners.delete(listener);
  };
}

// ───────── for React ─────────
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export function useOnline(): OnlineState {
  return useSyncExternalStore(subscribe, () => state, () => empty);
}
