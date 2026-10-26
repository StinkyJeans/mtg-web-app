import { playerToAct } from "@mtg/engine";
import type { CardDef, GameState, PlayerId } from "@mtg/engine";
import { animationsEnabled } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cardDetailImageUrl, cardImageUrl } from "@/lib/cards";
import { sleeveOf } from "@/lib/playmat";

// Cards flying between the board and the piles. Like combatFx it works on the page itself, using markers:
//   data-card-iid="..."      on every card in hand or on the battlefield
//   data-pile="library-p1"   on each pile ("library" or "graveyard", then the owner)

let busy = false;
/** True while a card is flying, so the game can ignore clicks until it has landed. */
export const isPileBusy = () => busy;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const cardEl = (iid: string) => document.querySelector<HTMLElement>(`[data-card-iid="${iid}"]`);
const pileEl = (kind: "library" | "graveyard", owner: PlayerId) => document.querySelector<HTMLElement>(`[data-pile="${kind}-${owner}"]`);
const ownerOf = (iid: string) => iid.split("-")[0] as PlayerId; // instance ids look like "p1-12"
const centerOf = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** The pile gives a little bump when a card lands on it. */
function bump(pile: HTMLElement) {
  pile.animate([{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
}

async function flyToGraveyard(el: HTMLElement, pile: HTMLElement, delay: number) {
  const from = el.getBoundingClientRect();
  const to = pile.getBoundingClientRect();
  const ghost = el.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("data-card-iid");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "70",
    pointerEvents: "none",
    transition: "none",
  });
  document.body.appendChild(ghost);
  el.style.visibility = "hidden";
  const a = centerOf(from);
  const b = centerOf(to);
  const scale = Math.min(to.width / from.width, to.height / from.height) * 0.75;
  await wait(delay);
  await ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${(b.x - a.x) * 0.12}px, ${(b.y - a.y) * 0.12 - 28}px) scale(1.08) rotate(-5deg)`, opacity: 1, offset: 0.22 },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${scale}) rotate(14deg)`, opacity: 0.85 },
    ],
    { duration: 720, easing: "cubic-bezier(.45,0,.75,.45)" },
  ).finished;
  ghost.remove();
  bump(pile);
}

/** Cards that were destroyed or discarded fly to their owner's graveyard. Call it BEFORE the state changes. */
export async function playToGraveyard(iids: string[]): Promise<void> {
  if (!animationsEnabled() || iids.length === 0) return;
  busy = true;
  try {
    const flights = iids.flatMap((iid, i) => {
      const el = cardEl(iid);
      const pile = pileEl("graveyard", ownerOf(iid));
      return el && pile ? [flyToGraveyard(el, pile, i * 150)] : [];
    });
    await Promise.all(flights);
  } finally {
    busy = false;
  }
}

export interface Draw {
  iid: string;
  owner: PlayerId;
  /** True when the player looking at the screen is the one drawing: the card is shown, then goes to their hand. */
  faceUp: boolean;
  def: CardDef;
}

/** Hides the freshly drawn cards in the hand until their animation lands. Call it right after the state changes. */
export function hideDrawn(draws: Draw[]): void {
  if (!animationsEnabled()) return;
  for (const d of draws) {
    const el = cardEl(d.iid);
    if (el) el.style.visibility = "hidden";
  }
}

const W = 120;
const H = 168;

function ghostCard(def: CardDef, owner: PlayerId): { outer: HTMLElement; flipper: HTMLElement } {
  const outer = document.createElement("div");
  Object.assign(outer.style, { position: "fixed", width: `${W}px`, height: `${H}px`, zIndex: "70", pointerEvents: "none", perspective: "900px" });
  const flipper = document.createElement("div");
  Object.assign(flipper.style, { position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" });
  const face = (css: Partial<CSSStyleDeclaration>) => {
    const f = document.createElement("div");
    Object.assign(f.style, { position: "absolute", inset: "0", borderRadius: "8px", border: "1px solid #52525b", backfaceVisibility: "hidden", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }, css);
    return f;
  };
  const sleeve = sleeveOf(owner);
  const back = face({ background: sleeve.css });
  const inner = document.createElement("div");
  Object.assign(inner.style, { position: "absolute", inset: "6px", borderRadius: "4px", border: `1px solid ${sleeve.edge}` });
  back.appendChild(inner);
  const front = face({ transform: "rotateY(180deg)", background: "#27272a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontWeight: "600", fontSize: "13px", padding: "8px" });
  if (def.image) Object.assign(front.style, { backgroundImage: `url(${cardImageUrl(def.image)})`, backgroundSize: "cover", backgroundPosition: "center" });
  else front.textContent = def.name;
  flipper.append(back, front);
  outer.appendChild(flipper);
  return { outer, flipper };
}

/**
 * Holds the revealed card in the middle. Clicking the card shows it big (or back to normal); clicking anywhere
 * else, or pressing Escape, ends the wait. The card's last position is written to `outer.style.transform`.
 */
function waitForPlayer(outer: HTMLElement, middle: { x: number; y: number }, from: { x: number; y: number }, def: CardDef): Promise<void> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    Object.assign(backdrop.style, { position: "fixed", inset: "0", zIndex: "69", background: "rgba(0,0,0,.45)", cursor: "pointer" });
    const hint = document.createElement("div");
    hint.textContent = "Click the card to see it big. Click anywhere else to put it in your hand.";
    Object.assign(hint.style, { position: "fixed", left: "0", right: "0", bottom: "24px", textAlign: "center", color: "#fff", fontSize: "14px", textShadow: "0 1px 4px #000" });
    backdrop.appendChild(hint);
    document.body.appendChild(backdrop);

    const at = (scale: number) => `translate(${middle.x - from.x}px, ${middle.y - from.y}px) scale(${scale})`;
    let big = false;
    const front = outer.firstElementChild?.children[1] as HTMLElement | undefined;
    const large = cardDetailImageUrl(def, "large");
    const close = document.createElement("div");
    close.textContent = "×";
    Object.assign(close.style, { position: "fixed", display: "none", width: "30px", height: "30px", borderRadius: "50%", background: "#fff", color: "#18181b", fontSize: "22px", lineHeight: "28px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.5)", zIndex: "72", cursor: "pointer" });
    backdrop.appendChild(close);
    outer.style.transform = at(1.7);
    outer.getAnimations().forEach((a) => a.cancel()); // the fly-in is held in place by "forwards": the style takes over
    outer.style.pointerEvents = "auto";
    outer.style.cursor = "zoom-in";
    outer.style.zIndex = "71";

    const toggle = (e: Event) => {
      e.stopPropagation();
      big = !big;
      const scale = big ? (window.innerHeight * 0.88) / H : 1.7; // as tall as the card popup elsewhere in the game
      close.style.display = big ? "block" : "none";
      close.style.left = `${middle.x + (W * scale) / 2 - 16}px`;
      close.style.top = `${middle.y - (H * scale) / 2 - 14}px`;
      // The small stored art would look blurry this large: switch to the high-resolution picture.
      if (big && front && large) front.style.backgroundImage = `url(${large})`;
      outer.style.cursor = big ? "zoom-out" : "zoom-in";
      outer.animate([{ transform: outer.style.transform }, { transform: at(scale) }], { duration: 220, easing: "ease-out" });
      outer.style.transform = at(scale);
    };
    const done = () => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      outer.style.pointerEvents = "none";
      outer.style.cursor = "";
      resolve();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && done();
    document.addEventListener("keydown", onKey);
    outer.addEventListener("click", toggle);
    backdrop.addEventListener("click", done);
  });
}

async function flyDraw(d: Draw, delay: number) {
  const library = pileEl("library", d.owner);
  const slot = cardEl(d.iid);
  if (!library) return;
  await wait(delay);
  // The other player's draw (or a card with nowhere to land) is not shown at all: nothing flies across the board,
  // their library just gives a little bump.
  if (!d.faceUp || !slot) {
    bump(library);
    return;
  }
  const from = centerOf(library.getBoundingClientRect());
  const middle = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const { outer, flipper } = ghostCard(d.def, d.owner);
  Object.assign(outer.style, { left: `${from.x - W / 2}px`, top: `${from.y - H / 2}px` });
  document.body.appendChild(outer);
  const startScale = 0.55;
  try {
    // 1. the card leaves the top of the library and comes to the middle of the screen
    await outer.animate(
      [
        { transform: `translate(0, 0) scale(${startScale})` },
        { transform: `translate(${middle.x - from.x}px, ${middle.y - from.y}px) scale(1.7)` },
      ],
      { duration: 520, easing: "ease-out", fill: "forwards" },
    ).finished;

    // 2. it turns over and shows itself
    await flipper.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], { duration: 480, easing: "ease-in-out", fill: "forwards" }).finished;

    // 3. it stays there until the player has seen it: click the card to see it big, click anywhere else to take it
    await waitForPlayer(outer, middle, from, d.def);

    // 4. and goes into the hand
    const rect = slot.getBoundingClientRect();
    const to = centerOf(rect);
    await outer.animate(
      [
        { transform: outer.style.transform || `translate(${middle.x - from.x}px, ${middle.y - from.y}px) scale(1.7)` },
        { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${rect.width / W})` },
      ],
      { duration: 480, easing: "ease-in-out", fill: "forwards" },
    ).finished;
  } finally {
    outer.remove();
    if (slot) slot.style.visibility = "";
  }
}

/** The drawn cards fly out of the library, are revealed in the middle, then land in the hand. */
export async function playDraws(draws: Draw[]): Promise<void> {
  if (!animationsEnabled() || draws.length === 0) return;
  busy = true;
  try {
    for (const d of draws) await flyDraw(d, 0);
  } finally {
    busy = false;
    for (const d of draws) {
      const el = cardEl(d.iid);
      if (el) el.style.visibility = "";
    }
  }
}

async function dealOne(d: Draw, delay: number) {
  const library = pileEl("library", d.owner);
  const slot = cardEl(d.iid);
  await wait(delay);
  if (!library || !slot) {
    if (slot) slot.style.visibility = "";
    return;
  }
  const from = centerOf(library.getBoundingClientRect());
  const rect = slot.getBoundingClientRect();
  const to = centerOf(rect);
  const { outer, flipper } = ghostCard(d.def, d.owner);
  Object.assign(outer.style, { left: `${from.x - W / 2}px`, top: `${from.y - H / 2}px` });
  document.body.appendChild(outer);
  try {
    const duration = 650;
    // The card turns face up while it flies, so it lands showing itself.
    flipper.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], { duration, easing: "ease-in-out", fill: "forwards" });
    await outer.animate(
      [
        { transform: `translate(0, 0) scale(${0.5})` },
        { transform: `translate(${(to.x - from.x) * 0.5}px, ${(to.y - from.y) * 0.5 - 70}px) scale(0.95)`, offset: 0.55 },
        { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${rect.width / W})` },
      ],
      { duration, easing: "ease-in-out", fill: "forwards" },
    ).finished;
  } finally {
    outer.remove();
    slot.style.visibility = "";
  }
}

/** The opening hand (or a mulligan's new one): the cards are dealt from the library straight into the hand, one after another. */
export async function playDeal(draws: Draw[]): Promise<void> {
  if (draws.length === 0) return;
  playSound("shuffle");
  if (!animationsEnabled()) return;
  draws.forEach((_, i) => playSound("draw", 0.35 + i * 0.11));
  busy = true;
  try {
    await Promise.all(draws.map((d, i) => dealOne(d, i * 110)));
  } finally {
    busy = false;
    for (const d of draws) {
      const el = cardEl(d.iid);
      if (el) el.style.visibility = "";
    }
  }
}

/** The hand of the player looking at the screen (`seat`, or in hot-seat the player to act), as cards to animate. */
export function handDraws(s: GameState, seat: PlayerId | null): Draw[] {
  const viewer = seat ?? playerToAct(s);
  return s.players[viewer].hand.map((c) => ({ iid: c.iid, owner: viewer, faceUp: true, def: s.cards[c.defId] }));
}
