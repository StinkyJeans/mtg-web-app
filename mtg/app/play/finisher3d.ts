import type * as TT from "three";
import { scaled } from "@/lib/motion";
import { liteMode } from "./perfTier";

/**
 * The 3D part of the finishing moves: real models drawn with three.js on a see-through canvas laid over the page.
 *   dragon: "Dragon Rigged" by na3ee1 (CC BY), a rigged dragon: its wings beat, its neck rears and its jaw opens (all driven from here, bone by bone),
 *           and the breath is a cloud of glowing particles that streams from its mouth down onto the loser's mat.
 *   reaper: "Grim Reaper" by Falibu (CC BY 3.0), a hooded skeleton with its own scythe taken off, and "Scythe" by Quaternius (CC0), which is
 *           put in its hands and then swung across the loser's mat, with a trail of light behind it.
 * The models are loaded only when a finisher is about to play (`warmFinisher` fetches them early so that they are in the cache). If anything
 * here fails (no WebGL, no network) the caller falls back to the flat version.
 * One world unit is one pixel of the page at the table (z = 0), so the models are placed with the page's own measurements.
 */

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Three = typeof TT;
const URLS = { dragon: "/models/finishers/dragon.glb", reaper: "/models/finishers/reaper.glb", scythe: "/models/finishers/scythe.glb" } as const;

let libs: Promise<{ THREE: Three; GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader }> | null = null;
function loadLibs() {
  libs ??= (async () => {
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    return { THREE, GLTFLoader };
  })();
  return libs;
}

/** Starts fetching a finisher's models and the 3D library, so that the finisher starts at once when it is played. */
export function warmFinisher(kind: "dragon" | "reaper"): void {
  if (typeof window === "undefined") return;
  void loadLibs().catch(() => undefined);
  for (const u of kind === "dragon" ? [URLS.dragon] : [URLS.reaper, URLS.scythe]) void fetch(u).catch(() => undefined);
}

/** True when this browser can draw 3D at all. */
export function canDo3D(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ─────────────────────────────── the stage ───────────────────────────────

interface Stage {
  THREE: Three;
  scene: TT.Scene;
  camera: TT.PerspectiveCamera;
  renderer: TT.WebGLRenderer;
  /** World position of a point of the page (x, y in pixels from the top left of the window; z above the table). */
  at(x: number, y: number, z?: number): TT.Vector3;
  load(name: keyof typeof URLS): Promise<TT.Group>;
  /** Calls `update(seconds, delta)` every frame (seconds run faster or slower with the animation speed) until it returns false. */
  run(update: (t: number, dt: number) => boolean | void): Promise<void>;
  /** Pixels per world unit on screen for a particle shader. */
  focal: number;
  pixelRatio: number;
  dispose(): void;
}

async function makeStage(root: HTMLElement): Promise<Stage> {
  const { THREE, GLTFLoader } = await loadLibs();
  const lite = liteMode();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lite, powerPreference: "high-performance" });
  const pixelRatio = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(vw, vh);
  renderer.setClearColor(0x000000, 0);
  Object.assign(renderer.domElement.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const fov = 40;
  const D = vh / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const camera = new THREE.PerspectiveCamera(fov, vw / vh, 10, D * 8);
  camera.position.set(0, 0, D);
  const loader = new GLTFLoader();
  let stopped = false;
  return {
    THREE,
    scene,
    camera,
    renderer,
    focal: D,
    pixelRatio,
    at: (x, y, z = 0) => new THREE.Vector3(x - vw / 2, vh / 2 - y, z),
    load: async (name) => (await loader.loadAsync(URLS[name])).scene,
    run: (update) =>
      new Promise<void>((resolve) => {
        let last = performance.now();
        let t = 0;
        const frame = (now: number) => {
          if (stopped) return resolve();
          const dt = Math.min(0.05, (now - last) / 1000) * (1000 / scaled(1000));
          last = now;
          t += dt;
          if (update(t, dt) === false) return resolve();
          renderer.render(scene, camera);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    dispose: () => {
      stopped = true;
      scene.traverse((o) => {
        const m = o as TT.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as TT.Material | TT.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ─────────────────────────────── glowing particles ───────────────────────────────

/** A pool of glowing, additive particles (fire, sparks): one draw call, each particle with its own size, colour and fade. */
function makeParticles(st: Stage, count: number) {
  const { THREE } = st;
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const vel = new Float32Array(count * 3);
  const age = new Float32Array(count).fill(99);
  const life = new Float32Array(count).fill(1);
  const s0 = new Float32Array(count);
  const grow = new Float32Array(count);
  const hot = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { pr: { value: st.pixelRatio }, focal: { value: st.focal } },
    vertexShader: `
      attribute float size; attribute vec3 color; attribute float alpha;
      uniform float pr; uniform float focal;
      varying vec3 vC; varying float vA;
      void main() {
        vC = color; vA = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pr * focal / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        gl_FragColor = vec4(vC, a * a * vA * 0.55);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  st.scene.add(points);
  let next = 0;
  return {
    points,
    /** One particle: where it starts, how fast it goes, how long it lives, its size and how fast it grows; `heat` 1 = white-hot, 0 = starts orange. */
    emit(p: TT.Vector3, v: TT.Vector3, lifeS: number, sizePx: number, growth: number, heat = 1) {
      const i = next++ % count;
      pos.set([p.x, p.y, p.z], i * 3);
      vel.set([v.x, v.y, v.z], i * 3);
      age[i] = 0;
      life[i] = lifeS;
      s0[i] = sizePx;
      grow[i] = growth;
      hot[i] = heat;
    },
    update(dt: number, drag = 0.6) {
      for (let i = 0; i < count; i++) {
        if (age[i] >= life[i]) {
          alpha[i] = 0;
          continue;
        }
        age[i] += dt;
        const k = age[i] / life[i];
        const damp = Math.exp(-drag * dt);
        for (let a = 0; a < 3; a++) {
          vel[i * 3 + a] *= damp;
          pos[i * 3 + a] += vel[i * 3 + a] * dt;
        }
        size[i] = s0[i] * (1 + grow[i] * k);
        // white-hot, then yellow, then orange, then a dull red as it dies
        if (hot[i] < 0) {
          // (a negative heat is a violet glow: the reaper's sparks)
          const g = -hot[i] * (1 - k);
          col[i * 3] = 0.55 + 0.45 * g;
          col[i * 3 + 1] = 0.35 + 0.55 * g;
          col[i * 3 + 2] = 1;
        } else {
          const h = hot[i] * (1 - k);
          col[i * 3] = 1;
          col[i * 3 + 1] = Math.max(0.1, 0.25 + 0.7 * h + 0.2 * (1 - k));
          col[i * 3 + 2] = Math.max(0, 0.9 * h * h - 0.05);
        }
        alpha[i] = Math.min(1, k * 10) * Math.pow(1 - k, 0.8);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
    },
  };
}

// ─────────────────────────────── the dragon ───────────────────────────────

/** Turns a bone about a WORLD axis from its rest pose (bones are turned in their parents' space, so the axis is converted). */
function turnBone(THREE: Three, bone: TT.Object3D, rest: TT.Quaternion, axis: TT.Vector3, angle: number) {
  const parentQ = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  const restWorld = parentQ.clone().multiply(rest);
  const world = new THREE.Quaternion().setFromAxisAngle(axis, angle).multiply(restWorld);
  bone.quaternion.copy(parentQ.invert().multiply(world));
  bone.updateMatrixWorld(true);
}

export async function dragon3D(root: HTMLElement, winner: Rect, loser: Rect, hooks: { onBreath(): void; breathS: number }): Promise<void> {
  const st = await makeStage(root);
  try {
    const { THREE, scene } = st;
    const lite = liteMode();
    const model = await st.load("dragon");
    model.traverse((o) => {
      const m = o as TT.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      const recolor = (mat: TT.Material) => {
        const s = mat as TT.MeshStandardMaterial;
        const set = (hex: number, emissive = 0x000000, k = 0) => {
          s.color.setHex(hex);
          s.emissive.setHex(emissive);
          s.emissiveIntensity = k;
        };
        // a fire-breather: dark crimson hide, deep red wing skin, eyes that glow
        if (s.name === "DarkGreen") set(0x4a0d0d);
        else if (s.name === "Green") set(0x8a1a12);
        else if (s.name === "Yellow") set(0xffd24a, 0xff9a1a, 1.6);
        else if (s.name === "Black") set(0x120505);
        s.metalness = 0.05;
        s.roughness = 0.62;
      };
      (Array.isArray(m.material) ? m.material : [m.material]).forEach(recolor);
    });
    // (the loader takes the dots out of names: "Spine.005" is "Spine005")
    const bone = (n: string) => model.getObjectByName(n.replace(/\./g, "")) as TT.Object3D;
    const b = {
      hip: bone("Hip"),
      snout: bone("Head.005_end"),
      jaw: bone("Jaw.001"),
      head: bone("Head.001"),
      neck: ["Spine.005", "Spine.006", "Spine.007", "Spine.008", "Spine.009"].map(bone),
      shoulderL: bone("Shoulder.L"),
      shoulderR: bone("Shoulder.R"),
      armL: bone("Arm.L"),
      armR: bone("Arm.R"),
      tail: ["Tail.001", "Tail.002", "Tail.003", "Tail.004", "Tail.005", "Tail.006"].map(bone),
    };
    const rest = new Map<TT.Object3D, TT.Quaternion>();
    for (const o of [b.jaw, b.head, ...b.neck, b.shoulderL, b.shoulderR, b.armL, b.armR, ...b.tail]) rest.set(o, o.quaternion.clone());

    // Its own axes (it was modelled facing some way): from the hip to the nose is "forward"; the up of the model is up.
    model.updateMatrixWorld(true);
    const wp = (o: TT.Object3D) => o.getWorldPosition(new THREE.Vector3());
    const fwdM = wp(b.snout).sub(wp(b.hip)).setY(0).normalize();
    const upM = new THREE.Vector3(0, 1, 0);
    const rightM = new THREE.Vector3().crossVectors(fwdM, upM);
    // The dragon is seen from the side (in profile), rising up the screen with its nose towards the loser's mat, tilted a little to the viewer so that
    // it has depth. `ang` is the way the nose points on the screen.
    const winnerMid = { x: winner.left + winner.width / 2, y: winner.top + winner.height / 2 };
    const loserMid = { x: loser.left + loser.width / 2, y: loser.top + loser.height / 2 };
    const towardTop = loserMid.y < winnerMid.y;
    // (the head comes up in the gap between the two mats, so that the neck and the wings are over the winner's mat and on screen)
    const gapY = towardTop ? (loser.top + loser.height + winner.top) / 2 : (winner.top + winner.height + loser.top) / 2;
    const headAt = st.at(winnerMid.x - winner.width * 0.05, gapY + (towardTop ? -10 : 10), 150);
    const targetWorld = st.at(loserMid.x, loserMid.y, 0);
    const ang = Math.atan2(targetWorld.y - headAt.y, targetWorld.x - headAt.x);
    const fwdW = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
    const side = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    const tilt = 0.85;
    const upW = side.clone().multiplyScalar(Math.cos(tilt)).add(new THREE.Vector3(0, 0, Math.sin(tilt))).normalize();
    const rightW = new THREE.Vector3().crossVectors(fwdW, upW);
    const A = new THREE.Matrix4().makeBasis(rightM, upM, fwdM);
    const B = new THREE.Matrix4().makeBasis(rightW, upW, fwdW);
    const orient = new THREE.Group();
    orient.quaternion.setFromRotationMatrix(B.multiply(A.transpose()));
    const holder = new THREE.Group();
    holder.add(orient);
    orient.add(model);
    scene.add(holder);

    // size: from nose to the tip of the tail it is about as long as the window is high
    const tailTip = bone("Tail.007_end");
    const bodyLen = Math.max(wp(b.snout).distanceTo(wp(tailTip)), 1);
    const s = Math.min(window.innerHeight * 1.25, window.innerWidth * 1.0) / bodyLen;
    model.scale.setScalar(s);
    // where the snout is, relative to the holder, so that the head can be put where it should be
    holder.updateMatrixWorld(true);
    const snoutRest = wp(b.snout).sub(holder.position);
    const home = headAt.clone().sub(snoutRest);
    const flyLen = bodyLen * s;

    // light: a warm key from above, a cool fill, and a flame-coloured light that follows the mouth while it breathes
    scene.add(new THREE.HemisphereLight(0xffe6d0, 0x2a1020, 1.5));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.4);
    key.position.set(-300, 500, 900);
    scene.add(key);
    const flame = new THREE.PointLight(0xff8a2a, 0, 900, 1.4);
    scene.add(flame);

    const fire = makeParticles(st, lite ? 360 : 900);
    const axisFwd = fwdW.clone();
    const axisRight = rightW.clone();
    const tmp = new THREE.Vector3();
    const T_ENTER = 1.0;
    const T_REAR = 1.8;
    const T_BREATH = T_REAR + hooks.breathS;
    const T_LEAVE = T_BREATH + 0.9;
    let breathStarted = false;
    let spawnDebt = 0;

    await st.run((t, dt) => {
      const enter = ease(seg(t, 0, T_ENTER));
      const leave = ease(seg(t, T_BREATH, T_LEAVE));
      // position: it flies in from behind, hovers, and falls back at the end
      holder.position.copy(home);
      holder.position.addScaledVector(fwdW, -flyLen * 0.9 * (1 - enter) - flyLen * 0.8 * leave);
      holder.position.z += (1 - enter) * -120 + leave * -80;
      holder.rotation.set(0, 0, 0);
      holder.rotation.z = Math.sin(t * 1.3) * 0.03; // a slow sway while it hovers
      // wings: they beat hard as it flies in, slower while it hovers, hard again as it leaves
      const beat = Math.sin(t * Math.PI * 2 * (1.9 - 0.5 * enter + leave * 0.8));
      const flapAmp = 0.7 - 0.2 * ease(seg(t, T_ENTER, T_REAR));
      const lift = beat * flapAmp;
      holder.position.z += Math.max(0, beat) * 14;
      const sideL = wp(b.shoulderL).sub(wp(b.hip)).dot(rightM.clone().applyQuaternion(orient.quaternion)) >= 0 ? 1 : -1;
      turnBone(THREE, b.shoulderL, rest.get(b.shoulderL)!, axisFwd, lift * sideL);
      turnBone(THREE, b.shoulderR, rest.get(b.shoulderR)!, axisFwd, -lift * sideL);
      // the neck rears back while it gathers breath, and thrusts forward to breathe
      const gather = ease(seg(t, T_ENTER, T_REAR));
      const thrust = ease(seg(t, T_REAR, T_REAR + 0.25));
      const rear = gather * 0.5 - thrust * 0.7 + ease(seg(t, T_BREATH, T_LEAVE)) * 0.2;
      b.neck.forEach((n, i) => turnBone(THREE, n, rest.get(n)!, axisRight, rear * (0.2 + i * 0.05)));
      // the jaw: wide open to roar and to breathe
      const jawOpen = 0.12 + 0.5 * ease(seg(t, T_ENTER - 0.2, T_REAR)) * (1 - ease(seg(t, T_BREATH + 0.2, T_LEAVE)));
      turnBone(THREE, b.jaw, rest.get(b.jaw)!, axisRight, jawOpen);
      // the tail whips
      b.tail.forEach((n, i) => turnBone(THREE, n, rest.get(n)!, upW, Math.sin(t * 3 - i * 0.7) * 0.12));

      // the breath
      const mouth = wp(b.snout);
      if (t >= T_REAR && t < T_BREATH) {
        if (!breathStarted) {
          breathStarted = true;
          hooks.onBreath();
        }
        const dir = tmp.copy(targetWorld).sub(mouth);
        const dist = dir.length();
        dir.normalize();
        spawnDebt += dt * (lite ? 160 : 320);
        while (spawnDebt >= 1) {
          spawnDebt -= 1;
          const spread = 0.13;
          const v = dir.clone().multiplyScalar(dist / 0.85).add(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-0.5, 0.5)).multiplyScalar(dist * spread));
          v.z -= 120; // the fire falls to the table
          fire.emit(mouth.clone().add(new THREE.Vector3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6))), v, rnd(0.55, 1.0), rnd(16, 36), rnd(1.8, 3.4), 0.8);
        }
        flame.position.copy(mouth);
        flame.intensity = 1.5e4 * (0.8 + Math.random() * 0.4);
      } else flame.intensity *= 0.85;
      fire.update(dt, 0.35);
      // the fire spreads out over the loser's mat: a second, slower cloud that rises from the table
      if (t >= T_REAR + 0.5 && t < T_BREATH + 0.3 && !lite) {
        for (let i = 0; i < 3; i++) {
          const p = targetWorld.clone().add(new THREE.Vector3(rnd(-loser.width * 0.45, loser.width * 0.45), rnd(-loser.height * 0.4, loser.height * 0.4), 4));
          fire.emit(p, new THREE.Vector3(rnd(-12, 12), rnd(20, 60), rnd(20, 70)), rnd(0.6, 1.2), rnd(40, 90), 1.4, 0.5);
        }
      }
      return t < T_LEAVE + 0.8;
    });
  } finally {
    st.dispose();
  }
}

// ─────────────────────────────── the reaper ───────────────────────────────

/** Rises, raises the scythe and swings it across the loser's mat. `onImpact` is called at the moment the blade passes through the mat. */
export async function reaper3D(root: HTMLElement, winner: Rect, loser: Rect, hooks: { onImpact(): void }): Promise<void> {
  const st = await makeStage(root);
  try {
    const { THREE, scene } = st;
    const lite = liteMode();
    const [figure, scytheModel] = await Promise.all([st.load("reaper"), st.load("scythe")]);
    // the figure's own little scythe is taken off (the brown pole and the grey blade): its hands are left holding the pole's place
    let poleTop: TT.Vector3 | null = null;
    let poleBottom: TT.Vector3 | null = null;
    let bladeMid: TT.Vector3 | null = null;
    const hide: TT.Mesh[] = [];
    figure.traverse((o) => {
      const m = o as TT.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as TT.MeshStandardMaterial;
      const c = mat.color;
      void c;
      if (mat.name === "mat20" || mat.name === "mat25") hide.push(m); // (the brown pole and the grey blade)
      m.frustumCulled = false;
      if (mat.name === "mat8") {
        mat.emissive.setHex(0xff2a1a);
        mat.emissiveIntensity = 2.2;
      }
      if (mat.name === "mat17") {
        mat.color.setHex(0x1a1a2c);
        mat.roughness = 0.9;
      }
    });
    figure.updateMatrixWorld(true);
    for (const m of hide) {
      const mat = m.material as TT.MeshStandardMaterial;
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
      if (mat.name === "mat25") bladeMid = bb.getCenter(new THREE.Vector3());
      else {
        const pos = m.geometry.attributes.position;
        let top = new THREE.Vector3(0, -1e9, 0);
        let bottom = new THREE.Vector3(0, 1e9, 0);
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          if (v.y > top.y) top = v.clone();
          if (v.y < bottom.y) bottom = v.clone();
        }
        poleTop = top;
        poleBottom = bottom;
      }
      m.visible = false;
    }
    const box = new THREE.Box3().setFromObject(figure);
    const figSize = box.getSize(new THREE.Vector3());
    const figH = figSize.y;
    // the figure faces +x in the file: turn it to face the player
    const facing = new THREE.Group();
    facing.add(figure);
    facing.rotation.y = -Math.PI / 2;
    const rig = new THREE.Group();
    rig.add(facing);
    scene.add(rig);
    const winnerMid = { x: winner.left + winner.width / 2, y: winner.top + winner.height / 2 };
    const loserMid = { x: loser.left + loser.width / 2, y: loser.top + loser.height / 2 };
    const sc = Math.min(window.innerHeight * 0.62, 560) / figH;
    rig.scale.setScalar(sc);
    const base = st.at(winnerMid.x, winnerMid.y + winner.height * 0.15, 160);
    const targetWorld = st.at(loserMid.x, loserMid.y, 0);
    const toward = targetWorld.y > base.y ? 1 : -1;

    // the scythe: its pole goes where the figure's pole was
    const scythe = new THREE.Group();
    const sBox = new THREE.Box3().setFromObject(scytheModel);
    const sCenter = sBox.getCenter(new THREE.Vector3());
    scytheModel.position.set(0, -sCenter.y, -sCenter.z); // the middle of the pole's length at the origin of its group (the pole itself is at x = 0)
    scythe.add(scytheModel);
    const poleLen = figH * 1.3; // a reaper's scythe stands taller than the reaper
    const sScale = poleLen / (sBox.max.y - sBox.min.y);
    const holderScythe = new THREE.Group();
    holderScythe.add(scythe);
    scythe.scale.setScalar(sScale);
    // in the figure's frame: the pole runs through both hands (the lower hand a little above the pole's middle), the blade on the side the old blade was
    if (poleTop && poleBottom) {
      const pt = poleTop as TT.Vector3;
      const pb = poleBottom as TT.Vector3;
      const dir = pt.clone().sub(pb).normalize();
      const mid = pt.clone().add(pb).multiplyScalar(0.5).addScaledVector(dir, poleLen * 0.12);
      holderScythe.position.copy(mid);
      holderScythe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      // the blade curves out to the side of the screen (the figure's +z is the screen's left once it faces the viewer): the classic silhouette, over its head
      const side = new THREE.Vector3(0, 0, 1);
      side.sub(dir.clone().multiplyScalar(side.dot(dir))).normalize();
      const cur = new THREE.Vector3(1, 0, 0).applyQuaternion(holderScythe.quaternion);
      const ang = Math.atan2(new THREE.Vector3().crossVectors(cur, side).dot(dir), cur.dot(side));
      holderScythe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, ang));
      void bladeMid;
    }
    figure.add(holderScythe);

    // light: cold moonlight and a violet glow
    scene.add(new THREE.HemisphereLight(0xb8b0ff, 0x120820, 1.3));
    const key = new THREE.DirectionalLight(0xdcd6ff, 2.2);
    key.position.set(-300, 600, 900);
    scene.add(key);
    const glow = new THREE.PointLight(0x8b5cf6, 0, 1400, 1.2);
    glow.position.set(base.x, base.y + 80, 380);
    scene.add(glow);

    // the trail of light: copies of the blade, left behind in the air and fading
    const ghosts: TT.Group[] = [];
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    if (!lite) {
      for (let i = 0; i < 5; i++) {
        const g = scytheModel.clone(true);
        g.traverse((o) => {
          const m = o as TT.Mesh;
          if (m.isMesh) m.material = ghostMat.clone();
        });
        const holder = new THREE.Group();
        holder.add(g);
        holder.visible = false;
        scene.add(holder);
        ghosts.push(holder);
      }
    }
    const sparks = makeParticles(st, lite ? 120 : 360);

    const T_RISE = 1.0;
    const T_RAISE = 1.9;
    const T_SWING = 2.25; // the blade is through the mat at the end of this
    const T_AFTER = T_SWING + 1.6;
    let impacted = false;
    // the scythe leaves the hands for the swing: it is taken out of the figure and put in the scene at the same place
    let loose = false;
    const wpos = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    const wscale = new THREE.Vector3();
    const startPose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1 };
    const history: { p: TT.Vector3; q: TT.Quaternion; s: number }[] = [];
    let acc = 0;

    await st.run((t, dt) => {
      const rise = ease(seg(t, 0, T_RISE));
      const raise = ease(seg(t, T_RISE + 0.2, T_RAISE));
      const swing = seg(t, T_RAISE + 0.15, T_SWING);
      const out = ease(seg(t, T_SWING + 0.5, T_AFTER));
      // the figure: it rises out of the floor of the table, looms, rears back with the scythe, and leans into the swing
      rig.position.copy(base);
      rig.position.y += (-figH * sc * 0.9 + 0) * (1 - rise) * 0.9 - out * figH * sc * 0.3 * toward * -1;
      rig.position.z += (1 - rise) * -240 + out * -240;
      rig.rotation.set(0, 0, 0);
      rig.rotation.x = toward * (-0.35 * raise + 0.7 * ease(swing) - 0.25 * out) + Math.sin(t * 1.6) * 0.02;
      rig.rotation.y = Math.sin(t * 0.9) * 0.1;
      glow.intensity = 3e4 * (0.5 + 0.5 * rise) * (0.85 + Math.random() * 0.3) * (1 - out);

      // the scythe: raised overhead, then thrown across the mat
      if (swing > 0 && !loose) {
        loose = true;
        holderScythe.updateWorldMatrix(true, false);
        holderScythe.matrixWorld.decompose(startPose.p, startPose.q, wscale);
        startPose.s = wscale.x;
        figure.remove(holderScythe);
        scene.add(holderScythe);
        holderScythe.position.copy(startPose.p);
        holderScythe.quaternion.copy(startPose.q);
        holderScythe.scale.setScalar(startPose.s);
      }
      if (loose) {
        // the path: from the hands, up and back, then forward and down across the loser's mat in a wide arc
        const k = ease(swing);
        const a = startPose.p;
        const mid = a.clone().lerp(targetWorld, 0.35);
        mid.z += 260;
        mid.x += (a.x < 0 ? 1 : -1) * 120;
        const q1 = 1 - k;
        const p = new THREE.Vector3(
          q1 * q1 * a.x + 2 * q1 * k * mid.x + k * k * targetWorld.x,
          q1 * q1 * a.y + 2 * q1 * k * mid.y + k * k * targetWorld.y,
          q1 * q1 * a.z + 2 * q1 * k * mid.z + k * k * (targetWorld.z + 30),
        );
        holderScythe.position.copy(p);
        // the blade turns over as it goes: a big arc about the line of flight (the camera axis)
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toward * (-0.3 + k * -2.6));
        holderScythe.quaternion.copy(spin.multiply(startPose.q));
        holderScythe.scale.setScalar(startPose.s * (1 + 0.9 * k));
        if (swing >= 1) holderScythe.visible = false;
        history.unshift({ p: holderScythe.position.clone(), q: holderScythe.quaternion.clone(), s: holderScythe.scale.x });
        if (history.length > 40) history.pop();
      }
      acc += dt;
      ghosts.forEach((g, i) => {
        const h = history[(i + 1) * 2];
        g.visible = !!h && swing < 1.0 && swing > 0;
        if (h && g.visible) {
          g.position.copy(h.p);
          g.quaternion.copy(h.q);
          g.scale.setScalar(h.s);
          g.traverse((o) => {
            const m = o as TT.Mesh;
            if (m.isMesh) (m.material as TT.MeshBasicMaterial).opacity = 0.3 * (1 - i / ghosts.length);
          });
        }
      });
      // the moment of the cut
      if (swing >= 1 && !impacted) {
        impacted = true;
        hooks.onImpact();
        for (let i = 0; i < (lite ? 40 : 160); i++) {
          const p = targetWorld.clone().add(new THREE.Vector3(rnd(-loser.width * 0.4, loser.width * 0.4), rnd(-loser.height * 0.3, loser.height * 0.3), 20));
          sparks.emit(p, new THREE.Vector3(rnd(-160, 160), rnd(-60, 200), rnd(60, 260)), rnd(0.5, 1.2), rnd(10, 26), 0.2, -0.9);
        }
      }
      sparks.update(dt, 1.4);
      void wpos;
      void wq;
      void acc;
      return t < T_AFTER + 0.2;
    });
  } finally {
    st.dispose();
  }
}
