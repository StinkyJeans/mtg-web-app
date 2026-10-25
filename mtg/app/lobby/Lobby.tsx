"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectLobby, createRoom, disconnectLobby, tryReconnect, useOnline } from "@/lib/online/session";
import LiveMatches from "./LiveMatches";
import RoomPopup from "./RoomPopup";
import VotePopup from "./VotePopup";

/**
 * The online side of the home page: the live matches (top right), the Create room button under them, and the pop-ups
 * that walk two players from an open room to the first turn.
 */
export default function Lobby() {
  const router = useRouter();
  const online = useOnline();
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState(""); // for the next room created; empty means open to anyone
  const room = online.snapshot;

  // Who am I? Then listen to the lobby for as long as this page is open.
  useEffect(() => {
    let alive = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive || !data.user) return;
        setUsername((data.user.user_metadata.username as string | undefined) ?? data.user.email?.split("@")[0] ?? "player");
        void connectLobby();
        void tryReconnect(); // a refreshed page goes back to the match it was in
      });
    return () => {
      alive = false;
      disconnectLobby();
    };
  }, []);

  // When the match begins, both players go to the play screen: once per match, as soon as both the room update and the game itself have arrived.
  const sent = useRef(false);
  useEffect(() => {
    const stage = room?.stage ?? null;
    if (stage !== "playing") {
      if (stage !== "over") sent.current = false; // a new match later may send them again
      return;
    }
    if (online.game && !sent.current) {
      sent.current = true;
      router.push("/play/online");
    }
  }, [room?.stage, online.game, router]);

  if (!username) return null;
  const inMatch = room?.stage === "playing" || room?.stage === "over";

  return (
    <>
      <aside className="fixed right-4 top-14 z-10 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
        <LiveMatches online={online} inRoom={room !== null} />

        {inMatch ? (
          <button
            onClick={() => router.push("/play/online")}
            className="rounded-2xl bg-gradient-to-b from-red-400 to-red-600 px-6 py-3 text-lg font-extrabold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5"
          >
            ▶ Return to your match
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void createRoom(`${username}'s room`, password);
              setPassword("");
            }}
            className="flex flex-col gap-2"
          >
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={online.lobby !== "on" || room !== null}
              maxLength={40}
              autoComplete="off"
              placeholder="🔒 Password (optional)"
              aria-label="Room password (optional)"
              className="rounded-xl border border-white/25 bg-slate-950/55 px-4 py-2.5 text-[15px] text-white placeholder:text-slate-300 focus:border-amber-300 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={online.lobby !== "on" || room !== null}
              className="rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-lg font-extrabold text-black shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-400/40 disabled:translate-y-0 disabled:opacity-50"
            >
              ＋ Create {password ? "locked room" : "room"}
            </button>
          </form>
        )}

        {online.error && (
          <p role="alert" className="rounded-xl border border-red-300/40 bg-red-950/70 px-3 py-2 text-[15px] text-[#fecaca]">
            {online.error}
          </p>
        )}
      </aside>

      {room?.stage === "waiting" && <RoomPopup room={room} />}
      {room && (room.stage === "vote" || room.stage === "decks" || room.stage === "coin") && <VotePopup room={room} />}
    </>
  );
}
