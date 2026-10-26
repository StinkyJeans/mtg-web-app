"use client";

import { useState } from "react";
import { joinRoom } from "@/lib/online/session";
import type { LobbyRoomInfo, Stage } from "@/lib/online/protocol";
import type { OnlineState } from "@/lib/online/session";
import { RowSkeletons } from "../Skeleton";
import WatchButton from "./WatchButton";

const STATUS: Record<Stage, { label: string; chip: string }> = {
  waiting: { label: "Waiting for a player", chip: "bg-amber-400/20 text-[#fde68a] ring-amber-300/40" },
  vote: { label: "Voting", chip: "bg-sky-400/20 text-[#bae6fd] ring-sky-300/40" },
  decks: { label: "Choosing decks", chip: "bg-sky-400/20 text-[#bae6fd] ring-sky-300/40" },
  coin: { label: "Coin toss", chip: "bg-violet-400/20 text-[#ddd6fe] ring-violet-300/40" },
  playing: { label: "LIVE", chip: "bg-red-500/25 text-[#fecaca] ring-red-400/50" },
  over: { label: "Finished", chip: "bg-slate-400/20 text-slate-200 ring-slate-300/30" },
};

/** The list of rooms, updated live: who is waiting for an opponent, and which matches are being played right now. */
export default function LiveMatches({ online, inRoom }: { online: OnlineState; inRoom: boolean }) {
  const rooms = [...online.rooms].sort((a, b) => Number(b.status === "playing") - Number(a.status === "playing") || a.name.localeCompare(b.name));
  const live = rooms.filter((r) => r.status === "playing").length;

  return (
    <section aria-label="Live matches" className="panel-glass flex max-h-[min(26rem,52dvh)] flex-col gap-3 p-4 text-white">
      <header className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${online.lobby === "on" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : online.lobby === "connecting" ? "animate-pulse bg-amber-300" : "bg-red-400"}`} aria-hidden="true" />
        <h2 className="font-title text-sm font-extrabold uppercase tracking-[0.2em] text-[#ffe29a]">Live matches</h2>
        <span className="count-chip ml-auto">{live} playing now</span>
      </header>

      {/* "off" with no error is just the moment before the first connection starts */}
      {(online.lobby === "connecting" || (online.lobby === "off" && !online.error)) && <RowSkeletons count={2} className="h-[62px]" label="Connecting to the game server" />}
      {online.lobby === "off" && online.error && <p className="empty-note text-[15px]">Not connected to the game server.</p>}

      {online.lobby === "on" && rooms.length === 0 && (
        <div className="empty-note flex flex-col items-center gap-1.5 text-[15px]">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#f4b43d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />
          </svg>
          <b className="text-slate-100">No rooms yet</b>
          <span className="text-slate-300">Create one and wait for a friend to join.</span>
        </div>
      )}

      <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
        {rooms.map((r) => (
          <RoomRow key={r.roomId} room={r} canJoin={!inRoom} />
        ))}
      </ul>
    </section>
  );
}

function RoomRow({ room, canJoin }: { room: LobbyRoomInfo; canJoin: boolean }) {
  const status = STATUS[room.status] ?? STATUS.waiting;
  const open = room.status === "waiting" && room.clients < room.maxClients && !room.bot;
  const [asking, setAsking] = useState(false); // a locked room: the password box is open
  const [password, setPassword] = useState("");

  async function join() {
    if (room.locked && !asking) {
      setAsking(true);
      return;
    }
    if (!(await joinRoom(room.roomId, room.locked ? password : undefined))) return; // the reason shows under the list
    setAsking(false);
    setPassword("");
  }

  return (
    <li className="deck-row !flex-col !items-stretch !gap-2 !py-2.5" style={{ "--accent": room.status === "playing" ? "#f87171" : room.status === "waiting" ? "#f4b43d" : "#38bdf8" } as React.CSSProperties}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">
            {room.locked && <span title="Needs a password" aria-label="Needs a password">🔒 </span>}
            {room.name}
          </div>
          <div className="truncate text-sm text-slate-300">
            {room.players.length > 0 ? room.players.join(" vs ") : `Host: ${room.host}`}
            {room.bot ? " · 🤖" : ""}
            {room.status === "playing" && room.turn > 0 ? ` · turn ${room.turn}` : ""}
            {room.spectators > 0 ? ` · 👁 ${room.spectators}` : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${status.chip}`}>
          {room.status === "playing" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 align-middle" aria-hidden="true" />}
          {status.label}
        </span>
        {room.status === "playing" && <WatchButton roomId={room.roomId} name={room.name} locked={room.locked} disabled={!canJoin} title={canJoin ? undefined : "You are already in a room"} />}
        {open && !asking && (
          <button
            onClick={() => void join()}
            disabled={!canJoin}
            title={canJoin ? "Join this room" : "You are already in a room"}
            className="btn-gold shrink-0"
          >
            Join
          </button>
        )}
      </div>
      {open && asking && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={40}
            autoComplete="off"
            placeholder="Password"
            aria-label={`Password for ${room.name}`}
            className="tool-field min-w-0 flex-1 !py-1.5 text-[15px]"
          />
          <button type="submit" disabled={!canJoin || !password} className="btn-gold shrink-0">
            Join
          </button>
          <button
            type="button"
            onClick={() => {
              setAsking(false);
              setPassword("");
            }}
            aria-label="Cancel"
            className="btn-ghost shrink-0 !px-2.5 !text-base leading-none"
          >
            ×
          </button>
        </form>
      )}
    </li>
  );
}
