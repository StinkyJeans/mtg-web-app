import { scaled } from "@/lib/motion";

/**
 * A finisher that is a video shot on a green screen (public/finisher-animation/dragon-breath): it is played silently (the video's own sound is never
 * heard), drawn through a small WebGL shader that turns the green into transparency (and takes the green fringe off the edges of the flames), and
 * laid over the page. The shader runs on the graphics chip, so a 1264x720 video costs about the same as the video itself.
 */
export const DRAGON_VIDEO = "/finisher-animation/dragon-breath/dragon%20breath%20fire.mp4";
/** The picture is 1264 x 720; the dragon's head is at the bottom middle, the flame goes up and bursts at the top (about 40% down). */
export const VIDEO_ASPECT = 1264 / 720;

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
  attribute vec2 p;
  varying vec2 uv;
  void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

// The green screen is taken out by un-mixing it. A pixel that is partly flame and partly green screen is "flame + some green"; how much green
// shows in how much it is greener than it is red or blue (flames are never greener than red). That share is the pixel's transparency, and
// taking the green out of what is left gives the flame's own colour back, so thin smoke and the fine sparks keep their colour at the edges.
const FRAG = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D tex;
  void main() {
    vec3 c = texture2D(tex, uv).rgb;
    float spill = c.g - max(c.r, c.b);
    float m = clamp((spill + 0.03) * 1.3, 0.0, 1.0);
    float a = 1.0 - m;
    if (a < 0.02) { gl_FragColor = vec4(0.0); return; }
    vec3 fg = clamp((c - vec3(0.0, m, 0.0)) / max(a, 0.05), 0.0, 1.0);
    fg.g = min(fg.g, max(fg.r, fg.b) * 0.97); // (a flame is never greener than it is red)
    gl_FragColor = vec4(fg * a, a);
  }`;

export interface VideoPlay {
  /** Where the picture goes on the page (its size is the video's shape stretched to `height`; `top` is of the top edge when not flipped). */
  left: number;
  top: number;
  height: number;
  /** The picture upside down: the dragon is at the top of the screen and breathes downwards. */
  flip: boolean;
  /** Called with the seconds played so far, every frame. */
  onTime?: (seconds: number) => void;
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
    const w = video.videoWidth || 1264;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const height = o.height;
    const width = height * (w / h);
    Object.assign(canvas.style, {
      position: "absolute",
      left: `${o.left - width / 2}px`,
      top: `${o.top}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
      zIndex: "5",
      transform: o.flip ? "scaleY(-1)" : "none",
      willChange: "opacity",
      opacity: "0",
    });
    // the picture is cut off at its edges (the burst is bigger than the frame): the edges fade out, so no straight line shows
    const feather = "linear-gradient(to bottom, transparent 0%, #000 16%, #000 88%, transparent 100%), linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)";
    canvas.style.setProperty("-webkit-mask-image", feather);
    canvas.style.setProperty("mask-image", feather);
    canvas.style.setProperty("-webkit-mask-composite", "source-in");
    canvas.style.setProperty("mask-composite", "intersect");
    root.appendChild(canvas);

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);

    const draw = () => {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    video.currentTime = 0;
    video.muted = true;
    video.playbackRate = (1000 / scaled(1000)) * 0.9; // (the speed setting; a touch slower, so that the burst is less violent)
    await video.play();
    const fade = (to: number, ms: number) => canvas.animate([{ opacity: getComputedStyle(canvas).opacity }, { opacity: to }], { duration: ms, fill: "forwards" });
    fade(0.92, 220);
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
        draw();
        o.onTime?.(video.currentTime);
        if (!fadingOut && video.duration - video.currentTime < 0.35) {
          fadingOut = true;
          fade(0, 300);
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
  }
}
