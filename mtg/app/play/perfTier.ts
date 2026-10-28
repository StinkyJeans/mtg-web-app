// How much the effects may cost. The same effects are drawn on every computer; on one that is short of memory or has a small integrated graphics chip
// (a laptop with 4 GB and "Intel UHD Graphics", say) the cheaper way of drawing each one is used: the same look, with the heaviest parts
// (big blurred glows, filters, full-screen blurs) swapped for flat ones, and fewer sparks.
//
// It is decided once, from what the browser says about the computer. It can be forced from the console: localStorage["mtg-perf"] = "lite" or "full".
// And it learns: if an attack drops many frames, the computer is marked as light from then on (`strain`).

const KEY = "mtg-perf";
const LEARNED = "mtg-perf-learned";
let lite: boolean | undefined;

function weakComputer(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.deviceMemory ?? 8) <= 4) return true;
    if ((nav.hardwareConcurrency ?? 8) <= 4) return true;
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return /\b(UHD|HD Graphics|GMA)\b/i.test(renderer);
  } catch {
    return false;
  }
}

/** True on a computer that should get the cheaper way of drawing effects. */
export function liteMode(): boolean {
  if (typeof window === "undefined") return false;
  if (lite !== undefined) return lite;
  try {
    const forced = localStorage.getItem(KEY);
    if (forced === "lite" || forced === "full") return (lite = forced === "lite");
    if (localStorage.getItem(LEARNED) === "1") return (lite = true);
  } catch {
    // (no storage: decided from the computer alone)
  }
  return (lite = weakComputer());
}

/** An attack dropped many frames: from now on this computer gets the cheaper effects, here and on its next visits. */
export function strain() {
  if (liteMode()) return;
  lite = true;
  try {
    if (localStorage.getItem(KEY) !== "full") localStorage.setItem(LEARNED, "1");
  } catch {
    // (it stays light for this visit)
  }
  document.documentElement.classList.add("perf-lite");
}

/** The page's own styles (the result screen) follow the same decision. */
export function applyPerfClass() {
  document.documentElement.classList.toggle("perf-lite", liteMode());
}
