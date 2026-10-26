"use client";

import { useState } from "react";
import type { CardDef } from "@mtg/engine";
import { CardImage } from "./CardDetail";

const ZOOM_W = 320;

/** The big card shown next to whatever the mouse is over: above it when there is room, otherwise below. */
export function useHoverZoom() {
  const [hover, setHover] = useState<{ def: CardDef; el: HTMLElement; left: number; top: number } | null>(null);
  function show(def: CardDef, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const h = ZOOM_W * 1.4;
    const top = r.top - 8 - h >= 8 ? r.top - 8 - h : Math.min(r.bottom + 8, window.innerHeight - h - 8);
    setHover({ def, el, left: Math.min(Math.max(8, r.left + r.width / 2 - ZOOM_W / 2), window.innerWidth - ZOOM_W - 8), top: Math.max(8, top) });
  }
  const hide = () => setHover(null);
  // if the card under the mouse was removed (a new page of cards), no mouse-leave arrives: hide the preview then
  const node = hover?.el.isConnected && (
    <div className="pointer-events-none fixed z-[48] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/80" style={{ left: hover.left, top: hover.top, width: ZOOM_W }}>
      <CardImage def={hover.def} size="normal" className="block w-full" fallback={<div className="bg-slate-800 p-4 text-sm text-white">{hover.def.name}</div>} />
    </div>
  );
  return { show, hide, node };
}
