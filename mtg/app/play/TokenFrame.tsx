import type { CardDef } from "@mtg/engine";

// A token card drawn by us, for tokens Scryfall has no picture of. It scales to any width (sizes are in container units).

const FRAME: Record<string, { bg: string; edge: string; ink: string }> = {
  W: { bg: "#f1e9cf", edge: "#cdbd8c", ink: "#2a2418" },
  U: { bg: "#2f6fb5", edge: "#1c4a80", ink: "#f4f8ff" },
  B: { bg: "#3b3438", edge: "#1d181b", ink: "#f2eef0" },
  R: { bg: "#c4492f", edge: "#8a2a17", ink: "#fff3ef" },
  G: { bg: "#3f7d4c", edge: "#245232", ink: "#f1fbf3" },
  gold: { bg: "#d1a93f", edge: "#8d6f1c", ink: "#241c05" },
  none: { bg: "#8d9399", edge: "#585d62", ink: "#101214" },
};

function paint(colors: string[] | undefined) {
  if (!colors || colors.length === 0) return FRAME.none;
  return colors.length > 1 ? FRAME.gold : (FRAME[colors[0]] ?? FRAME.none);
}

export default function TokenFrame({ def, art, power, toughness, damaged = false }: { def: CardDef; art?: string | null; power?: number; toughness?: number; damaged?: boolean }) {
  const c = paint(def.colors);
  const isCreature = def.type === "creature";
  const typeLine = def.typeLine ? (/^token/i.test(def.typeLine) ? def.typeLine : `Token ${def.typeLine}`) : isCreature ? "Token Creature" : "Token";
  const p = power ?? def.power;
  const t = toughness ?? def.toughness;
  return (
    <div
      aria-hidden="true"
      className="@container absolute inset-0 flex flex-col"
      style={{ background: c.edge, padding: "3.5%", borderRadius: "inherit" }}
    >
      <div className="flex h-full flex-col overflow-hidden" style={{ background: c.bg, color: c.ink, borderRadius: "4cqw", border: `0.6cqw solid ${c.edge}` }}>
        <div className="truncate px-[4cqw] py-[1.6cqw] font-bold leading-tight" style={{ fontSize: "8.5cqw", background: "rgba(255,255,255,0.18)", borderBottom: `0.6cqw solid ${c.edge}` }}>
          {def.name}
        </div>
        <div
          className="min-h-0 flex-1"
          style={{
            margin: "2.5cqw",
            border: `0.8cqw solid ${c.edge}`,
            background: art ? `${c.edge} url(${art}) center / cover no-repeat` : `linear-gradient(160deg, ${c.edge}, ${c.bg})`,
          }}
        />
        <div className="truncate px-[4cqw] py-[1.4cqw] font-semibold leading-tight" style={{ fontSize: "6.4cqw", background: "rgba(255,255,255,0.18)", borderTop: `0.6cqw solid ${c.edge}`, borderBottom: `0.6cqw solid ${c.edge}` }}>
          {typeLine}
        </div>
        <div className="flex min-h-[14cqw] items-center justify-end px-[3cqw] py-[1.5cqw]">
          {isCreature && p !== undefined && t !== undefined && (
            <span className="rounded-[2cqw] px-[3cqw] py-[0.8cqw] font-extrabold tabular-nums" style={{ fontSize: "9cqw", background: c.bg, border: `0.9cqw solid ${c.edge}`, color: damaged ? "#b3261e" : c.ink }}>
              {p}/{t}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
