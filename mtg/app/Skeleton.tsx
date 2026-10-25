/** Grey placeholder shapes that shimmer while real content loads. The shimmer only moves a background, so it stays cheap. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />;
}

// Same dimensions as CardView, so nothing jumps when the real cards arrive.
const CARD = { md: "h-[168px] aspect-[146/204]", lg: "h-[201px] w-36" };

/** A grid of card-shaped placeholders. */
export function CardSkeletons({ count, size = "lg", className = "flex flex-wrap gap-3" }: { count: number; size?: "md" | "lg"; className?: string }) {
  return (
    <div role="status" aria-label="Loading cards" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${CARD[size]} rounded-xl`} />
      ))}
    </div>
  );
}

/** Stacked row-shaped placeholders (deck lists, match lists). */
export function RowSkeletons({ count, className = "h-12", gap = "gap-2", label = "Loading" }: { count: number; className?: string; gap?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={`flex flex-col ${gap}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${className} rounded-xl`} />
      ))}
    </div>
  );
}
