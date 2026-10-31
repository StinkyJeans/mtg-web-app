import type { GameEvent, GameState } from "@mtg/engine";
import { animationsEnabled, scaled } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { dropLife } from "./lifeCount";
import { liteMode, strain } from "./perfTier";
import { TINT, reticle, ring, slash, sparkBurst } from "./effectFx";

// Combat animation. Attackers lunge at what they are hitting: a blocking creature (it recoils) or the
// defending player's life total (it flashes). It works on the page itself, using two markers:
//   data-card-iid="..."   on every card on the battlefield
//   data-life="p1|p2"     on each player's life number

type Hit = Extract<GameEvent, { type: "combatDamage" }>;

// One charge, as fractions of its length: the attacker pulls back and turns to face its target (to WINDUP), holds there, coiled (to COIL), then
// drives in, faster and faster, and the hit lands at IMPACT_AT. After it: a short rebound, and back home.
const LUNGE_MS = 1450;
const CROWD_LUNGE_MS = 1100; // with three or more attackers each charge is a little shorter, so the whole attack does not drag
const WINDUP = 0.24;
const COIL = 0.31;
const IMPACT_AT = 0.52; // fraction of the lunge at which the hit lands
const BETWEEN_HITS_MS = 160; // pause after an attacker is home, before the next one steps up
const AIM_MS = 420; // the aiming lines: drawn, held, and gone just as the attackers charge
const AIM_LEAD_MS = 420; // how long the attackers wait, lines drawn, before they charge
const BETWEEN_GROUPS_MS = 350; // pause after the blocked fights, before the unblocked attackers go

let playing = false;
/** Whether this screen belongs to the player being attacked: only they see the edges of the screen flash. (Set for each attack.) */
let flashEdges = true;
/** How many attackers are charging at the same moment (and how many numbers have been shown for them): with a crowd, each one gets lighter effects. */
let crowd = 1;
/** How many attackers are in this wave: with many, each charge is shorter. */
let wave = 1;
let flashed = false;
let numberSlot = 0;
let bursts = 0; // impact flashes shown in this wave
let slashes = 0; // blade strokes shown in this wave
/** True while an attack is being animated, so the game can ignore clicks until it has finished. */
export const isCombatPlaying = () => playing;

/** Resolves when `anim` has actually reached `ms`, so effects land exactly when the card does. */
function waitUntil(anim: Animation, ms: number) {
  return new Promise<void>((resolve) => {
    const check = () => (Number(anim.currentTime ?? 0) >= ms || anim.playState === "finished" ? resolve() : requestAnimationFrame(check));
    check();
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, scaled(ms)));
const isPlayer = (id: string) => id === "p1" || id === "p2";
const cardEl = (iid: string) => document.querySelector<HTMLElement>(`[data-card-iid="${iid}"]`);
const lifeEl = (id: string) => document.querySelector<HTMLElement>(`[data-life="${id}"]`);
const centerOf = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** A red "-3" that rises from the point of impact and fades. */
/** `infect`: poison counters on a player, -1/-1 counters on a creature. */
function floatNumber(at: DOMRect, amount: number, infect?: "player" | "creature") {
  if (crowd > 2 && numberSlot >= 3) return; // with a crowd, the first three hits show their numbers (the life total shows the rest)
  const note = document.createElement("div");
  note.textContent = infect === "player" ? `☠ +${amount}` : infect === "creature" ? `-${amount}/-${amount}` : `-${amount}`;
  const c = centerOf(at);
  // several numbers on the same life total fan out sideways instead of piling up on top of each other
  const x = c.x + (crowd > 1 ? ((numberSlot++ % 5) - 2) * 26 : 0);
  const y = c.y;
  Object.assign(note.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    zIndex: "70",
    pointerEvents: "none",
    willChange: "transform, opacity",
    fontWeight: "800",
    fontSize: `${26 + Math.min(amount, 9) * 3}px`, // a bigger hit is a bigger number
    color: infect ? "#4d7c0f" : "#dc2626",
    textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 2px 6px rgba(0,0,0,.4)",
  });
  document.body.appendChild(note);
  note
    .animate(
      [
        { transform: "translate(-50%, -50%) scale(0.35)", opacity: 0 },
        { transform: "translate(-50%, -92%) scale(1.6)", opacity: 1, offset: 0.13 },
        { transform: "translate(-50%, -110%) scale(1.15)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%, -220%) scale(1)", opacity: 0 },
      ],
      { duration: 1000, easing: "ease-out" },
    )
    .finished.then(() => note.remove());
}

/** A card that has been hit is shoved away from the attacker, tilts, and flashes. (`ux, uy` is the direction of the shove.) */
function recoil(el: HTMLElement, ux: number, uy: number) {
  const px = ux * 28;
  const py = uy * 28;
  // A brightness flash means repainting the card every frame, so with several attackers at once the shove alone is shown.
  const flash = crowd <= 2 && !liteMode();
  el.animate(
    [
      { transform: "translate(0, 0) rotate(0deg)", ...(flash ? { filter: "none" } : {}) },
      { transform: `translate(${px}px, ${py}px) rotate(${ux >= 0 ? 6 : -6}deg)`, ...(flash ? { filter: "brightness(1.8) saturate(1.6)" } : {}), offset: 0.22 },
      { transform: `translate(${-px * 0.25}px, ${-py * 0.25}px) rotate(${ux >= 0 ? -2 : 2}deg)`, ...(flash ? { filter: "brightness(1.15)" } : {}), offset: 0.55 },
      { transform: "translate(0, 0) rotate(0deg)", ...(flash ? { filter: "none" } : {}) },
    ],
    { duration: 480, easing: "ease-out" },
  );
}

/** The flash at the point where two cards (or a card and a life total) collide: a shock ring and sparks. */
function impactBurst(x: number, y: number, power = 1, tint = TINT.C) {
  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: "22px",
    height: "22px",
    marginLeft: "-11px",
    marginTop: "-11px",
    borderRadius: "50%",
    border: `4px solid ${tint}`,
    ...(crowd > 2 || liteMode() ? { background: `radial-gradient(circle, ${tint}8c, transparent)` } : { boxShadow: `0 0 26px 10px ${tint}d9` }), // (a big blurred glow, five times over, is what slows the screen)
    willChange: "transform, opacity",
    zIndex: "65",
    pointerEvents: "none",
  });
  document.body.appendChild(ring);
  ring.animate([{ transform: "scale(0.3)", opacity: 1 }, { transform: `scale(${3.5 + 3 * power})`, opacity: 0 }], { duration: 440, easing: "ease-out" }).finished.then(() =>
    ring.remove(),
  );

  const sparks = crowd > 2 ? 3 : liteMode() ? 5 : 7 + Math.round(power * 5);
  for (let i = 0; i < sparks; i++) {
    const angle = (i / sparks) * Math.PI * 2 + Math.random() * 0.4;
    const spark = document.createElement("div");
    Object.assign(spark.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: "4px",
      height: "16px",
      marginLeft: "-2px",
      borderRadius: "2px",
      background: i % 2 ? tint : "#fff",
      zIndex: "65",
      pointerEvents: "none",
    });
    document.body.appendChild(spark);
    const far = 40 + Math.random() * 36;
    spark
      .animate(
        [
          { transform: `rotate(${angle}rad) translateY(-8px) scaleY(1)`, opacity: 1 },
          { transform: `rotate(${angle}rad) translateY(-${far}px) scaleY(0.4)`, opacity: 0 },
        ],
        { duration: 400 + Math.random() * 120, easing: "ease-out" },
      )
      .finished.then(() => spark.remove());
  }
}

/**
 * The edges of the screen flash for a moment: a hit you feel. Four thin strips along the edges (one gradient over the whole screen
 * would be a layer the size of the window, blended over everything, which is slow on a busy page). Opacity only.
 */
function screenFlash(rgb: string, strength: number) {
  if (!flashEdges || flashed) return; // the attacker doesn't get the flash, the player who was hit does, and once for a whole wave of attackers
  flashed = true;
  const edge = `rgba(${rgb}, ${strength})`;
  const clear = `rgba(${rgb}, 0)`;
  const strips: [string, Partial<CSSStyleDeclaration>][] = [
    [`linear-gradient(to bottom, ${edge}, ${clear})`, { left: "0", right: "0", top: "0", height: "16vh" }],
    [`linear-gradient(to top, ${edge}, ${clear})`, { left: "0", right: "0", bottom: "0", height: "16vh" }],
    [`linear-gradient(to right, ${edge}, ${clear})`, { top: "16vh", bottom: "16vh", left: "0", width: "12vw" }],
    [`linear-gradient(to left, ${edge}, ${clear})`, { top: "16vh", bottom: "16vh", right: "0", width: "12vw" }],
  ];
  for (const [background, place] of strips) {
    const el = document.createElement("div");
    Object.assign(el.style, { position: "fixed", pointerEvents: "none", zIndex: "64", background, willChange: "opacity", ...place });
    document.body.appendChild(el);
    el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], { duration: 460, easing: "ease-out" }).finished.then(() => el.remove());
  }
}

/**
 * A shock wave: two rings (a strong one with a weaker one trailing it) spreading out from the point of impact across the whole screen,
 * thinning and fading as they go. It is ONE soft gradient circle, drawn once at a small size and only scaled and faded: transform and opacity,
 * so the graphics card does it and the page underneath is not redrawn. The rings are soft, so enlarging the small drawing does not show,
 * and the browser keeps a small picture in memory instead of one as big as the screen.
 */
function shockwave(x: number, y: number, power: number, tint = TINT.C) {
  const need = 2 * Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)); // across to the farthest corner
  const weak = liteMode(); // a weaker computer gets a smaller picture that is enlarged less far (it covers most of the screen, and costs less to draw)
  const base = weak ? 256 : 512; // drawn size: small on purpose, the ring is soft so it can be enlarged without showing
  const grow = Math.min(weak ? 4.5 : Infinity, need / (base * 0.9)); // (the leading ring sits at 90% of the radius and ends at the farthest corner)
  const peak = Math.min(1, 0.7 + power * 0.08);
  // both rings are in one gradient (a weaker one trailing the strong one), so there is one layer to move, not two
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    left: `${x - base / 2}px`,
    top: `${y - base / 2}px`,
    width: `${base}px`,
    height: `${base}px`,
    pointerEvents: "none",
    zIndex: "62",
    opacity: "0",
    willChange: "transform, opacity",
    contain: "strict",
    background: `radial-gradient(closest-side, transparent 0%, transparent 52%, ${tint}22 60%, rgba(255,255,255,0.5) 66%, ${tint}22 72%, transparent 78%, transparent 80%, ${tint}44 85%, rgba(255,255,255,0.9) 90%, ${tint}44 94%, transparent 99%)`,
  });
  document.body.appendChild(el);
  el.animate(
    [
      { transform: "scale(0.25)", opacity: 0 },
      { transform: `scale(${(0.15 * grow).toFixed(3)})`, opacity: peak, offset: 0.1 },
      { transform: `scale(${(0.6 * grow).toFixed(3)})`, opacity: peak * 0.55, offset: 0.55 },
      { transform: `scale(${grow.toFixed(3)})`, opacity: 0 },
    ],
    { duration: (weak ? 800 : 950) + power * 25, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "both" },
  ).finished.then(() => el.remove(), () => el.remove());
}

let shaking: Animation | null = null;

/**
 * The playmat takes the blow: it is knocked back the way the hit came in, then settles in a few shrinking swings. It is only the middle
 * of the page that moves (the part with the cards), and only sideways: turning or scaling a layer the size of the window made the browser
 * redraw all of it on every frame, which is what made an earlier version drop frames. One animation of a handful of keyframes, transform only;
 * a second hit replaces the first instead of stacking on it.
 */
function screenShake(dealt: number, ux: number, uy: number) {
  const mat = document.querySelector("main > section");
  if (!mat) return;
  const k = Math.min(1, 0.45 + dealt * 0.11); // 0..1: how hard
  const reach = 6 + k * 12; // pixels of the first swing
  const MS = 380 + k * 320;
  const frames: Keyframe[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const decay = Math.pow(1 - t, 2); // the swings die away
    const along = Math.sin(t * 3.5 * Math.PI * 2 + 0.6) * decay * reach; // back and forth along the line of the hit
    const across = Math.sin(t * 3.5 * Math.PI * 3.1) * decay * reach * 0.28; // and a little sideways, so it does not feel mechanical
    frames.push({ transform: `translate(${(ux * along - uy * across).toFixed(1)}px, ${(uy * along + ux * across).toFixed(1)}px)` });
  }
  shaking?.cancel();
  const anim = mat.animate(frames, { duration: MS, easing: "linear" });
  shaking = anim;
  anim.finished.then(() => shaking === anim && (shaking = null), () => {});
}

const lifePulsing = new Set<HTMLElement>(); // life numbers that are pulsing right now

/** A player's life total pulses red when it is hit. */
function flashLife(el: HTMLElement, at?: { r: DOMRect; look: { fontFamily: string; fontSize: string; fontWeight: string } }) {
  if (lifePulsing.has(el)) return; // already pulsing from another hit
  // A copy of the number does the pulsing, on a layer of its own over the page: scaling the real one would repaint the panel it sits in.
  const r = at?.r ?? el.getBoundingClientRect();
  const look = at?.look ?? getComputedStyle(el);
  const copy = document.createElement("div");
  copy.textContent = el.textContent;
  Object.assign(copy.style, {
    position: "fixed",
    left: `${r.left + r.width / 2}px`,
    top: `${r.top + r.height / 2}px`,
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    fontWeight: look.fontWeight,
    lineHeight: "1",
    color: "#ef4444",
    textShadow: "0 0 10px rgba(239, 68, 68, 0.9), 0 0 2px #000",
    willChange: "transform, opacity",
    zIndex: "66",
    pointerEvents: "none",
  });
  document.body.appendChild(copy);
  lifePulsing.add(el);
  copy
    .animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.7)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -50%) scale(2.3)", opacity: 0 },
      ],
      { duration: 520, easing: "ease-out" },
    )
    .finished.then(() => {
      copy.remove();
      lifePulsing.delete(el);
    });
}

/** A thin glowing line from an attacker to what it is about to hit: it draws itself out, holds for a moment, and fades. */
function aimLine(from: DOMRect, to: DOMRect, delay: number, tint = TINT.C) {
  const a = centerOf(from);
  const b = centerOf(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const line = document.createElement("div");
  Object.assign(line.style, {
    position: "fixed",
    left: `${a.x}px`,
    top: `${a.y - 1.5}px`,
    width: `${len}px`,
    height: "3px",
    borderRadius: "2px",
    background: `linear-gradient(90deg, ${tint}26, #fff)`,
    transformOrigin: "0 50%",
    willChange: "transform, opacity",
    zIndex: "59",
    pointerEvents: "none",
    opacity: "0",
  });
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  document.body.appendChild(line);
  line
    .animate(
      [
        { transform: `rotate(${angle}rad) scaleX(0)`, opacity: 0 },
        { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: 0.5 },
        { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: 0.7 },
        { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 0 },
      ],
      { duration: AIM_MS, delay, easing: "ease-out", fill: "backwards" },
    )
    .finished.then(() => line.remove());
}

/** The red chevron that marks an attacking creature, and the streak that trails it as it charges (both ride on the moving card). */
function attackMarks(ghost: HTMLElement, ux: number, uy: number, width: number, height: number, tint = TINT.C, lean = 0) {
  const chevron = document.createElement("div");
  Object.assign(chevron.style, {
    position: "absolute",
    left: "50%",
    top: "-16px",
    marginLeft: "-13px",
    width: "0",
    height: "0",
    borderLeft: "13px solid transparent",
    borderRight: "13px solid transparent",
    borderBottom: "15px solid #ef4444",
    pointerEvents: "none",
  });
  ghost.appendChild(chevron);
  if (crowd > 3) return null; // with many attackers the streaks are left out
  const streak = document.createElement("div");
  const angle = Math.atan2(-uy, -ux) - (lean * Math.PI) / 180; // behind the card, away from where it is going (the card itself is turned by `lean`)
  Object.assign(streak.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${Math.max(width, height) * 1.9}px`,
    height: `${width * 0.55}px`,
    marginTop: `${-width * 0.275}px`,
    borderRadius: "999px",
    background: `linear-gradient(90deg, ${tint}d9, transparent)`,
    transformOrigin: "0 50%",
    transform: `rotate(${angle}rad)`,
    opacity: "0",
    willChange: "opacity",
    pointerEvents: "none",
    zIndex: "-1",
  });
  ghost.appendChild(streak);
  return streak;
}

/** A hot flash at the moment of impact (a gradient disc, so it costs nothing to draw). */
function flare(x: number, y: number, power: number, tint = TINT.C) {
  const size = 90 + 60 * power;
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: `radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, ${tint}bf 35%, transparent 70%)`,
    willChange: "transform, opacity",
    zIndex: "65",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
  el.animate([{ transform: "scale(0.2)", opacity: 1 }, { transform: "scale(1.5)", opacity: 0.8, offset: 0.35 }, { transform: "scale(1.9)", opacity: 0 }], { duration: 380, easing: "ease-out" }).finished.then(() => el.remove());
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Sends one attacker at `target`, runs the hit effects at the moment of impact, and brings it home. */
async function lunge(attacker: HTMLElement, target: HTMLElement, targetIsPlayer: boolean, hits: Hit[], attackerId: string) {
  const from = attacker.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const a = centerOf(from);
  const b = centerOf(to);
  const tint = TINT[attacker.dataset.tint ?? "C"] ?? TINT.C; // an attack takes the colour of the creature making it
  const width = attacker.offsetWidth; // size of the moving card, ignoring any tilt
  const height = attacker.offsetHeight;
  // Everything that will be struck is measured now, before the page is changed for the charge: measuring it at the moment of impact
  // (after the moving card was added and the real one hidden) made the browser lay the whole page out again right at the hit.
  const struck = new Map<HTMLElement, { r: DOMRect; look: { fontFamily: string; fontSize: string; fontWeight: string } | null }>();
  for (const h of hits) {
    if (h.source !== attackerId) continue;
    const el = isPlayer(h.target) ? lifeEl(h.target) : cardEl(h.target);
    if (!el || struck.has(el)) continue;
    const look = isPlayer(h.target) ? getComputedStyle(el) : null;
    struck.set(el, { r: el.getBoundingClientRect(), look: look ? { fontFamily: look.fontFamily, fontSize: look.fontSize, fontWeight: look.fontWeight } : null });
  }

  const ms = wave >= 3 ? CROWD_LUNGE_MS : LUNGE_MS;
  let mx = b.x - a.x; // how far the attacker travels
  let my = b.y - a.y;
  // The TOP of the card is what hits: it turns to face its target and drives in until its top edge reaches the number or the other card.
  const dist = Math.hypot(mx, my) || 1;
  let reach = dist - (from.height / 2 - 6);
  if (!targetIsPlayer) {
    // a card is struck at its edge: how far from its centre that edge is, in the direction the attacker comes from
    const dx = Math.abs(mx / dist) || 1e-6;
    const dy = Math.abs(my / dist) || 1e-6;
    reach = dist - from.height / 2 - Math.min(to.width / 2 / dx, to.height / 2 / dy) + 8; // (pressing in a little)
  }
  reach = Math.max(0, reach);
  mx = (mx / dist) * reach;
  my = (my / dist) * reach;
  // Never let the card fly out of the window (a life total sits close to the left edge).
  const margin = 8;
  const halfW = Math.max(width, height) / 2;
  const halfH = halfW;
  mx = Math.min(Math.max(mx, margin + halfW - a.x), window.innerWidth - margin - halfW - a.x);
  my = Math.min(Math.max(my, margin + halfH - a.y), window.innerHeight - margin - halfH - a.y);

  // Where the attacker ends up, and the direction it is travelling in (used for the shove and the rebound).
  const end = { x: a.x + mx, y: a.y + my };
  const len = Math.hypot(b.x - end.x, b.y - end.y) || 1;
  const ux = (b.x - end.x) / len;
  const uy = (b.y - end.y) / len;
  // the card faces its target, its top towards it, and the hit is where the top lands
  const lean = (Math.atan2(ux, -uy) * 180) / Math.PI;
  const contact = { x: end.x + ux * (from.height / 2), y: end.y + uy * (from.height / 2) };

  // The moving card is a copy drawn on top of everything, so it isn't clipped by the board it came from.
  // With several attackers at once, each moving copy is just the card's picture (a whole copy of the card, text and badges and all,
  // five times over, is what slows the screen); a lone attacker is copied in full.
  const art = crowd > 2 ? attacker.querySelector("img")?.currentSrc : "";
  const ghost = art ? document.createElement("div") : (attacker.cloneNode(true) as HTMLElement);
  if (art) Object.assign(ghost.style, { background: `center / cover url("${art}")`, borderRadius: "8px", border: "1px solid #52525b" });
  ghost.removeAttribute("data-card-iid");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${a.x - width / 2}px`,
    top: `${a.y - height / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    margin: "0",
    zIndex: "60",
    pointerEvents: "none",
    translate: "none",
    scale: "none",
    rotate: "none",
    transition: "none",
    ...(crowd > 2 || liteMode() ? {} : { boxShadow: "0 26px 30px rgba(0, 0, 0, 0.4)" }),
    willChange: "transform",
  });
  document.body.appendChild(ghost);
  attacker.style.visibility = "hidden";
  const streak = attackMarks(ghost, ux, uy, width, height, tint, lean);
  streak?.animate([{ opacity: 0 }, { opacity: 0, offset: COIL / IMPACT_AT - 0.02 }, { opacity: 0.9, offset: 0.9 }, { opacity: 0 }], { duration: ms * IMPACT_AT, easing: "linear", fill: "forwards" });
  const tilt = lean; // it points its top at the target
  const coil = lean;

  const motion = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1.05)", offset: 0, easing: "ease-out" },
      // wind up: pull back and turn to face the target
      { transform: `translate(${-ux * 46}px, ${-uy * 46}px) scale(1.18) rotate(${coil}deg)`, offset: WINDUP, easing: "ease-in-out" },
      // coiled: held back for a beat before it goes
      { transform: `translate(${-ux * 52}px, ${-uy * 52}px) scale(1.2) rotate(${coil}deg)`, offset: COIL, easing: "cubic-bezier(0.75, 0, 1, 0.5)" },
      // contact: it has been speeding up the whole way, so it arrives at full speed
      { transform: `translate(${mx}px, ${my}px) scale(1.16) rotate(${tilt}deg)`, offset: IMPACT_AT, easing: "ease-out" },
      // rebound: bounces back off the target
      { transform: `translate(${mx - ux * 34}px, ${my - uy * 34}px) scale(1.1) rotate(${tilt * 0.6}deg)`, offset: IMPACT_AT + 0.1, easing: "ease-in-out" },
      // back home
      { transform: "translate(0, 0) scale(1.05) rotate(0deg)", offset: 1 },
    ],
    { duration: ms, easing: "linear" },
  );

  playSound("charge", (ms * (WINDUP - 0.04)) / 1000); // as it starts to coil
  await waitUntil(motion, ms * IMPACT_AT);
  playSound(targetIsPlayer ? "hit" : "clash");
  const dealt = hits.filter((h) => h.source === attackerId).reduce((n, h) => n + h.amount, 0);
  // The hit's effects are started over a few frames, the flash and burst first: creating all of them in one frame was one long frame, right at the hit.
  if (crowd <= 2 || bursts++ < 2) {
    // (with a crowd, only the first two hits get the full flash)
    impactBurst(contact.x, contact.y, Math.min(1.6, 0.6 + dealt * 0.12), tint);
    flare(contact.x, contact.y, Math.min(1.6, 0.6 + dealt * 0.12), tint);
  }
  await nextFrame();
  if (targetIsPlayer && hits.some((h) => h.source === attackerId && isPlayer(h.target))) {
    screenShake(dealt, ux, uy);
    shockwave(contact.x, contact.y, dealt, tint);
  }
  // a heavy hit rings out twice and throws more sparks
  if (dealt >= 3 && (crowd <= 2 || bursts <= 2)) {
    ring({ x: contact.x - 40, y: contact.y - 40, w: 80, h: 80 }, tint, 90, dealt >= 5 ? 2.4 : 1.8);
    sparkBurst(contact, tint, 8, 0, 70);
  }
  await nextFrame();
  screenFlash(targetIsPlayer ? "239, 68, 68" : "251, 191, 36", Math.min(0.34, 0.08 + dealt * 0.03));
  const attackerNow = new DOMRect(end.x - width / 2, end.y - height / 2, width, height);
  for (const hit of hits) {
    if (hit.source === attackerId) {
      const el = isPlayer(hit.target) ? lifeEl(hit.target) : cardEl(hit.target);
      if (!el) continue;
      const seen = struck.get(el);
      const box = seen?.r ?? el.getBoundingClientRect();
      if (isPlayer(hit.target)) {
        if (!hit.infect) dropLife(hit.target, hit.amount); // the life total starts counting down now, as the hit lands
        flashLife(el, seen?.look ? { r: box, look: seen.look } : undefined);
      } else {
        // Every creature the attacker hit is shoved away from it.
        const c = centerOf(box);
        const d = Math.hypot(c.x - end.x, c.y - end.y) || 1;
        recoil(el, (c.x - end.x) / d, (c.y - end.y) / d);
      }
      if (crowd <= 3 || slashes++ < 3) slash({ x: box.left, y: box.top, w: box.width, h: box.height }, tint); // (with a crowd, the first three hits get the blade)
      floatNumber(box, hit.amount, hit.infect ? (isPlayer(hit.target) ? "player" : "creature") : undefined);
    } else if (hit.target === attackerId) {
      floatNumber(attackerNow, hit.amount, hit.infect ? "creature" : undefined); // the blocker hit back
    }
  }

  // Hit-stop: the picture freezes for a heartbeat, so the hit lands with weight (the heavier the hit, the longer).
  const stop = dealt >= 5 ? 170 : dealt >= 3 ? 120 : 80;
  if (stop > 0) {
    motion.pause();
    await wait(stop);
    motion.play();
  }
  await motion.finished;
  ghost.remove();
  attacker.style.visibility = "";
}

/** The creatures that fought in this update: the combat on the board, or one declared and fought at once because nothing could block. */
export function attackersIn(before: GameState | null | undefined, events: GameEvent[]): string[] {
  if (!events.some((e) => e.type === "combatDamage")) return [];
  if (before?.combat) return before.combat.attackers.map((a) => a.attacker);
  return events.flatMap((e) => (e.type === "attackersDeclared" ? e.attackers : []));
}

/**
 * Plays the animation for the combat damage in `events`, then resolves. `attackerIds` are the creatures that
 * attacked. Resolves immediately if the player turned animations off, or if the cards can't be found.
 */
export async function playCombat(events: GameEvent[], attackerIds: string[], opts: { flash?: boolean } = {}): Promise<void> {
  flashEdges = opts.flash !== false;
  const hits = events.filter((e): e is Hit => e.type === "combatDamage");
  if (!animationsEnabled()) {
    if (hits.length > 0) playSound(hits.some((h) => isPlayer(h.target)) ? "hit" : "clash");
    return;
  }

  // One charge per attacker: at the creature blocking it, or (when nobody blocked it) at the player's life total.
  type Charge = { run: () => Promise<void>; unblocked: boolean; aim: [HTMLElement, HTMLElement] };
  const charges: Charge[] = [];
  for (const id of attackerIds) {
    const attacker = cardEl(id);
    const mine = hits.filter((h) => h.source === id);
    const playerHit = mine.find((h) => isPlayer(h.target));
    // Blocked: aim at the first creature it fights (one it hit, or failing that one that hit it).
    const cardId = mine.find((h) => !isPlayer(h.target))?.target ?? hits.find((h) => h.target === id)?.source;
    // A blocked trampler hits the player too, but it still crashes into its blocker first.
    const atPlayer = !cardId && Boolean(playerHit);
    const target = cardId ? cardEl(cardId) : playerHit ? lifeEl(playerHit.target) : null;
    if (!attacker || !target) continue;
    const related = hits.filter((h) => h.source === id || h.target === id);
    charges.push({ run: () => lunge(attacker, target, atPlayer, related, id), unblocked: atPlayer, aim: [attacker, target] });
  }

  /**
   * The charges, ONE AT A TIME: each attacker picks its target (a line to it and a mark closing in), charges, hits and is home again before
   * the next one starts. (So only one card is ever moving, and every hit gets all of its effects.)
   */
  const playAll = async (group: Charge[]) => {
    wave = group.length;
    crowd = 1;
    let first = true;
    for (const c of group) {
      flashed = false;
      numberSlot = 0;
      bursts = 0;
      slashes = 0;
      const tint = TINT[c.aim[0].dataset.tint ?? "C"] ?? TINT.C;
      const to = c.aim[1].getBoundingClientRect();
      aimLine(c.aim[0].getBoundingClientRect(), to, 0, tint);
      reticle({ x: to.left, y: to.top, w: to.width, h: to.height }, tint, 0, AIM_MS + AIM_LEAD_MS * 0.4);
      await wait(first ? AIM_LEAD_MS : AIM_LEAD_MS * 0.65); // (the first one takes its time; the rest step up a little faster)
      first = false;
      await c.run();
      await wait(BETWEEN_HITS_MS);
    }
  };

  // Frames that took far too long during this attack: a computer that does that gets the cheaper effects from now on.
  let slowFrames = 0;
  let lastFrame = performance.now();
  let watching = true;
  const watchFrames = (t: number) => {
    if (t - lastFrame > 45) slowFrames++;
    lastFrame = t;
    if (watching) requestAnimationFrame(watchFrames);
  };
  requestAnimationFrame(watchFrames);
  playing = true;
  // The playmat gets its own layer now, while the attackers are still lining up, so the first shake does not have to make one at the moment of impact.
  const mat = document.querySelector<HTMLElement>("main > section");
  if (mat && attackerIds.length > 0 && hits.some((h) => isPlayer(h.target))) mat.style.willChange = "transform";
  try {
    // Blocked attackers fight first. The unblocked ones wait, lifted, where they are...
    await playAll(charges.filter((c) => !c.unblocked));
    // ...and only when those fights are over do they charge at the player.
    const unblocked = charges.filter((c) => c.unblocked);
    if (unblocked.length > 0 && unblocked.length < charges.length) await wait(BETWEEN_GROUPS_MS);
    await playAll(unblocked);
  } finally {
    playing = false;
    watching = false;
    if (slowFrames >= 6) strain();
    if (mat) setTimeout(() => (mat.style.willChange = ""), 900); // (after the last shake has settled)
  }
}

