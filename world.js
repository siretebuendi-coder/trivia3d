// La isla: montaña, camino en espiral, mar, árboles, nubes, casillas y cámara.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toon, gradientMap, OUTLINE } from './toon.js';
import { N, tileType, CHALLENGES, KIND_INFO, mulberry32 } from './shared.js';

const V3 = THREE.Vector3;
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- terreno ----------
export function terrainH(x, z) {
  const r = Math.hypot(x, z), d = r / 34;
  let h = 1.7 * (1 - ss(0.62, 0.95, d)) - 1.4 * ss(0.8, 1.18, d) - 6 * ss(1.0, 1.55, d);
  h += 15.5 * Math.exp(-Math.pow(r / 12, 2.2));
  const m = ss(0.1, 0.32, d) * (1 - ss(0.6, 0.9, d));
  h += m * (Math.sin(x * 0.28 + 1.3) * Math.cos(z * 0.25) * 0.55 + Math.sin(x * 0.7 + z * 0.9) * 0.18);
  return h;
}

// ---------- camino en espiral (casillas a la misma distancia unas de otras) ----------
const TURNS = 2.9, R0 = 26, R1 = 2.6, TH0 = Math.PI / 2;
const DENSE = 3600;
const dX = new Float32Array(DENSE), dZ = new Float32Array(DENSE), dS = new Float32Array(DENSE);
(function () {
  let s = 0;
  for (let i = 0; i < DENSE; i++) {
    const t = i / (DENSE - 1), th = TH0 - TURNS * 2 * Math.PI * t, r = R0 + (R1 - R0) * t;
    dX[i] = r * Math.cos(th);
    dZ[i] = r * Math.sin(th);
    if (i) s += Math.hypot(dX[i] - dX[i - 1], dZ[i] - dZ[i - 1]);
    dS[i] = s;
  }
})();
const LEN = dS[DENSE - 1];
export const SPACING = LEN / (N - 1);

function atS(s) {
  s = clamp(s, 0, LEN);
  let lo = 0, hi = DENSE - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (dS[mid] <= s) lo = mid; else hi = mid; }
  const f = (s - dS[lo]) / Math.max(1e-6, dS[hi] - dS[lo]);
  return [dX[lo] + (dX[hi] - dX[lo]) * f, dZ[lo] + (dZ[hi] - dZ[lo]) * f];
}
function tanAtS(s) {
  const a = atS(s - 0.6), b = atS(s + 0.6);
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}
export const TILES = Array.from({ length: N }, (_, i) => {
  const s = i * SPACING, [x, z] = atS(s), [tx, tz] = tanAtS(s);
  return { s, x, z, y: terrainH(x, z), tx, tz };
});
const PATHPTS = [];
for (let s = 0; s <= LEN; s += 0.4) PATHPTS.push(atS(s));
function distToPath(x, z) {
  let best = 1e9;
  for (const p of PATHPTS) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best);
}

// Sitio de cada equipo dentro de una casilla (4 huecos)
const SLOT = [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]];
export function tokenSpot(i, slot) {
  const T = TILES[i], nx = -T.tz, nz = T.tx, [a, b] = SLOT[slot % 4];
  return new V3(T.x + T.tx * a + nx * b, T.y + 0.22, T.z + T.tz * a + nz * b);
}
// El monstruo se planta en medio del camino, entre su casilla y la siguiente.
export function monsterSpot(i) {
  const T = TILES[i], s = T.s + 2.75, [x, z] = atS(s);
  return { pos: new V3(x, terrainH(x, z) - 0.05, z), yaw: Math.atan2(-T.tx, -T.tz) };
}
export const SUMMIT = new V3(0, terrainH(0, 0), 0);

// ---------- texturas dibujadas con canvas ----------
const FONT = 'Fredoka, "Segoe UI", system-ui, sans-serif';
const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const TILE_BG = {
  normal: '#fff1cf', bonus: '#8ee593', trap: '#ff8f84', monster: '#c9a8ff', start: '#ffffff', goal: '#ffd84d',
  mc: '#cfe3ff', open: '#bff3ee', draw: '#ffc4e4', blind: '#d2caff', match: '#c6f2d3', differ: '#ffd9b8', mime: '#ffc9d6', guess: '#ffeaa8',
};
function tileTexture(type, i) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = TILE_BG[type] || '#fff1cf';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(38,36,74,.28)';
    g.lineWidth = 12;
    g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const base = { bonus: ['⭐', '+3'], trap: ['💥', '−3'], monster: ['👹', ''], start: ['🏁', ''], goal: ['🏆', ''] }[type];
    const kind = KIND_INFO[type];
    const emoji = base ? base[0] : kind ? kind.emoji : '';
    const label = base ? base[1] : kind ? kind.name.toUpperCase() : '';
    if (emoji) {
      g.font = '112px ' + EMOJI;
      g.fillText(emoji, 128, 100);
      if (label) {
        g.font = '700 ' + (label.length > 7 ? 38 : 50) + 'px ' + FONT;
        g.fillStyle = 'rgba(38,36,74,.85)';
        g.fillText(label, 128, 205);
      }
    } else {
      g.font = '700 112px ' + FONT;
      g.fillStyle = 'rgba(38,36,74,.6)';
      g.fillText(String(i), 128, 136);
    }
  });
}

// ---------- ayudantes de escena ----------
function starGeometry() {
  const sh = new THREE.Shape();
  const R = 0.6, r = 0.27;
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i) sh.lineTo(x, y); else sh.moveTo(x, y);
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  g.center();
  return g;
}

function addMesh(scene, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, ol = 0.07, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || toon(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (o.rot) m.rotation.set(...o.rot);
  m.castShadow = o.cast !== false;
  m.receiveShadow = !!o.receive;
  if (ol) { const h = new THREE.Mesh(geo, OUTLINE); h.scale.setScalar(1 + ol); m.add(h); }
  scene.add(m);
  return m;
}

// ---------- el mundo ----------
export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe6ff, 140, 380);
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 1400);

  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
  const cylG = new THREE.CylinderGeometry(1, 1, 1, 20);
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const coneG = new THREE.ConeGeometry(1, 1, 10);
  const anim = []; // funciones que se ejecutan cada fotograma

  // --- luces ---
  scene.add(new THREE.HemisphereLight(0xe3f4ff, 0x86b45c, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2da, 2.3);
  sun.position.set(48, 74, 34);
  sun.target.position.set(0, 4, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);

  // --- cielo ---
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3d9bff) }, mid: { value: new THREE.Color(0xbfe6ff) }, bot: { value: new THREE.Color(0xd9f2ff) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0), 0.7)) : mix(mid, bot, clamp(-h*3.0,0.0,1.0)); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}',
    })
  );
  scene.add(sky);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,240,170,.95)'); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }),
    transparent: true, depthWrite: false, fog: false,
  }));
  sunSprite.position.set(300, 230, 200);
  sunSprite.scale.set(150, 150, 1);
  scene.add(sunSprite);

  // --- terreno con colores por altura / pendiente / camino ---
  const SEG = 200, SIZE = 110;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
  tg.computeVertexNormals();
  const nor = tg.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const C = (k) => new THREE.Color(k);
  const GRASS1 = C(0x78d65c), GRASS2 = C(0x5bbf4b), SAND = C(0xf5dd9d), WET = C(0xd9b878), DEEP = C(0x1b93bd);
  const ROCK1 = C(0xa8a09b), ROCK2 = C(0x8d8481), SNOW = C(0xffffff), DIRT = C(0xeacb8e);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), ny = nor.getY(i);
    const n = 0.5 + 0.5 * Math.sin(x * 0.9) * Math.cos(z * 0.8);
    c.copy(GRASS1).lerp(GRASS2, n);
    c.lerp(SAND, 1 - ss(0.3, 1.1, h));
    if (h < 0) c.lerp(WET, ss(0, -0.9, h));
    c.lerp(DEEP, ss(-1.0, -4.5, h));
    const slope = 1 - ny;
    const rk = Math.max(ss(0.2, 0.36, slope), ss(7.5, 10.5, h)) * (h > 0.5 ? 1 : 0);
    c.lerp(n > 0.5 ? ROCK1 : ROCK2, rk);
    c.lerp(SNOW, ss(12.4, 13.8, h + (n - 0.5) * 0.8));
    if (Math.abs(x) < 34 && Math.abs(z) < 34 && h > -0.2) {
      const dp = distToPath(x, z);
      c.lerp(DIRT, 1 - ss(1.7, 2.8, dp));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const terrain = new THREE.Mesh(tg, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // --- mar ---
  const deep = new THREE.Mesh(new THREE.CircleGeometry(600, 48), toon(0x1b93bd));
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -7.2;
  scene.add(deep);
  const water = new THREE.Mesh(new THREE.CircleGeometry(600, 64), new THREE.MeshBasicMaterial({ color: 0x3fcbe6, transparent: true, opacity: 0.74 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.05;
  scene.add(water);
  const waveTex = canvasTex(512, 512, (g) => {
    const rnd = mulberry32(5);
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 6;
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = rnd() * 512, y = rnd() * 512, w = 24 + rnd() * 34;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 10, x + w, y); g.stroke();
    }
  }, true);
  waveTex.repeat.set(70, 70);
  const waves = new THREE.Mesh(new THREE.CircleGeometry(600, 48), new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0.55, depthWrite: false }));
  waves.rotation.x = -Math.PI / 2;
  waves.position.y = -0.02;
  scene.add(waves);
  anim.push((dt, t) => { waveTex.offset.set(t * 0.004, t * 0.0025); water.position.y = -0.05 + Math.sin(t * 0.8) * 0.03; });

  // --- árboles y adornos (instanciados) ---
  function inst(geo, list, ol = 0.07) {
    const mesh = new THREE.InstancedMesh(geo, toon(0xffffff), list.length);
    const hull = new THREE.InstancedMesh(geo, OUTLINE, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    list.forEach((it, i) => {
      q.setFromEuler(e.set(0, it.ry || 0, 0));
      m4.compose(it.p, q, it.s);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, cc.set(it.c));
      m4.compose(it.p, q, it.s.clone().multiplyScalar(1 + ol));
      hull.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    scene.add(mesh, hull);
  }
  const rnd = mulberry32(2024);
  const taken = [];
  function place(count, tries, rMin, rMax, hMin, hMax, minPath, minGap) {
    const out = [];
    for (let k = 0; k < tries && out.length < count; k++) {
      const a = rnd() * Math.PI * 2, r = rMin + rnd() * (rMax - rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = terrainH(x, z);
      if (h < hMin || h > hMax) continue;
      if (distToPath(x, z) < minPath) continue;
      if (taken.some((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 < minGap * minGap)) continue;
      taken.push([x, z]);
      out.push({ x, z, h });
    }
    return out;
  }
  // Pinos
  {
    const trunk = [], low = [], high = [];
    const greens = [0x2f9e55, 0x3aae5c, 0x278a4b];
    for (const { x, z, h } of place(70, 5000, 6, 31, 1.2, 10, 3.6, 2.4)) {
      const sc = 0.8 + rnd() * 0.6, g = greens[Math.floor(rnd() * 3)];
      trunk.push({ p: new V3(x, h + 0.6 * sc, z), s: new V3(0.22 * sc, 1.2 * sc, 0.22 * sc), c: 0x8d5a2b });
      low.push({ p: new V3(x, h + 1.7 * sc, z), s: new V3(1.15 * sc, 1.9 * sc, 1.15 * sc), c: g });
      high.push({ p: new V3(x, h + 2.8 * sc, z), s: new V3(0.85 * sc, 1.6 * sc, 0.85 * sc), c: g });
    }
    inst(cylG, trunk);
    inst(coneG, low);
    inst(coneG, high);
  }
  // Árboles redondos
  {
    const trunk = [], crown = [];
    const greens = [0x62c94a, 0x4fb843, 0x7ad65a];
    for (const { x, z, h } of place(55, 4000, 11, 29, 1.0, 6.5, 3.6, 3.0)) {
      const sc = 0.8 + rnd() * 0.5, g = greens[Math.floor(rnd() * 3)];
      trunk.push({ p: new V3(x, h + 0.7 * sc, z), s: new V3(0.26 * sc, 1.4 * sc, 0.26 * sc), c: 0x9a6a3a });
      crown.push({ p: new V3(x, h + 2.0 * sc, z), s: new V3(1.35 * sc, 1.15 * sc, 1.35 * sc), c: g });
    }
    inst(cylG, trunk);
    inst(sphere, crown);
  }
  // Arbustos, rocas y flores
  {
    const bush = [];
    for (const { x, z, h } of place(60, 3000, 8, 30, 0.9, 7, 2.8, 1.6)) bush.push({ p: new V3(x, h + 0.2, z), s: new V3(0.8 + rnd() * 0.5, 0.55 + rnd() * 0.3, 0.8 + rnd() * 0.5), c: [0x4fb843, 0x6fcf55][Math.floor(rnd() * 2)] });
    inst(sphere, bush, 0.09);
    const rocks = [];
    for (const { x, z, h } of place(36, 3000, 6, 31, 0.8, 11, 2.6, 1.8)) {
      const s = 0.4 + rnd() * 0.8;
      rocks.push({ p: new V3(x, h + 0.15, z), s: new V3(s * 1.2, s * 0.8, s), c: [0xa8a09b, 0x8d8481, 0xbab2ad][Math.floor(rnd() * 3)], ry: rnd() * 6 });
    }
    inst(new THREE.DodecahedronGeometry(1, 0), rocks, 0.1);
    const flowers = [];
    const fc = [0xff8fb1, 0xffe14d, 0xffffff, 0xff9d5c, 0xc9a0ff];
    for (let k = 0; k < 2200 && flowers.length < 200; k++) {
      const a = rnd() * 6.283, r = 8 + rnd() * 21, x = Math.cos(a) * r, z = Math.sin(a) * r, h = terrainH(x, z);
      if (h < 1.1 || h > 8 || distToPath(x, z) < 2.4) continue;
      flowers.push({ p: new V3(x, h + 0.12, z), s: new V3(0.13, 0.13, 0.13), c: fc[Math.floor(rnd() * 5)] });
    }
    inst(sphere, flowers, 0.25);
  }
  // Palmeras en la playa
  for (const { x, z, h } of place(16, 3000, 26.5, 32, 0.3, 1.1, 3.2, 3.5)) {
    const g = new THREE.Group();
    g.position.set(x, h, z);
    g.rotation.y = rnd() * 6.28;
    const curve = new THREE.QuadraticBezierCurve3(new V3(0, 0, 0), new V3(0.5, 1.8, 0.2), new V3(1.1, 3.6, 0));
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.22, 7), toon(0xb9824a));
    trunk.castShadow = true;
    g.add(trunk);
    const top = new THREE.Group();
    top.position.set(1.1, 3.6, 0);
    g.add(top);
    for (let k = 0; k < 7; k++) {
      const leaf = new THREE.Mesh(coneG, toon(k % 2 ? 0x38b24f : 0x2f9e45));
      leaf.scale.set(0.34, 2.3, 0.1);
      leaf.position.set(Math.cos((k / 7) * 6.283) * 0.9, -0.15, Math.sin((k / 7) * 6.283) * 0.9);
      leaf.rotation.set(Math.sin((k / 7) * 6.283) * 1.1, 0, -Math.cos((k / 7) * 6.283) * 1.1);
      leaf.castShadow = true;
      top.add(leaf);
    }
    for (let k = 0; k < 2; k++) { const nut = new THREE.Mesh(sphere, toon(0x7a4a22)); nut.scale.setScalar(0.17); nut.position.set(0.15 * k, -0.35, 0.15); top.add(nut); }
    scene.add(g);
    const ph = rnd() * 6;
    anim.push((dt, t) => { top.rotation.z = Math.sin(t * 1.2 + ph) * 0.03; });
  }

  // --- nubes ---
  const cloudMat = toon(0xffffff);
  for (let i = 0; i < 12; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = rnd() * 6.28;
    const cloud = new THREE.Group();
    const n = 4 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const r = 2 + rnd() * 2;
      const m = new THREE.Mesh(sphere, cloudMat);
      m.scale.set(r * 1.2, r * 0.8, r);
      m.position.set((k - n / 2) * 2.6, rnd() * 0.9, (rnd() - 0.5) * 1.6);
      cloud.add(m);
    }
    const rad = 70 + rnd() * 80;
    cloud.position.set(rad, 30 + rnd() * 22, 0);
    pivot.add(cloud);
    scene.add(pivot);
    const sp = 0.004 + rnd() * 0.01;
    anim.push((dt) => { pivot.rotation.y += sp * dt; });
  }

  // --- barquitos ---
  [[44, 0.4], [52, 2.6], [47, 4.4]].forEach(([r, a], i) => {
    const b = new THREE.Group();
    b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    b.rotation.y = a + 1.2;
    const hull = addMesh(b, boxG, 0xc0763c, 0, 0.3, 0, 3.2, 0.8, 1.2, 0.07);
    addMesh(b, coneG, 0xc0763c, 1.9, 0.3, 0, 0.62, 0.9, 0.62, 0.07, { rot: [0, 0, -Math.PI / 2] });
    addMesh(b, cylG, 0x7a4a22, -0.1, 1.5, 0, 0.07, 2.4, 0.07, 0);
    addMesh(b, coneG, 0xffffff, 0.25, 1.7, 0, 0.9, 1.9, 0.06, 0.04, { rot: [0, 0, -0.1] });
    scene.add(b);
    anim.push((dt, t) => { b.position.y = Math.sin(t * 1.3 + i) * 0.12; b.rotation.z = Math.sin(t * 1.1 + i) * 0.05; });
  });

  // --- casillas ---
  const BODY = { normal: 0xd9cba6, bonus: 0x3fae52, trap: 0xc94b43, monster: 0x7a4bd6, start: 0xdddddd, goal: 0xe6b422,
    mc: 0x4f8fe8, open: 0x1fb5a8, draw: 0xe0559d, blind: 0x5b4bb7, match: 0x44b36b, differ: 0xe8803a, mime: 0xc2506a, guess: 0xd9a21f };
  const tileGroups = [];
  const starG = starGeometry();
  for (let i = 0; i < N; i++) {
    const T = TILES[i], type = tileType(i);
    const g = new THREE.Group();
    g.position.set(T.x, T.y, T.z);
    const bodyM = new THREE.Mesh(cyl8, toon(BODY[type]));
    bodyM.scale.set(1.5, 1.2, 1.5);
    bodyM.position.y = -0.4;
    bodyM.castShadow = true;
    bodyM.receiveShadow = true;
    const hull = new THREE.Mesh(cyl8, OUTLINE);
    hull.scale.setScalar(1.05);
    bodyM.add(hull);
    g.add(bodyM);
    const topM = new THREE.Mesh(new THREE.CircleGeometry(1.34, 8), new THREE.MeshToonMaterial({ map: tileTexture(type, i), gradientMap: gradientMap() }));
    topM.rotation.x = -Math.PI / 2;
    topM.position.y = 0.212;
    topM.receiveShadow = true;
    g.add(topM);
    if (type === 'bonus') {
      const st = new THREE.Mesh(starG, toon(0xffd23f));
      const h = new THREE.Mesh(starG, OUTLINE);
      h.scale.setScalar(1.12);
      st.add(h);
      st.position.y = 2.3;
      st.castShadow = true;
      g.add(st);
      anim.push((dt, t) => { st.rotation.y = t * 1.6; st.position.y = 2.3 + Math.sin(t * 2.4 + i) * 0.2; });
    } else if (CHALLENGES.has(type)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.17, 8, 18), toon(BODY[type]));
      const rh = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.17, 8, 18), OUTLINE);
      rh.scale.setScalar(1.12);
      ring.add(rh);
      ring.castShadow = true;
      g.add(ring);
      anim.push((dt, t) => { ring.rotation.y = t * 1.8; ring.rotation.x = Math.sin(t * 1.3 + i) * 0.5; ring.position.y = 2.2 + Math.sin(t * 2.2 + i) * 0.18; });
    } else if (type === 'trap') {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const sp = new THREE.Mesh(coneG, toon(0x7a2a2a));
        sp.scale.set(0.13, 0.46, 0.13);
        sp.position.set(Math.cos(a) * 1.42, 0.45, Math.sin(a) * 1.42);
        sp.castShadow = true;
        g.add(sp);
      }
    }
    scene.add(g);
    tileGroups.push({ g, baseY: T.y, bump: -1 });
  }
  // Arco de salida
  {
    const T = TILES[0], g = new THREE.Group();
    g.position.set(T.x, T.y, T.z);
    g.rotation.y = Math.atan2(T.tx, T.tz);
    for (const s of [-1, 1]) {
      addMesh(g, cylG, 0x9a6a3a, s * 2.3, 1.7, 0, 0.24, 3.4, 0.24, 0.08);
      addMesh(g, coneG, s > 0 ? 0xff6b57 : 0x3fa9ff, s * 2.3, 3.7, 0, 0.5, 0.7, 0.5, 0.08);
    }
    addMesh(g, boxG, 0x9a6a3a, 0, 3.5, 0, 4.9, 0.5, 0.36, 0.06);
    const signTex = canvasTex(512, 128, (cx) => {
      cx.fillStyle = '#fff3c9'; cx.fillRect(0, 0, 512, 128);
      cx.strokeStyle = '#1d1b3a'; cx.lineWidth = 10; cx.strokeRect(5, 5, 502, 118);
      cx.fillStyle = '#1d1b3a'; cx.font = '700 84px ' + FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText('¡SALIDA!', 256, 68);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 3.5, 0.2);
    g.add(sign);
    const sign2 = sign.clone();
    sign2.position.z = -0.2;
    sign2.rotation.y = Math.PI;
    g.add(sign2);
    scene.add(g);
  }
  // Cima: podio, copa de oro y bandera
  const trophy = new THREE.Group();
  {
    const g = trophy;
    g.position.set(SUMMIT.x, SUMMIT.y, SUMMIT.z);
    addMesh(g, cyl8, 0xb9b3ad, 0, 0.35, 0, 1.7, 0.7, 1.7, 0.05, { receive: true });
    addMesh(g, cyl8, 0xd6d0ca, 0, 0.8, 0, 1.2, 0.3, 1.2, 0.05);
    const pts = [[0.0, 0], [0.55, 0], [0.55, 0.12], [0.2, 0.3], [0.16, 0.9], [0.65, 1.25], [0.78, 1.9], [0.0, 1.9]].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), toon(0xffc933, { side: THREE.DoubleSide }));
    cup.position.y = 1.0;
    cup.castShadow = true;
    g.add(cup);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 16), toon(0xffc933));
      h.position.set(s * 0.82, 2.2, 0);
      g.add(h);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.8 }));
    ring.position.y = 2.2;
    g.add(ring);
    const st = new THREE.Mesh(starG, toon(0xffd23f));
    st.position.y = 3.7;
    st.scale.setScalar(0.8);
    g.add(st);
    anim.push((dt, t) => { ring.rotation.x = t * 1.2; ring.rotation.y = t * 0.8; st.rotation.y = t * 2; st.position.y = 3.7 + Math.sin(t * 2) * 0.15; });
    scene.add(g);
    // bandera de meta
    const pole = new THREE.Group();
    pole.position.set(2.6, SUMMIT.y - 0.5, -2.6);
    addMesh(pole, cylG, 0xeeeeee, 0, 2.2, 0, 0.09, 4.4, 0.09, 0.1);
    const flagTex = canvasTex(256, 160, (cx) => {
      for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) { cx.fillStyle = (x + y) % 2 ? '#1d1b3a' : '#ffffff'; cx.fillRect(x * 32, y * 32, 32, 32); }
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(1.15, 3.7, 0);
    pole.add(flag);
    scene.add(pole);
    anim.push((dt, t) => { flag.rotation.y = Math.sin(t * 3) * 0.25; });
  }

  // --- cámara ---
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.enablePan = false;

  const LOBBY_POS = new V3(0, 40, 80), LOBBY_TGT = new V3(0, 5, 0);
  camera.position.copy(LOBBY_POS);
  controls.target.copy(LOBBY_TGT);

  const world = {
    renderer, scene, camera, controls,
    mode: 'lobby',
    onMode: () => {},
    focus: new V3(), ftx: 0, ftz: 1,
    _fly: null,
    _winA: 0,
  };

  function applyMode(m) {
    world.mode = m;
    controls.autoRotate = m === 'lobby';
    controls.autoRotateSpeed = 0.9;
    controls.enablePan = m === 'free';
    world.onMode(m);
  }
  world.setMode = (m) => {
    if (m === 'overview') return world.flyTo(new V3(0, 58, 70), new V3(0, 6, 0), 1.6, 'free');
    if (m === 'lobby') return world.flyTo(LOBBY_POS, LOBBY_TGT, 2.2, 'lobby');
    if (m === 'win') world._winA = Math.atan2(camera.position.z, camera.position.x);
    applyMode(m);
  };
  world.flyTo = (pos, tgt, dur, after) => {
    world._fly = { fp: camera.position.clone(), ft: controls.target.clone(), tp: pos.clone(), tt: tgt.clone(), t: 0, dur, after };
    world.mode = 'fly';
    controls.autoRotate = false;
  };
  world.setFocus = (p, tx, tz) => { world.focus.copy(p); world.ftx = tx; world.ftz = tz; };
  controls.addEventListener('start', () => { if (world.mode === 'auto') applyMode('follow'); });
  applyMode('lobby');

  world.bump = (i) => { if (tileGroups[i]) tileGroups[i].bump = 0; };
  world.tokenSpot = tokenSpot;
  world.monsterSpot = monsterSpot;
  world.add = (o) => scene.add(o);
  world.resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  const desired = new V3(), tgt = new V3();
  world.update = (dt, t) => {
    for (const f of anim) f(dt, t);
    for (const tg of tileGroups) {
      if (tg.bump >= 0) {
        tg.bump += dt / 0.35;
        tg.g.position.y = tg.baseY - Math.sin(Math.PI * Math.min(1, tg.bump)) * 0.22;
        if (tg.bump >= 1) { tg.bump = -1; tg.g.position.y = tg.baseY; }
      }
    }
    const f = world.focus;
    const m = world.mode;
    if (m === 'auto') {
      desired.set(f.x - world.ftx * 9.5, f.y + 5.6, f.z - world.ftz * 9.5);
      desired.y = Math.max(desired.y, terrainH(desired.x, desired.z) + 2.2);
      tgt.set(f.x + world.ftx * 2.5, f.y + 1.3, f.z + world.ftz * 2.5);
      const k = 1 - Math.exp(-dt * 2.2);
      camera.position.lerp(desired, k);
      controls.target.lerp(tgt, k * 1.3);
    } else if (m === 'follow') {
      tgt.set(f.x, f.y + 1.3, f.z);
      const d = tgt.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 5));
      controls.target.add(d);
      camera.position.add(d);
    } else if (m === 'fly' && world._fly) {
      const F = world._fly;
      F.t += dt;
      const k = ss(0, 1, F.t / F.dur);
      camera.position.lerpVectors(F.fp, F.tp, k);
      controls.target.lerpVectors(F.ft, F.tt, k);
      if (F.t >= F.dur) { world._fly = null; applyMode(F.after); }
    } else if (m === 'win') {
      world._winA += dt * 0.35;
      desired.set(SUMMIT.x + Math.cos(world._winA) * 14, SUMMIT.y + 7.5, SUMMIT.z + Math.sin(world._winA) * 14);
      const k = 1 - Math.exp(-dt * 1.5);
      camera.position.lerp(desired, k);
      tgt.set(SUMMIT.x, SUMMIT.y + 2.5, SUMMIT.z);
      controls.target.lerp(tgt, k);
    }
    controls.update(dt);
    const gy = terrainH(camera.position.x, camera.position.z) + 1.4;
    if (camera.position.y < gy) camera.position.y = gy;
  };

  return world;
}
