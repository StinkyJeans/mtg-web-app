"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.7;

/**
 * Uses all of the space it has, without scrolling: the contents are sized to the largest size that still fits.
 * With few cards they grow to fill the space; with many they shrink (never below half) until everything is on screen.
 */
export default function FitToHeight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
      const room = box.clientHeight;
      if (room <= 0) return;
      // The biggest zoom (in steps of 0.02) that still fits, found by halving the range: taller contents are never smaller.
      let low = Math.round(MIN_ZOOM * 50);
      let high = Math.round(MAX_ZOOM * 50);
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
      content.style.zoom = String(current);
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
  }, []);

  return (
    <div ref={outer} className={`min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div ref={inner} className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}
