"use client";

import { useEffect, useState } from "react";

/** Before a room is opened: open to anyone, or locked with a password. */
export default function CreateRoomDialog({ busy, ready, error, onCreate, onClose }: { busy: boolean; ready: boolean; error: string | null; onCreate: (password: string) => void; onClose: () => void }) {
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const missing = locked && password.trim() === "";
  return (
    <div role="dialog" aria-modal="true" aria-label="Create a room" className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!missing) onCreate(locked ? password : "");
        }}
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/25 bg-slate-950/95 p-5 text-white shadow-2xl shadow-black/50 sm:p-6"
      >
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold">Create a room</h2>
            <p className="mt-1 text-[15px] text-slate-300">Open a room, then a friend joins it or you play against the bot.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-2xl leading-none">
            ×
          </button>
        </header>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Who can join</legend>
          {[
            { value: false, title: "Open room", text: "Anyone can see it and join." },
            { value: true, title: "Password room", text: "Only people who know the password can join." },
          ].map((o) => (
            <label key={String(o.value)} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${locked === o.value ? "border-amber-300 bg-amber-400/15" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
              <input type="radio" name="room-lock" checked={locked === o.value} onChange={() => setLocked(o.value)} className="mt-1 h-4 w-4 accent-amber-400" />
              <span>
                <span className="block font-bold">{o.value ? "🔒 " : ""}{o.title}</span>
                <span className="block text-sm text-slate-300">{o.text}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {locked && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-200">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={40}
              autoFocus
              autoComplete="off"
              placeholder="Choose a password"
              aria-label="Room password"
              className="w-full rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-300/40 bg-red-950/70 px-3 py-2 text-[15px] text-[#fecaca]">
            {error}
          </p>
        )}
        {!ready && <p className="text-sm text-amber-200">Connecting to the game server…</p>}

        <button type="submit" disabled={!ready || busy || missing} aria-busy={busy} className="btn-gold !w-full !rounded-2xl !py-3.5 !text-base">
          {busy ? "Opening your room…" : locked ? "Create password room" : "Create room"}
        </button>
      </form>
    </div>
  );
}
