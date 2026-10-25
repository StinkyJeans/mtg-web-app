"use client";

import { useRef, useState } from "react";
import { PRESETS } from "@/lib/background";
import type { useBattlefieldBackground } from "@/lib/background";

/** A small panel to choose the picture behind the battlefield. */
export default function BackgroundPicker({ bg }: { bg: ReturnType<typeof useBattlefieldBackground> }) {
  const [open, setOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-2 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left text-xs font-bold uppercase font-display tracking-wide text-zinc-600">
        <span>🖼 Background</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          <div>
            <button onClick={() => file.current?.click()} className="w-full rounded-lg bg-amber-400 px-3 py-1.5 font-semibold text-black shadow hover:bg-amber-300">
              Choose a picture from your computer…
            </button>
            <input
              ref={file}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void bg.upload(f);
                e.target.value = "";
              }}
            />
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Any JPG or PNG. It is saved in this browser only. Wide pictures (16:9) work best.
            </p>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase font-display text-zinc-500">Or pick a look</div>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => bg.choose(`preset:${p.id}`)}
                  title={p.name}
                  className={`h-10 rounded-md border-2 text-[10px] font-bold text-white shadow-sm ${bg.usingPreset === p.id ? "border-amber-400 ring-2 ring-amber-300" : "border-white"}`}
                  style={{ backgroundImage: p.css, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="flex justify-between">
              <span>Picture strength</span>
              <span>{Math.round((1 - bg.dim) * 100)}%</span>
            </span>
            <input type="range" min={0} max={0.85} step={0.05} value={bg.dim} onChange={(e) => bg.setDim(Number(e.target.value))} className="accent-amber-500" aria-label="How strong the picture is" />
            <span className="text-[11px] text-zinc-500">Lower it if the cards are hard to read.</span>
          </label>

          {(bg.usingFile || bg.usingPreset) && (
            <button onClick={() => bg.choose("")} className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-100">
              Back to the default
            </button>
          )}
          <p className="rounded bg-zinc-100 p-2 text-[11px] leading-snug text-zinc-600">
            The default is the file <b>mtg/public/backgrounds/battlefield.jpg</b>. Put a picture there with that name and it is used whenever nothing else is chosen here.
          </p>
          {bg.error && <p className="text-xs text-red-600">{bg.error}</p>}
        </div>
      )}
    </section>
  );
}
