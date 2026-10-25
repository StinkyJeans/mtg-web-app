"use client";

import { joinRoom } from "@/lib/online/session";
import type { LobbyRoomInfo, Stage } from "@/lib/online/protocol";
import type { OnlineState } from "@/lib/online/session";

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
    <section aria-label="Live matches" className="flex max-h-[min(26rem,52dvh)] flex-col gap-2 rounded-2xl border border-white/25 bg-slate-950/55 p-3 text-white shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10">
      <header className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${online.lobby === "on" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : online.lobby === "connecting" ? "animate-pulse bg-amber-300" : "bg-red-400"}`} aria-hidden="true" />
        <h2 className="font-display text-base font-bold uppercase tracking-widest">Live matches</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">{live} playing now</span>
      </header>

      {online.lobby !== "on" && (
        <p className="rounded-lg bg-white/5 px-3 py-4 text-center text-[15px] text-slate-200">
          {online.lobby === "connecting" ? "Connecting to the game server…" : "Not connected to the game server."}
        </p>
      )}

      {online.lobby === "on" && rooms.length === 0 && (
        <p className="rounded-lg bg-white/5 px-3 py-5 text-center text-[15px] text-slate-200">
          No rooms yet.
          <br />
          <span className="text-slate-300">Create one and wait for your brother to join.</span>
        </p>
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
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{room.name}</div>
        <div className="truncate text-sm text-slate-300">
          {room.players.length > 0 ? room.players.join(" vs ") : `Host: ${room.host}`}
          {room.bot ? " · 🤖" : ""}
          {room.status === "playing" && room.turn > 0 ? ` · turn ${room.turn}` : ""}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${status.chip}`}>
        {room.status === "playing" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 align-middle" aria-hidden="true" />}
        {status.label}
      </span>
      {open && (
        <button
          onClick={() => void joinRoom(room.roomId)}
          disabled={!canJoin}
          title={canJoin ? "Join this room" : "You are already in a room"}
          className="shrink-0 rounded-lg bg-amber-400 px-3 py-1 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
        >
          Join
        </button>
      )}
    </li>
  );
}
