import { animationsEnabled } from "@/lib/motion";

// Confetti, drawn on a 2D canvas. No libraries: two cannons fire from the bottom corners,
// then paper rains down from the top for a couple of seconds.

const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#facc15", "#06b6d4"];
const RAIN_MS = 2200;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number; // spin
  flip: number; // makes the paper "flutter" by squashing it as it turns
  vflip: number;
  color: string;
  round: boolean;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Starts the effect on `canvas` and returns a function that stops it and clears the canvas. */
export function startConfetti(canvas: HTMLCanvasElement, durationMs = 4800): () => void {
  const ctx = canvas.getContext("2d");
  // No confetti if the player turned animations off.
  if (!ctx || !animationsEnabled()) return () => {};

  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const pieces: Piece[] = [];
  const add = (x: number, y: number, vx: number, vy: number) =>
    pieces.push({
      x,
      y,
      vx,
      vy,
      w: rand(7, 13),
      h: rand(4, 8),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.25, 0.25),
      flip: rand(0, Math.PI * 2),
      vflip: rand(0.08, 0.3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.25,
    });

  /** A cannon: `deg` is the direction (90 = straight up), fired with a spread. */
  const burst = (x: number, y: number, deg: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = ((deg + rand(-32, 32)) * Math.PI) / 180;
      const speed = rand(10, 24);
      add(x, y, Math.cos(a) * speed, -Math.sin(a) * speed);
    }
  };

  burst(w * 0.04, h + 10, 66, 110);
  burst(w * 0.96, h + 10, 114, 110);
  const second = window.setTimeout(() => {
    burst(w * 0.04, h + 10, 72, 70);
    burst(w * 0.96, h + 10, 108, 70);
  }, 450);

  const start = performance.now();
  let last = start;
  let raf = 0;

  const tick = (now: number) => {
    const k = Math.min((now - last) / 16.67, 3); // 1 = one frame at 60 fps, so speed doesn't depend on refresh rate
    last = now;

    if (now - start < RAIN_MS) {
      for (let i = 0; i < 3; i++) add(rand(0, w), -12, rand(-1.5, 1.5), rand(1.5, 4));
    }

    ctx.clearRect(0, 0, w, h);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.vx *= Math.pow(0.991, k);
      p.vy = Math.min(p.vy + 0.34 * k, 6.5); // gravity, with air drag capping the fall speed
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.rot += p.vr * k;
      p.flip += p.vflip * k;
      if (p.y > h + 30) {
        pieces.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (now - start < durationMs || pieces.length > 0) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(second);
    window.removeEventListener("resize", resize);
    ctx.clearRect(0, 0, w, h);
  };
}
