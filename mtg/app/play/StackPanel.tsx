"use client";

import { useState } from "react";
import { legalTargets } from "@mtg/engine";
import type { Activatable, CardDef, Crewable, Cyclable, GameState, LoyaltyOption, PlayerId, StackItem, TargetChoice, TargetSpec } from "@mtg/engine";
import CardView from "./CardView";
import { ManaText } from "./ManaSymbols";
import { helpFor } from "./glossary";
import { playerName } from "./log";

/** A short plain-English explanation of what some rules text does (see glossary.ts). */
export function Help({ text, max = 3, large }: { text: string; max?: number; large?: boolean }) {
  const lines = helpFor(text, max);
  if (lines.length === 0) return null;
  return (
    <span className={large ? "mt-1.5 block text-[15px] font-normal leading-relaxed text-zinc-700" : "mt-1 block text-xs font-normal leading-snug text-zinc-500"}>
      {lines.map((l) => (
        <span key={l} className="block">
          ⓘ {l}
        </span>
      ))}
    </span>
  );
}

/** Name of something a spell or ability can point at. */
const targetKey = (t: TargetChoice) => (t.kind === "player" || t.kind === "stack" ? `${t.kind}:${t.id}` : t.kind === "none" ? "none" : `${t.kind}:${t.iid}`);

export function targetName(state: GameState, t: TargetChoice): string {
  if (t.kind === "none") return "No target (skip)";
  if (t.kind === "player") return playerName(t.id);
  if (t.kind === "stack") {
    const item = state.stack.find((i) => i.id === t.id);
    return item ? `${itemName(state, item)} (on the stack)` : "a spell";
  }
  for (const p of Object.values(state.players)) {
    const perm = p.battlefield.find((x) => x.card.iid === t.iid);
    if (perm) return `${state.cards[perm.card.defId].name} (${playerName(p.id)})`;
    const dead = p.graveyard.find((x) => x.iid === t.iid);
    if (dead) return `${state.cards[dead.defId].name} (in ${playerName(p.id)}'s graveyard)`;
  }
  return t.iid;
}

export function itemName(state: GameState, item: StackItem): string {
  return item.kind === "spell" ? state.cards[item.card.defId].name : `${item.sourceName} ability`;
}

/** Rules text as the engine reads it ("~", lowercase) made readable: the card's name back in, first letter capital. */
export function readable(text: string, cardName: string): string {
  const t = text.replace(/~/g, cardName).replace(/\{([a-z0-9]+)\}/g, (_, x: string) => `{${x.toUpperCase()}}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** What is waiting to resolve, newest on top. The player to act can respond or pass. */
export function StackPanel({ state, actor, onPass, waiting }: { state: GameState; actor: PlayerId; onPass: () => void; /** Online, and the other player has to act: what to say while waiting. */ waiting?: string }) {
  // With nothing on the stack there can still be a window to respond (before combat damage): it needs its pass button too.
  if (state.stack.length === 0 && !state.priority) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-violet-500/50 bg-violet-50 p-3">
      <h2 className="text-sm font-semibold uppercase font-display tracking-wide text-violet-700">
        {state.stack.length === 0 ? "Before combat damage: respond, or pass to continue" : "The stack (resolves top first)"}
      </h2>
      <ol className="flex flex-col gap-1.5 text-base">
        {[...state.stack].reverse().map((item) => (
          <li key={item.id} className="rounded-lg border border-violet-200 bg-white px-3 py-2">
            <span className="text-lg font-semibold">{itemName(state, item)}</span>
            <span className="text-zinc-600"> · {playerName(item.controller)}</span>
            {item.targets.length > 0 && <span className="text-zinc-700"> → {item.targets.map((t) => targetName(state, t)).join(", ")}</span>}
            {item.kind === "ability" && <div className="text-[15px] text-zinc-700">{readable(item.text, item.sourceName)}</div>}
            <Help text={item.kind === "ability" ? item.text : (state.cards[item.card.defId].text ?? "")} max={2} large />
          </li>
        ))}
      </ol>
      {state.priority && waiting && <p className="text-base font-medium text-violet-800">{waiting}</p>}
      {state.priority && !waiting && (
        <div className="flex items-center gap-3">
          <button onClick={onPass} className="rounded-lg bg-violet-600 px-4 py-2 text-base font-semibold text-white hover:bg-violet-500">
            {playerName(actor)}: {state.stack.length === 0 ? "pass (continue)" : "pass (let it resolve)"}
          </button>
          <span className="text-[15px] text-zinc-700">{state.stack.length === 0 ? "You may cast an instant or use an ability first." : "Or cast an instant / use an ability to respond."}</span>
        </div>
      )}
    </section>
  );
}

/** Picks the targets one need at a time. `onDone` gets them all; `onCancel` is missing when a choice is forced. */
export function TargetPanel({
  state,
  controller,
  title,
  detail,
  specs,
  chosen,
  aimed,
  onAim,
  onPick,
  onCancel,
}: {
  state: GameState;
  controller: PlayerId;
  title: string;
  /** What the ability does, shown under the title. */
  detail?: string;
  specs: TargetSpec[];
  chosen: TargetChoice[];
  /** Clicked but not yet confirmed. */
  aimed: TargetChoice | null;
  onAim: (t: TargetChoice | null) => void;
  onPick: (t: TargetChoice) => void;
  onCancel?: () => void;
}) {
  const spec = specs[chosen.length];
  if (!spec) return null;
  const options = legalTargets(state, spec, controller);
  const aim = aimed && options.some((t) => targetKey(t) === targetKey(aimed)) ? aimed : null;
  // Anything on the battlefield is chosen by clicking the glowing card itself. The list only holds what has no card to click:
  // a player, a spell on the stack, a card in a graveyard, or "no target".
  const onBoard = (t: TargetChoice) => t.kind === "permanent" && Object.values(state.players).some((p) => p.battlefield.some((x) => x.card.iid === t.iid));
  const cardsToClick = options.some(onBoard);
  const listed = options.filter((t) => !onBoard(t));
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-sky-500/50 bg-sky-50 p-3">
      <h2 className="text-base font-semibold text-sky-800">
        {title}
        <span className="font-normal text-sky-700">
          {" "}
          — choose {spec.label}
          {specs.length > 1 ? ` (${chosen.length + 1}/${specs.length})` : ""}
        </span>
      </h2>
      {detail && (
        <div className="rounded bg-white px-3 py-2 text-[15px] leading-relaxed text-zinc-800">
          <div className="mb-0.5 text-xs font-bold uppercase font-display tracking-wider text-sky-700">What it does</div>
          <p className="whitespace-pre-line">{detail}</p>
          <Help text={detail} max={3} large />
        </div>
      )}
      {cardsToClick && <p className="text-sm font-medium text-sky-800">👆 Click one of the glowing cards on the battlefield, then confirm it here.</p>}
      {aim && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-white px-3 py-2">
          <span className="text-sm text-zinc-800">
            🎯 <span className="font-semibold">{targetName(state, aim)}</span>
          </span>
          <button onClick={() => onPick(aim)} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
            Confirm target
          </button>
          <button onClick={() => onAim(null)} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
            Change
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {listed.length > 0 && cardsToClick && <span className="text-sm text-zinc-600">Or choose:</span>}
        {listed.map((t, i) => (
          <button
            key={i}
            onClick={() => onAim(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${aim && targetKey(aim) === targetKey(t) ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400" : "border-sky-400 bg-white hover:bg-sky-100"}`}
          >
            {targetName(state, t)}
          </button>
        ))}
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

/** The name of a card in either player's hand. */
const cardName = (state: GameState, iid: string) => {
  const card = [...state.players.p1.hand, ...state.players.p2.hand].find((c) => c.iid === iid);
  return card ? state.cards[card.defId].name : "a card";
};

/** Abilities the player can use right now (tap to ping, pump, and so on). */
export function AbilityPanel({
  state,
  abilities,
  onUse,
  cycles = [],
  onCycle,
  crews = [],
  onCrew,
  loyalty = [],
  onLoyalty,
  flashbacks = [],
  exileLands = [],
  onPlayLand,
  onFlashback,
  locked = [],
  warnings = {},
}: {
  state: GameState;
  abilities: Activatable[];
  onUse: (a: Activatable) => void;
  cycles?: Cyclable[];
  onCycle?: (iid: string) => void;
  crews?: Crewable[];
  onCrew?: (iid: string) => void;
  loyalty?: LoyaltyOption[];
  onLoyalty?: (a: LoyaltyOption) => void;
  flashbacks?: { iid: string; name: string; cost: string; zone?: "graveyard" | "exile" }[];
  /** Lands in exile that may be played ("you may play that card"). */
  exileLands?: { iid: string; name: string }[];
  onPlayLand?: (iid: string) => void;
  onFlashback?: (iid: string) => void;
  /** Abilities that exist but can't be used right now, with the reason. Shown greyed out. */
  locked?: { key: string; where: "hand" | "battlefield"; label: React.ReactNode; reason: string; help?: string }[];
  /** "iid-index" -> a warning, for abilities that would change nothing right now. */
  warnings?: Record<string, string>;
}) {
  if (abilities.length === 0 && cycles.length === 0 && crews.length === 0 && loyalty.length === 0 && flashbacks.length === 0 && exileLands.length === 0 && locked.length === 0) return null;
  const nameOfPerm = (iid: string) => {
    for (const p of Object.values(state.players)) {
      const card = [...p.battlefield.map((x) => x.card), ...p.hand, ...p.graveyard].find((c) => c.iid === iid);
      if (card) return state.cards[card.defId].name;
    }
    return iid;
  };
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50 p-3">
      <h2 className="text-sm font-semibold uppercase font-display tracking-wide text-emerald-700">Abilities</h2>
      <div className="flex flex-col gap-1">
        {loyalty.map((a) => (
          <button key={`loyalty-${a.iid}-${a.index}`} onClick={() => onLoyalty?.(a)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">{nameOfPerm(a.iid)}</span> <span className="rounded bg-zinc-200 px-1.5 text-sm font-bold">{a.cost > 0 ? `+${a.cost}` : a.cost}</span>: {readable(a.text.replace(/^[+-]?\d+: /, ""), nameOfPerm(a.iid))}
            <Help text={a.text} large />
          </button>
        ))}
        {crews.map((c) => (
          <button key={`crew-${c.iid}`} onClick={() => onCrew?.(c.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Crew {nameOfPerm(c.iid)}</span> {c.crew}: tap creatures with total power {c.crew}, it becomes a creature this turn
            <Help text={`crew ${c.crew}`} large />
          </button>
        ))}
        {flashbacks.map((f) => (
          <button key={`flashback-${f.iid}`} onClick={() => onFlashback?.(f.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            {f.zone === "exile" ? (
              <>
                <span className="font-semibold">Play {f.name}</span>: <ManaText text={f.cost} /> — it was exiled and you attacked this turn
              </>
            ) : (
              <>
                <span className="font-semibold">Flashback {f.name}</span>: <ManaText text={f.cost} /> — cast it from your graveyard
                <Help text="flashback" large />
              </>
            )}
          </button>
        ))}
        {exileLands.map((l) => (
          <button key={`exile-land-${l.iid}`} onClick={() => onPlayLand?.(l.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Play {l.name}</span> as your land for the turn — it was exiled and you attacked this turn
          </button>
        ))}
        {cycles.map((c) => (
          <button key={`cycle-${c.iid}`} onClick={() => onCycle?.(c.iid)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">Cycle {cardName(state, c.iid)}</span>
            : <ManaText text={c.cost} /> — discard it, draw a card <span className="rounded bg-emerald-100 px-1.5 text-sm text-emerald-800">works from your hand</span>
            <Help text="cycling" large />
          </button>
        ))}
        {abilities.map((a) => (
          <button key={`${a.iid}-${a.index}`} onClick={() => onUse(a)} className="rounded-lg border border-emerald-400 bg-white px-3 py-2 text-left text-base leading-snug hover:bg-emerald-100">
            <span className="font-semibold">{nameOfPerm(a.iid)}</span>
            {Object.values(state.players).some((p) => p.hand.some((c) => c.iid === a.iid)) && <span className="ml-1 rounded bg-sky-100 px-1.5 text-sm text-sky-800">from hand</span>}
            {Object.values(state.players).some((p) => p.graveyard.some((c) => c.iid === a.iid)) && <span className="ml-1 rounded bg-stone-200 px-1.5 text-sm text-stone-700">from graveyard</span>}
            : {readable(a.text, nameOfPerm(a.iid))}
            {warnings[`${a.iid}-${a.index}`] && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-sm font-semibold text-amber-800">⚠ {warnings[`${a.iid}-${a.index}`]}</span>}
            <Help text={a.text} large />
          </button>
        ))}
        {locked.map((l) => (
          <button key={l.key} disabled title={l.reason} className="cursor-not-allowed rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-base text-zinc-600 opacity-80">
            {l.label} <span className="rounded bg-zinc-200 px-1.5 text-sm text-zinc-700">{l.where === "hand" ? "from hand" : "on battlefield"}</span> <span className="text-sm italic">— {l.reason}</span>
            {l.help && <Help text={l.help} max={2} large />}
          </button>
        ))}
      </div>
    </section>
  );
}

/** A choice among cards (which to discard, which to keep, which land to fetch, the order of the library). */
type PickKind = NonNullable<GameState["pendingPick"]>["kind"];
const CONFIRM: Partial<Record<PickKind, (name: string) => string>> = {
  discard: (n) => `Discard ${n}`,
  rummage: (n) => `Discard ${n}`,
  bounceOwn: (n) => `Return ${n}`,
  tapSome: (n) => `Tap ${n}`,
  crew: (n) => `Tap ${n}`,
  toHand: (n) => `Take ${n}`,
  searchLand: (n) => `Take ${n}`,
  searchAny: (n) => `Take ${n}`,
  revealToHand: (n) => `Take ${n}`,
  scry: (n) => `Put ${n} on the bottom`,
  surveil: (n) => `Put ${n} into the graveyard`,
};

export function PickPanel({ state, onPick, onZoom }: { state: GameState; onPick: (iid?: string) => void; onZoom: (def: CardDef) => void }) {
  const [selected, setSelected] = useState<string | null>(null); // a clicked card waits for the Confirm button
  const pick = state.pendingPick;
  if (!pick) return null;
  const owner = state.players[pick.owner];
  const cards = pick.options.flatMap((iid) => {
    const card = [...owner.hand, ...owner.library, ...owner.battlefield.map((p) => p.card)].find((c) => c.iid === iid);
    return card ? [card] : [];
  });
  if (pick.kind === "color") {
    const names: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
    return (
      <section className="flex flex-col gap-2 rounded-lg border border-rose-500/50 bg-rose-50 p-3">
        <PickHeader state={state} onZoom={onZoom} />
        <div className="flex flex-wrap gap-2">
          {pick.options.map((o) => (
            <button key={o} onClick={() => onPick(o)} className="flex items-center gap-2 rounded-lg border border-rose-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-rose-100">
              <ManaText text={`{${o}}`} /> {names[o] ?? o}
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (pick.kind === "ward" || pick.kind === "mode" || pick.kind === "mayPay" || pick.kind === "tax" || pick.kind === "toggle" || pick.kind === "topBottom") {
    return (
      <section className="flex flex-col gap-2 rounded-lg border border-rose-500/50 bg-rose-50 p-3">
        <PickHeader state={state} onZoom={onZoom} />
        <div className="flex flex-wrap gap-2">
          {(pick.kind === "ward" || pick.kind === "mayPay" || pick.kind === "tax") && (
            <button onClick={() => onPick("pay")} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
              Pay <ManaText text={pick.wardCost ?? ""} />
            </button>
          )}
          {(pick.kind === "toggle" || pick.kind === "topBottom") &&
            pick.options.map((o) => (
              <button key={o} onClick={() => onPick(o)} className="rounded-lg border border-rose-400 bg-white px-4 py-1.5 text-sm font-semibold capitalize hover:bg-rose-100">
                {pick.kind === "topBottom" ? `Put it on the ${o}` : o}
              </button>
            ))}
          {pick.kind === "mode" &&
            pick.options.map((o) => (
              <button key={o} onClick={() => onPick(o)} className="rounded-lg border border-rose-400 bg-white px-3 py-1.5 text-left text-sm hover:bg-rose-100">
                <ManaText text={pick.modes?.[Number(o)]?.text ?? o} />
              </button>
            ))}
          {pick.optional && (
            <button onClick={() => onPick(undefined)} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
              {pick.kind === "tax" ? "Don't pay (they draw)" : pick.kind === "toggle" ? "Do nothing" : "Don't pay"}
            </button>
          )}
        </div>
      </section>
    );
  }
  const chosen = cards.find((c) => c.iid === selected);
  const confirm = (iid?: string) => {
    setSelected(null);
    onPick(iid);
  };
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-rose-500/50 bg-rose-50 p-3">
      <PickHeader state={state} onZoom={onZoom} />
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => (
          <CardView
            key={c.iid}
            def={state.cards[c.defId]}
            ring={c === chosen ? "ring-4 ring-amber-400" : "ring-2 ring-rose-400"}
            onClick={() => setSelected(c === chosen ? null : c.iid)}
            onZoom={() => onZoom(state.cards[c.defId])}
          />
        ))}
      </div>
      {/* The other cards that were looked at are shown too, so the player can see what goes to the bottom. */}
      {pick.kind === "revealToHand" && (pick.bottomIids ?? []).some((id) => !pick.options.includes(id)) && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase font-display tracking-wide text-zinc-500">Also looked at (can&apos;t be taken)</span>
          <div className="flex flex-wrap gap-2">
            {(pick.bottomIids ?? [])
              .filter((id) => !pick.options.includes(id))
              .flatMap((id) => owner.library.filter((c) => c.iid === id))
              .map((c) => (
                <CardView key={c.iid} def={state.cards[c.defId]} dim onZoom={() => onZoom(state.cards[c.defId])} />
              ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => chosen && confirm(chosen.iid)}
          disabled={!chosen}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {chosen ? (CONFIRM[pick.kind] ?? ((n: string) => `Choose ${n}`))(state.cards[chosen.defId].name) : "Click a card, then confirm"}
        </button>
        {pick.optional && (
          <button onClick={() => confirm(undefined)} className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm hover:bg-zinc-200">
            {pick.kind === "searchLand" || pick.kind === "searchAny" ? "Don't search" : pick.kind === "crew" ? "Cancel" : pick.kind === "scry" || pick.kind === "surveil" ? "Keep the rest on top" : pick.kind === "revealToHand" ? "Take nothing" : pick.kind === "rummage" ? "Don't discard" : pick.kind === "tapSome" ? "Done" : "No, leave it"}
          </button>
        )}
      </div>
    </section>
  );
}

/** The card a choice comes from, found wherever it is now (a resolving spell is already in the graveyard). */
function sourceDef(state: GameState): CardDef | null {
  if (state.pendingPick?.source?.defId) return state.cards[state.pendingPick.source.defId] ?? null;
  const iid = state.pendingChoice?.item.source;
  if (!iid) return null;
  const card = Object.values(state.players)
    .flatMap((p) => [...p.battlefield.map((x) => x.card), ...p.graveyard, ...p.exile])
    .find((c) => c.iid === iid);
  return card ? (state.cards[card.defId] ?? null) : null;
}

/** What a choice is for: the card it comes from and its text, then the question. */
function PickHeader({ state, onZoom }: { state: GameState; onZoom: (def: CardDef) => void }) {
  const pick = state.pendingPick!;
  const def = sourceDef(state);
  return (
    <div className="flex items-start gap-3">
      {def && <CardView def={def} onZoom={() => onZoom(def)} />}
      <div className="min-w-0">
        {pick.source && <div className="text-[11px] font-semibold uppercase font-display tracking-wide text-rose-700">Resolving {pick.source.name}</div>}
        <h2 className="text-sm font-semibold text-rose-800">
          {playerName(pick.player)}: {pick.prompt}
        </h2>
        {def?.text && (
          <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-zinc-700">
            <ManaText text={def.text} />
          </p>
        )}
      </div>
    </div>
  );
}

/** Online, for the player who is waiting: what the other player is in the middle of, so the pause makes sense. */
export function ResolvingNotice({ state, onZoom }: { state: GameState; onZoom: (def: CardDef) => void }) {
  const chooser = state.pendingPick?.player ?? state.pendingChoice?.player;
  const name = state.pendingPick?.source?.name ?? state.pendingChoice?.item.sourceName;
  if (!chooser || !name) return null;
  const def = sourceDef(state);
  return (
    <section className="flex items-start gap-3 rounded-lg border border-violet-500/50 bg-violet-50 p-3">
      {def && <CardView def={def} onZoom={() => onZoom(def)} />}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase font-display tracking-wide text-violet-700">Resolving {name}</div>
        <p className="text-sm font-semibold text-violet-900">Waiting for {playerName(chooser)} to choose…</p>
        {def?.text && (
          <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-zinc-700">
            <ManaText text={def.text} />
          </p>
        )}
      </div>
    </section>
  );
}

/** Choose X for a spell like "deals X damage": + / - buttons, up to what the player can pay. */
export function XPanel({ name, max, x, onChange, onCast, onCancel }: { name: string; max: number; x: number; onChange: (x: number) => void; onCast: () => void; onCancel: () => void }) {
  const step = "h-8 w-8 rounded border border-zinc-400 bg-white text-lg font-bold hover:bg-zinc-100 disabled:opacity-30";
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/50 bg-orange-50 p-3">
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
  title: string;
  options: { label: React.ReactNode; disabled?: boolean; onPick: () => void }[];
  onCancel: () => void;
  multi?: { selected: number[]; onToggle: (i: number) => void; onDone: () => void };
  onDone?: () => void;
}) {
  void onDone;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-indigo-500/50 bg-indigo-50 p-3">
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
          <button onClick={multi.onDone} disabled={multi.selected.length === 0} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40">
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
