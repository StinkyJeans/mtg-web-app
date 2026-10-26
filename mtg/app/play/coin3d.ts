import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// A real 3D coin, drawn with three.js. No modelling software: the coin is a cylinder, and the
// faces and ridged edge are painted onto textures in code.

export type Side = "heads" | "tails";

const THICKNESS = 0.16;
const REST_Y = THICKNESS / 2; // height of the coin's centre when it lies flat on the ground
const FLIGHT_S = 1.9; // time in the air
const PEAK = 2.25; // how high it goes
const SPINS = 5; // full end-over-end turns during the toss
const IDLE_TILT = 0.55; // how far the face is tilted toward the camera while waiting
const SETTLE_S = 0.9; // bounces and rocking after landing
const BOUNCES = [
  { start: 0, length: 0.32, height: 0.42 },
  { start: 0.32, length: 0.2, height: 0.12 },
];

/** Where the coin is at a moment in time, as a pure function so it can be checked without drawing. */
export interface CoinPose {
  y: number;
  rx: number; // spin end over end
  ry: number; // wobble
  rz: number; // wobble
}

export type FlightStart = CoinPose;

/** Pose `t` seconds after the toss begins. Lands on heads (a whole number of turns) or tails (a half turn more). */
export function coinPose(t: number, result: Side, from: FlightStart): CoinPose & { done: boolean } {
  const total = Math.PI * 2 * SPINS + (result === "tails" ? Math.PI : 0);

  if (t < FLIGHT_S) {
    const s = t / FLIGHT_S;
    const fade = 1 - s;
    return {
      // Parabola: up and back down, starting from wherever the coin was hovering.
      y: REST_Y + (from.y - REST_Y) * fade + 4 * PEAK * s * (1 - s),
      // Constant spin, like a real coin; wobble dies away exactly as it lands.
      rx: total * s + from.rx * fade,
      ry: from.ry * fade + 0.14 * Math.sin(Math.PI * 2 * 1.1 * s) * fade,
      rz: from.rz * fade + 0.24 * Math.sin(Math.PI * 2 * 1.7 * s) * fade,
      done: false,
    };
  }

  // After landing: two small bounces while the coin rocks and comes to rest.
  const tau = t - FLIGHT_S;
  let y = REST_Y;
  for (const b of BOUNCES) {
    if (tau >= b.start && tau < b.start + b.length) {
      const u = (tau - b.start) / b.length;
      y = REST_Y + b.height * 4 * u * (1 - u);
    }
  }
  const rock = 0.3 * Math.exp(-6 * tau) * Math.sin(Math.PI * 2 * 3.2 * tau);
  return { y, rx: total + rock, ry: 0, rz: 0, done: tau >= SETTLE_S };
}

// ───────── textures ─────────

/** The outline of the five-flame emblem, centred on (cx, cy) and `h` tall: five spikes over a rounded point. Fill or stroke it afterwards. */
function flameEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number): void {
  const s = h / 2;
  const at = (x: number, y: number): [number, number] => [cx + x * s, cy + y * s];
  const move = (x: number, y: number) => ctx.moveTo(...at(x, y));
  const quad = (x1: number, y1: number, x: number, y: number) => ctx.quadraticCurveTo(...at(x1, y1), ...at(x, y));
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => ctx.bezierCurveTo(...at(x1, y1), ...at(x2, y2), ...at(x, y));
  ctx.beginPath();
  move(0, -1);
  quad(0.05, -0.45, 0.17, 0.16);
  quad(0.2, -0.42, 0.4, -0.8);
  quad(0.38, -0.2, 0.57, 0.26);
  quad(0.62, 0.0, 0.8, -0.5);
  cubic(0.95, 0.12, 0.55, 0.8, 0, 1);
  cubic(-0.55, 0.8, -0.95, 0.12, -0.8, -0.5);
  quad(-0.62, 0.0, -0.57, 0.26);
  quad(-0.38, -0.2, -0.4, -0.8);
  quad(-0.2, -0.42, -0.17, 0.16);
  quad(-0.05, -0.45, 0, -1);
  ctx.closePath();
}

/** One face of the coin. `relief` draws a grey-scale height map instead of colour, for the raised design. */
function drawFace(side: Side, relief: boolean, rotation: number): HTMLCanvasElement {
  const size = 512;
  const c = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const base = relief ? "#808080" : "#d9a520";
  const raised = relief ? "#ffffff" : "#f6d97a";

  if (relief) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
  } else {
    const g = ctx.createRadialGradient(c - 60, c - 60, 20, c, c, c);
    g.addColorStop(0, "#f7de86");
    g.addColorStop(0.55, "#dca824");
    g.addColorStop(1, "#a9771a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.translate(c, c);
  ctx.rotate(rotation);
  ctx.translate(-c, -c);

  // Raised rim and a ring of beads.
  ctx.strokeStyle = raised;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(c, c, 236, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 196, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = raised;
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * 216, c + Math.sin(a) * 216, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = raised;
  ctx.strokeStyle = raised;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cy = c - 26; // the design sits a little above the middle, the word below it
  if (side === "heads") {
    // The five-flame emblem: a gold-rimmed shield of fire, red at the point and glowing orange at the tips.
    flameEmblem(ctx, c, cy - 18, 280); // sits above the word, with a gap
    if (relief) {
      ctx.fillStyle = "#b8b8b8";
    } else {
      const g = ctx.createLinearGradient(0, cy - 158, 0, cy + 122);
      g.addColorStop(0, "#ffc15a");
      g.addColorStop(0.42, "#f0592a");
      g.addColorStop(1, "#a8142a");
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.strokeStyle = raised;
    ctx.lineWidth = 11;
    ctx.stroke();
  } else {
    // The five-color wheel: a pentagram joining five gems, white, blue, black, red and green, in the order of the wheel.
    const R = 112;
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [c + Math.cos(a) * R, cy + Math.sin(a) * R] as const;
    });
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (const [n, i] of [0, 2, 4, 1, 3, 0].entries()) (n === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[i][0], pts[i][1]);
    ctx.stroke();
    const gems = ["#fbf5d6", "#2f86e0", "#40363d", "#e0472b", "#2f9a52"];
    pts.forEach(([x, y], i) => {
      // a raised setting, then the gem
      ctx.fillStyle = raised;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
      if (relief) {
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(x, y, 31, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = raised;
        ctx.beginPath();
        ctx.arc(x - 8, y - 8, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const g = ctx.createRadialGradient(x - 10, y - 10, 3, x, y, 32);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.35, gems[i]);
        g.addColorStop(1, gems[i]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 31, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  ctx.fillStyle = raised;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 70px Cinzel, Georgia, 'Times New Roman', serif";
  ctx.fillText(side === "heads" ? "HEADS" : "TAILS", c, 396);

  return canvas;
}

/** Vertical grooves around the rim, used as a bump map for the ridged edge. */
function drawReeding(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 8;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 1024, 8);
  ctx.fillStyle = "#ffffff";
  for (let x = 0; x < 1024; x += 8) ctx.fillRect(x, 0, 4, 8);
  return canvas;
}

// ───────── scene ─────────

export interface CoinScene {
  /** Toss the coin. It lands on `result`, then `onLanded` is called once it has come to rest. */
  flip(result: Side, onLanded: () => void): void;
  dispose(): void;
}

/** Creates the 3D scene on `canvas`. Throws if the browser can't do WebGL; the caller should fall back. */
export function createCoinScene(canvas: HTMLCanvasElement, opts: { topRotation?: number; bottomRotation?: number } = {}): CoinScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // transparent: the page behind shows through
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  // Studio-style reflections, so the metal has something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 5.3, 6.9);
  camera.lookAt(0, 1.2, 0);

  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(3.5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); // a coin-sized shadow does not need more, and every frame redraws it
  sun.shadow.camera.left = sun.shadow.camera.bottom = -4.5;
  sun.shadow.camera.right = sun.shadow.camera.top = 4.5;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 25;
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const toTexture = (canvas2d: HTMLCanvasElement, color: boolean) => {
    const t = new THREE.CanvasTexture(canvas2d);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const textures: THREE.Texture[] = [];
  const face = (side: Side, rotation: number) => {
    const color = toTexture(drawFace(side, false, rotation), true);
    const relief = toTexture(drawFace(side, true, rotation), false);
    textures.push(color, relief);
    return new THREE.MeshStandardMaterial({ map: color, bumpMap: relief, bumpScale: 2.2, metalness: 1, roughness: 0.34 });
  };

  const reeding = toTexture(drawReeding(), false);
  reeding.wrapS = reeding.wrapT = THREE.RepeatWrapping;
  textures.push(reeding);
  const rim = new THREE.MeshStandardMaterial({ color: 0xd9a520, bumpMap: reeding, bumpScale: 1.4, metalness: 1, roughness: 0.36 });

  // Cylinder groups: 0 = side, 1 = top cap (heads), 2 = bottom cap (tails).
  // The caps are mapped sideways by default; these turns put each design upright for the camera.
  const materials = [rim, face("heads", opts.topRotation ?? -Math.PI / 2), face("tails", opts.bottomRotation ?? Math.PI / 2)];
  const geometry = new THREE.CylinderGeometry(1, 1, THICKNESS, 96, 1);
  const coin = new THREE.Mesh(geometry, materials);
  coin.castShadow = true;
  scene.add(coin);

  // Once the coin has landed it never moves again: the loop stops after one last frame instead of redrawing a still coin 60 times a second.
  let stopped = false;

  function resize() {
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 300;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // a sharp-enough coin without drawing four times the pixels on a 2x screen
    if (stopped) renderer.render(scene, camera); // the loop is resting: show the new size once
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  // Waiting: the coin hovers, tilted toward the player, and drifts a little.
  const idle = (time: number): CoinPose => ({
    y: 0.34 + 0.05 * Math.sin(time * 2.2),
    rx: IDLE_TILT + 0.05 * Math.sin(time * 1.3),
    ry: 0.12 * Math.sin(time * 0.9),
    rz: 0.05 * Math.sin(time * 1.7),
  });

  let flight: { result: Side; startedAt: number; from: FlightStart; onLanded: () => void; landed: boolean; landedAt: number } | null = null;
  const startedAt = performance.now();
  let lastDrawn = 0;

  renderer.setAnimationLoop((now: number) => {
    let pose: CoinPose;
    if (flight) {
      const p = coinPose((now - flight.startedAt) / 1000, flight.result, flight.from);
      pose = p;
      if (p.done && !flight.landed) {
        flight.landed = true;
        flight.landedAt = now;
        flight.onLanded();
      }
    } else {
      if (now - lastDrawn < 30) return; // the idle hover is slow and gentle: about 30 frames a second is plenty
      pose = idle((now - startedAt) / 1000);
    }
    lastDrawn = now;
    coin.position.y = pose.y;
    coin.rotation.set(pose.rx, pose.ry, pose.rz);
    renderer.render(scene, camera);
    if (flight?.landed && now - flight.landedAt > 400) {
      stopped = true;
      renderer.setAnimationLoop(null);
    }
  });

  return {
    flip(result, onLanded) {
      if (flight) return;
      flight = {
        result,
        startedAt: performance.now(),
        from: { y: coin.position.y, rx: coin.rotation.x, ry: coin.rotation.y, rz: coin.rotation.z },
        onLanded,
        landed: false,
        landedAt: 0,
      };
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
