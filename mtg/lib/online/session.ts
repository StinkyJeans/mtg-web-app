"use client";

import { useSyncExternalStore } from "react";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import { createClient } from "@/lib/supabase/client";
import { setPlayerNames } from "@/app/play/log";
import type { ChatLine, LobbyRoomInfo, RoomSnapshot, StartPayload, UpdatePayload } from "./protocol";

// The browser's one connection to the live game server: the lobby (the list of rooms) and, at most, one match room.
// It lives outside React so it survives moving from the dashboard to the play screen.

export interface OnlineState {
  lobby: "off" | "connecting" | "on";
  rooms: LobbyRoomInfo[];
  /** The match room this player is in, as the server last described it. */
  snapshot: RoomSnapshot | null;
  /** Set once the match has started. */
  game: StartPayload | null;
  chat: ChatLine[];
  error: string | null;
}

const empty: OnlineState = { lobby: "off", rooms: [], snapshot: null, game: null, chat: [], error: null };
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
export async function connectLobby(): Promise<void> {
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
        clients: Number(r.clients ?? 0),
        maxClients: Number(r.maxClients ?? 2),
      };
    };
    room.onMessage("rooms", (rooms: Record<string, unknown>[]) => set({ rooms: rooms.filter((r) => r.name === "match").map(info) }));
    room.onMessage("+", ([id, r]: [string, Record<string, unknown>]) => {
      if (r.name !== "match") return;
      set({ rooms: [...state.rooms.filter((x) => x.roomId !== id), info(r)] });
    });
    room.onMessage("-", (id: string) => set({ rooms: state.rooms.filter((x) => x.roomId !== id) }));
    room.onLeave(() => {
      lobbyRoom = null;
      set({ lobby: "off", rooms: [] });
    });
    set({ lobby: "on" });
  } catch (e) {
    lobbyRoom = null;
    set({ lobby: "off", error: `${explain(e)} (Is the game server running?)` });
  }
}

export function disconnectLobby(): void {
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

function attach(room: Room) {
  matchRoom = room;
  keep(room.reconnectionToken); // a refreshed page can use this to come back to the same seat
  queued.length = 0;
  set({ snapshot: null, game: null, chat: [], error: null });
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
  room.onLeave((code: number) => {
    if (matchRoom === room) {
      matchRoom = null;
      if (code === 4000) keep(null); // a deliberate leave: nothing to come back to
      set({ snapshot: null, game: null, chat: [] });
    }
  });
  room.send("hello"); // handlers are ready: now ask where things stand
}

export async function createRoom(name: string): Promise<void> {
  set({ error: null });
  try {
    attach(await getClient().create("match", { token: await accessToken(), name }));
  } catch (e) {
    set({ error: explain(e) });
  }
}

export async function joinRoom(roomId: string): Promise<void> {
  set({ error: null });
  try {
    attach(await getClient().joinById(roomId, { token: await accessToken() }));
  } catch (e) {
    set({ error: explain(e) });
  }
}

export function leaveRoom(): void {
  keep(null);
  const room = matchRoom;
  matchRoom = null;
  setPlayerNames();
  set({ snapshot: null, game: null, chat: [] });
  void room?.leave(true);
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
    keep(null); // too late: the seat was given up
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
