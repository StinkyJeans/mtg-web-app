import type { CardDef } from "@mtg/engine";
import { cardImageUrl } from "@/lib/cards";
import { isTokenDef, useTokenArt } from "@/lib/tokenArt";
import TokenFrame from "./TokenFrame";

type Size = "sm" | "md" | "lg";

// Stored art is 146x204, so "lg" shows it at its native size.
// On the play screen the page sets --card-h from the window height so the whole board fits without scrolling; elsewhere it is 168px.
const ART_SIZE: Record<Size, string> = { sm: "h-[calc(var(--card-h,168px)*0.8)] aspect-[146/204]", md: "h-[var(--card-h,168px)] aspect-[146/204]", lg: "h-[201px] w-36" };
const FRAME_SIZE: Record<Size, string> = ART_SIZE;

// A card turned sideways is as wide as it is tall; the margin gives it that extra width so its neighbours don't get covered.
const TAP_MARGIN: Record<Size, string> = { sm: "mx-[calc(var(--card-h,168px)*0.115)]", md: "mx-[calc(var(--card-h,168px)*0.142)]", lg: "mx-8" };

export const COMBAT_BADGE: Record<string, string> = {
  free: "bg-yellow-400 text-black",
  best: "bg-yellow-400 text-black",
  safe: "bg-green-600 text-white",
  good: "bg-green-600 text-white",
  risky: "bg-orange-500 text-white",
  trade: "bg-orange-500 text-white",
  chump: "bg-orange-500 text-white",
  block: "bg-sky-600 text-white",
  threat: "bg-red-600 text-white",
  blocked: "bg-emerald-600 text-white",
};

interface Props {
  /** Combat advice: the card glows in the color of the tone and wears the label as a badge. */
  combat?: { tone: string; label: string; why?: string };
  def: CardDef;
  tapped?: boolean;
  summoningSick?: boolean;
  damage?: number;
  /** Power and toughness right now (auras, anthems and pumps change them). Defaults to the printed ones. */
  power?: number;
  toughness?: number;
  /** In hand: you can play this right now with the mana you have. Gets a green glow and a badge. */
  castable?: boolean;
  /** In hand: you can't play this right now. The card is dimmed, `hint` says why. */
  dim?: boolean;
  hint?: string;
  /** Small labels on the card, e.g. "On: Grizzly Bears" for an Aura, or the Auras attached to a creature. */
  tags?: string[];
  /** Tailwind ring classes, e.g. "ring-2 ring-amber-400" */
  ring?: string;
  note?: string;
  size?: Size;
  /** Marks the card on the page so the combat animation can find it. */
  iid?: string;
  /** Attacking this turn: the card lifts up and glows red. */
  attacking?: boolean;
  onClick?: () => void;
  /** Mouse over / keyboard focus: used to show the card in the detail panel. */
  onHover?: () => void;
  /**
   * Show the card big. Adds a magnifier button (visible on hover) and makes right-click work.
   * Use it where a plain click already does something else, like adding the card to a deck.
   */
  onZoom?: () => void;
}

function Card({ combat, def, tapped, summoningSick, damage = 0, power, toughness, tags, castable, dim, hint, ring = "", note, size = "sm", iid, attacking, onClick, onHover, onZoom }: Props) {
  const tokenArt = useTokenArt(def); // tokens have no stored art: it comes from Scryfall
  const imageUrl = def.image ? cardImageUrl(def.image) : tokenArt?.small || null;
  const tokenFrame = !imageUrl && isTokenDef(def); // a token Scryfall has no picture of: we draw the card ourselves
  const nowPower = power ?? def.power ?? 0;
  const toughnessLeft = (toughness ?? def.toughness ?? 0) - damage;
  const changed = def.type === "creature" && (nowPower !== (def.power ?? 0) || (toughness ?? def.toughness ?? 0) !== (def.toughness ?? 0));
  const base = `relative shrink-0 overflow-hidden rounded-lg border border-zinc-600 text-left text-xs transition ${
    tapped && !attacking ? `rotate-90 brightness-[.72] ${TAP_MARGIN[size]}` : ""
  } ${attacking ? "-translate-y-3 scale-105 shadow-xl shadow-red-500/50 ring-2 ring-red-500" : ""} ${
    onClick ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
  } ${castable ? "castable-glow" : ""} ${combat ? `combat-${combat.tone}` : ""} ${dim ? "brightness-[.7] saturate-50" : ""} ${ring}`;
  const hover = hint ?? (combat ? `${combat.label}${combat.why ? `: ${combat.why}` : ""}` : undefined) ?? (onHover ? undefined : [def.typeLine, def.manaCost, def.text].filter(Boolean).join("\n"));
  const badge = combat ? (
    <span className={`absolute left-1 top-1 z-10 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow ${COMBAT_BADGE[combat.tone] ?? "bg-zinc-700 text-white"}`}>{combat.label}</span>
  ) : castable ? (
    <span className="absolute left-1 top-1 z-10 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">✓ Castable</span>
  ) : null;

  // Real card art already shows name, cost, text and P/T: only add the live game status on top.
  if (imageUrl || tokenFrame) {
    return (
      <button
        type="button"
        data-card-iid={iid}
        onClick={onClick}
        onMouseEnter={onHover}
        onContextMenu={onZoom && ((e) => (e.preventDefault(), onZoom()))}
        onFocus={onHover}
        title={hover}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        className={`${base} ${ART_SIZE[size]} bg-slate-800`}
      >
        <span className="sr-only">{def.name}</span>
        {tokenFrame && <TokenFrame def={def} art={tokenArt?.crop} power={nowPower} toughness={toughnessLeft} damaged={damage > 0} />}
        {badge}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-1 text-[10px] font-semibold">
          {note && <span className="rounded bg-sky-600 px-1 text-white">{note}</span>}
          {tags?.map((t) => (
            <span key={t} className="rounded bg-violet-700 px-1 text-white">
              {t}
            </span>
          ))}
          {tapped && (
            <span className="rounded bg-black/80 px-1 text-zinc-200">
              <i className="ms ms-tap" role="img" aria-label="Tapped" title="Tapped" />
            </span>
          )}
          {summoningSick && <span className="rounded bg-black/80 px-1 text-zinc-200">Summoning sick</span>}
        </div>
        {!tokenFrame && (damage > 0 || changed) && (
          <span className={`absolute right-1 top-1 rounded px-1.5 py-0.5 text-xs font-bold text-white ${damage > 0 ? "bg-red-700" : "bg-emerald-700"}`} title="Power / toughness now">
            {nowPower}/{toughnessLeft}
          </span>
        )}
      </button>
    );
  }

  // No art: draw a simple frame.
  const tint = def.type === "land" ? (def.id === "forest" ? "bg-green-900" : "bg-red-900") : "bg-indigo-900";
  return (
    <button
      type="button"
      data-card-iid={iid}
      onClick={onClick}
      onMouseEnter={onHover}
      onContextMenu={onZoom && ((e) => (e.preventDefault(), onZoom()))}
      onFocus={onHover}
      title={hover}
      className={`${base} ${tint} flex flex-col justify-between p-2 text-white ${FRAME_SIZE[size]}`}
    >
      {badge}
      <div className="flex justify-between gap-1 rounded bg-black/40 px-1">
        <span className="font-semibold leading-tight">{def.name}</span>
        {def.type === "creature" && <span className="text-amber-300">{def.cost}</span>}
      </div>
      <div className="rounded bg-black/40 px-1 text-zinc-300">
        <div className="capitalize">{def.type}</div>
        {note && <div className="text-sky-300">{note}</div>}
        {tags?.map((t) => (
          <div key={t} className="rounded bg-violet-700/90 px-1 text-[10px] text-white">
            {t}
          </div>
        ))}
        {tapped && (
          <div>
            <i className="ms ms-tap" role="img" aria-label="Tapped" title="Tapped" />
          </div>
        )}
        {summoningSick && <div>Summoning sick</div>}
      </div>
      {def.type === "creature" && (
        <div className="self-end rounded bg-black/70 px-1.5 py-0.5 font-bold">
          {nowPower}/{damage ? <span className="text-red-400">{toughnessLeft}</span> : toughnessLeft}
        </div>
      )}
    </button>
  );
}

export default function CardView(props: Props) {
  const card = <Card {...props} />;
  if (!props.onZoom) return card;

  return (
    <div className="group relative shrink-0">
      {card}
      <button
        type="button"
        onClick={props.onZoom}
        aria-label={`Enlarge ${props.def.name}`}
        title="Enlarge (or right-click the card)"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white opacity-0 shadow transition hover:bg-black group-hover:opacity-100 focus-visible:opacity-100"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
        </svg>
      </button>
    </div>
  );
}
