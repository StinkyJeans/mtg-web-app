"use client";

import { useState } from "react";
import { useMedia } from "./useMedia";

/** A phone held sideways: the battle is laid out for an upright phone, so ask for that (the player may carry on anyway). */
export default function RotateHint() {
  const sideways = useMedia("(orientation: landscape) and (max-height: 500px) and (max-width: 1023px) and (pointer: coarse)");
  const [carryOn, setCarryOn] = useState(false);
  if (!sideways || carryOn) return null;
  return (
    <div role="alertdialog" aria-label="Turn your phone upright" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center text-white">
      <div className="text-5xl" aria-hidden="true">
        📱
      </div>
      <h2 className="font-display text-xl font-bold tracking-wide">Turn your phone upright</h2>
      <p className="max-w-sm text-base text-slate-200">The battle fits best when the phone is held upright, so both battlefields and your hand are on screen.</p>
      <button onClick={() => setCarryOn(true)} className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white">
        Play sideways anyway
      </button>
    </div>
  );
}
