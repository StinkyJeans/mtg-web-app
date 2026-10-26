"use client";

import { useEffect, useRef, useState } from "react";
import { setMuted, setVolume, useMusic } from "@/lib/music";

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A speaker that shows how loud the music is. */
function Speaker({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...line}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" />
      {level === 0 ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />}
      {level > 0.4 && <path d="M18.3 7a7 7 0 0 1 0 10" />}
    </svg>
  );
}

/** In the top bar, on the dashboard only (where the music plays): mute it, or change how loud it is. */
export default function MusicControl() {
  const music = useMusic();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // the volume box closes on a click outside it, or Esc
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!music.active) return null;
  const silent = music.muted || music.volume === 0;
  const percent = Math.round(music.volume * 100);

  return (
    <div ref={box} className="relative flex items-center gap-1">
      <button
        onClick={() => setMuted(!music.muted)}
        aria-pressed={music.muted}
        aria-label={music.muted ? "Unmute the music" : "Mute the music"}
        title={music.blocked ? "Click anywhere to start the music" : music.muted ? "Unmute the music" : "Mute the music"}
        className="bar-btn relative flex items-center gap-1.5"
      >
        <Speaker level={silent ? 0 : music.volume} />
        <span className="hidden sm:inline">Music</span>
        {music.blocked && <span aria-hidden="true" className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 shadow-[0_0_8px_#fcd34d]" />}
      </button>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Music volume" title="Music volume" className="bar-btn !px-1.5">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...line} className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="panel-glass absolute right-0 top-full z-40 mt-2 flex w-64 flex-col gap-2 p-4 text-sm text-slate-100">
          <div className="flex items-center justify-between font-semibold">
            <label htmlFor="music-volume">Music volume</label>
            <span className="count-chip !py-0">{music.muted ? "Muted" : `${percent}%`}</span>
          </div>
          <input
            id="music-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-full cursor-pointer accent-[#f4b43d]"
            aria-label="Music volume"
          />
          <button onClick={() => setMuted(!music.muted)} className="btn-ghost self-start">
            <Speaker level={silent ? 0 : 1} />
            {music.muted ? "Unmute" : "Mute"}
          </button>
        </div>
      )}
    </div>
  );
}
