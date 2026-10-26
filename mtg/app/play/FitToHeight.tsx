"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.7;

/**
 * Uses all of the space it has, without scrolling: the contents are sized to the largest size that still fits.
 * With few cards they grow to fill the space; with many they shrink (never below half) until everything is on screen.
 */
export default function FitToHeight({
  children,
  className = "",
  innerClassName = "flex flex-col gap-1",
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** The smallest the contents may get (0.5 = half size). */
  minZoom?: number;
  /** The biggest: 1 means "never larger than normal", only shrink to fit. */
  maxZoom?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    let frame = 0;
    let current = 1;
    // The height the contents take on screen at a given zoom.
    const heightAt = (zoom: number) => {
      content.style.zoom = String(zoom);
      return content.getBoundingClientRect().height;
    };
    const fit = () => {
      const pad = getComputedStyle(box);
      const room = box.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
      if (room <= 0) return;
      // Most of the time nothing needed to change: the size in use still fits and one step more would not. That is two layouts
      // instead of the seven of the search below, which every card that moves on a busy board used to cost on a slow computer.
      if (heightAt(current) <= room && (current >= maxZoom - 0.001 || heightAt(Math.min(maxZoom, current + 0.02)) > room)) {
        heightAt(current);
        return;
      }
      // The biggest zoom (in steps of 0.02) that still fits, found by halving the range: taller contents are never smaller.
      let low = Math.round(minZoom * 50);
      let high = Math.round(maxZoom * 50);
      if (heightAt(high / 50) <= room) low = high;
      else {
        while (high - low > 1) {
          const mid = Math.floor((low + high) / 2);
          if (heightAt(mid / 50) <= room) low = mid;
          else high = mid;
        }
      }
      // Only a real change is written back, so the size observers below do not wake themselves up again.
      current = Math.abs(low / 50 - current) < 0.04 && heightAt(current) <= room ? current : low / 50;
      heightAt(current);
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const watch = new ResizeObserver(later);
    watch.observe(box);
    watch.observe(content);
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
    };
  }, [minZoom, maxZoom]);

  return (
    <div ref={outer} className={`min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div ref={inner} className={innerClassName}>
        {children}
      </div>
    </div>
  );
}
