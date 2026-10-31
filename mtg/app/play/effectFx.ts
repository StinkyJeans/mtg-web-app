import { liteMode } from "./perfTier";
import { powerOf, toughnessOf } from "@mtg/engine";
import type { CardDef, GameEvent, GameState, Permanent, PlayerId, TargetChoice } from "@mtg/engine";
import { animationsEnabled, scaled } from "@/lib/motion";
import { shuffleOnMat } from "./pileFx";

// Animations for what spells, abilities and effects do. Everything is found from what the game reports (its events) and from
// what changed between the old and the new board, so a new card needs nothing of its own. The markers it works with:
//   data-card-iid="..."  on every card on the battlefield     data-life="p1|p2"  on each life total
//
// Kept cheap on purpose: only movement and fading (the browser does those on the graphics card, no layout, no repaint of the
// page), all the pieces live in one overlay layer, the rectangles are read first and the pieces drawn after, and one action
// never makes more than MAX_PIECES of them.

const MAX_PIECES = 16; // per action
const maxPieces = () => (liteMode() ? 10 : MAX_PIECES); // (a computer with little memory and a small graphics chip gets fewer)
const MAX_ALIVE = 36; // on screen at once, over all actions
const BEAM_MS = 420; // how long a beam takes from its source to its target

let alive = 0;
let layerEl: HTMLElement | null = null;

const COLOR: Record<string, string> = { W: "#fde68a", U: "#60a5fa", B: "#a78bfa", R: "#f87171", G: "#4ade80", C: "#cbd5e1" };
/** The colour a card's attack takes (a little brighter than the spell colours, so it reads on a dark board). */
export const TINT: Record<string, string> = { W: "#fde68a", U: "#7dd3fc", B: "#c4b5fd", R: "#fb923c", G: "#86efac", C: "#e2e8f0" };
const GOOD = "#22c55e";
const BAD = "#ef4444";
const KEYWORD = "#c4b5fd";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, scaled(ms)));
const isPlayer = (id: string) => id === "p1" || id === "p2";

function layer(): HTMLElement {
  if (layerEl && layerEl.isConnected) return layerEl;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "66", contain: "layout paint style" });
  document.body.appendChild(el);
  layerEl = el;
  return el;
}

const cardEl = (iid: string) => document.querySelector<HTMLElement>(`[data-card-iid="${iid}"]`);
const lifeEl = (id: string) => document.querySelector<HTMLElement>(`[data-life="${id}"]`);

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const boxOf = (el: Element | null): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0 ? null : { x: r.left, y: r.top, w: r.width, h: r.height };
};
/** Where each card stood just before the board changed: a card that died or left is gone from the page, but its number can still be shown there. */
let snap = new Map<string, Box>();
const where = (id: string): Box | null => boxOf(isPlayer(id) ? lifeEl(id) : cardEl(id)) ?? (isPlayer(id) ? null : (snap.get(id) ?? null));
const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** A piece of the effect: put on the overlay, animated, and removed when it is done. Returns when it has finished. */
function piece(style: Partial<CSSStyleDeclaration>, text: string | null, frames: Keyframe[], ms: number, delay = 0, easing = "ease-out"): Promise<void> {
  if (alive >= MAX_ALIVE) return Promise.resolve();
  const el = document.createElement("div");
  Object.assign(el.style, { position: "absolute", willChange: "transform, opacity", ...style });
  if (text !== null) el.textContent = text;
  layer().appendChild(el);
  alive++;
  return el
    .animate(frames, { duration: ms, delay, easing, fill: "both" })
    .finished.catch(() => undefined)
    .then(() => {
      el.remove();
      alive--;
    });
}

// ───────── the pieces ─────────

/** A number or word that rises from a card or a life total and fades: "-3", "+1/+1", "Flying". */
function floatText(b: Box, text: string, color: string, delay = 0, size = 26, dy = 0) {
  const { x, y: cy } = center(b);
  const y = cy + dy;
  void piece(
    { left: `${x}px`, top: `${y}px`, fontWeight: "800", fontSize: `${size}px`, color, whiteSpace: "nowrap", textShadow: "0 0 3px #000, 0 0 3px #000, 0 2px 6px rgba(0,0,0,.5)" },
    text,
    [
      { transform: "translate(-50%, -30%) scale(0.6)", opacity: 0 },
      { transform: "translate(-50%, -80%) scale(1.2)", opacity: 1, offset: 0.2 },
      { transform: "translate(-50%, -190%) scale(1)", opacity: 0 },
    ],
    1100,
    delay,
  );
}

/** A coin of mana that rises from the land or creature that made it and fades: what each source paid. */
function manaCoin(b: Box, color: string, delay = 0, dx = 0) {
  const { x, y } = center(b);
  void piece(
    { left: `${x + dx}px`, top: `${y}px`, width: "28px", height: "28px", borderRadius: "50%", background: COLOR[color] ?? COLOR.C, color: "#111", fontWeight: "800", fontSize: "15px", lineHeight: "28px", textAlign: "center", boxShadow: "0 0 0 2px rgba(0,0,0,.55), 0 0 12px rgba(255,255,255,.35)" },
    color,
    [
      { transform: "translate(-50%, -20%) scale(0.5)", opacity: 0 },
      { transform: "translate(-50%, -70%) scale(1.1)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%, -230%) scale(1)", opacity: 0 },
    ],
    1200,
    delay,
  );
}

/** A ring that grows from the middle of a card and fades. */
export function ring(b: Box, color: string, delay = 0, grow = 1) {
  const { x, y } = center(b);
  const size = Math.max(40, Math.min(b.w, b.h) * 0.7);
  void piece(
    { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", border: `3px solid ${color}` },
    null,
    [{ transform: "scale(0.4)", opacity: 0 }, { transform: "scale(0.4)", opacity: 0.95, offset: 0.001 }, { transform: `scale(${1.9 * grow})`, opacity: 0 }], // (not there at all until its delay is over)
    520,
    delay,
  );
}

/** A blocker is tied to the attacker it stands in front of: a line that draws itself from the blocker to the attacker, an arrowhead on the attacker, a ring on the blocker. */
export function blockLink(from: Box, to: Box, delay = 0) {
  const a = center(from);
  const b = center(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 20) return;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const color = "#7dd3fc";
  const dir = `rotate(${angle}rad)`;
  const keep = [0, 0.22, 0.78, 1];
  const fade = (t: string) => keep.map((offset, i) => ({ transform: t, opacity: i === 0 || i === 3 ? 0 : 1, offset }));
  // the line: it grows out of the blocker
  void piece(
    { left: `${a.x}px`, top: `${a.y - 2.5}px`, width: `${Math.max(0, len - 26)}px`, height: "5px", borderRadius: "3px", transformOrigin: "0 50%", background: `linear-gradient(90deg, ${color}40, ${color})`, boxShadow: `0 0 10px ${color}` },
    null,
    [{ transform: `${dir} scaleX(0)`, opacity: 0 }, { transform: `${dir} scaleX(1)`, opacity: 1, offset: 0.22 }, { transform: `${dir} scaleX(1)`, opacity: 1, offset: 0.78 }, { transform: `${dir} scaleX(1)`, opacity: 0 }],
    1250,
    delay,
    "ease-out",
  );
  // the arrowhead, on the attacker
  void piece(
    { left: `${b.x}px`, top: `${b.y}px`, width: "0", height: "0", borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: `22px solid ${color}`, filter: `drop-shadow(0 0 6px ${color})`, transformOrigin: "0 0" },
    null,
    fade(`translate(${-(Math.min(to.w, to.h) / 2 + 22) * Math.cos(angle)}px, ${-(Math.min(to.w, to.h) / 2 + 22) * Math.sin(angle)}px) ${dir} translateY(-12px)`),
    1250,
    delay,
  );
  ring(from, color, delay + 40, 1.3);
}

/** A quick bright stroke across a box, like a blade going through it. */
export function slash(b: Box, color: string, delay = 0) {
  const { x, y } = center(b);
  const len = Math.max(60, Math.hypot(b.w, b.h) * 1.15);
  void piece(
    { left: `${x - len / 2}px`, top: `${y - 2.5}px`, width: `${len}px`, height: "5px", borderRadius: "3px", background: `linear-gradient(90deg, transparent, #fff 32%, ${color} 68%, transparent)` },
    null,
    [{ transform: "rotate(-38deg) scaleX(0.15)", opacity: 0 }, { transform: "rotate(-38deg) scaleX(1)", opacity: 1, offset: 0.35 }, { transform: "rotate(-38deg) scaleX(1.06)", opacity: 0 }],
    280,
    delay,
  );
}

/** Specks that fly out from a point and fade (a handful of small dots: a spark, not a particle system). */
export function sparkBurst(c: { x: number; y: number }, color: string, n = 6, delay = 0, far = 46) {
  if (liteMode()) n = Math.max(3, Math.ceil(n * 0.6));
  const turn = Math.random() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2;
    const d = far * (0.7 + 0.5 * ((i * 7) % 5) / 5);
    void piece(
      { left: `${c.x - 3}px`, top: `${c.y - 3}px`, width: "6px", height: "6px", borderRadius: "50%", background: i % 2 ? "#fff" : color },
      null,
      [{ transform: "translate(0, 0) scale(1)", opacity: 0 }, { transform: `translate(${Math.cos(a) * d * 0.45}px, ${Math.sin(a) * d * 0.45}px) scale(1)`, opacity: 1, offset: 0.2 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0.3)`, opacity: 0 }],
      420 + (i % 3) * 60,
      delay,
    );
  }
}

/** Glints that drift up from a card or a life total and fade: something good happening to it. */
export function riseSparkles(b: Box, color: string, n = 5, delay = 0) {
  if (liteMode()) n = Math.max(2, Math.ceil(n * 0.6));
  for (let i = 0; i < n; i++) {
    const x = b.x + b.w * (0.15 + (0.7 * i) / Math.max(1, n - 1));
    const y = b.y + b.h * (0.55 + 0.25 * ((i * 3) % 2));
    const rise = 38 + ((i * 5) % 4) * 14;
    void piece(
      { left: `${x - 3}px`, top: `${y - 3}px`, width: "7px", height: "7px", borderRadius: "50%", background: `radial-gradient(circle, #fff, ${color} 60%, transparent 75%)` },
      null,
      [{ transform: "translateY(0) scale(0.4)", opacity: 0 }, { transform: `translateY(${-rise * 0.4}px) scale(1.1)`, opacity: 1, offset: 0.3 }, { transform: `translateY(${-rise}px) scale(0.5)`, opacity: 0 }],
      780 + (i % 3) * 120,
      delay + i * 70,
    );
  }
}

/** A target mark that closes in on what is about to be hit. */
export function reticle(b: Box, color: string, delay = 0, ms = 330) {
  const { x, y } = center(b);
  const size = Math.max(44, Math.min(b.w, b.h) * 0.9);
  void piece(
    { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", border: `2px solid ${color}` },
    null,
    [{ transform: "scale(2)", opacity: 0 }, { transform: "scale(1)", opacity: 0.95, offset: 0.55 }, { transform: "scale(0.9)", opacity: 0 }],
    ms,
    delay,
  );
}

/** The card is covered by a colour for a moment. */
function flash(b: Box, color: string, delay = 0) {
  void piece({ left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: "10px", background: color }, null, [{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], 520, delay);
}

/** A beam from a spell's or ability's source to what it aims at, with a bright head that travels along it. */
function beam(from: Box, to: Box, color: string, delay = 0) {
  const a = center(from);
  const b = center(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  void piece(
    { left: `${a.x}px`, top: `${a.y - 2}px`, width: `${len}px`, height: "4px", borderRadius: "2px", transformOrigin: "0 50%", background: `linear-gradient(90deg, transparent, ${color})` },
    null,
    [
      { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 },
      { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.55 },
      { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 0 },
    ],
    BEAM_MS,
    delay,
    "ease-in-out",
  );
  void piece(
    { left: `${a.x - 7}px`, top: `${a.y - 7}px`, width: "14px", height: "14px", borderRadius: "50%", background: color },
    null,
    [{ transform: "translate(0, 0) scale(0.6)", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(1.3)`, opacity: 1, offset: 0.85 }, { transform: `translate(${dx}px, ${dy}px) scale(2.2)`, opacity: 0 }],
    BEAM_MS - 40,
    delay,
    "ease-in",
  );
}

/** A card comes into being: it grows in from a little smaller, with a small overshoot. */
function popIn(el: HTMLElement) {
  el.animate([{ transform: "scale(0.55)", opacity: 0 }, { transform: "scale(1.09)", opacity: 1, offset: 0.62 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: "ease-out" });
}

/**
 * A card arrives on the battlefield by SLAMMING onto the playmat: it comes down from above, big and fast, hits the mat (it squashes for a
 * moment and springs back), and where it lands there is a shock ring, a puff of dust, sparks in its color, and the whole mat gives a thud.
 * A creature hits harder than a land. The card is what moves; the rest are short transform/opacity pieces, so it stays light.
 */
function arrive(el: HTMLElement, b: Box, color: string, land = false) {
  const IMPACT = 0.42; // as a fraction of the fall: where the card meets the mat
  const MS = land ? 460 : 560;
  const c = center(b);
  el.animate(
    [
      { transform: "translateY(-46px) scale(2.1) rotate(-4deg)", opacity: 0, offset: 0, easing: "cubic-bezier(.55, 0, 1, .6)" }, // (accelerating: it is dropped, not carried)
      { transform: "translateY(-14px) scale(1.5) rotate(-1.5deg)", opacity: 1, offset: IMPACT * 0.75, easing: "cubic-bezier(.55, 0, 1, .6)" },
      { transform: "translateY(2px) scale(1.04, 0.93)", opacity: 1, offset: IMPACT, easing: "ease-out" }, // the hit: squashed flat
      { transform: "translateY(-3px) scale(0.985, 1.025)", opacity: 1, offset: IMPACT + 0.2, easing: "ease-in-out" }, // springs back
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    { duration: MS },
  );
  const hit = Math.round(MS * IMPACT);
  // the shadow it falls onto: it starts wide and faint, and tightens and darkens as the card comes down
  void piece(
    { left: `${b.x - b.w * 0.15}px`, top: `${b.y + b.h * 0.55}px`, width: `${b.w * 1.3}px`, height: `${b.h * 0.5}px`, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 70%)" },
    null,
    [{ transform: "scale(1.7)", opacity: 0 }, { transform: "scale(0.95)", opacity: 0.9, offset: IMPACT }, { transform: "scale(1.15)", opacity: 0 }],
    MS * 0.9,
  );
  // the landing: a hot flash under the card, a ring that rolls out along the mat, and the dust and sparks it throws up
  void piece(
    { left: `${c.x - 80}px`, top: `${c.y - 80}px`, width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,0.85) 0%, ${color} 38%, transparent 70%)` },
    null,
    [{ transform: "scale(0.3)", opacity: 0 }, { transform: "scale(0.55)", opacity: 0.9, offset: 0.25 }, { transform: "scale(1.5)", opacity: 0 }],
    420,
    hit,
  );
  // the shock wave runs along the mat: a flattened ring
  void piece(
    { left: `${c.x - b.w / 2}px`, top: `${b.y + b.h - b.h * 0.28}px`, width: `${b.w}px`, height: `${b.h * 0.56}px`, borderRadius: "50%", border: `3px solid ${color}`, boxShadow: `0 0 14px ${color}` },
    null,
    [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(0.6)", opacity: 0.95, offset: 0.001 }, { transform: `scale(${land ? 1.7 : 2.4})`, opacity: 0 }],
    520,
    hit,
  );
  ring(b, color, hit + 30, land ? 1.2 : 1.6);
  if (!land) sparkBurst({ x: c.x, y: b.y + b.h * 0.85 }, color, 8, hit, 64);
  // dust: two soft puffs thrown out to each side of the card's foot
  for (const side of [-1, 1]) {
    void piece(
      { left: `${c.x + side * b.w * 0.45 - 14}px`, top: `${b.y + b.h * 0.85}px`, width: "28px", height: "20px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(226,232,240,.75), rgba(226,232,240,0) 70%)" },
      null,
      [{ transform: "translate(0, 0) scale(0.4)", opacity: 0 }, { transform: `translate(${side * 10}px, -4px) scale(1)`, opacity: 0.8, offset: 0.3 }, { transform: `translate(${side * b.w * 0.5}px, -14px) scale(2.2)`, opacity: 0 }],
      520,
      hit,
    );
  }
  // the mat takes the blow: a short thud straight down and back (the same layer the combat shake uses)
  const mat = document.querySelector<HTMLElement>("main > section");
  if (mat) {
    const d = land ? 2.5 : 5;
    window.setTimeout(() => mat.animate([{ transform: "translateY(0)" }, { transform: `translateY(${d}px)`, offset: 0.25 }, { transform: `translateY(${-d * 0.4}px)`, offset: 0.55 }, { transform: "translateY(0)" }], { duration: 260, easing: "ease-out" }), scaled(hit));
  }
}

/** A card turns over (a Marvel hero transforming). */
function flip(el: HTMLElement) {
  el.animate([{ transform: "perspective(600px) rotateY(0deg)" }, { transform: "perspective(600px) rotateY(90deg)", offset: 0.45 }, { transform: "perspective(600px) rotateY(0deg)" }], { duration: 560, easing: "ease-in-out" });
}

/** A card that was hurt shakes. */
function shake(el: HTMLElement) {
  el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)", offset: 0.18 }, { transform: "translateX(6px)", offset: 0.4 }, { transform: "translateX(-3px)", offset: 0.65 }, { transform: "translateX(0)" }], { duration: 360, easing: "ease-out" });
}

const tintOf = (def: CardDef | undefined) => COLOR[(def?.colors ?? [])[0] ?? "C"] ?? COLOR.C;
const battlefieldOf = (s: GameState) => (["p1", "p2"] as const).flatMap((id) => s.players[id].battlefield.map((perm) => ({ perm, owner: id })));
const keywordsOf = (p: Permanent) => new Set([...(p.tempKeywords ?? []), ...(p.kwCounters ?? [])]);
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The permanent a target choice points at, as an id the page knows (a card's iid or a player). */
function aim(t: TargetChoice): string | null {
  return t.kind === "permanent" ? t.iid : t.kind === "player" ? t.id : null;
}

/**
 * Spells and abilities: a beam from where it came from to what it aims at, and a ring on the source. It plays BEFORE the new board
 * goes up (the cards it aims at are still on the page, even the ones that are about to die), and the game waits for it to arrive, so
 * the result shows when the beam lands, not after it.
 */
export async function playCasts(events: GameEvent[], after: GameState): Promise<void> {
  if (typeof document === "undefined" || document.hidden || !animationsEnabled()) return;
  const jobs: (() => void)[] = [];
  for (const e of events) {
    if (e.type !== "spellCast" && e.type !== "abilityActivated") continue;
    const owners = Object.values(after.players);
    const sourceCard = owners.flatMap((p) => [...p.battlefield.map((b) => b.card), ...p.hand, ...p.graveyard]).find((c) => c.iid === e.iid);
    const color = tintOf(sourceCard ? after.cards[sourceCard.defId] : undefined);
    const from = (e.type === "abilityActivated" ? where(e.iid) : null) ?? where(e.player);
    if (!from) continue;
    jobs.push(() => ring(from, color, 0, e.type === "abilityActivated" ? 1 : 1.4)); // the spell or ability gathers its power where it comes from
    let landed = 0;
    for (const t of e.targets ?? []) {
      const id = aim(t);
      const to = id ? where(id) : null;
      if (!to || jobs.length >= maxPieces()) continue;
      jobs.push(() => beam(from, to, color, 0));
      if (landed++ < 3) jobs.push(() => (ring(to, color, BEAM_MS * 0.8, 1.3), sparkBurst(center(to), color, 6, BEAM_MS * 0.8))); // and breaks on what it hits
    }
  }
  if (jobs.length === 0) return;
  jobs.forEach((job) => job());
  await wait(BEAM_MS * 0.85); // the result shows as the beam arrives
}

/**
 * Plays the animations for one action, once the new board is on the page. Nothing here waits: the game carries on
 * while the pieces play. `before` is the board as it was (null if there was none).
 */
export function playEffects(before: GameState | null | undefined, after: GameState, events: GameEvent[]): void {
  if (typeof document === "undefined" || document.hidden || !animationsEnabled()) return;
  const jobs: (() => void)[] = []; // drawn after all the reading is done
  const add = (job: () => void) => jobs.length < maxPieces() && jobs.push(job);
  const hadCombat = events.some((e) => e.type === "combatDamage"); // the attack animation already shows combat hits and their numbers

  // A card shuffled a library (a search, "then shuffle"): that library is riffle-shuffled on the table, as it is at the start of a match.
  for (const e of events) {
    if (e.type !== "libraryShuffled") continue;
    jobs.push(() => void shuffleOnMat(e.player));
  }

  // Blocks: each blocker is tied to the attacker it stops.
  for (const e of events) {
    if (e.type !== "blockersDeclared") continue;
    e.blocks.forEach((blk, i) => {
      const from = boxOf(cardEl(blk.blocker));
      const to = boxOf(cardEl(blk.attacker));
      if (from && to) jobs.push(() => blockLink(from, to, i * 160));
    });
  }

  // Damage and life: the numbers (combat hits are the attack animation's job).
  for (const e of events) {
    if (e.type === "damage" && !hadCombat) {
      const b = where(e.target);
      if (b) {
        add(() => floatText(b, `-${e.amount}`, BAD, 120));
        const el = isPlayer(e.target) ? null : cardEl(e.target); // (a card that died is gone: its number shows, but nothing flashes over whatever took its place)
        if (el || isPlayer(e.target)) add(() => flash(b, "rgba(239,68,68,.9)", 100));
        add(() => slash(b, BAD, 60));
        if (el) jobs.push(() => shake(el));
      }
    } else if (e.type === "lifeGained") {
      const b = boxOf(lifeEl(e.player));
      if (b) {
        add(() => floatText(b, `+${e.amount}`, GOOD, 80, 30));
        add(() => ring(b, GOOD, 40, 1.5));
        add(() => riseSparkles(b, GOOD, 5, 60));
      }
    } else if (e.type === "lifeLost" && !hadCombat && !events.some((x) => x.type === "damage")) {
      const b = boxOf(lifeEl(e.player));
      if (b) add(() => floatText(b, `-${e.amount}`, BAD, 80, 30));
    } else if (e.type === "poisoned" && !hadCombat) {
      const b = boxOf(document.querySelector<HTMLElement>(`[data-poison="${e.player}"]`) ?? lifeEl(e.player));
      if (b) add(() => floatText(b, `☠ +${e.amount}`, "#4d7c0f", 80, 30));
    } else if (e.type === "manaPaid") {
      const seen = new Map<string, number>(); // a land that made two mana shows two coins side by side
      e.made.forEach((m, i) => {
        const b = where(m.iid);
        const n = seen.get(m.iid) ?? 0;
        seen.set(m.iid, n + 1);
        if (b) add(() => manaCoin(b, m.color, i * 90, n * 18));
      });
    } else if (e.type === "countered") {
      const b = boxOf(document.querySelector("[data-resolve-zone]")) ?? { x: window.innerWidth / 2 - 40, y: window.innerHeight / 2 - 20, w: 80, h: 40 };
      add(() => floatText(b, "Countered!", "#f97316", 0, 30));
    }
  }

  // What changed on the battlefield: counters, size, keywords, equipment, turning over, new cards.
  if (before) {
    const was = new Map(battlefieldOf(before).map((x) => [x.perm.card.iid, x.perm]));
    let shown = 0;
    for (const { perm } of battlefieldOf(after)) {
      const old = was.get(perm.card.iid);
      const el = cardEl(perm.card.iid);
      if (!el) continue;
      if (!old) {
        if (shown++ < 6) {
          const box = boxOf(el);
          const color = tintOf(after.cards[perm.card.defId]);
          const land = after.cards[perm.card.defId]?.type === "land";
          jobs.push(() => (box ? arrive(el, box, color, land) : popIn(el)));
        }
        continue;
      }
      const dp = powerOf(after, perm) - powerOf(before, old);
      const dt = toughnessOf(after, perm) - toughnessOf(before, old);
      const dc = (perm.counters ?? 0) - (old.counters ?? 0);
      const oldKeys = keywordsOf(old);
      const newKeys = keywordsOf(perm);
      // Most cards did not change at all: those are not even measured (the position of a card costs a layout read).
      const changed = old.card.defId !== perm.card.defId || dp !== 0 || dt !== 0 || dc !== 0 || perm.attachedTo !== old.attachedTo || [...newKeys].some((k) => !oldKeys.has(k));
      if (!changed) continue;
      const box = boxOf(el);
      if (!box) continue;
      if (old.card.defId !== perm.card.defId) jobs.push(() => flip(el));
      if ((dp !== 0 || dt !== 0) && !hadCombat) {
        const good = dp + dt >= 0;
        add(() => floatText(box, `${sign(dp)}/${sign(dt)}`, good ? GOOD : BAD, 200, 22, -16));
        add(() => ring(box, good ? GOOD : BAD, 150));
      } else if (dc !== 0) {
        add(() => floatText(box, `${sign(dc)}/${sign(dc)}`, dc > 0 ? GOOD : BAD, 200, 22, -16));
        if (dc > 0) add(() => riseSparkles(box, GOOD, 4, 120));
      }
      if ((dp !== 0 || dt !== 0) && !hadCombat && dp + dt >= 0) add(() => riseSparkles(box, GOOD, 4, 180));
      let k = 0;
      for (const kwd of newKeys) {
        if (oldKeys.has(kwd)) continue;
        const delay = 300 + k++ * 140;
        const dy = 14 + (k - 1) * 20; // below the size change, and each word below the one before
        add(() => floatText(box, kwd[0].toUpperCase() + kwd.slice(1), KEYWORD, delay, 17, dy));
      }
      if (perm.attachedTo !== old.attachedTo && perm.attachedTo) add(() => ring(box, "#fbbf24", 100, 1.2));
    }
  }

  if (jobs.length === 0) return;
  // one frame later: the new board has been laid out, and the page is not busy with this action's own work
  requestAnimationFrame(() => jobs.forEach((job) => job()));
}

/**
 * Before the new board goes up: cards that are leaving without dying (exiled, sent back to a hand or a library) fade and shrink
 * away from where they stood. (Cards that die fly to the graveyard, see playToGraveyard.) Short, and the only part that waits.
 */
export async function playLeaving(before: GameState | null | undefined, after: GameState, events: GameEvent[]): Promise<void> {
  if (!before || typeof document === "undefined" || document.hidden || !animationsEnabled()) return;
  const stays = new Set(battlefieldOf(after).map((x) => x.perm.card.iid));
  // Where cards stood, kept for the ones that are about to leave the page (an effect aimed at a creature that died still needs to know where it was).
  // Only those are measured: reading the position of every card on the page after every move cost a layout read per card, many times a second.
  const kept = new Set([...stays, ...Object.values(after.players).flatMap((p) => p.hand.map((c) => c.iid))]);
  snap = new Map(
    Array.from(document.querySelectorAll<HTMLElement>("[data-card-iid]"))
      .filter((el) => !kept.has(el.dataset.cardIid ?? ""))
      .map((el) => [el.dataset.cardIid ?? "", boxOf(el)] as const)
      .filter((x): x is [string, Box] => !!x[0] && !!x[1]),
  );
  const died = new Set(events.flatMap((e) => (e.type === "creatureDied" ? [e.iid] : e.type === "cardsDiscarded" ? e.iids : [])));
  const leaving = battlefieldOf(before).filter(({ perm }) => !stays.has(perm.card.iid) && !died.has(perm.card.iid));
  if (leaving.length === 0 || leaving.length > 8) return;
  const ghosts: { box: Box; node: HTMLElement; up: boolean; exiled: boolean }[] = [];
  for (const { perm } of leaving) {
    const el = cardEl(perm.card.iid);
    const box = boxOf(el);
    if (!el || !box) continue;
    const inHand = Object.values(after.players).some((p) => p.hand.some((c) => c.iid === perm.card.iid));
    const node = el.cloneNode(true) as HTMLElement;
    node.removeAttribute("data-card-iid");
    el.style.visibility = "hidden"; // the ghost takes its place, so it is the ghost that fades
    const exiled = Object.values(after.players).some((p) => p.exile.some((c) => c.iid === perm.card.iid));
    ghosts.push({ box, node, up: inHand, exiled });
  }
  const run = ghosts.map(({ box, node, up, exiled }) => {
    Object.assign(node.style, { position: "absolute", left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, margin: "0", willChange: "transform, opacity", pointerEvents: "none" });
    layer().appendChild(node);
    alive++;
    return node
      .animate(
        exiled
          ? // exile is not death: the card glows pale violet and rises out of the game, nothing falls
            [
              { transform: "translateY(0) scale(1)", opacity: 1, filter: "brightness(1)" },
              { transform: "translateY(-8px) scale(1.06)", opacity: 1, filter: "brightness(1.7) drop-shadow(0 0 16px #c4b5fd)", offset: 0.4 },
              { transform: "translateY(-34px) scale(1.14)", opacity: 0, filter: "brightness(2.4) drop-shadow(0 0 22px #ddd6fe)" },
            ]
          : [{ transform: "translateY(0) scale(1)", opacity: 1 }, { transform: up ? "translateY(-40px) scale(0.9)" : "translateY(-10px) scale(0.75) rotate(4deg)", opacity: 0 }],
        { duration: exiled ? 560 : 360, easing: "ease-in", fill: "both" },
      )
      .finished.catch(() => undefined)
      .then(() => {
        node.remove();
        alive--;
      });
  });
  await Promise.race([Promise.all(run), wait(ghosts.some((g) => g.exiled) ? 620 : 420)]);
}

export type { PlayerId };
