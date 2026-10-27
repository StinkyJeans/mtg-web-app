import type { GameEvent, GameState } from "@mtg/engine";
import { animationsEnabled } from "@/lib/motion";
import { playSound } from "@/lib/sound";

// Combat animation. Attackers lunge at what they are hitting: a blocking creature (it recoils) or the
// defending player's life total (it flashes). It works on the page itself, using two markers:
//   data-card-iid="..."   on every card on the battlefield
//   data-life="p1|p2"     on each player's life number

type Hit = Extract<GameEvent, { type: "combatDamage" }>;

const LUNGE_MS = 820;
const IMPACT_AT = 0.45; // fraction of the lunge at which the hit lands
const STAGGER_MS = 150; // delay between attackers, so each hit can be seen
const AIM_MS = 330; // the aiming lines: drawn, held, and gone just as the attackers charge
const AIM_LEAD_MS = 320; // how long the attackers wait, lines drawn, before they charge
const BETWEEN_GROUPS_MS = 250; // pause after the blocked fights, before the unblocked attackers go

let playing = false;
/** Whether this screen belongs to the player being attacked: only they see the edges of the screen flash. (Set for each attack.) */
let flashEdges = true;
/** How many attackers are charging at the same moment (and how many numbers have been shown for them): with a crowd, each one gets lighter effects. */
let crowd = 1;
let flashed = false;
let numberSlot = 0;
let bursts = 0; // impact flashes shown in this wave
/** True while an attack is being animated, so the game can ignore clicks until it has finished. */
export const isCombatPlaying = () => playing;

/** Resolves when `anim` has actually reached `ms`, so effects land exactly when the card does. */
function waitUntil(anim: Animation, ms: number) {
  return new Promise<void>((resolve) => {
    const check = () => (Number(anim.currentTime ?? 0) >= ms || anim.playState === "finished" ? resolve() : requestAnimationFrame(check));
    check();
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isPlayer = (id: string) => id === "p1" || id === "p2";
const cardEl = (iid: string) => document.querySelector<HTMLElement>(`[data-card-iid="${iid}"]`);
const lifeEl = (id: string) => document.querySelector<HTMLElement>(`[data-life="${id}"]`);
const centerOf = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** A red "-3" that rises from the point of impact and fades. */
function floatNumber(at: DOMRect, amount: number) {
  if (crowd > 2 && numberSlot >= 3) return; // with a crowd, the first three hits show their numbers (the life total shows the rest)
  const note = document.createElement("div");
  note.textContent = `-${amount}`;
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
    color: "#dc2626",
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
  const flash = crowd <= 2;
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
function impactBurst(x: number, y: number, power = 1) {
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
    border: "4px solid #fde047",
    ...(crowd > 2 ? { background: "radial-gradient(circle, rgba(253, 224, 71, 0.55), rgba(251, 146, 60, 0))" } : { boxShadow: "0 0 26px 10px rgba(251, 146, 60, 0.85)" }), // (a big blurred glow, five times over, is what slows the screen)
    willChange: "transform, opacity",
    zIndex: "65",
    pointerEvents: "none",
  });
  document.body.appendChild(ring);
  ring.animate([{ transform: "scale(0.3)", opacity: 1 }, { transform: `scale(${3.5 + 3 * power})`, opacity: 0 }], { duration: 440, easing: "ease-out" }).finished.then(() =>
    ring.remove(),
  );

  const sparks = crowd > 2 ? 3 : 7 + Math.round(power * 5);
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
      background: i % 2 ? "#fb923c" : "#fde047",
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

const lifePulsing = new Set<HTMLElement>(); // life numbers that are pulsing right now

/** A player's life total pulses red when it is hit. */
function flashLife(el: HTMLElement) {
  if (lifePulsing.has(el)) return; // already pulsing from another hit
  // A copy of the number does the pulsing, on a layer of its own over the page: scaling the real one would repaint the panel it sits in.
  const r = el.getBoundingClientRect();
  const look = getComputedStyle(el);
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
function aimLine(from: DOMRect, to: DOMRect, delay: number) {
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
    background: "linear-gradient(90deg, rgba(254, 202, 202, 0.15), rgba(254, 226, 226, 0.95))",
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
function attackMarks(ghost: HTMLElement, ux: number, uy: number, width: number, height: number) {
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
  const angle = Math.atan2(-uy, -ux); // behind the card, away from where it is going
  Object.assign(streak.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${Math.max(width, height) * 1.9}px`,
    height: `${width * 0.55}px`,
    marginTop: `${-width * 0.275}px`,
    borderRadius: "999px",
    background: "linear-gradient(90deg, rgba(254, 215, 170, 0.85), rgba(255, 255, 255, 0))",
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
function flare(x: number, y: number, power: number) {
  const size = 90 + 60 * power;
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255, 251, 235, 0.95) 0%, rgba(253, 186, 116, 0.75) 35%, rgba(239, 68, 68, 0) 70%)",
    willChange: "transform, opacity",
    zIndex: "65",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
  el.animate([{ transform: "scale(0.2)", opacity: 1 }, { transform: "scale(1.5)", opacity: 0.8, offset: 0.35 }, { transform: "scale(1.9)", opacity: 0 }], { duration: 380, easing: "ease-out" }).finished.then(() => el.remove());
}

/** Sends one attacker at `target`, runs the hit effects at the moment of impact, and brings it home. */
async function lunge(attacker: HTMLElement, target: HTMLElement, targetIsPlayer: boolean, hits: Hit[], attackerId: string) {
  const from = attacker.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const a = centerOf(from);
  const b = centerOf(to);
  const width = attacker.offsetWidth; // size of the moving card, ignoring any tilt
  const height = attacker.offsetHeight;

  let mx = b.x - a.x; // how far the attacker travels
  let my = b.y - a.y;
  if (targetIsPlayer) {
    // Fly right onto the life total.
    mx *= 0.95;
    my *= 0.95;
  } else {
    // Drive in until the two cards touch edge to edge, then press in a little, like two cars colliding.
    // The cards touch when the gap between their centres equals half of both sizes, along x or y.
    const reachX = (width + to.width) / 2;
    const reachY = (height + to.height) / 2;
    const m = Math.max(Math.abs(mx) / reachX, Math.abs(my) / reachY); // distance now / distance when touching
    const travelled = m > 1 ? 1 - 0.9 / m : 0.2; // 0.9 = press in by 10% of the gap
    mx *= travelled;
    my *= travelled;
  }
  // Never let the card fly out of the window (a life total sits close to the left edge).
  const margin = 8;
  mx = Math.min(Math.max(mx, margin + width / 2 - a.x), window.innerWidth - margin - width / 2 - a.x);
  my = Math.min(Math.max(my, margin + height / 2 - a.y), window.innerHeight - margin - height / 2 - a.y);

  // Where the attacker ends up, and the direction it is travelling in (used for the shove and the rebound).
  const end = { x: a.x + mx, y: a.y + my };
  const len = Math.hypot(b.x - end.x, b.y - end.y) || 1;
  const ux = (b.x - end.x) / len;
  const uy = (b.y - end.y) / len;
  const contact = { x: (end.x + b.x) / 2, y: (end.y + b.y) / 2 };

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
    ...(crowd > 2 ? {} : { boxShadow: "0 26px 30px rgba(0, 0, 0, 0.4)" }),
    willChange: "transform",
  });
  document.body.appendChild(ghost);
  attacker.style.visibility = "hidden";
  const streak = attackMarks(ghost, ux, uy, width, height);
  streak?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.16 / IMPACT_AT }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: LUNGE_MS * IMPACT_AT, easing: "linear", fill: "forwards" });
  const tilt = ux >= 0 ? 9 : -9; // it banks into the charge

  const motion = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1.05)", offset: 0, easing: "ease-out" },
      // wind up: pull back before charging, then accelerate into the target
      { transform: `translate(${-ux * 22}px, ${-uy * 22}px) scale(1.12) rotate(-3deg)`, offset: 0.16, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
      // contact: arrives at full speed
      { transform: `translate(${mx}px, ${my}px) scale(1.14) rotate(${tilt}deg)`, offset: IMPACT_AT, easing: "ease-out" },
      // rebound: bounces back off the target
      { transform: `translate(${mx - ux * 38}px, ${my - uy * 38}px) scale(1.1) rotate(-5deg)`, offset: IMPACT_AT + 0.14, easing: "ease-in-out" },
      // back home
      { transform: "translate(0, 0) scale(1.05)", offset: 1 },
    ],
    { duration: LUNGE_MS, easing: "linear" },
  );

  playSound("charge", (LUNGE_MS * 0.16) / 1000); // as it leaves the wind-up
  await waitUntil(motion, LUNGE_MS * IMPACT_AT);
  playSound(targetIsPlayer ? "hit" : "clash");
  const dealt = hits.filter((h) => h.source === attackerId).reduce((n, h) => n + h.amount, 0);
  if (crowd <= 2 || bursts++ < 2) {
    // (with a crowd, only the first two hits get the full flash)
    impactBurst(contact.x, contact.y, Math.min(1.6, 0.6 + dealt * 0.12));
    flare(contact.x, contact.y, Math.min(1.6, 0.6 + dealt * 0.12));
  }
  screenFlash(targetIsPlayer ? "239, 68, 68" : "251, 191, 36", Math.min(0.34, 0.08 + dealt * 0.03));
  const attackerNow = new DOMRect(end.x - width / 2, end.y - height / 2, width, height);
  for (const hit of hits) {
    if (hit.source === attackerId) {
      const el = isPlayer(hit.target) ? lifeEl(hit.target) : cardEl(hit.target);
      if (!el) continue;
      if (isPlayer(hit.target)) {
        flashLife(el);
      } else {
        // Every creature the attacker hit is shoved away from it.
        const c = centerOf(el.getBoundingClientRect());
        const d = Math.hypot(c.x - end.x, c.y - end.y) || 1;
        recoil(el, (c.x - end.x) / d, (c.y - end.y) / d);
      }
      floatNumber(el.getBoundingClientRect(), hit.amount);
    } else if (hit.target === attackerId) {
      floatNumber(attackerNow, hit.amount); // the blocker hit back
    }
  }

  // Hit-stop: a heavy hit freezes the picture for a heartbeat, so it lands with weight.
  const stop = dealt >= 5 ? 95 : dealt >= 3 ? 60 : 0;
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

  /** Starts the charges one after another, a moment apart, and resolves when the last one is home. */
  const playAll = (group: Charge[]) => {
    crowd = group.length;
    flashed = false;
    numberSlot = 0;
    bursts = 0;
    // First the attackers pick their targets: a line from each, then they go
    if (group.length <= 3) group.forEach((c, i) => aimLine(c.aim[0].getBoundingClientRect(), c.aim[1].getBoundingClientRect(), i * 40));
    if (group.length === 0) return Promise.resolve([]);
    return wait(AIM_LEAD_MS).then(() => Promise.all(group.map((c, i) => wait(i * STAGGER_MS).then(c.run))));
  };

  playing = true;
  try {
    // Blocked attackers fight first. The unblocked ones wait, lifted, where they are...
    await playAll(charges.filter((c) => !c.unblocked));
    // ...and only when those fights are over do they charge at the player.
    const unblocked = charges.filter((c) => c.unblocked);
    if (unblocked.length > 0 && unblocked.length < charges.length) await wait(BETWEEN_GROUPS_MS);
    await playAll(unblocked);
  } finally {
    playing = false;
  }
}

