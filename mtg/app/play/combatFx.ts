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
const BETWEEN_GROUPS_MS = 250; // pause after the blocked fights, before the unblocked attackers go

let playing = false;
/** Whether this screen belongs to the player being attacked: only they see the edges of the screen flash. (Set for each attack.) */
let flashEdges = true;
/** How many attackers are charging at the same moment (and how many numbers have been shown for them): with a crowd, each one gets lighter effects. */
let crowd = 1;
let flashed = false;
let numberSlot = 0;
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

/** The edges of the screen flash for a moment: a hit you feel. Opacity only, so it costs next to nothing. */
function screenFlash(rgb: string, strength: number) {
  if (!flashEdges || flashed) return; // the attacker doesn't get the flash, the player who was hit does, and once for a whole wave of attackers
  flashed = true;
  const el = document.createElement("div");
  Object.assign(el.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "64", background: `radial-gradient(ellipse at center, rgba(${rgb}, 0) 45%, rgba(${rgb}, ${strength}) 100%)` });
  document.body.appendChild(el);
  el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], { duration: 460, easing: "ease-out" }).finished.then(() => el.remove());
}

/** A player's life total pulses red when it is hit. */
function flashLife(el: HTMLElement) {
  if (el.getAnimations().some((a) => a.playState === "running" && a.effect?.getTiming().duration === 520)) return; // already pulsing from another hit
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.8)", offset: 0.25 },
      { transform: "scale(1)" },
    ],
    { duration: 520, easing: "ease-out" },
  );
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
  const ghost = attacker.cloneNode(true) as HTMLElement;
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

  const motion = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1.05)", offset: 0, easing: "ease-out" },
      // wind up: pull back before charging, then accelerate into the target
      { transform: `translate(${-ux * 22}px, ${-uy * 22}px) scale(1.12) rotate(-3deg)`, offset: 0.16, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
      // contact: arrives at full speed
      { transform: `translate(${mx}px, ${my}px) scale(1.1)`, offset: IMPACT_AT, easing: "ease-out" },
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
  impactBurst(contact.x, contact.y, Math.min(1.6, 0.6 + dealt * 0.12));
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
  type Charge = { run: () => Promise<void>; unblocked: boolean };
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
    charges.push({ run: () => lunge(attacker, target, atPlayer, related, id), unblocked: atPlayer });
  }

  /** Starts the charges one after another, a moment apart, and resolves when the last one is home. */
  const playAll = (group: Charge[]) => {
    crowd = group.length;
    flashed = false;
    numberSlot = 0;
    return Promise.all(group.map((c, i) => wait(i * STAGGER_MS).then(c.run)));
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
