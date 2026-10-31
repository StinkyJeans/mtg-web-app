import type * as TT from "three";
import { scaled } from "@/lib/motion";
import { liteMode } from "./perfTier";
import { makeFire } from "./fireFx";
import type { Fire } from "./fireFx";

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

let libs: Promise<{ THREE: Three; GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader; RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment }> | null = null;
function loadLibs() {
  libs ??= (async () => {
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
    return { THREE, GLTFLoader, RoomEnvironment };
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
  const { THREE, GLTFLoader, RoomEnvironment } = await loadLibs();
  const lite = liteMode();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lite, powerPreference: "high-performance" });
  const pixelRatio = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(vw, vh);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  Object.assign(renderer.domElement.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  if (!lite) {
    // soft studio light all around, for the reflections on scales and metal
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
  }
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

// ─────────────────────────────── the dragon ───────────────────────────────

/** Moves a smooth, unrigged dragon: the wings beat and bend with the tips trailing, the neck rears and thrusts, the tail whips. Done in the vertex shader. */
function bendDragon(mat: TT.MeshStandardMaterial, u: Record<string, { value: number }>) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uPhase; uniform float uFlap; uniform float uNeck; uniform float uTime; uniform float uTail;
        vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vec3 dragonP = position;
        {
          float ax = abs(dragonP.x);
          float sx = dragonP.x < 0.0 ? -1.0 : 1.0;
          // the wings: they turn about the shoulder; the farther out, the more they turn, and the tips are a little behind the roots
          float wing = smoothstep(1.2, 2.4, ax);
          float s = clamp((ax - 1.2) / 7.3, 0.0, 1.0);
          float a = uFlap * sin(uPhase - s * 1.15) * (0.18 + 0.82 * s) * wing;
          vec2 r = rot2(vec2(ax - 1.2, dragonP.y - 4.0), a);
          dragonP.x = sx * (1.2 + r.x);
          dragonP.y = 4.0 + r.y;
          vec2 nr = rot2(vec2(sx * objectNormal.x, objectNormal.y), a);
          objectNormal.x = sx * nr.x;
          objectNormal.y = nr.y;
          // the neck and head: a bend about the base of the neck (pitch up when positive)
          float nw = smoothstep(0.8, 4.5, dragonP.z) * (1.0 - smoothstep(1.0, 2.2, ax));
          vec2 nk = rot2(vec2(dragonP.z - 0.8, dragonP.y - 2.8), uNeck * nw);
          dragonP.z = 0.8 + nk.x;
          dragonP.y = 2.8 + nk.y;
          vec2 nn = rot2(vec2(objectNormal.z, objectNormal.y), uNeck * nw);
          objectNormal.z = nn.x;
          objectNormal.y = nn.y;
          // the tail whips, the body undulates a little
          float tail = 1.0 - smoothstep(-9.5, -2.5, dragonP.z);
          dragonP.x += sin(uTime * 2.6 - dragonP.z * 0.5) * uTail * tail * (1.0 - wing);
          dragonP.y += sin(uTime * 1.7 + dragonP.z * 0.35) * 0.14 * (1.0 - wing);
        }`,
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n        transformed = dragonP;");
  };
  mat.customProgramCacheKey = () => "dragon-bend";
}

export async function dragon3D(root: HTMLElement, winner: Rect, loser: Rect, hooks: { onBreath(): void; breathS: number }): Promise<void> {
  const st = await makeStage(root);
  let fire: Fire | null = null;
  try {
    const { THREE, scene } = st;
    const lite = liteMode();
    const model = await st.load("dragon");
    const u = { uPhase: { value: 0 }, uFlap: { value: 0.5 }, uNeck: { value: 0 }, uTime: { value: 0 }, uTail: { value: 0.35 } };
    model.traverse((o) => {
      const m = o as TT.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
        const s = mat as TT.MeshStandardMaterial;
        s.roughness = 0.5;
        s.metalness = 0.12;
        s.envMapIntensity = 0.9;
        if (s.name === "Material.002") s.color.setHex(0x1b1b1b); // the claws and horns
        else s.color.multiplyScalar(0.8);
        bendDragon(s, u);
      });
    });
    // The model faces +z (head), has its wings along x and its back up (+y). It is shown in profile, rising up the screen towards the loser's mat,
    // tilted a little to the viewer for depth. `ang` is the way the nose points on the screen.
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
    const tilt = 0.8;
    const upW = side.clone().multiplyScalar(Math.cos(tilt)).add(new THREE.Vector3(0, 0, Math.sin(tilt))).normalize();
    const rightW = new THREE.Vector3().crossVectors(fwdW, upW);
    const fwdM = new THREE.Vector3(0, 0, 1);
    const upM = new THREE.Vector3(0, 1, 0);
    const rightM = new THREE.Vector3().crossVectors(fwdM, upM);
    const A = new THREE.Matrix4().makeBasis(rightM, upM, fwdM);
    const B = new THREE.Matrix4().makeBasis(rightW, upW, fwdW);
    const orient = new THREE.Group();
    orient.quaternion.setFromRotationMatrix(B.multiply(A.transpose()));
    const holder = new THREE.Group();
    holder.add(orient);
    orient.add(model);
    scene.add(holder);
    model.position.set(0, -3, -3); // (about the middle of the body, so that it turns about itself)
    // size: from nose to tail it is about as long as the window is high
    const s = Math.min(window.innerHeight * 1.25, window.innerWidth * 1.0) / 15.5;
    model.scale.setScalar(s);
    // the mouth, in the model's own space: where the nose is while the neck is bent by `neck`
    const mouthWorld = (neck: number) => {
      const dz = 6.15 - 0.8;
      const dy = 3.0 - 2.8;
      return model.localToWorld(new THREE.Vector3(0, 2.8 + (Math.sin(neck) * dz + Math.cos(neck) * dy), 0.8 + (Math.cos(neck) * dz - Math.sin(neck) * dy)));
    };
    holder.updateMatrixWorld(true);
    const home = headAt.clone().sub(mouthWorld(0).sub(holder.position));
    const flyLen = 15.5 * s;

    // light: a cool key from above and an environment for the reflections on the scales; the fire lights it from the front
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x2a1418, 0.9));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.6);
    key.position.set(-400, 600, 800);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7a3a, 1.6);
    rim.position.set(500, -300, -400);
    scene.add(rim);
    const flame = new THREE.PointLight(0xff8a2a, 0, 1100, 1.3);
    scene.add(flame);

    const fx = makeFire({ THREE, scene, focal: st.focal, pixelRatio: st.pixelRatio }, { flames: lite ? 200 : 420, ground: lite ? 120 : 360, smoke: lite ? 60 : 160, sparks: lite ? 80 : 260 });
    fire = fx;
    const T_ENTER = 1.15;
    const T_REAR = 2.0;
    const T_BREATH = T_REAR + hooks.breathS;
    const T_LEAVE = T_BREATH + 0.8;
    const T_END = T_BREATH + 2.6;
    let breathStarted = false;
    let flameDebt = 0;
    let smokeDebt = 0;
    let sparkDebt = 0;
    let groundDebt = 0;
    const tmp = new THREE.Vector3();
    const cam0 = st.camera.position.clone();
    const spring = (x: number) => 1 - Math.exp(-5.5 * x) * Math.cos(7 * x); // overshoots a little and settles: it arrives with weight

    await st.run((t, dt) => {
      const enter = clamp01(t / T_ENTER);
      const settle = spring(enter);
      const leave = ease(seg(t, T_BREATH, T_LEAVE));
      holder.position.copy(home);
      holder.position.addScaledVector(fwdW, -flyLen * 0.95 * (1 - settle) - flyLen * 0.85 * leave);
      holder.position.z += (1 - settle) * -140 + leave * -90;
      // a slow bob and sway while it hovers
      const hover = ease(seg(t, 0.6, T_ENTER));
      holder.position.addScaledVector(side, Math.sin(t * 1.1) * 7 * hover);
      holder.position.z += Math.sin(t * 1.5) * 10 * hover;
      holder.rotation.z = Math.sin(t * 0.9) * 0.025 * hover;
      // the wings: hard beats flying in, slower and wider while it hovers, hard again as it leaves
      const flapHz = 1.55 + (1 - enter) * 1.0 + leave * 1.2;
      u.uPhase.value += dt * Math.PI * 2 * flapHz;
      u.uFlap.value = 0.5 + 0.18 * ease(seg(t, T_ENTER, T_REAR)) - 0.1 * ease(seg(t, T_REAR, T_BREATH));
      u.uTime.value = t;
      u.uTail.value = 0.35 + 0.25 * Math.sin(t * 0.7);
      // the neck: the head is drawn back to gather breath, then thrown forward and down as the fire comes
      const gather = ease(seg(t, T_ENTER, T_REAR - 0.1));
      const thrust = ease(seg(t, T_REAR - 0.1, T_REAR + 0.22));
      u.uNeck.value = 0.34 * gather - 0.5 * thrust + 0.3 * ease(seg(t, T_BREATH, T_LEAVE)) + Math.sin(t * 2.1) * 0.025;
      holder.updateMatrixWorld(true);

      // the breath: a jet of flames from the mouth to the loser's mat, with smoke and sparks in it
      const mouth = mouthWorld(u.uNeck.value);
      const breathing = t >= T_REAR && t < T_BREATH;
      if (breathing) {
        if (!breathStarted) {
          breathStarted = true;
          hooks.onBreath();
        }
        const dir = tmp.copy(targetWorld).sub(mouth);
        const dist = dir.length();
        dir.normalize();
        const speed = dist / 0.75;
        flameDebt += dt * (lite ? 70 : 150);
        while (flameDebt >= 1) {
          flameDebt -= 1;
          const kick = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-0.5, 0.5)).multiplyScalar(speed * 0.1);
          fx.flame(mouth.clone().add(new THREE.Vector3(rnd(-5, 5), rnd(-5, 5), rnd(-5, 5))), dir.clone().multiplyScalar(speed * rnd(0.8, 1.15)).add(kick).setZ(-70), rnd(0.5, 0.85), rnd(28, 52), rnd(2.2, 3.4), 40);
        }
        smokeDebt += dt * (lite ? 8 : 20);
        while (smokeDebt >= 1) {
          smokeDebt -= 1;
          fx.smoke(mouth.clone().addScaledVector(dir, dist * rnd(0.3, 0.8)), new THREE.Vector3(rnd(-30, 30), rnd(20, 60), 30), rnd(1.4, 2.2), rnd(80, 140), 1.8, 40);
        }
        sparkDebt += dt * (lite ? 25 : 70);
        while (sparkDebt >= 1) {
          sparkDebt -= 1;
          fx.spark(mouth.clone(), dir.clone().multiplyScalar(speed * rnd(0.5, 1.2)).add(new THREE.Vector3(rnd(-160, 160), rnd(-160, 160), rnd(0, 120))), rnd(0.7, 1.5), rnd(5, 11));
        }
        flame.position.copy(mouth);
        flame.intensity = 1.3e4 * (0.75 + 0.25 * Math.sin(t * 31) + 0.2 * Math.sin(t * 13.7));
      } else flame.intensity *= 0.9;

      // the loser's mat burns: flames standing up out of it, smoke rolling off, embers flying
      const burning = t >= T_REAR + 0.55 && t < T_BREATH + 1.5;
      if (burning) {
        const strength = ease(seg(t, T_REAR + 0.55, T_REAR + 1.4)) * (1 - ease(seg(t, T_BREATH + 0.4, T_BREATH + 1.5)));
        groundDebt += dt * (lite ? 40 : 100) * strength;
        while (groundDebt >= 1) {
          groundDebt -= 1;
          const p = targetWorld.clone().add(new THREE.Vector3(rnd(-loser.width * 0.5, loser.width * 0.5), rnd(-loser.height * 0.42, loser.height * 0.38), 3));
          fx.standing(p, new THREE.Vector3(rnd(-14, 14), rnd(40, 110), rnd(10, 50)), rnd(0.7, 1.3), rnd(90, 170), 0.9, 120);
          if (Math.random() < 0.18) fx.smoke(p.clone().setZ(12), new THREE.Vector3(rnd(-20, 20), rnd(30, 70), 20), rnd(1.8, 2.8), rnd(120, 220), 1.7, 35);
          if (Math.random() < 0.3 && !lite) fx.spark(p, new THREE.Vector3(rnd(-80, 80), rnd(80, 240), rnd(20, 120)), rnd(0.8, 1.8), rnd(4, 9));
        }
      }
      fx.update(dt, t);
      // the camera shakes a little with the roar
      const shake = breathing ? 2.2 : 0;
      st.camera.position.set(cam0.x + rnd(-shake, shake), cam0.y + rnd(-shake, shake), cam0.z);
      return t < T_END;
    });
  } finally {
    fire?.dispose();
    st.dispose();
  }
}

// ─────────────────────────────── the reaper ───────────────────────────────

/** Rises, raises the scythe and swings it across the loser's mat. `onImpact` is called at the moment the blade passes through the mat. */
export async function reaper3D(root: HTMLElement, winner: Rect, loser: Rect, hooks: { onImpact(): void }): Promise<void> {
  const st = await makeStage(root);
  let fireRef: Fire | null = null;
  try {
    const { THREE, scene } = st;
    const lite = liteMode();
    const [figure, scytheModel] = await Promise.all([st.load("reaper"), st.load("scythe")]);
    // the figure's own little scythe is taken off (the brown pole and the grey blade): its hands are left holding the pole's place
    let poleTop: TT.Vector3 | null = null;
    let poleBottom: TT.Vector3 | null = null;
    let bladeMid: TT.Vector3 | null = null;
    const robeTime = { value: 0 };
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
        // the cloak moves: a slow ripple that grows towards the hem
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uTime = robeTime;
          sh.vertexShader = sh.vertexShader
            .replace("#include <common>", "#include <common>\n        uniform float uTime;")
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
        float hem = 1.0 - smoothstep(0.0, 0.75, position.y);
        transformed.x += sin(uTime * 2.3 + position.y * 7.0 + position.z * 5.0) * 0.022 * hem;
        transformed.z += sin(uTime * 1.9 + position.y * 6.0 + position.x * 5.0) * 0.022 * hem;`,
            );
        };
        mat.customProgramCacheKey = () => "reaper-robe";
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
    // violet fire and mist (the same flames as the dragon's, cold): off the blade as it is raised and swung, on the cut, and mist at the figure's feet
    const fx = makeFire({ THREE, scene, focal: st.focal, pixelRatio: st.pixelRatio }, { flames: lite ? 140 : 320, ground: lite ? 120 : 300, smoke: lite ? 80 : 200, sparks: lite ? 60 : 200 }, 1);
    const bladePoint = (k: number) => scytheModel.localToWorld(new THREE.Vector3(0.3 + 2.1 * k, 3.2 - 0.35 * k, 0));
    fireRef = fx;
    const diagLen = Math.hypot(loser.width, loser.height);
    const slashRad = (-22 * Math.PI) / 180;
    const cutPoint = (k: number) => targetWorld.clone().add(new THREE.Vector3(Math.cos(-slashRad) * diagLen * k, Math.sin(-slashRad) * diagLen * k, 4));
    let cutFireUntil = -1;
    let mistDebt = 0;
    let bladeDebt = 0;
    let cutDebt = 0;

    const T_RISE = 1.0;
    const T_RAISE = 1.9;
    const T_SWING = 2.25; // the blade is through the mat at the end of this
    const T_AFTER = T_SWING + 2.4;
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
      glow.intensity = 3e4 * (0.5 + 0.5 * rise) * (0.85 + Math.sin(t * 17) * 0.1 + Math.sin(t * 6.3) * 0.08) * (1 - out);
      robeTime.value = t;
      // mist rolls off the table around the figure's feet
      if (t < T_SWING + 0.6) {
        mistDebt += dt * (lite ? 8 : 22);
        while (mistDebt >= 1) {
          mistDebt -= 1;
          fx.smoke(base.clone().add(new THREE.Vector3(rnd(-200, 200), rnd(-70, 20) - figH * sc * 0.45, -20)), new THREE.Vector3(rnd(-14, 14), rnd(8, 26), 10), rnd(2.4, 3.4), rnd(150, 260), 1.5, 10);
        }
      }
      // cold flames lick up the blade while it is raised and swung
      if (t > T_RISE && t < T_SWING + 0.15) {
        figure.updateMatrixWorld(true);
        bladeDebt += dt * (lite ? 30 : 80);
        while (bladeDebt >= 1) {
          bladeDebt -= 1;
          fx.flame(bladePoint(Math.random()), new THREE.Vector3(rnd(-20, 20), rnd(30, 90), rnd(10, 40)), rnd(0.35, 0.65), rnd(30, 56), 1.4, 90);
        }
      }

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
        cutFireUntil = t + 1.6;
        for (let i = 0; i < (lite ? 30 : 90); i++) {
          fx.spark(cutPoint(rnd(-0.5, 0.5)), new THREE.Vector3(rnd(-160, 160), rnd(-40, 240), rnd(60, 260)), rnd(0.8, 1.8), rnd(5, 11));
        }
      }
      // cold fire stands up along the cut and burns out
      if (t < cutFireUntil) {
        const left = (cutFireUntil - t) / 1.6;
        cutDebt += dt * (lite ? 40 : 110) * Math.min(1, left * 2);
        while (cutDebt >= 1) {
          cutDebt -= 1;
          fx.standing(cutPoint(rnd(-0.5, 0.5)), new THREE.Vector3(rnd(-14, 14), rnd(40, 110), rnd(10, 50)), rnd(0.7, 1.3), rnd(80, 150), 0.9, 120);
          if (Math.random() < 0.2) fx.smoke(cutPoint(rnd(-0.5, 0.5)), new THREE.Vector3(rnd(-20, 20), rnd(30, 70), 20), rnd(1.8, 2.8), rnd(120, 200), 1.7, 35);
        }
      }
      fx.update(dt, t);
      void wpos;
      void wq;
      void acc;
      return t < T_AFTER + 0.2;
    });
  } finally {
    fireRef?.dispose();
    st.dispose();
  }
}
