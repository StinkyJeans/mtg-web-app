"use client";

import { useEffect, useState } from "react";

// The loading screen shown when a match begins. It stays up until the match is ready (online: the game has arrived from
// the server) and for at least `minMs`, so it never just flashes, then it fades away.

const LINES = ["Shuffling the libraries…", "Cutting the decks…", "Drawing opening hands…", "Tapping the lands…", "Summoning the battlefield…"];
const GEMS = [
  { id: "w", fill: "#fbf5d6", edge: "#d9cfa0" },
  { id: "u", fill: "#2f86e0", edge: "#9cc7f5" },
  { id: "b", fill: "#4a3d46", edge: "#b9a8b4" },
  { id: "r", fill: "#e0472b", edge: "#f6a08f" },
  { id: "g", fill: "#2f9a52", edge: "#98dcb0" },
];
// the five gems sit at the corners of a pentagon (white at the top, then clockwise in the order of the color wheel)
const POINTS = GEMS.map((_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [100 + 62 * Math.cos(a), 100 + 62 * Math.sin(a)] as const;
});
const STAR = [0, 2, 4, 1, 3, 0].map((i) => POINTS[i].join(",")).join(" ");

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

      <svg viewBox="0 0 200 200" className="enter-sigil" aria-hidden="true">
        <defs>
          {GEMS.map((g) => (
            <radialGradient key={g.id} id={`enter-gem-${g.id}`} cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor={g.fill} />
              <stop offset="1" stopColor={g.fill} />
            </radialGradient>
          ))}
          <radialGradient id="enter-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f4b43d" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f4b43d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#enter-glow)" className="enter-pulse" />
        <g className="enter-turn">
          <circle cx="100" cy="100" r="92" fill="none" stroke="#f4b43d" strokeWidth="1.2" strokeDasharray="1.5 5.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="85" fill="none" stroke="#f4b43d" strokeWidth="2.4" opacity="0.9" />
        </g>
        <g className="enter-turn enter-turn-back">
          <circle cx="100" cy="100" r="62" fill="none" stroke="#ffe29a" strokeWidth="1.4" opacity="0.7" />
          <polygon points={STAR} fill="none" stroke="#ffe29a" strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
          {POINTS.map(([x, y], i) => (
            <g key={GEMS[i].id}>
              <circle cx={x} cy={y} r="13" fill="#f4b43d" />
              <circle cx={x} cy={y} r="10" fill={`url(#enter-gem-${GEMS[i].id})`} stroke={GEMS[i].edge} strokeWidth="0.8" />
            </g>
          ))}
        </g>
        <circle cx="100" cy="100" r="5" fill="#fff3c4" className="enter-pulse" />
      </svg>

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
