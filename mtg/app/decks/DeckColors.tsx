import { ManaSymbol } from "../play/ManaSymbols";

/** The deck's colors as mana symbols. */
export default function DeckColors({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  return (
    <span className="flex gap-0.5" aria-label={`Colors: ${colors.join(", ")}`}>
      {colors.map((c) => (
        <ManaSymbol key={c} symbol={c} />
      ))}
    </span>
  );
}
