/**
 * The DuelRealm logo (public/logo.svg) as a round picture: a gold ring with the five-color wheel.
 * `size` is in pixels. The picture has square corners in its file, the circle crop hides them.
 */
export default function Logo({ size = 40, className = "", glow = false }: { size?: number; className?: string; glow?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none rounded-full object-cover ${glow ? "shadow-[0_0_34px_rgba(244,180,61,0.45)]" : ""} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
