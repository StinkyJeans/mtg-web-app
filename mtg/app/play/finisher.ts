import type { PlayerId } from "@mtg/engine";
import { animationsEnabled, scaled } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { liteMode } from "./perfTier";
import { canDo3D, reaper3D } from "./finisher3d";
import { playGreenVideo } from "./finisherVideo";

/**
 * The finishing move: when a game is won, the winner's finisher plays on the loser's playmat, then the result comes up.
 *   dragon: a dragon's head rises over the winner's mat and breathes fire across the table; the loser's mat burns.
 *   reaper: the hands of the Grim Reaper rise over the winner's mat, the scythe swings across the loser's mat, and the mat tears and warps.
 * Everything is drawn on one overlay on top of the page and removed when it ends; the animations are transform / opacity (and, for the
 * burning and warping of the mat itself, a filter on that one element for about a second). A weak computer gets fewer pieces and no warp.
 */
export type FinisherKind = "dragon" | "reaper";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Pt {
  x: number;
  y: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, scaled(ms)));
const centerOf = (r: Rect): Pt => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function rectOf(id: PlayerId | null, fallback: Rect): Rect {
  const el = id ? document.querySelector<HTMLElement>(`[data-mat="${id}"]`) : null;
  const r = el?.getBoundingClientRect();
  return r && r.width > 40 && r.height > 40 ? { left: r.left, top: r.top, width: r.width, height: r.height } : fallback;
}

function div(parent: HTMLElement, style: Partial<CSSStyleDeclaration>, html = ""): HTMLElement {
  const d = document.createElement("div");
  Object.assign(d.style, { position: "absolute", pointerEvents: "none", willChange: "transform, opacity", ...style });
  if (html) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

/** The playmat element that sits at this place (none in the preview, which has no mats). */
function matAt(r: Rect): HTMLElement | null {
  // (the whole table may be mid-shake: the nearest mat within a few dozen pixels is the one)
  let best: HTMLElement | null = null;
  let bestGap = 60;
  for (const m of Array.from(document.querySelectorAll<HTMLElement>("[data-mat]"))) {
    const b = m.getBoundingClientRect();
    const gap = Math.abs(b.left - r.left) + Math.abs(b.top - r.top);
    if (gap < bestGap) [best, bestGap] = [m, gap];
  }
  return best;
}

/** The playmat takes a blow: it jolts and settles (the same layer the combat shake uses is left alone: this is one more animation on the mat). */
function jolt(px: number, ms: number) {
  const mat = document.querySelector<HTMLElement>("main > section");
  if (!mat) return;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const k = Math.pow(1 - t, 2) * px;
    frames.push({ transform: `translate(${(Math.sin(t * 40) * k).toFixed(1)}px, ${(Math.cos(t * 33) * k * 0.7).toFixed(1)}px)` });
  }
  mat.animate(frames, { duration: ms, easing: "linear" });
}

// ───────────────────────────── the dragon ─────────────────────────────

/** A dragon's head and neck in profile, facing right (the mouth is at 500,170). Drawn in one piece so it can be placed and turned freely. */
const DRAGON_SVG = `
<svg viewBox="0 0 560 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <linearGradient id="dg-scale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f1d1d"/><stop offset=".55" stop-color="#4c0f0f"/><stop offset="1" stop-color="#1c0606"/></linearGradient>
    <linearGradient id="dg-belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a16207"/><stop offset="1" stop-color="#451a03"/></linearGradient>
    <linearGradient id="dg-horn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5e7c8"/><stop offset="1" stop-color="#6b4a2a"/></linearGradient>
    <radialGradient id="dg-throat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7ae"/><stop offset=".4" stop-color="#fb923c"/><stop offset="1" stop-color="#dc2626" stop-opacity="0"/></radialGradient>
    <radialGradient id="dg-eye" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fde047"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
  </defs>
  <!-- the neck, going back and down off the page, with spines along it -->
  <path d="M-80 150 C20 130 90 118 170 118 L205 232 C120 262 30 290 -80 330 Z" fill="url(#dg-scale)" stroke="#0a0202" stroke-width="3"/>
  <path d="M-80 330 C30 290 120 262 205 232 L190 205 C120 232 30 262 -80 292 Z" fill="url(#dg-belly)" opacity=".85"/>
  <g fill="#2a0a0a" stroke="#0a0202" stroke-width="2"><path d="M20 128 l14 -34 l14 32 z"/><path d="M70 120 l14 -40 l15 38 z"/><path d="M122 117 l15 -42 l15 40 z"/></g>
  <!-- horns, swept back -->
  <path d="M176 104 C150 62 96 30 24 18 C80 52 118 84 142 128 Z" fill="url(#dg-horn)" stroke="#3a2412" stroke-width="3"/>
  <path d="M206 96 C196 54 160 20 112 0 C150 36 170 70 180 108 Z" fill="url(#dg-horn)" stroke="#3a2412" stroke-width="3"/>
  <!-- the head -->
  <path d="M150 112 C188 78 252 70 306 92 C366 108 440 128 506 150 C520 156 520 170 504 174 L330 190 C292 222 232 232 182 220 C148 204 138 150 150 112 Z" fill="url(#dg-scale)" stroke="#0a0202" stroke-width="4"/>
  <!-- cheek spikes and scale highlights -->
  <g fill="#3a0e0e" stroke="#0a0202" stroke-width="2"><path d="M150 168 l-34 16 l38 6 z"/><path d="M162 196 l-26 28 l40 -10 z"/><path d="M190 214 l-8 34 l30 -22 z"/></g>
  <g fill="none" stroke="#b45309" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"><path d="M200 96 C240 90 280 98 320 112"/><path d="M210 118 C250 114 300 122 350 134"/><path d="M360 128 C400 138 450 146 488 150"/></g>
  <!-- brow, eye and nostril -->
  <path d="M214 112 C240 98 282 100 300 118 C270 112 240 114 214 128 Z" fill="#1c0606" stroke="#0a0202" stroke-width="2"/>
  <ellipse cx="262" cy="124" rx="26" ry="17" fill="url(#dg-eye)" class="dg-eyeglow"/>
  <ellipse cx="262" cy="124" rx="13" ry="8.5" fill="#fde047" stroke="#7c2d12" stroke-width="2"/>
  <rect x="260" y="116" width="4.5" height="16" rx="2" fill="#1c0606"/>
  <ellipse cx="482" cy="150" rx="9" ry="5" fill="#0a0202" transform="rotate(14 482 150)"/>
  <ellipse cx="482" cy="150" rx="5" ry="2.6" fill="#fb923c" class="dg-nostril" transform="rotate(14 482 150)"/>
  <!-- the inside of the mouth: it glows when the fire comes -->
  <path d="M232 214 C300 196 400 186 502 178 L330 196 C290 214 258 220 232 214 Z" fill="#450a0a"/>
  <ellipse cx="420" cy="190" rx="86" ry="22" fill="url(#dg-throat)" class="dg-throat" opacity="0"/>
  <!-- upper teeth -->
  <g fill="#f8fafc" stroke="#9ca3af" stroke-width="1"><path d="M338 190 l8 22 l8 -22 z"/><path d="M372 187 l8 24 l8 -24 z"/><path d="M406 183 l8 26 l8 -26 z"/><path d="M442 180 l8 24 l7 -24 z"/><path d="M474 177 l6 20 l6 -20 z"/></g>
  <!-- the lower jaw: it swings open around its hinge -->
  <g class="dg-jaw" style="transform-origin:205px 215px; transform-box:view-box">
    <path d="M196 214 C268 250 360 250 492 206 C470 190 420 190 340 196 C290 202 240 208 196 214 Z" fill="url(#dg-scale)" stroke="#0a0202" stroke-width="4"/>
    <path d="M214 232 C290 258 380 250 482 214" fill="none" stroke="#a16207" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>
    <g fill="#f8fafc" stroke="#9ca3af" stroke-width="1"><path d="M356 200 l7 -19 l7 19 z"/><path d="M392 198 l7 -21 l7 21 z"/><path d="M428 196 l7 -22 l7 22 z"/><path d="M462 194 l6 -18 l6 18 z"/></g>
  </g>
</svg>`;

/** The loser's mat on fire: a glow over it, flames licking up from its lower edge, the mat charring under it, and the table jolting. Pieces are added to `run`. */
async function burnMat(root: HTMLElement, loser: Rect, lite: boolean, FIRE_MS: number, run: Promise<unknown>[], flat = true): Promise<void> {
  // the loser's mat: a glow of fire over it, flames licking up from its lower edge, the mat charring under it
  const wash = div(root, {
    left: `${loser.left}px`,
    top: `${loser.top}px`,
    width: `${loser.width}px`,
    height: `${loser.height}px`,
    borderRadius: "14px",
    background: "radial-gradient(ellipse at 50% 85%, rgba(255,200,60,.95) 0%, rgba(249,115,22,.75) 32%, rgba(185,28,28,.55) 60%, rgba(0,0,0,0) 80%)",
    opacity: "0",
  });
  run.push(
    wash.animate(
      [
        { opacity: 0 },
        { opacity: 0.55, offset: 0.2 },
        { opacity: 0.85, offset: 0.35 },
        { opacity: 0.6, offset: 0.5 },
        { opacity: 0.9, offset: 0.65 },
        { opacity: 0.7, offset: 0.8 },
        { opacity: 0 },
      ],
      { duration: FIRE_MS + 900, delay: 350, fill: "both" },
    ).finished,
  );
  if (flat) {
    const tongues = lite ? 9 : 18;
    const flameSvg = `<svg viewBox="0 0 100 140" preserveAspectRatio="none" width="100%" height="100%"><defs><linearGradient id="fl-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff7b0"/><stop offset=".25" stop-color="#fcd34d"/><stop offset=".55" stop-color="#f97316"/><stop offset=".85" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d" stop-opacity="0"/></linearGradient></defs><path d="M52 0 C58 26 92 44 94 86 C96 118 76 140 50 140 C24 140 4 118 6 88 C8 62 28 54 34 30 C40 44 44 36 52 0 Z" fill="url(#fl-g)"/><path d="M50 58 C56 76 78 86 78 110 C78 128 66 140 50 140 C34 140 22 128 22 110 C22 90 42 82 50 58 Z" fill="#fff3a0" opacity=".75"/></svg>`;
    for (let i = 0; i < tongues; i++) {
      const w = rnd((loser.width / 9) * 0.8, (loser.width / 9) * 1.4);
      const h = rnd(loser.height * 0.6, loser.height * 1.15);
      const x = loser.left + ((i + rnd(0.1, 0.9)) / tongues) * loser.width - w / 2;
      const f = div(
        root,
        {
          left: `${x}px`,
          top: `${loser.top + loser.height - h * 0.95}px`,
          width: `${w}px`,
          height: `${h}px`,
          transformOrigin: "50% 100%",
          opacity: "0",
        },
        flameSvg,
      );
      run.push(
        f.animate(
          [
            { transform: "scaleY(0.05) scaleX(.6)", opacity: 0 },
            { transform: "scaleY(1) scaleX(1)", opacity: 0.95, offset: 0.25 },
            { transform: `scaleY(${rnd(0.7, 0.9)}) scaleX(${rnd(1.05, 1.2)}) skewX(${rnd(-8, 8)}deg)`, opacity: 0.9, offset: 0.45 },
            { transform: `scaleY(${rnd(0.95, 1.15)}) scaleX(.95) skewX(${rnd(-8, 8)}deg)`, opacity: 0.9, offset: 0.7 },
            { transform: "scaleY(.5) scaleX(.8)", opacity: 0 },
          ],
          { duration: FIRE_MS + 700, delay: 450 + i * 35, easing: "ease-in-out", fill: "both" },
        ).finished,
      );
    }
  }
  // the mat itself burns: darker and warmer, then back
  matAt(loser)?.animate(
    [{ filter: "none" }, { filter: "brightness(.55) sepia(.7) saturate(1.4) hue-rotate(-12deg)", offset: 0.3 }, { filter: "brightness(.6) sepia(.6) saturate(1.3)", offset: 0.75 }, { filter: "none" }],
    { duration: FIRE_MS + 1200, delay: 400, easing: "ease-in-out" },
  );
  jolt(5, 500);
  await wait(600);
  jolt(7, 600);
  await wait(500);
  playSound("burn");
  await wait(FIRE_MS - 1100);
}

async function dragonFlat(root: HTMLElement, winner: Rect, loser: Rect): Promise<void> {
  const lite = liteMode();
  const W = centerOf(winner);
  const T = centerOf(loser);
  // the mouth hangs over the winner's mat (a little to the left of its middle, near the edge that faces the loser); the head looks at the loser's
  // mat and the neck trails away behind it, off the screen
  const up = T.y < W.y ? -1 : 1;
  const mouth: Pt = { x: W.x - winner.width * 0.14, y: up < 0 ? winner.top - winner.height * 0.08 : winner.top + winner.height * 1.08 };
  const dist = Math.hypot(T.x - mouth.x, T.y - mouth.y) || 1;
  const d = { x: (T.x - mouth.x) / dist, y: (T.y - mouth.y) / dist };
  const angle = Math.atan2(d.y, d.x);
  const size = Math.max(300, Math.min(window.innerWidth * 0.4, 500, window.innerHeight * 0.7));
  const s = size / 560;
  const mouthLocal = { x: 504 * s, y: 172 * s };

  // a dark veil over the table
  const veil = div(root, { inset: "0", background: "radial-gradient(ellipse at 50% 60%, rgba(40,6,6,.25), rgba(0,0,0,.7))", opacity: "0" });
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });

  const dragon = div(
    root,
    {
      left: `${mouth.x - mouthLocal.x}px`,
      top: `${mouth.y - mouthLocal.y}px`,
      width: `${size}px`,
      height: `${(size * 340) / 560}px`,
      transformOrigin: `${mouthLocal.x}px ${mouthLocal.y}px`,
      filter: "drop-shadow(0 18px 26px rgba(0,0,0,.7))",
    },
    DRAGON_SVG,
  );
  const jaw = dragon.querySelector<SVGGElement>(".dg-jaw");
  const throat = dragon.querySelector<SVGElement>(".dg-throat");
  const place = (extra: string) => `rotate(${angle}rad) ${extra}`;
  // 1. it rises out of the dark behind the winner's mat (from the side away from the target)
  const back = { x: -d.x * 260, y: -d.y * 260 };
  playSound("charge");
  const rise = dragon.animate(
    [
      { transform: `translate(${back.x}px, ${back.y}px) ${place("scale(.6)")}`, opacity: 0 },
      { transform: `translate(${back.x * 0.15}px, ${back.y * 0.15}px) ${place("scale(1.04)")}`, opacity: 1, offset: 0.7 },
      { transform: `translate(0, 0) ${place("scale(1)")}`, opacity: 1 },
    ],
    { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
  );
  await rise.finished;

  // 2. it rears and roars: head back, jaw wide, the throat starts to glow
  jaw?.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(24deg)" }], { duration: 380, easing: "ease-out", fill: "forwards" });
  throat?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
  await dragon.animate(
    [
      { transform: `translate(0, 0) ${place("scale(1)")}` },
      { transform: `translate(${-d.x * 26}px, ${-d.y * 26}px) ${place("scale(1.06)")}`, offset: 0.6 },
      { transform: `translate(${-d.x * 20}px, ${-d.y * 20}px) ${place("scale(1.05)")}` },
    ],
    { duration: 600, easing: "ease-out", fill: "forwards" },
  ).finished;

  // 3. the fire: a stream of flame from the mouth to the loser's mat, which lights up and burns
  const FIRE_MS = 1500;
  const from: Pt = { x: mouth.x - d.x * 20, y: mouth.y - d.y * 20 };
  playSound("burn");
  const count = lite ? 30 : 84;
  const dragonShake = dragon.animate(
    [
      { transform: `translate(${-d.x * 20}px, ${-d.y * 20}px) ${place("scale(1.05)")}` },
      { transform: `translate(${-d.x * 24 + 3}px, ${-d.y * 24 - 3}px) ${place("scale(1.07)")}` },
      { transform: `translate(${-d.x * 20 - 3}px, ${-d.y * 20 + 3}px) ${place("scale(1.05)")}` },
      { transform: `translate(${-d.x * 24}px, ${-d.y * 24}px) ${place("scale(1.07)")}` },
    ],
    { duration: 120, iterations: Math.ceil((FIRE_MS + 400) / 120), fill: "forwards" },
  );
  const run: Promise<unknown>[] = [];
  // the core of the breath: one long tapering jet from the mouth, hot white-yellow at the root and red at the far end, that flickers
  const reach = Math.hypot(T.x - from.x, T.y - from.y);
  const jet = div(root, {
    left: `${from.x}px`,
    top: `${from.y - 50}px`,
    width: `${reach * 1.02}px`,
    height: "100px",
    filter: lite ? "none" : "blur(5px)",
    transformOrigin: "0 50%",
    clipPath: "polygon(0 44%, 28% 30%, 62% 10%, 100% 0, 100% 100%, 62% 90%, 28% 70%, 0 56%)",
    background: "linear-gradient(90deg, #ffffff 0%, #fff3a0 10%, #ffb347 38%, #f97316 62%, rgba(220,38,38,.75) 90%, rgba(127,29,29,0) 100%)",
    opacity: "0",
  });
  const aim = `rotate(${angle}rad)`;
  run.push(
    jet.animate(
      [
        { transform: `${aim} scale(0, .3)`, opacity: 0 },
        { transform: `${aim} scale(1, 1)`, opacity: 0.95, offset: 0.16 },
        { transform: `${aim} scale(.97, 1.12)`, opacity: 0.85, offset: 0.3 },
        { transform: `${aim} scale(1, .92)`, opacity: 0.95, offset: 0.45 },
        { transform: `${aim} scale(.98, 1.15)`, opacity: 0.85, offset: 0.62 },
        { transform: `${aim} scale(1, 1)`, opacity: 0.9, offset: 0.8 },
        { transform: `${aim} scale(1, .2)`, opacity: 0 },
      ],
      { duration: FIRE_MS + 300, easing: "ease-out", fill: "both" },
    ).finished,
  );
  for (let i = 0; i < count; i++) {
    const delay = (i / count) * FIRE_MS * 0.8;
    const dur = rnd(520, 900);
    const sz = rnd(24, 54);
    const hit: Pt = { x: T.x + rnd(-loser.width * 0.4, loser.width * 0.4), y: T.y + rnd(-loser.height * 0.32, loser.height * 0.32) };
    const mid: Pt = { x: from.x + (hit.x - from.x) * 0.5 + rnd(-30, 30), y: from.y + (hit.y - from.y) * 0.5 + rnd(-30, 30) };
    const p = div(root, {
      left: `${from.x - sz / 2}px`,
      top: `${from.y - sz / 2}px`,
      width: `${sz}px`,
      height: `${sz}px`,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,251,224,.95) 0%, rgba(253,224,71,.9) 22%, rgba(251,146,60,.75) 50%, rgba(220,38,38,.4) 70%, rgba(127,29,29,0) 78%)",
      mixBlendMode: lite ? "normal" : "screen",
      opacity: "0",
    });
    run.push(
      p.animate(
        [
          { transform: "translate(0, 0) scale(.25)", opacity: 0 },
          { transform: `translate(${mid.x - from.x}px, ${mid.y - from.y}px) scale(.9)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${hit.x - from.x}px, ${hit.y - from.y}px) scale(${rnd(1.3, 2.1)})`, opacity: 0.9, offset: 0.85 },
          { transform: `translate(${hit.x - from.x + rnd(-30, 30)}px, ${hit.y - from.y - rnd(30, 90)}px) scale(${rnd(1.6, 2.4)})`, opacity: 0 },
        ],
        { duration: dur, delay, easing: "ease-in", fill: "both" },
      ).finished,
    );
  }
  await burnMat(root, loser, lite, FIRE_MS, run);
  void dragonShake;

  // 4. the fire dies down and the dragon draws back
  throat?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" });
  jaw?.animate([{ transform: "rotate(24deg)" }, { transform: "rotate(0deg)" }], { duration: 400, fill: "forwards" });
  dragonShake.cancel();
  const out = dragon.animate(
    [
      { transform: `translate(${-d.x * 20}px, ${-d.y * 20}px) ${place("scale(1.05)")}`, opacity: 1 },
      { transform: `translate(${back.x * 0.9}px, ${back.y * 0.9}px) ${place("scale(.75)")}`, opacity: 0 },
    ],
    { duration: 900, easing: "ease-in", fill: "forwards" },
  );
  veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" });
  await Promise.all([out.finished, ...run].map((p) => Promise.resolve(p).catch(() => undefined)));
}

// ───────────────────────────── the grim reaper ─────────────────────────────

/** Two skeletal hands gripping a scythe, in dark ragged sleeves. The scythe stands upright; the blade is at the top. */
const REAPER_SVG = `
<svg viewBox="0 0 400 640" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <linearGradient id="rp-blade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".5" stop-color="#a5b4fc"/><stop offset="1" stop-color="#475569"/></linearGradient>
    <linearGradient id="rp-pole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2a1a"/><stop offset=".5" stop-color="#8b6a43"/><stop offset="1" stop-color="#2a1d11"/></linearGradient>
    <linearGradient id="rp-bone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#b8b09a"/></linearGradient>
    <linearGradient id="rp-cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1030"/><stop offset="1" stop-color="#050309"/></linearGradient>
    <radialGradient id="rp-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c4b5fd" stop-opacity=".9"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
  </defs>
  <!-- a violet glow behind the blade -->
  <ellipse cx="230" cy="90" rx="190" ry="120" fill="url(#rp-glow)" class="rp-aura"/>
  <!-- the pole -->
  <path d="M196 600 L190 40 L212 40 L226 600 Z" fill="url(#rp-pole)" stroke="#120a05" stroke-width="3"/>
  <!-- the blade: a long curved crescent -->
  <path d="M202 52 C120 6 40 24 -20 110 C60 70 130 74 208 108 C300 140 370 120 400 70 C330 96 270 88 212 70 Z" fill="url(#rp-blade)" stroke="#1e1b4b" stroke-width="4" class="rp-blade"/>
  <path d="M-12 108 C60 72 130 76 208 108 C300 140 366 118 396 72" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3" stroke-linecap="round"/>
  <path d="M190 56 L222 56 L226 84 L192 84 Z" fill="#3f3f46" stroke="#111" stroke-width="3"/>
  <!-- the sleeves -->
  <path d="M40 640 C46 520 86 420 150 372 C196 344 262 350 290 392 C320 450 334 540 346 640 Z" fill="url(#rp-cloth)" stroke="#2e1065" stroke-width="3"/>
  <path d="M40 640 L66 596 L84 640 L110 586 L132 640 L160 600 L184 640 L214 590 L238 640 L268 598 L292 640 L322 592 L346 640 Z" fill="#050309" stroke="#2e1065" stroke-width="2"/>
  <!-- the upper hand: bone fingers wrapped around the pole -->
  <g stroke="#2a2418" stroke-width="3" stroke-linejoin="round">
    <path d="M168 330 C160 300 170 276 196 272 C230 268 244 292 238 318 C232 340 190 352 168 330 Z" fill="url(#rp-bone)"/>
    <rect x="166" y="288" width="22" height="46" rx="11" fill="url(#rp-bone)" transform="rotate(-6 177 311)"/>
    <rect x="184" y="276" width="22" height="50" rx="11" fill="url(#rp-bone)"/>
    <rect x="202" y="276" width="22" height="50" rx="11" fill="url(#rp-bone)"/>
    <rect x="220" y="284" width="20" height="44" rx="10" fill="url(#rp-bone)" transform="rotate(8 230 306)"/>
  </g>
  <g stroke="#6b6450" stroke-width="2" stroke-linecap="round"><path d="M176 300 h14"/><path d="M194 296 h14"/><path d="M212 296 h14"/><path d="M228 302 h12"/><path d="M178 318 h60"/></g>
  <!-- the lower hand -->
  <g stroke="#2a2418" stroke-width="3" stroke-linejoin="round">
    <path d="M168 470 C160 440 170 416 196 412 C230 408 244 432 238 458 C232 480 190 492 168 470 Z" fill="url(#rp-bone)"/>
    <rect x="166" y="428" width="22" height="46" rx="11" fill="url(#rp-bone)" transform="rotate(-6 177 451)"/>
    <rect x="184" y="416" width="22" height="50" rx="11" fill="url(#rp-bone)"/>
    <rect x="202" y="416" width="22" height="50" rx="11" fill="url(#rp-bone)"/>
    <rect x="220" y="424" width="20" height="44" rx="10" fill="url(#rp-bone)" transform="rotate(8 230 446)"/>
  </g>
  <g stroke="#6b6450" stroke-width="2" stroke-linecap="round"><path d="M176 440 h14"/><path d="M194 436 h14"/><path d="M212 436 h14"/><path d="M228 442 h12"/><path d="M178 458 h60"/></g>
</svg>`;

const WARP_FILTER = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="finisher-warp" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence id="finisher-noise" type="fractalNoise" baseFrequency="0.006 0.016" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap id="finisher-disp" in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

/** The blade goes through the loser's mat: a flash and a line of light, the table jolts, the cut opens as a dark seam, and the mat itself warps. */
async function cutMat(root: HTMLElement, loser: Rect, lite: boolean): Promise<void> {
  const T = centerOf(loser);
  // the cut: a bright line through the loser's mat, with a flash
  playSound("die");
  const diag = Math.hypot(loser.width, loser.height);
  const slashAngle = -22;
  const line = div(root, {
    left: `${T.x - diag * 0.62}px`,
    top: `${T.y - 3}px`,
    width: `${diag * 1.24}px`,
    height: "6px",
    borderRadius: "3px",
    background: "linear-gradient(90deg, rgba(167,139,250,0), #fff 18%, #fff 82%, rgba(167,139,250,0))",
    boxShadow: "0 0 18px 6px #a78bfa, 0 0 60px 14px rgba(139,92,246,.7)",
    transformOrigin: "50% 50%",
    opacity: "0",
    zIndex: "10",
  });
  line.animate(
    [
      { transform: `rotate(${slashAngle}deg) scaleX(0)`, opacity: 1 },
      { transform: `rotate(${slashAngle}deg) scaleX(1)`, opacity: 1, offset: 0.25 },
      { transform: `rotate(${slashAngle}deg) scaleX(1)`, opacity: 1, offset: 0.6 },
      { transform: `rotate(${slashAngle}deg) scaleX(1) scaleY(.2)`, opacity: 0 },
    ],
    { duration: 700, easing: "ease-out", fill: "both" },
  );
  const flash = div(root, { inset: "0", background: "#fff", opacity: "0", zIndex: "10" });
  flash.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 380, easing: "ease-out", fill: "both" });
  jolt(12, 700);
  // the rift: the cut opens into a dark seam, then closes
  const rift = div(root, {
    left: `${T.x - diag * 0.6}px`,
    top: `${T.y - 14}px`,
    width: `${diag * 1.2}px`,
    height: "28px",
    background: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)",
    boxShadow: "0 0 24px 8px rgba(124,58,237,.8)",
    borderRadius: "50%",
    transformOrigin: "50% 50%",
    opacity: "0",
  });
  rift.animate(
    [
      { transform: `rotate(${slashAngle}deg) scale(1, 0)`, opacity: 0 },
      { transform: `rotate(${slashAngle}deg) scale(1, 1)`, opacity: 1, offset: 0.25 },
      { transform: `rotate(${slashAngle}deg) scale(1, .9)`, opacity: 1, offset: 0.7 },
      { transform: `rotate(${slashAngle}deg) scale(1, 0)`, opacity: 0 },
    ],
    { duration: 1500, easing: "ease-in-out", fill: "both" },
  );

  // the distortion: the mat itself warps (a displacement filter that swells and settles) and loses its colour
  const matEl = matAt(loser);
  const holder = div(root, {});
  holder.innerHTML = WARP_FILTER;
  const disp = holder.querySelector<SVGElement>("#finisher-disp");
  const noise = holder.querySelector<SVGElement>("#finisher-noise");
  let warping = Promise.resolve();
  if (matEl && disp && noise) {
    const before = matEl.style.filter;
    matEl.style.filter = "url(#finisher-warp) saturate(.6) brightness(.85)";
    const MS = 1500;
    const t0 = performance.now();
    let frame = 0;
    warping = new Promise<void>((resolve) => {
      const tick = (now: number) => {
        // a weak computer redraws the warp every third frame, with the noise left as it is (only how far it pushes changes)
        if (lite && frame++ % 3 !== 0 && now - t0 < scaled(MS)) {
          requestAnimationFrame(tick);
          return;
        }
        const k = Math.min(1, (now - t0) / scaled(MS));
        const swell = Math.sin(Math.min(1, k) * Math.PI); // 0 → 1 → 0
        disp.setAttribute("scale", String(Math.round(swell * 130)));
        if (!lite) noise.setAttribute("baseFrequency", `${(0.008 + swell * 0.01).toFixed(4)} ${(0.02 + Math.sin(k * 18) * 0.012).toFixed(4)}`);
        if (k < 1) requestAnimationFrame(tick);
        else {
          matEl.style.filter = before;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }
  // after-shocks and sparks of violet light along the cut
  const sparks = lite ? 6 : 16;
  for (let i = 0; i < sparks; i++) {
    const t = rnd(-0.5, 0.5);
    const px = T.x + Math.cos((slashAngle * Math.PI) / 180) * diag * t;
    const py = T.y + Math.sin((slashAngle * Math.PI) / 180) * diag * t;
    const sp = div(root, { left: `${px - 4}px`, top: `${py - 4}px`, width: "8px", height: "8px", borderRadius: "50%", background: "#ede9fe", boxShadow: "0 0 10px 3px #a78bfa", opacity: "0" });
    sp.animate(
      [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${rnd(-50, 50)}px, ${rnd(-90, -20)}px) scale(0)`, opacity: 0 }],
      { duration: rnd(600, 1100), delay: rnd(0, 300), easing: "ease-out", fill: "both" },
    );
  }
  await wait(700);
  jolt(6, 600);
  await warping;
}

async function reaperFlat(root: HTMLElement, winner: Rect, loser: Rect): Promise<void> {
  const lite = liteMode();
  const W = centerOf(winner);
  const T = centerOf(loser);
  const dist = Math.hypot(T.x - W.x, T.y - W.y) || 1;

  // darkness and violet mist close in
  const veil = div(root, { inset: "0", background: "radial-gradient(ellipse at 50% 50%, rgba(46,16,101,.25), rgba(2,0,10,.82))", opacity: "0" });
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, fill: "forwards" });
  const mist = div(root, {
    left: `${W.x - winner.width * 0.6}px`,
    top: `${W.y - winner.height * 0.9}px`,
    width: `${winner.width * 1.2}px`,
    height: `${winner.height * 1.8}px`,
    background: "radial-gradient(ellipse, rgba(139,92,246,.55) 0%, rgba(76,29,149,.3) 40%, rgba(0,0,0,0) 70%)",
    opacity: "0",
  });
  mist.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 800, easing: "ease-out", fill: "forwards" });

  // the scythe and the hands: they rise at the centre of the winner's mat
  const h = Math.max(300, Math.min(window.innerHeight * 0.62, 560));
  const w = (h * 400) / 640;
  const reaper = div(
    root,
    {
      left: `${W.x - w / 2}px`,
      top: `${W.y - h * 0.62}px`,
      width: `${w}px`,
      height: `${h}px`,
      transformOrigin: "50% 62%",
      filter: "drop-shadow(0 0 18px rgba(139,92,246,.7))",
      opacity: "0",
    },
    REAPER_SVG,
  );
  playSound("charge");
  // 1. it rises out of the mist
  await reaper.animate(
    [
      { transform: "translateY(90px) rotate(-6deg) scale(.7)", opacity: 0 },
      { transform: "translateY(0) rotate(-14deg) scale(1)", opacity: 1 },
    ],
    { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
  ).finished;
  // 2. it draws back: the scythe is raised and held, glowing
  const aura = reaper.querySelector<SVGElement>(".rp-aura");
  aura?.animate([{ opacity: 0.5 }, { opacity: 1 }, { opacity: 0.6 }], { duration: 700, iterations: 2 });
  const toward = Math.atan2(T.y - W.y, T.x - W.x); // the swing goes towards the loser's mat
  const lean = toward > 0 ? 1 : -1; // (towards the bottom of the screen or the top)
  await reaper.animate(
    [
      { transform: "translateY(0) rotate(-14deg) scale(1)" },
      { transform: `translateY(${-lean * 14}px) rotate(-52deg) scale(1.06)` },
    ],
    { duration: 650, easing: "ease-in-out", fill: "forwards" },
  ).finished;
  await wait(220);

  // 3. the swing: the whole scythe sweeps across the loser's mat
  reaper.animate(
    [
      { transform: `translateY(${-lean * 14}px) rotate(-52deg) scale(1.06)`, offset: 0 },
      { transform: `translate(${(T.x - W.x) * 0.55}px, ${(T.y - W.y) * 0.55}px) rotate(18deg) scale(1.15)`, offset: 0.55 },
      { transform: `translate(${(T.x - W.x) * 0.9}px, ${(T.y - W.y) * 0.9}px) rotate(60deg) scale(1.2)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${(T.x - W.x) * 1.0}px, ${(T.y - W.y) * 1.0}px) rotate(70deg) scale(1.2)`, opacity: 0 },
    ],
    { duration: 380, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards" },
  );
  await wait(210);
  await cutMat(root, loser, lite);
  await wait(250);
  veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  mist.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  await wait(600);
  void dist;
}

/**
 * The dragon: a video of a dragon breathing a beam of fire that bursts (shot on a green screen, played silently with the green made see-through).
 * It is placed so that the dragon's head is over the winner's mat and the burst is over the loser's, and flipped when the loser is below the winner.
 */
async function dragonVideoFinisher(root: HTMLElement, winner: Rect, loser: Rect): Promise<void> {
  const lite = liteMode();
  const vh = window.innerHeight;
  const W = centerOf(winner);
  const L = centerOf(loser);
  const above = L.y < W.y; // the loser's mat is above the winner's
  // A modest size (well under the window's height): the dragon's head sits at the edge of the winner's mat that faces the loser, and the burst
  // (in the picture, 20% of its height beyond the head) rises over the loser's mat. In the picture the head's tip is 60% of the way down.
  const height = Math.max(340, Math.min(vh * 0.6, 640));
  const headY = above ? winner.top + winner.height * 0.12 : winner.top + winner.height * 0.88;
  const top = above ? headY - 0.6 * height : headY - 0.4 * height;
  const veil = div(root, { inset: "0", background: "radial-gradient(ellipse at 50% 55%, rgba(40,6,6,.1), rgba(0,0,0,.4))", opacity: "0" });
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
  const run: Promise<unknown>[] = [];
  let burning: Promise<void> = Promise.resolve();
  let step = 0;
  playSound("charge");
  await playGreenVideo(root, {
    left: (W.x + L.x) / 2,
    top,
    height,
    flip: !above,
    onTime: (t) => {
      // the beam hits at once; the burst grows over the next seconds, and its ring of fire goes out near the end
      if (step === 0 && t >= 0.35) {
        step = 1;
        playSound("burn");
        burning = burnMat(root, loser, lite, 3000, run, false); // (the glow over the mat and its charring)
        jolt(2, 400);
      } else if (step === 1 && t >= 1.7) {
        step = 2;
        jolt(3, 500);
      } else if (step === 2 && t >= 3.5) {
        step = 3;
        jolt(4, 600);
      }
    },
  });
  veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  await burning;
  await Promise.all(run.map((p) => Promise.resolve(p).catch(() => undefined)));
}

/** The reaper, in 3D: darkness and violet mist, the model rising at the winner's mat, its scythe swung across the loser's. */
async function reaper3dFinisher(root: HTMLElement, winner: Rect, loser: Rect): Promise<void> {
  const lite = liteMode();
  const W = centerOf(winner);
  const veil = div(root, { inset: "0", background: "radial-gradient(ellipse at 50% 50%, rgba(46,16,101,.25), rgba(2,0,10,.82))", opacity: "0" });
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, fill: "forwards" });
  const mist = div(root, {
    left: `${W.x - winner.width * 0.6}px`,
    top: `${W.y - winner.height * 0.9}px`,
    width: `${winner.width * 1.2}px`,
    height: `${winner.height * 1.8}px`,
    background: "radial-gradient(ellipse, rgba(139,92,246,.55) 0%, rgba(76,29,149,.3) 40%, rgba(0,0,0,0) 70%)",
    opacity: "0",
  });
  mist.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 800, easing: "ease-out", fill: "forwards" });
  playSound("charge");
  let cut: Promise<void> = Promise.resolve();
  await reaper3D(root, winner, loser, {
    onImpact: () => {
      playSound("die");
      cut = cutMat(root, loser, lite);
    },
  });
  await cut;
  veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  mist.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
  await wait(600);
}

/**
 * Plays the finishing move. `winner` and `loser` are the players (their `data-mat` areas are used); `at` gives the two areas by hand (the
 * preview in the lobby has no playmats). Resolves when it is over. Does nothing when animations are off.
 */
export async function playFinisher(kind: FinisherKind, winner: PlayerId | null, loser: PlayerId | null, at?: { winner: Rect; loser: Rect }): Promise<void> {
  if (typeof document === "undefined" || !animationsEnabled()) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fallbackW: Rect = { left: vw * 0.2, top: vh * 0.55, width: vw * 0.6, height: vh * 0.3 };
  const fallbackL: Rect = { left: vw * 0.2, top: vh * 0.1, width: vw * 0.6, height: vh * 0.3 };
  const w = at?.winner ?? rectOf(winner, fallbackW);
  const l = at?.loser ?? rectOf(loser, fallbackL);
  const root = document.createElement("div");
  Object.assign(root.style, { position: "fixed", inset: "0", zIndex: "9990", pointerEvents: "none", overflow: "hidden" });
  document.body.appendChild(root);
  try {
    // the 3D version; if it cannot be drawn (no WebGL, the models did not load) the flat drawing is played instead
    let done = false;
    if (canDo3D()) {
      try {
        await (kind === "dragon" ? dragonVideoFinisher(root, w, l) : reaper3dFinisher(root, w, l));
        done = true;
      } catch (e) {
        console.warn("finisher failed, using the flat one", e);
        root.replaceChildren();
      }
    }
    if (!done) await (kind === "dragon" ? dragonFlat(root, w, l) : reaperFlat(root, w, l));
  } finally {
    root.remove();
  }
}
