import type * as TT from "three";

/**
 * Fire that looks like fire: not glowing balls, but flames that are eaten away by moving noise as they age (so they have ragged, licking edges),
 * a temperature that runs from white-hot at the root through yellow and orange to a dull red, dark smoke that rises off them, and sparks that
 * flicker and fall. Every flame is a point sprite turned at random; the whole thing is three draw calls however many flames there are.
 * Everything is drawn from a small noise picture made once here (no files).
 */
type Three = typeof TT;

interface Host {
  THREE: Three;
  scene: TT.Scene;
  /** Pixels per world unit at the table: the camera's distance. */
  focal: number;
  pixelRatio: number;
}

/** Tileable soft noise in two channels (the flames and the smoke read it at two scales). */
function makeNoise(THREE: Three): TT.DataTexture {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  const lattice = (cells: number, seed: number) => {
    const a = new Float32Array(cells * cells);
    let s = seed;
    for (let i = 0; i < a.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      a[i] = s / 4294967296;
    }
    return a;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  const sample = (lat: Float32Array, cells: number, x: number, y: number) => {
    const fx = x * cells;
    const fy = y * cells;
    const x0 = Math.floor(fx) % cells;
    const y0 = Math.floor(fy) % cells;
    const x1 = (x0 + 1) % cells;
    const y1 = (y0 + 1) % cells;
    const tx = fade(fx - Math.floor(fx));
    const ty = fade(fy - Math.floor(fy));
    const a = lat[y0 * cells + x0] * (1 - tx) + lat[y0 * cells + x1] * tx;
    const b = lat[y1 * cells + x0] * (1 - tx) + lat[y1 * cells + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
  const octaves = (seed: number) => [4, 8, 16, 32].map((c, i) => ({ lat: lattice(c, seed + i * 977), cells: c, w: 1 / (1 + i * 0.9) }));
  const o1 = octaves(11);
  const o2 = octaves(4242);
  const fbm = (os: ReturnType<typeof octaves>, x: number, y: number) => {
    let sum = 0;
    let wsum = 0;
    for (const o of os) {
      sum += sample(o.lat, o.cells, x, y) * o.w;
      wsum += o.w;
    }
    return sum / wsum;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      data[i] = Math.min(255, fbm(o1, x / N, y / N) * 255 * 1.15);
      data[i + 1] = Math.min(255, fbm(o2, x / N, y / N) * 255 * 1.15);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const VERT = `
  attribute float size; attribute vec3 info; // info: age 0..1, seed, alpha
  uniform float pr; uniform float focal;
  varying vec3 vI;
  void main() {
    vI = info;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pr * focal / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

// Shared by the flame and the smoke: a sprite turned at random, a soft shape, and noise that moves through it and eats it away.
const COMMON = `
  uniform sampler2D noise; uniform float time; uniform float tilt; uniform float cold;
  varying vec3 vI;
  vec2 turn(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  float grain(vec2 uv, float seed, float speed) {
    vec2 q = uv * 0.85 + vec2(seed * 7.31, seed * 3.17) + vec2(0.0, -time * speed);
    return texture2D(noise, q).r * 0.62 + texture2D(noise, q * 2.7 + 0.37).g * 0.38;
  }
`;

const FLAME_FRAG = `${COMMON}
  vec3 temperature(float t) {
    // dull red -> orange -> yellow -> white
    vec3 c = mix(vec3(0.42, 0.03, 0.0), vec3(1.0, 0.30, 0.02), smoothstep(0.0, 0.34, t));
    c = mix(c, vec3(1.0, 0.72, 0.16), smoothstep(0.30, 0.62, t));
    c = mix(c, vec3(1.0, 0.97, 0.80), smoothstep(0.6, 1.0, t));
    return c;
  }
  void main() {
    vec2 uv = turn(gl_PointCoord - 0.5, (vI.y - 0.5) * tilt);
    vec2 q = uv * 2.0;
    // a flame: wide at the root and drawn out to a tip at the top of its sprite (the picture's y runs downwards)
    float h = 0.5 - q.y * 0.5;
    float width = 0.12 + 0.7 * pow(max(1.0 - h, 0.0), 0.75) * smoothstep(0.0, 0.22, h);
    float body = (1.0 - smoothstep(0.0, 1.0, abs(q.x) / width)) * smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.78, 1.0, h));
    float n = grain(uv, vI.y, 0.9 + vI.y);
    float age = vI.x;
    // the noise eats the flame more the older it is: a young flame is solid, an old one is a few ragged licks
    // (and it always dies away before the edge of its sprite: no square outlines)
    float edge = 1.0 - smoothstep(0.62, 0.98, length(q));
    float heat = (body * (1.1 - age * 0.9) + (n - 0.5) * (0.55 + age * 0.9)) * edge;
    float a = smoothstep(0.14, 0.46, heat);
    if (a < 0.01) discard;
    vec3 col = temperature(clamp((heat - 0.1) * 0.95, 0.0, 1.0));
    // cold fire: the same flame with its heat shifted to violet and white
    vec3 violet = vec3(0.36 * col.r + 0.14 * col.g, 0.12 * col.r + 0.28 * col.g, 0.55 * col.r + 0.42 * col.g + 0.22);
    col = mix(col, violet, cold);
    gl_FragColor = vec4(col * (0.45 + 0.5 * a), a * vI.z * 0.8);
  }`;

const SMOKE_FRAG = `${COMMON}
  void main() {
    vec2 uv = turn(gl_PointCoord - 0.5, (vI.y - 0.5) * 6.2831);
    float r = length(uv * 2.0);
    float body = 1.0 - smoothstep(0.1, 1.0, r);
    float n = grain(uv * 1.3, vI.y, 0.25);
    float dens = (body * (0.5 + n * 0.9) - vI.x * 0.25) * (1.0 - smoothstep(0.6, 0.98, r));
    float a = smoothstep(0.05, 0.6, dens) * vI.z;
    if (a < 0.005) discard;
    vec3 ash = vec3(0.055, 0.05, 0.05) + vec3(0.12, 0.05, 0.02) * (1.0 - vI.x) * body;
    vec3 mist = vec3(0.12, 0.07, 0.22) + vec3(0.10, 0.06, 0.16) * (1.0 - vI.x) * body;
    gl_FragColor = vec4(mix(ash, mist, cold), a * 0.42);
  }`;

const SPARK_FRAG = `
  uniform float cold;
  varying vec3 vI;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.0, 1.0, d));
    float flick = 0.65 + 0.35 * sin(vI.x * 90.0 + vI.y * 40.0);
    vec3 col = mix(vec3(1.0, 0.62 - vI.x * 0.3, 0.14), vec3(0.78, 0.62, 1.0), cold);
    gl_FragColor = vec4(col, a * a * vI.z * flick);
  }`;

interface Pool {
  points: TT.Points;
  cap: number;
  pos: Float32Array;
  vel: Float32Array;
  age: Float32Array;
  life: Float32Array;
  size0: Float32Array;
  grow: Float32Array;
  seed: Float32Array;
  buoy: Float32Array;
  size: Float32Array;
  info: Float32Array;
  next: number;
  mat: TT.ShaderMaterial;
}

export function makeFire(host: Host, caps: { flames: number; ground: number; smoke: number; sparks: number }, cold = 0) {
  const { THREE, scene } = host;
  const noise = makeNoise(THREE);
  const pool = (cap: number, frag: string, blending: TT.Blending, tilt = 6.2831): Pool => {
    const pos = new Float32Array(cap * 3);
    const size = new Float32Array(cap);
    const info = new Float32Array(cap * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("info", new THREE.BufferAttribute(info, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending,
      uniforms: { pr: { value: host.pixelRatio }, focal: { value: host.focal }, noise: { value: noise }, time: { value: 0 }, tilt: { value: tilt }, cold: { value: cold } },
      vertexShader: VERT,
      fragmentShader: frag,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    return { points, cap, pos, vel: new Float32Array(cap * 3), age: new Float32Array(cap).fill(99), life: new Float32Array(cap).fill(1), size0: new Float32Array(cap), grow: new Float32Array(cap), seed: new Float32Array(cap), buoy: new Float32Array(cap), size, info, next: 0, mat };
  };
  const flames = pool(caps.flames, FLAME_FRAG, THREE.AdditiveBlending);
  // flames that stand upright on a surface: turned only a little from the vertical
  const ground = pool(caps.ground, FLAME_FRAG, THREE.AdditiveBlending, 0.7);
  const smoke = pool(caps.smoke, SMOKE_FRAG, THREE.NormalBlending);
  const sparks = pool(caps.sparks, SPARK_FRAG, THREE.AdditiveBlending);
  // smoke is drawn first (under the flames)
  smoke.points.renderOrder = 1;
  flames.points.renderOrder = 2;
  ground.points.renderOrder = 2;
  sparks.points.renderOrder = 3;

  const emit = (p: Pool, at: TT.Vector3, v: TT.Vector3, life: number, size: number, growth: number, buoy: number) => {
    const i = p.next++ % p.cap;
    p.pos[i * 3] = at.x;
    p.pos[i * 3 + 1] = at.y;
    p.pos[i * 3 + 2] = at.z;
    p.vel[i * 3] = v.x;
    p.vel[i * 3 + 1] = v.y;
    p.vel[i * 3 + 2] = v.z;
    p.age[i] = 0;
    p.life[i] = life;
    p.size0[i] = size;
    p.grow[i] = growth;
    p.seed[i] = Math.random();
    p.buoy[i] = buoy;
  };
  const step = (p: Pool, dt: number, drag: number, fadeIn: number, fadeOutPow: number, gravity = 0) => {
    const damp = Math.exp(-drag * dt);
    for (let i = 0; i < p.cap; i++) {
      if (p.age[i] >= p.life[i]) {
        p.info[i * 3 + 2] = 0;
        continue;
      }
      p.age[i] += dt;
      const k = Math.min(1, p.age[i] / p.life[i]);
      p.vel[i * 3] *= damp;
      p.vel[i * 3 + 1] = p.vel[i * 3 + 1] * damp + (p.buoy[i] + gravity) * dt;
      p.vel[i * 3 + 2] *= damp;
      p.pos[i * 3] += p.vel[i * 3] * dt;
      p.pos[i * 3 + 1] += p.vel[i * 3 + 1] * dt;
      p.pos[i * 3 + 2] += p.vel[i * 3 + 2] * dt;
      p.size[i] = p.size0[i] * (1 + p.grow[i] * k);
      p.info[i * 3] = k;
      p.info[i * 3 + 1] = p.seed[i];
      p.info[i * 3 + 2] = Math.min(1, k * fadeIn) * Math.pow(1 - k, fadeOutPow);
    }
    const g = p.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.info.needsUpdate = true;
  };

  return {
    /** A flame: `buoy` is how hard it rises (pixels per second, per second). */
    flame: (at: TT.Vector3, v: TT.Vector3, life: number, size: number, growth = 1.2, buoy = 120) => emit(flames, at, v, life, size, growth, buoy),
    /** A flame standing on a surface: it keeps its tip up. */
    standing: (at: TT.Vector3, v: TT.Vector3, life: number, size: number, growth = 0.9, buoy = 130) => emit(ground, at, v, life, size, growth, buoy),
    smoke: (at: TT.Vector3, v: TT.Vector3, life: number, size: number, growth = 1.6, buoy = 30) => emit(smoke, at, v, life, size, growth, buoy),
    spark: (at: TT.Vector3, v: TT.Vector3, life: number, size: number) => emit(sparks, at, v, life, size, -0.5, 90),
    update(dt: number, time: number) {
      for (const p of [flames, ground, smoke, sparks]) p.mat.uniforms.time.value = time;
      step(flames, dt, 0.9, 8, 0.55);
      step(ground, dt, 0.9, 8, 0.55);
      step(smoke, dt, 0.45, 5, 0.8);
      step(sparks, dt, 0.25, 12, 0.6, -240);
    },
    dispose() {
      for (const p of [flames, ground, smoke, sparks]) {
        scene.remove(p.points);
        p.points.geometry.dispose();
        p.mat.dispose();
      }
      noise.dispose();
    },
  };
}

export type Fire = ReturnType<typeof makeFire>;
