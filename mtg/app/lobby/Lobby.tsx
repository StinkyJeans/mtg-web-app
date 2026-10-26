"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectLobby, createRoom, disconnectLobby, tryReconnect, useOnline } from "@/lib/online/session";
import { Skeleton } from "../Skeleton";
import LiveMatches from "./LiveMatches";
import RoomPopup from "./RoomPopup";
import VotePopup from "./VotePopup";

const ASIDE = "z-10 order-last flex w-full max-w-md flex-col gap-3 xl:order-none xl:fixed xl:right-4 xl:top-14 xl:w-[min(26rem,calc(100vw-2rem))] xl:max-w-none";

/** The live matches panel and the Create room button, in their shapes, until it is known who is signed in. */
function LobbySkeleton() {
  return (
    <aside role="status" aria-label="Loading the live matches" className={ASIDE}>
      <div className="panel-glass flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-2.5 w-2.5 !rounded-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="ml-auto h-6 w-24 !rounded-full" />
        </div>
        <Skeleton className="h-[62px] !rounded-xl" />
        <Skeleton className="h-[62px] !rounded-xl" />
      </div>
      <Skeleton className="h-[52px] !rounded-2xl" />
      <Skeleton className="h-[56px] !rounded-2xl" />
    </aside>
  );
}

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

  if (!username) return <LobbySkeleton />;
  const inMatch = room?.stage === "playing" || room?.stage === "over";

  return (
    <>
      <aside className={ASIDE}>
        <LiveMatches online={online} inRoom={room !== null} />

        {inMatch ? (
          <button
            onClick={() => router.push("/play/online")}
            className="btn-live"
          >
            ▶ {room?.spectating ? "Return to the match you are watching" : "Return to your match"}
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
            <label className="tool-field !rounded-2xl !bg-slate-950/60 !px-4 !py-3 text-[15px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
              </svg>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={online.lobby !== "on" || room !== null}
                maxLength={40}
                autoComplete="off"
                placeholder="Password (optional)"
                aria-label="Room password (optional)"
                className="w-full disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={online.lobby !== "on" || room !== null}
              className="btn-gold !w-full !rounded-2xl !py-3.5 !text-base"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create {password ? "locked room" : "room"}
            </button>
          </form>
        )}

        {online.reconnecting && (
          <p role="status" className="rounded-xl border border-amber-300/40 bg-slate-950/70 px-3 py-2 text-[15px] text-amber-100">
            ⟳ Reconnecting to your room…
          </p>
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
