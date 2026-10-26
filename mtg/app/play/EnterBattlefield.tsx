"use client";

import { useEffect, useState } from "react";
import Logo from "../Logo";

// The loading screen shown when a match begins. It stays up until the match is ready (online: the game has arrived from
// the server) and for at least `minMs`, so it never just flashes, then it fades away.

const LINES = ["Shuffling the libraries…", "Cutting the decks…", "Drawing opening hands…", "Tapping the lands…", "Summoning the battlefield…"];
export default function EnterBattlefield({ ready = true, minMs = 1700, names }: { ready?: boolean; minMs?: number; names?: Record<string, string> }) {
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minMs);
    const tick = setInterval(() => setLine((n) => Math.min(n + 1, LINES.length - 1)), minMs / LINES.length);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [minMs]);

  const leaving = ready && minDone;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), 700); // after the fade
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;
  return (
    <div role="status" aria-live="polite" aria-label="Entering the battlefield" className="enter-overlay" data-leaving={leaving}>
      <div className="enter-fog" aria-hidden="true" />
      <div className="enter-fog enter-fog-b" aria-hidden="true" />

      <Logo size={272} glow className="enter-sigil enter-logo" />

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="enter-eyebrow">The duel begins</p>
        <h2 className="enter-title">Entering the battlefield</h2>
        {names && names.p1 && names.p2 && (
          <p className="enter-versus">
            <span>{names.p1}</span>
            <i aria-hidden="true">vs</i>
            <span>{names.p2}</span>
          </p>
        )}
      </div>

      <div className="flex w-[min(22rem,80vw)] flex-col items-center gap-2.5">
        <div className="enter-bar" aria-hidden="true">
          <span style={{ animationDuration: `${minMs}ms` }} />
        </div>
        <p key={line} className="enter-line">
          {LINES[line]}
        </p>
      </div>
    </div>
  );
}
