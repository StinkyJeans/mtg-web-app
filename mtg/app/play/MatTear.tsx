"use client";

import { useMemo } from "react";
import { useAnimationsOn } from "@/lib/motion";

// (Always mounted, whatever the life total, so that a tear starts from the whole mat and slides: mounting it already torn would show the tear at once.)
// The playmat as a sheet of paper. As its player loses life it tears away from the edges, bite by ragged bite, leaving a pale torn
// rim and the dark table underneath, until at 0 life nothing is left. The tearing is a clip-path with the same number of points at
// every life total, so the browser slides it from one shape to the next, slowly. (It repaints while it moves, which happens only
// when the life total changes, and the glow around the edge only fades in and out.)

const PER_EDGE = 16; // points along each side of the mat
const TEAR_FROM = 12; // life at which the first tears start

function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far the tear has got, from 0 (whole) to 1 (gone), for a life total. */
export const tearOf = (life: number) => Math.min(1, Math.max(0, (TEAR_FROM - life) / TEAR_FROM));

interface Bite {
  /** The tear reaches this point once the mat is this torn (0 to 1): the weak spots go first. */
  starts: number;
  /** How ragged: how much of the way in this point goes before the whole thing goes. */
  reach: number;
}

/** The weak spots and ragged depths all around the mat: the same every time for the same seed, so the tear grows where it began. */
function bites(seed: number): Bite[] {
  const rnd = random(seed);
  const n = PER_EDGE * 4;
  // clumps of weakness: a few bites that start early and tear deep, with calmer stretches between them
  const centers = Array.from({ length: 6 }, () => rnd() * n);
  return Array.from({ length: n }, (_, i) => {
    const near = Math.min(...centers.map((c) => Math.min(Math.abs(i - c), n - Math.abs(i - c))));
    const weak = Math.max(0, 1 - near / 4.5); // 1 at the heart of a weak spot
    return { starts: Math.max(0, 0.7 * (1 - weak) * (0.45 + 0.55 * rnd()) - 0.04), reach: 0.42 + 0.58 * (0.35 + 0.65 * rnd()) * (0.55 + 0.45 * weak) };
  });
}

/** The polygon (as CSS) for a mat torn this much. `shrink` pulls the edge in a little less (the paper rim sticks out past the mat). */
function polygon(list: Bite[], tear: number, shrink = 1): string {
  const pts = list.map((b, i) => {
    const eaten = Math.max(0, Math.min(1, (tear - b.starts) / (1 - b.starts || 1)));
    // ragged until the very end, when every point runs into the middle and nothing is left
    const finish = Math.pow(tear, 7);
    const depth = 50 * (Math.pow(eaten, 0.85) * b.reach + (1 - b.reach) * finish * eaten) * shrink;
    const edge = Math.floor(i / PER_EDGE);
    const f = (i % PER_EDGE) / PER_EDGE; // how far along that side
    const wiggle = ((i * 7919) % 13) / 13; // a little sideways jitter, so the torn edge is not a neat staircase
    const along = Math.max(0, Math.min(100, f * 100 + (wiggle - 0.5) * 1.2 * (eaten > 0 ? 1 : 0)));
    switch (edge) {
      case 0:
        return `${along}% ${depth}%`; // top, left to right: the tear goes down
      case 1:
        return `${100 - depth}% ${along}%`; // right, top to bottom: the tear goes left
      case 2:
        return `${100 - along}% ${100 - depth}%`; // bottom, right to left: the tear goes up
      default:
        return `${depth}% ${100 - along}%`; // left, bottom to top: the tear goes right
    }
  });
  return `polygon(${pts.join(", ")})`;
}

/**
 * The surface of a playmat, in place of its plain background: put it inside the mat (which must be `relative`), under the cards.
 * `seed` makes each player's mat tear in its own places.
 */
export function MatTear({ life, mat, seed }: { life: number; mat: string; seed: number }) {
  const on = useAnimationsOn();
  const list = useMemo(() => bites(seed), [seed]);
  const tear = tearOf(life);
  const move = on ? "clip-path 2.4s steps(12, end)" : "none";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
      {/* the pale torn rim, a little further out than the mat itself */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #cdbfa0, #8f8468)", opacity: 0.9, clipPath: polygon(list, tear, 0.93), transition: move, willChange: "clip-path", transform: "translateZ(0)" }} />
      {/* the mat */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), ${mat}`, clipPath: polygon(list, tear), transition: move, willChange: "clip-path, transform", transform: "translateZ(0)" }} />
      {/* a worried red glow at the edge of what is left */}
      {tear > 0.3 && <div className={`mat-lowlife ${on ? "mat-lowlife-moving" : ""}`} data-stage={tear > 0.8 ? 3 : tear > 0.5 ? 2 : 1} />}
    </div>
  );
}
