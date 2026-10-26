"use client";

import type { PlayerId } from "@mtg/engine";
import { MATS, resolve, SLEEVES } from "@/lib/playmat";
import { SleeveBack } from "./AppearanceDialog";

/**
 * Choose the card sleeve and the playmat for one player, with a preview of the table. `sleeve` and `mat` are the stored
 * choices ("preset:<id>", or empty for the player's default); `who` only decides which default mat is shown.
 */
export default function LookPicker({ who, sleeve, mat, onSleeve, onMat, disabled = false }: { who: PlayerId; sleeve: string; mat: string; onSleeve: (value: string) => void; onMat: (value: string) => void; disabled?: boolean }) {
  const s = resolve("sleeve", sleeve, who);
  const m = resolve("mat", mat, who);
  const ring = (on: boolean) => (on ? "border-[#fcd34d] ring-2 ring-[#fcd34d]" : "border-white/25 hover:border-white/70");

  return (
    <div className="flex flex-col gap-2.5 text-left">
      {/* the table as it will look: the mat, with a stack of sleeved cards */}
      <div className="relative h-24 overflow-hidden rounded-xl border border-white/25 shadow-inner" style={{ background: m.css }} aria-label="Preview of your table">
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-x-3 bottom-2 top-2 rounded-lg border border-dashed border-white/30" />
        <div className="absolute right-5 top-1/2 h-[68px] w-[48px] -translate-y-1/2">
          {[3, 2, 1, 0].map((i) => (
            <div key={i} className="absolute" style={{ left: (3 - i) * 1.5, top: -(3 - i) * 1.5 }}>
              <SleeveBack css={s.css} edge={s.edge} className="h-[68px] w-[48px]" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Card sleeve</span>
        <div className="mt-1.5 flex max-h-[7.2rem] flex-wrap gap-1.5 overflow-y-auto pr-1">
          {SLEEVES.map((x) => (
            <button key={x.id} type="button" disabled={disabled} onClick={() => onSleeve(`preset:${x.id}`)} title={x.name} aria-label={`Sleeve: ${x.name}`} aria-pressed={s.id === x.id} className="transition hover:-translate-y-0.5 disabled:opacity-50">
              <SleeveBack css={x.css} edge={x.edge ?? "#fff"} className={`h-[46px] w-[33px] border-2 ${ring(s.id === x.id)}`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Playmat</span>
        <div className="mt-1.5 flex max-h-[7.2rem] flex-wrap gap-1.5 overflow-y-auto pr-1">
          {MATS.map((x) => (
            <button key={x.id} type="button" disabled={disabled} onClick={() => onMat(`preset:${x.id}`)} title={x.name} aria-label={`Playmat: ${x.name}`} aria-pressed={m.id === x.id} className="transition hover:-translate-y-0.5 disabled:opacity-50">
              <span className={`block h-[34px] w-[52px] rounded-md border-2 ${ring(m.id === x.id)}`} style={{ background: x.css }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
