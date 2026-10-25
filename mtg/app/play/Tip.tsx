"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_W = 340;
const EDGE = 8;

/**
 * Wraps a control and shows an explanation as soon as the mouse is over it, or it has keyboard focus.
 * (The browser's own `title` tooltip waits a second and looks plain.)
 * The explanation floats above the page (not inside the panel the control is in), so no panel can cut it off,
 * and it is kept inside the window: it moves sideways near the edges and flips above when there is no room below.
 */
export default function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number; above: boolean } | null>(null);

  const show = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const roomBelow = window.innerHeight - r.bottom;
    const above = roomBelow < 120 && r.top > roomBelow;
    setAt({ x: r.left + r.width / 2, y: above ? r.top : r.bottom, above });
  };

  return (
    <span ref={wrap} className="relative inline-flex" onMouseEnter={show} onMouseLeave={() => setAt(null)} onFocus={show} onBlur={() => setAt(null)}>
      {children}
      {at &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[70] w-max rounded-xl border border-white/25 bg-slate-950/90 px-4 py-3 text-left text-[15px] font-medium leading-relaxed text-white shadow-xl shadow-black/50 backdrop-blur-md"
            style={{
              // centered on the control, but never closer than EDGE to either side of the window
              left: `clamp(${EDGE + MAX_W / 2}px, ${at.x}px, calc(100vw - ${EDGE + MAX_W / 2}px))`,
              top: at.above ? undefined : at.y + 8,
              bottom: at.above ? window.innerHeight - at.y + 8 : undefined,
              transform: "translateX(-50%)",
              maxWidth: `min(${MAX_W}px, calc(100vw - ${EDGE * 2}px))`,
            }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
