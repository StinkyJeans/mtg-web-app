import { scaled } from "@/lib/motion";
import { liteMode } from "./perfTier";

/**
 * A finisher that is a video shot on a green screen (public/finisher-animation/dragon-breath). It is played silently (its sound is never heard) and
 * every frame of it is redrawn by us through a small WebGL shader that
 *   - turns the green into transparency (and takes the green fringe off the flames), and
 *   - cuts the frame into pieces (the dragon, the beam, the burst) that are each placed, sized and faded on their own.
 * That is what lets the finisher be laid out to fit the battlefield instead of being a rectangle of video: the dragon's head can be at one place, the
 * burst at another, and the beam stretched between them. The shader runs on the graphics chip.
 */
export const DRAGON_VIDEO = "/finisher-animation/dragon-breath/dragon%20breath%20fire.mp4";
/** The video is 1264 x 720. */
export const VIDEO_W = 1264;
export const VIDEO_H = 720;

/** One piece of the frame, put somewhere on the page. Coordinates are CSS pixels of the window; `src` is a part of the frame in 0..1 (u0, v0, u1, v1). */
export interface Layer {
  src: [number, number, number, number];
  /** Where it goes: the left edge, the top edge, the width and the height. */
  dest: [number, number, number, number];
  /** The piece upside down (a finisher played from the top of the screen). */
  flipY?: boolean;
  /** The width at its top edge and at its bottom edge, if they differ (a beam that widens): defaults to `dest`'s width. */
  widths?: [number, number];
  /** How much of each edge (a part of the piece's size) fades out: top, bottom, left, right, as seen on the screen. */
  feather?: [number, number, number, number];
  /** 0..1, for fading a piece in or out. */
  alpha?: number;
  /** The width, as a part of the piece, of a column down its middle (a beam) that its top and bottom feathering does not touch, so the beam runs on through a join. */
  keepCenter?: number;
  /** Drawn from a still picture of an early frame (taken about a quarter of a second in) instead of the playing video: the dragon's head does not need to move, and the later frames have wide flames around it. */
  still?: boolean;
}

let warm: HTMLVideoElement | null = null;

function makeVideo(src: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true; // (the sound of the file is not wanted)
  v.defaultMuted = true;
  v.volume = 0;
  v.playsInline = true;
  v.preload = "auto";
  v.setAttribute("muted", "");
  v.src = src;
  return v;
}

/** Starts loading the video, so that it plays at once later (the same element is used when it is played). */
export function warmVideo(src = DRAGON_VIDEO): void {
  if (typeof document === "undefined" || warm) return;
  warm = makeVideo(src);
  warm.load();
}

const VERT = `
  attribute vec2 c;
  uniform vec4 dest;       // left, top, width, height (CSS pixels)
  uniform vec2 widths;     // width at the top edge, at the bottom edge
  uniform vec2 view;       // the window's size
  uniform vec4 src;        // u0, v0, u1, v1
  uniform float flipY;
  varying vec2 uv;
  varying vec2 q;
  void main() {
    float w = mix(widths.x, widths.y, c.y);
    vec2 p = vec2(dest.x + dest.z * 0.5 + (c.x - 0.5) * w, dest.y + c.y * dest.w);
    gl_Position = vec4(p.x / view.x * 2.0 - 1.0, 1.0 - p.y / view.y * 2.0, 0.0, 1.0);
    vec2 cc = vec2(c.x, flipY > 0.5 ? 1.0 - c.y : c.y);
    uv = mix(src.xy, src.zw, cc);
    q = c;
  }`;

// The green screen is taken out by un-mixing it. A pixel that is partly flame and partly green screen is "flame + some green"; how much green
// shows in how much it is greener than it is red or blue (flames are never greener than red). That share is the pixel's transparency, and
// taking the green out of what is left gives the flame's own colour back, so thin smoke and the fine sparks keep their colour at the edges.
const FRAG = `
  precision mediump float;
  varying vec2 uv;
  varying vec2 q;
  uniform sampler2D tex;
  uniform vec4 feather;   // top, bottom, left, right
  uniform float alpha;
  uniform float keep;     // the width of the middle column the top and bottom feather leaves alone
  float soft(float x, float f) { return f <= 0.0 ? 1.0 : smoothstep(0.0, f, x); }
  void main() {
    vec3 c = texture2D(tex, uv).rgb;
    float spill = c.g - max(c.r, c.b);
    float m = clamp((spill + 0.03) * 1.3, 0.0, 1.0);
    float a = 1.0 - m;
    if (a < 0.02) { gl_FragColor = vec4(0.0); return; }
    vec3 fg = clamp((c - vec3(0.0, m, 0.0)) / max(a, 0.05), 0.0, 1.0);
    fg.g = min(fg.g, max(fg.r, fg.b) * 0.97); // (a flame is never greener than it is red)
    float vert = soft(q.y, feather.x) * soft(1.0 - q.y, feather.y);
    vert = mix(vert, 1.0, keep > 0.0 ? 1.0 - smoothstep(keep * 0.5, keep, abs(q.x - 0.5)) : 0.0);
    a *= vert * soft(q.x, feather.z) * soft(1.0 - q.x, feather.w) * alpha;
    gl_FragColor = vec4(fg * a, a);
  }`;

export interface VideoPlay {
  /** The pieces of the frame, as they should be drawn `seconds` into the video (it is asked for every frame, so things can grow and fade). */
  layers: (seconds: number) => Layer[];
  /** Called with the seconds played so far, every frame. */
  onTime?: (seconds: number) => void;
  /** Called once the picture is on screen, with a function that shakes it (pixels, milliseconds): cheap, because only the picture moves. */
  onReady?: (shake: (px: number, ms: number) => void) => void;
  /** The whole picture's fade-out, in seconds before the end of the video (default 1). */
  fadeOut?: number;
}

/** Plays the video over the page, silently and with its green made transparent. Rejects if it cannot be played (the caller then draws something else). */
export async function playGreenVideo(root: HTMLElement, o: VideoPlay): Promise<void> {
  const video = warm ?? makeVideo(DRAGON_VIDEO);
  warm = null; // (a finished video is not played twice: the next one is made new)
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) throw new Error("no WebGL");
  try {
    await new Promise<void>((resolve, reject) => {
      const give = window.setTimeout(() => reject(new Error("the video did not load in time")), 9000);
      const ok = () => (window.clearTimeout(give), resolve());
      if (video.readyState >= 3) return ok();
      video.addEventListener("canplay", ok, { once: true });
      video.addEventListener("error", () => (window.clearTimeout(give), reject(new Error("the video could not be loaded"))), { once: true });
      video.load();
    });
    // The canvas covers only where the pieces go (they are all over the battlefield but the picture is much smaller than the window), so there is
    // less to draw and, above all, less for the browser to put together on every frame.
    const reach = [0.3, 1, 2, 4, 6].flatMap((t) => o.layers(t));
    const pad = 12;
    const x0 = Math.max(0, Math.floor(Math.min(...reach.map((l) => l.dest[0] + l.dest[2] / 2 - Math.max(l.dest[2], ...(l.widths ?? [0])) / 2)) - pad));
    const y0 = Math.max(0, Math.floor(Math.min(...reach.map((l) => l.dest[1])) - pad));
    const x1 = Math.min(window.innerWidth, Math.ceil(Math.max(...reach.map((l) => l.dest[0] + l.dest[2] / 2 + Math.max(l.dest[2], ...(l.widths ?? [0])) / 2)) + pad));
    const y1 = Math.min(window.innerHeight, Math.ceil(Math.max(...reach.map((l) => l.dest[1] + l.dest[3])) + pad));
    const vw = Math.max(16, x1 - x0);
    const vh = Math.max(16, y1 - y0);
    const ratio = liteMode() ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(vw * ratio);
    canvas.height = Math.round(vh * ratio);
    Object.assign(canvas.style, { position: "absolute", left: `${x0}px`, top: `${y0}px`, width: `${vw}px`, height: `${vh}px`, pointerEvents: "none", zIndex: "5", willChange: "opacity, transform", opacity: "0" });
    root.appendChild(canvas);
    o.onReady?.((px, ms) => {
      const k: Keyframe[] = [];
      for (let i = 0; i <= 10; i++) k.push({ transform: `translate(${((i % 2 ? 1 : -1) * px * (1 - i / 10)).toFixed(1)}px, ${((i % 3 ? 1 : -1) * px * 0.6 * (1 - i / 10)).toFixed(1)}px)` });
      canvas.animate(k, { duration: ms, easing: "linear" });
    });

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "c");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { dest: u("dest"), widths: u("widths"), view: u("view"), src: u("src"), flipY: u("flipY"), feather: u("feather"), alpha: u("alpha"), keep: u("keep") };
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const snap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, snap);
    for (const [k, val] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]] as const) gl.texParameteri(gl.TEXTURE_2D, k, val);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    let snapped = false;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // (the shader gives colours already multiplied by their transparency)
    gl.uniform2f(U.view, vw, vh);

    const draw = (layers: Layer[]) => {
      if (!snapped && video.currentTime >= 0.25) {
        gl.bindTexture(gl.TEXTURE_2D, snap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        snapped = true;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const l of layers) {
        if ((l.alpha ?? 1) <= 0.003) continue;
        gl.bindTexture(gl.TEXTURE_2D, l.still && snapped ? snap : tex);
        gl.uniform4f(U.src, ...l.src);
        gl.uniform4f(U.dest, l.dest[0] - x0, l.dest[1] - y0, l.dest[2], l.dest[3]);
        const w = l.widths ?? [l.dest[2], l.dest[2]];
        gl.uniform2f(U.widths, w[0], w[1]);
        gl.uniform1f(U.flipY, l.flipY ? 1 : 0);
        const f = l.feather ?? [0, 0, 0, 0];
        gl.uniform4f(U.feather, f[0], f[1], f[2], f[3]);
        gl.uniform1f(U.alpha, l.alpha ?? 1);
        gl.uniform1f(U.keep, l.keepCenter ?? 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };

    video.currentTime = 0;
    video.muted = true;
    video.playbackRate = (1000 / scaled(1000)) * 0.9; // (the speed setting; a touch slower, so that the burst is less violent)
    await video.play();
    const fade = (to: number, ms: number) => canvas.animate([{ opacity: getComputedStyle(canvas).opacity }, { opacity: to }], { duration: ms, fill: "forwards" });
    fade(1, 200);
    const fadeAt = o.fadeOut ?? 1;
    await new Promise<void>((resolve) => {
      let finished = false;
      let fadingOut = false;
      const end = () => {
        if (finished) return;
        finished = true;
        resolve();
      };
      video.addEventListener("ended", end, { once: true });
      const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback?.bind(video);
      const frame = () => {
        if (finished) return;
        const t = video.currentTime;
        draw(o.layers(t));
        o.onTime?.(t);
        if (!fadingOut && video.duration - t < fadeAt) {
          fadingOut = true;
          fade(0, fadeAt * 900);
        }
        if (rvfc) rvfc(frame);
        else requestAnimationFrame(frame);
      };
      frame();
      window.setTimeout(end, (video.duration * 1000) / video.playbackRate + 3000); // (never stuck)
    });
  } finally {
    video.pause();
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    window.setTimeout(() => warmVideo(), 1500); // (a rematch can end the same way: the next one is already loading)
  }
}
