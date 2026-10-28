"use client";

import type { GameState, PlayerId } from "@mtg/engine";
import { ManaText } from "./ManaSymbols";

/** Choose X for a spell like "deals X damage": + / - buttons, up to what the player can pay. */
export function XPanel({ name, max, x, onChange, onCast, onCancel }: { name: string; max: number; x: number; onChange: (x: number) => void; onCast: () => void; onCancel: () => void }) {
  const step = "h-8 w-8 rounded border border-zinc-400 bg-white text-lg font-bold hover:bg-zinc-100 disabled:opacity-30";
  return (
    <section className="panel-in flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/50 bg-orange-50 p-3">
      <h2 className="text-sm font-semibold text-orange-800">{name}: choose X</h2>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(x - 1)} disabled={x <= 0} aria-label="Lower X" className={step}>
          −
        </button>
        <span className="w-8 text-center text-xl font-bold">{x}</span>
        <button onClick={() => onChange(x + 1)} disabled={x >= max} aria-label="Raise X" className={step}>
          +
        </button>
        <span className="text-xs text-zinc-600">(you can pay for up to {max})</span>
      </div>
      <button onClick={onCast} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
        Continue
      </button>
      <button onClick={onCancel} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
        Cancel
      </button>
    </section>
  );
}

/** A choice made before casting: which mode(s) of a "Choose one" spell, or whether to pay the kicker. */
export function ChoicePanel({
  title,
  options,
  onCancel,
  multi,
  onDone,
}: {
  title: React.ReactNode;
  options: { label: React.ReactNode; disabled?: boolean; onPick: () => void }[];
  onCancel: () => void;
  multi?: { selected: number[]; onToggle: (i: number) => void; onDone: () => void; /** Continue stays off until this is true (default: something is selected). */ canDone?: boolean };
  onDone?: () => void;
}) {
  void onDone;
  return (
    <section className="panel-in flex flex-col gap-2 rounded-lg border border-indigo-500/50 bg-indigo-50 p-3">
      <h2 className="text-sm font-semibold text-indigo-800">{title}</h2>
      <div className="flex flex-col gap-2">
        {options.map((o, i) => (
          <button
            key={i}
            disabled={o.disabled}
            onClick={() => (multi ? multi.onToggle(i) : o.onPick())}
            className={`rounded-lg border px-3 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${multi?.selected.includes(i) ? "border-indigo-600 bg-indigo-200" : "border-indigo-400 bg-white hover:bg-indigo-100"}`}
          >
            {multi && <span className="mr-2">{multi.selected.includes(i) ? "☑" : "☐"}</span>}
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {multi && (
          <button onClick={multi.onDone} disabled={multi.canDone === undefined ? multi.selected.length === 0 : !multi.canDone} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40">
            Continue
          </button>
        )}
        <button onClick={onCancel} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
          Cancel
        </button>
      </div>
    </section>
  );
}

/** A modal double-faced land (a Pathway): which face to play it with. */
export function LandFacePanel({ state, actor, iid, onPlay, onCancel }: { state: GameState; actor: PlayerId; iid: string; onPlay: (back: boolean) => void; onCancel: () => void }) {
  const card = state.players[actor].hand.find((c) => c.iid === iid);
  if (!card) return null;
  const faces = [state.cards[card.defId], state.cards[`${card.defId}//back`]];
  return (
    <ChoicePanel
      title="Which face do you play it with?"
      options={faces.map((face, i) => ({ label: <>{face.name}: <ManaText text={(face.text ?? "").replace(/\.$/, "")} /></>, onPick: () => onPlay(i === 1) }))}
      onCancel={onCancel}
    />
  );
}
