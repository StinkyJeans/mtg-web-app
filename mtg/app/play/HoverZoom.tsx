"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CardDef } from "@mtg/engine";
import { CardImage } from "./CardDetail";

const ZOOM_W = 320;
const HOLD_MS = 400;

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
  // A touch screen has no hover: pressing a card and holding it shows the same big card for as long as the finger stays down (moving the
  // finger is a scroll, which cancels it), and the tap that ends the hold is not a click on the card.
  const timer = useRef(0);
  const from = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const cancel = () => {
    window.clearTimeout(timer.current);
    from.current = null;
    if (held.current) setHover(null);
  };
  /** What to spread on an element showing `def`: hover with a mouse, press and hold with a finger. */
  const on = (def: CardDef) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(def, e.currentTarget),
    onMouseLeave: hide,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "touch") return;
      const el = e.currentTarget;
      held.current = false;
      from.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        held.current = true;
        from.current = null;
        navigator.vibrate?.(15);
        show(def, el);
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const start = from.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      if (!held.current) return;
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => held.current && e.preventDefault(), // (the hold must not open the browser's picture menu)
    style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties,
  });
  // if the card under the mouse was removed (a new page of cards), no mouse-leave arrives: hide the preview then
  // (drawn on the page itself: inside a panel with a blur or a transform, `fixed` would be measured from the panel, not the screen)
  const node = hover?.el.isConnected && createPortal(
    <div className="pointer-events-none fixed z-[48] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/80" style={{ left: hover.left, top: hover.top, width: ZOOM_W }}>
      <CardImage def={hover.def} size="normal" className="block w-full" fallback={<div className="bg-slate-800 p-4 text-sm text-white">{hover.def.name}</div>} />
    </div>
  , document.body);
  return { show, hide, on, node };
}
