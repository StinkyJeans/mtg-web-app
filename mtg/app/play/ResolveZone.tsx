"use client";

import type { CardDef, GameState, StackItem } from "@mtg/engine";
import { cardImageUrl } from "@/lib/cards";
import { animationsEnabled } from "@/lib/motion";
import { itemName, readable, targetName } from "./cardText";
import { playerName } from "./log";
import type { Announcement } from "./log";

const REVEAL_MS = 1500;
const REVEAL_FAST_MS = 700; // animations off: still seen, but the game moves on sooner
const MAX_SHOWN = 4;

let holding = false;
/** True while the other player's play is being shown before the board changes, so clicks wait for it. */
export const isRevealing = () => holding;

/** Keeps the other player's play in the zone for a moment before the game moves on. */
export async function holdReveal(): Promise<void> {
  holding = true;
  try {
    await new Promise((r) => setTimeout(r, animationsEnabled() ? REVEAL_MS : REVEAL_FAST_MS));
  } finally {
    holding = false;
  }
}

type Status = "casting" | "stack" | "resolved";

interface Entry {
  key: string;
  status: Status;
  kind: "spell" | "ability";
  def?: CardDef;
  title: string;
  lines: string[];
  onClose?: () => void;
}

const LOOK: Record<Status, { chip: string; ring: string }> = {
  casting: { chip: "animate-pulse bg-amber-400 text-black", ring: "ring-amber-300" },
  stack: { chip: "bg-violet-600 text-white", ring: "ring-violet-400" },
  resolved: { chip: "bg-emerald-500 text-black", ring: "ring-emerald-300/70" },
};

const label = (e: Entry) => (e.status === "casting" ? (e.kind === "spell" ? "Casting…" : "Activating…") : e.status === "stack" ? "On the stack" : "Resolved");

/** The card a stack item came from: the spell itself, or the permanent whose ability it is. */
function stackCard(state: GameState, item: StackItem): CardDef | undefined {
  if (item.kind === "spell") return state.cards[item.card.defId];
  const perm = Object.values(state.players)
    .flatMap((p) => p.battlefield)
    .find((p) => p.card.iid === item.source);
  return perm ? state.cards[perm.card.defId] : undefined;
}

const onStack = (state: GameState, iid?: string) => !!iid && state.stack.some((i) => (i.kind === "spell" ? i.card.iid : i.source) === iid);

/**
 * The "to resolve" zone on the mat: what is on the stack, and what the other player just cast or used, shown as the cards
 * themselves so every play can be followed. `revealing` is the other player's play, shown before the board changes.
 */
export default function ResolveZone({
  state,
  played,
  revealing,
  onClose,
  onZoom,
}: {
  state: GameState;
  /** What the other player cast or used lately (it fades after a few seconds). */
  played: Announcement[];
  revealing: { items: Announcement[]; cards: Record<string, CardDef> } | null;
  onClose: (id: number) => void;
  onZoom: (def: CardDef) => void;
}) {
  const entries: Entry[] = [
    ...[...state.stack].reverse().map((item): Entry => ({
      key: `stack-${item.id}`,
      status: "stack",
      kind: item.kind,
      def: stackCard(state, item),
      title: `${playerName(item.controller)}: ${itemName(state, item)}`,
      lines: [
        ...(item.kind === "ability" ? [readable(item.text, item.sourceName)] : []),
        ...(item.targets.length > 0 ? [`Target: ${item.targets.map((t) => targetName(state, t)).join(", ")}`] : []),
      ],
    })),
    ...(revealing?.items ?? []).map((a): Entry => {
      const def = a.defId ? revealing?.cards[a.defId] : undefined;
      return { key: `played-${a.id}`, status: "casting", kind: a.kind, def, title: a.title, lines: a.kind === "ability" ? a.lines.slice(0, 1) : [] };
    }),
    ...played
      .filter((a) => !onStack(state, a.iid))
      .reverse()
      .map((a): Entry => ({ key: `played-${a.id}`, status: "resolved", kind: a.kind, def: a.defId ? state.cards[a.defId] : undefined, title: a.title, lines: a.lines, onClose: () => onClose(a.id) })),
  ].slice(0, MAX_SHOWN);
  if (entries.length === 0) return null;

  return (
    // It floats over the board (no panel behind it), so the player's mat stays visible around the cards. Only the cards take clicks.
    <section aria-label="To resolve" aria-live="polite" className="pointer-events-none fixed left-[56%] top-[26dvh] z-40 flex w-[min(24rem,92vw)] -translate-x-1/2 flex-col gap-2">
      <h3 className="self-start rounded-full bg-slate-950/80 px-3 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-widest text-amber-200 shadow-lg shadow-black/40">To resolve</h3>
      {entries.map((e) => (
        <div key={e.key} className={`announce-in pointer-events-auto flex items-start gap-2.5 rounded-lg bg-white p-2 text-zinc-900 shadow-2xl shadow-black/50 ring-2 ${LOOK[e.status].ring}`}>
          <button
            type="button"
            onClick={() => e.def && onZoom(e.def)}
            aria-label={e.def ? `Enlarge ${e.def.name}` : "Card"}
            className="flex h-[112px] w-20 shrink-0 items-end overflow-hidden rounded-md border border-zinc-700 bg-zinc-300 bg-cover bg-center shadow"
            style={e.def?.image ? { backgroundImage: `url(${cardImageUrl(e.def.image)})` } : undefined}
          >
            {!e.def?.image && <span className="p-1 text-left text-[11px] font-semibold leading-tight">{e.def?.name}</span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wide ${LOOK[e.status].chip}`}>{label(e)}</span>
              {e.onClose && (
                <button onClick={e.onClose} aria-label="Close" className="ml-auto rounded px-1.5 text-zinc-500 hover:bg-zinc-200">
                  ×
                </button>
              )}
            </div>
            <div className="mt-1 font-semibold leading-snug">{e.title}</div>
            {e.status === "casting" && e.kind === "spell" && e.def?.text && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-snug text-zinc-600">{e.def.text}</p>}
            {e.lines.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-sm leading-snug text-zinc-700">
                {e.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
