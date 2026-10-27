"use client";

import CardDetail, { CardImage } from "./CardDetail";
import { PREVIEW_W, useInspected, usePreview } from "./hoverStore";

/** The right-hand panel: the card under the mouse. */
export function HoverDetail() {
  return <CardDetail inspected={useInspected()} />;
}

/** The big card shown next to the card under the mouse. */
export function HoverPreview({ hidden }: { hidden: boolean }) {
  const hover = usePreview();
  if (!hover || hidden) return null;
  return (
    <div className="pointer-events-none fixed z-40 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/80" style={{ left: hover.left, top: hover.top, width: PREVIEW_W }}>
      <CardImage def={hover.def} size="normal" className="block w-full" fallback={<div className="bg-slate-800 p-4 text-sm text-white">{hover.def.name}</div>} />
    </div>
  );
}
