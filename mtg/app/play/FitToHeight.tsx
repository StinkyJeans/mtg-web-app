"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.7;
/** The contents only grow when they can get this much bigger. */
const GROW = 0.04;

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
  const refit = useRef<() => void>(null);
  const counted = useRef(0);

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    let frame = 0;
    let current = 1;
    // What the last fit found: the contents were this tall in this much room, at a size that fits and one step more would not.
    let settledHeight = -1;
    let settledRoom = -1;
    // The height the contents take on screen at a given zoom.
    const heightAt = (zoom: number) => {
      content.style.zoom = String(zoom);
      return content.getBoundingClientRect().height;
    };
    const fit = () => {
      const pad = getComputedStyle(box);
      const room = box.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
      if (room <= 0) return;
      // Most of the time nothing needed to change: the size in use still fits, and the next size worth moving to (GROW bigger: smaller
      // gains are not worth the cards jumping about) would not. Each look at the height is a whole layout of the board, so that is
      // settled with as few as possible: one, when simple arithmetic can say it would not fit (a bigger zoom never makes the contents
      // shorter than the same contents scaled up, only taller when rows wrap).
      const now = heightAt(current);
      if (now <= room) {
        if (Math.abs(now - settledHeight) < 0.5 && room === settledRoom) return; // (the same contents in the same room: still settled)
        if (current >= maxZoom - 0.001 || now * ((current + GROW) / current) > room || heightAt(Math.min(maxZoom, current + GROW)) > room) {
          // (the size in use is put back without measuring it again: `now` is what it measured, and the layout this would force is done anyway when the screen is drawn)
          content.style.zoom = String(current);
          settledHeight = now;
          settledRoom = room;
          return;
        }
      }
      // Otherwise the size changes. The contents are about as tall as the zoom is big, so the answer is guessed from the height just
      // measured and then corrected a step at a time: usually two or three layouts, where a search of the whole range takes seven.
      const minStep = Math.round(minZoom * 50);
      const maxStep = Math.round(maxZoom * 50);
      let step = Math.min(maxStep, Math.max(minStep, Math.floor(((current * room) / now) * 50 + 1e-6)));
      let height = heightAt(step / 50);
      let looks = 0;
      while (height > room && step > minStep && looks++ < 6) height = heightAt(--step / 50);
      while (height <= room && step < maxStep && looks++ < 6) {
        if (height * ((step + 1) / step) > room) break; // (a step more cannot fit: no need to look)
        const up = heightAt((step + 1) / 50);
        if (up > room) break;
        step++;
        height = up;
      }
      if (looks >= 6) {
        // far from the guess (rows wrapping differently): the biggest zoom that still fits, found by halving the range
        let low = minStep;
        let high = maxStep;
        if (heightAt(high / 50) <= room) low = high;
        else {
          while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (heightAt(mid / 50) <= room) low = mid;
            else high = mid;
          }
        }
        step = low;
      }
      // Only a real change is written back, so the size observers below do not wake themselves up again.
      const next = now <= room && Math.abs(step / 50 - current) < GROW ? current : step / 50;
      // the height at the size chosen: it is already known when that is the last size looked at
      if (next === step / 50) {
        current = next;
        content.style.zoom = String(current);
        settledHeight = height;
      } else {
        current = next;
        settledHeight = heightAt(current);
      }
      settledRoom = room;
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    counted.current = content.getElementsByTagName("*").length;
    fit();
    refit.current = fit;
    const watch = new ResizeObserver(later);
    watch.observe(box);
    watch.observe(content);
    return () => {
      refit.current = null;
      cancelAnimationFrame(frame);
      watch.disconnect();
    };
  }, [minZoom, maxZoom]);

  // A card that comes or goes is fitted before the screen is drawn, so the animations that follow it find everything where it will stay (the
  // observers above only notice a frame later, and the layout they ask for is then done twice). Counting the elements costs no layout.
  useLayoutEffect(() => {
    const count = inner.current?.getElementsByTagName("*").length ?? 0;
    if (count === counted.current) return;
    counted.current = count;
    refit.current?.();
  });

  return (
    <div ref={outer} className={`min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div ref={inner} className={innerClassName}>
        {children}
      </div>
    </div>
  );
}
