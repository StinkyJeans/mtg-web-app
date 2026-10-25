"use client";

import { useEffect } from "react";
import { holdWallpaper } from "../LiveWallpaper";
import { leaveRoom, send } from "@/lib/online/session";
import type { RoomSnapshot } from "@/lib/online/protocol";

const SEAT_COLOR = { p1: "from-sky-400 to-blue-600", p2: "from-rose-400 to-red-600" } as const;

/** The pop-up shown to everyone in a room: the room's name and host, who is in, and (for the host) the Vote button. */
export default function RoomPopup({ room }: { room: RoomSnapshot }) {
  useEffect(() => holdWallpaper(), []); // the moving background holds still behind frosted glass

  const iAmHost = room.you === room.host;
  const host = room.players.find((p) => p.seat === room.host);
  const full = room.players.length === 2;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Room ${room.name}`} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-white/25 bg-slate-950/55 p-6 text-white shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
        {/* the room's name and its host */}
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-slate-300">Room</p>
            <h2 className="truncate text-3xl font-extrabold">{room.name}</h2>
            <p className="mt-1 text-[15px] text-slate-200">
              Hosted by <span className="font-bold text-[#fde68a]">{host?.name ?? "…"}</span>
              {iAmHost && <span className="ml-1 text-slate-300">(you)</span>}
            </p>
          </div>
          <button
            onClick={() => leaveRoom()}
            aria-label={iAmHost ? "Close the room" : "Leave the room"}
            title={iAmHost ? "Close the room" : "Leave the room"}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-lg leading-none hover:bg-white/20"
          >
            ×
          </button>
        </header>

        {/* the players */}
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Players">
          {(["p1", "p2"] as const).map((seat) => {
            const p = room.players.find((x) => x.seat === seat);
            return (
              <div key={seat} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${p ? "border-white/25 bg-white/10" : "border-dashed border-white/25 bg-white/5"}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-extrabold text-white shadow-lg ${p ? `bg-gradient-to-br ${SEAT_COLOR[seat]}` : "bg-white/10"}`}>
                  {p ? (p.bot ? "🤖" : p.name.charAt(0).toUpperCase()) : "?"}
                </div>
                <div className="min-w-0">
                  {p ? (
                    <>
                      <div className="truncate text-lg font-bold">{p.name}</div>
                      <div className="text-sm text-slate-300">
                        {p.bot ? "Computer player" : seat === room.host ? "Host" : "Guest"}
                        {p.seat === room.you ? " · you" : ""}
                        {p.bot && iAmHost && (
                          <button onClick={() => send("removeBot")} className="ml-2 underline hover:text-white">
                            remove
                          </button>
                        )}
                      </div>
                    </>
                  ) : iAmHost ? (
                    <>
                      <div className="text-lg font-semibold text-slate-200">Waiting…</div>
                      <button onClick={() => send("addBot")} className="mt-1 rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-sm font-bold text-[#fde68a] hover:bg-white/20">
                        🤖 Play against a bot
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-semibold text-slate-200">Waiting…</div>
                      <div className="text-sm text-slate-300">for a player to join</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* only the host starts the vote */}
        <footer className="flex flex-col items-center gap-2">
          {iAmHost ? (
            <>
              <button
                onClick={() => send("startVote")}
                disabled={!full}
                className="w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 text-lg font-extrabold text-black shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 sm:w-auto"
              >
                Vote
              </button>
              <p className="text-sm text-slate-300">{full ? "Start the vote for the deck size." : "The Vote button turns on when a second player has joined, or add a bot."}</p>
            </>
          ) : (
            <p className="rounded-xl bg-white/10 px-4 py-2 text-[15px] text-slate-100">Waiting for {host?.name ?? "the host"} to start the vote…</p>
          )}
        </footer>
      </div>
    </div>
  );
}
