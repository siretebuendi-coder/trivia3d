// Personajes (avatares) y monstruos, construidos con formas simples en estilo dibujo animado.
import * as THREE from 'three';
import { toon, OUTLINE, INK } from './toon.js';

// ---------- geometrías compartidas y ayudantes ----------
const geoCache = new Map();
const G = (k, make) => {
  let g = geoCache.get(k);
  if (!g) { g = make(); geoCache.set(k, g); }
  return g;
};
const U = {
  s: () => G('s', () => new THREE.SphereGeometry(1, 28, 18)),
  c: () => G('c', () => new THREE.ConeGeometry(1, 1, 18)),
  y: () => G('y', () => new THREE.CylinderGeometry(1, 1, 1, 24)),
  b: () => G('b', () => new THREE.BoxGeometry(1, 1, 1)),
  o: () => G('o', () => new THREE.OctahedronGeometry(1, 0)),
};

function mk(parent, geo, color, pos, scale, rot, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || toon(color));
  m.position.set(pos[0], pos[1], pos[2]);
  m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  if (o.ol !== 0) {
    const h = new THREE.Mesh(geo, OUTLINE);
    h.scale.setScalar(1 + (o.ol ?? 0.09));
    m.add(h);
  }
  parent.add(m);
  return m;
}
const ball = (p, c, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, o) => mk(p, U.s(), c, [x, y, z], [r * sx, r * sy, r * sz], null, o);
const cone = (p, c, r, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => mk(p, U.c(), c, [x, y, z], [r, h, r], [rx, ry, rz], o);
const cyl = (p, c, r, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => mk(p, U.y(), c, [x, y, z], [r, h, r], [rx, ry, rz], o);
const box = (p, c, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => mk(p, U.b(), c, [x, y, z], [w, h, d], [rx, ry, rz], o);
const glow = (hex) => new THREE.MeshBasicMaterial({ color: hex });

// ---------- esqueleto común de los avatares ----------
function rig(shirt, skin, o = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  ball(body, shirt, 0.42, 0, 0.5, 0, 1, 1.05, 0.92);
  const head = new THREE.Group();
  head.position.y = 1.28;
  body.add(head);
  if (!o.noHead) ball(head, skin, 0.52);
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.43, 0.78, 0);
  armR.position.set(0.43, 0.78, 0);
  ball(armL, skin, 0.15, 0, -0.2, 0, 1, 1.5, 1);
  ball(armR, skin, 0.15, 0, -0.2, 0, 1, 1.5, 1);
  body.add(armL, armR);
  const foot = o.foot ?? skin;
  ball(body, foot, 0.16, -0.2, 0.1, 0.1, 1, 0.7, 1.35);
  ball(body, foot, 0.16, 0.2, 0.1, 0.1, 1, 0.7, 1.35);
  return { root, body, head, armL, armR, eyes: null, mouth: null, update: null };
}

function face(r, o = {}) {
  const h = r.head;
  const eyes = new THREE.Group();
  h.add(eyes);
  r.eyes = eyes;
  const ex = o.ex ?? 0.2, ey = o.ey ?? 0.06, ez = o.ez ?? 0.42;
  if (!o.noEyes) {
    for (const s of [-1, 1]) {
      ball(eyes, 0xffffff, 0.15, s * ex, ey, ez, 1, 1.18, 0.62);
      ball(eyes, INK, 0.085, s * ex, ey - 0.01, ez + 0.07, 1, 1.15, 0.6, { ol: 0 });
      ball(eyes, 0xffffff, 0.032, s * ex + 0.03, ey + 0.04, ez + 0.115, 1, 1, 1, { ol: 0 });
    }
  }
  if (!o.noCheeks) for (const s of [-1, 1]) ball(h, 0xff8fa3, 0.075, s * 0.33, -0.07, 0.36, 1, 0.8, 0.4, { ol: 0 });
  if (!o.noMouth) {
    const m = new THREE.Group();
    m.position.set(0, o.my ?? -0.2, o.mz ?? 0.47);
    h.add(m);
    const t = new THREE.Mesh(G('mouth', () => new THREE.TorusGeometry(0.085, 0.022, 6, 14, Math.PI)), toon(0x3b1d29));
    t.rotation.z = Math.PI;
    t.position.y = 0.06;
    t.scale.x = o.mw ?? 1;
    m.add(t);
    r.mouth = m;
  }
}

// Cadena de bolas para colas (con movimiento)
function tail(r, color, pts, parentPos = [0, 0.35, -0.38]) {
  const g = new THREE.Group();
  g.position.set(...parentPos);
  r.body.add(g);
  for (const [x, y, z, rad, c] of pts) ball(g, c ?? color, rad, x, y, z);
  return g;
}

// ---------- los 8 avatares ----------
const SP = {
  gato(c) {
    const S = 0xffa94d;
    const r = rig(c, S);
    face(r, { my: -0.19 });
    const h = r.head;
    for (const s of [-1, 1]) {
      cone(h, S, 0.17, 0.36, s * 0.29, 0.5, 0, 0, 0, -s * 0.32);
      cone(h, 0xffb3c1, 0.09, 0.2, s * 0.28, 0.47, 0.06, 0, 0, -s * 0.32, { ol: 0 });
      for (const dy of [-0.045, 0.03]) box(h, 0x3b1d29, 0.3, 0.014, 0.014, s * 0.43, -0.1 + dy, 0.4, 0, s * 0.35, s * dy * 2, { ol: 0 });
    }
    ball(h, 0xff7a93, 0.045, 0, -0.07, 0.5, 1, 0.8, 0.7, { ol: 0 });
    for (const x of [-0.12, 0, 0.12]) box(h, 0xe0802a, 0.05, 0.14, 0.02, x, 0.46, 0.2, -0.5, 0, 0, { ol: 0 });
    const tl = tail(r, S, [[0, 0.1, -0.1, 0.1], [0, 0.26, -0.2, 0.095], [0, 0.43, -0.22, 0.09], [0, 0.58, -0.16, 0.09]]);
    r.update = (t) => { tl.rotation.x = Math.sin(t * 3) * 0.25; tl.rotation.z = Math.sin(t * 2) * 0.2; };
    return r;
  },
  rana(c) {
    const S = 0x6fd65a;
    const r = rig(c, S);
    face(r, { noEyes: true, my: -0.2, mw: 1.9 });
    const h = r.head;
    for (const s of [-1, 1]) {
      ball(h, S, 0.2, s * 0.26, 0.42, 0.1);
      ball(h, 0xffffff, 0.14, s * 0.26, 0.46, 0.26, 1, 1.1, 0.7);
      ball(h, INK, 0.08, s * 0.26, 0.45, 0.34, 1, 1.1, 0.6, { ol: 0 });
      ball(h, 0xffffff, 0.03, s * 0.285, 0.5, 0.385, 1, 1, 1, { ol: 0 });
      ball(h, 0x4fb843, 0.05, s * 0.08, -0.02, 0.5, 1, 1, 0.5, { ol: 0 });
    }
    r.eyes = null;
    return r;
  },
  oso(c) {
    const S = 0xa86a3c;
    const r = rig(c, S);
    face(r, { my: -0.24, mz: 0.58, ey: 0.1, ex: 0.21 });
    const h = r.head;
    for (const s of [-1, 1]) {
      ball(h, S, 0.19, s * 0.38, 0.4, -0.02);
      ball(h, 0xe8b88a, 0.1, s * 0.38, 0.4, 0.1, 1, 1, 0.5, { ol: 0 });
    }
    ball(h, 0xe9c9a0, 0.22, 0, -0.12, 0.4, 1, 0.8, 0.8);
    ball(h, INK, 0.065, 0, -0.04, 0.58, 1.1, 0.8, 0.8, { ol: 0 });
    return r;
  },
  robot(c) {
    const S = 0xcfd8e3;
    const r = rig(c, S, { noHead: true, foot: 0x8896a8 });
    const h = r.head;
    box(h, S, 0.98, 0.84, 0.88, 0, 0, 0);
    box(h, 0x1f2a44, 0.8, 0.34, 0.1, 0, 0.08, 0.42, 0, 0, 0, { ol: 0 });
    const eyes = new THREE.Group();
    h.add(eyes);
    r.eyes = eyes;
    for (const s of [-1, 1]) box(eyes, 0x5ef2ff, 0.17, 0.12, 0.05, s * 0.2, 0.08, 0.47, 0, 0, 0, { ol: 0, mat: glow(0x5ef2ff) });
    box(h, 0x1f2a44, 0.32, 0.09, 0.05, 0, -0.22, 0.45, 0, 0, 0, { ol: 0 });
    for (const x of [-0.08, 0, 0.08]) box(h, 0xcfd8e3, 0.02, 0.08, 0.06, x, -0.22, 0.46, 0, 0, 0, { ol: 0 });
    for (const s of [-1, 1]) cyl(h, 0x8896a8, 0.1, 0.14, s * 0.52, 0, 0, 0, 0, Math.PI / 2);
    cyl(h, 0x8896a8, 0.025, 0.32, 0, 0.58, 0);
    const bulb = ball(h, 0xff5a5f, 0.09, 0, 0.78, 0, 1, 1, 1, { mat: glow(0xff5a5f) });
    r.update = (t) => { bulb.scale.setScalar(0.09 * (1 + Math.sin(t * 6) * 0.2)); };
    return r;
  },
  mago(c) {
    const S = 0xffd6b0;
    const r = rig(c, S);
    face(r, { my: -0.22 });
    const h = r.head;
    ball(h, 0xf2b894, 0.085, 0, -0.06, 0.5, 1, 0.9, 0.9, { ol: 0.1 });
    cone(h, 0xffffff, 0.3, 0.78, 0, -0.64, 0.2, Math.PI, 0, 0);
    for (const s of [-1, 1]) ball(h, 0xffffff, 0.09, s * 0.1, -0.14, 0.47, 1, 0.7, 0.7);
    const hat = new THREE.Group();
    hat.position.y = 0.42;
    h.add(hat);
    cyl(hat, 0x5b3fb8, 0.74, 0.07, 0, 0, 0);
    cyl(hat, 0xf1c40f, 0.44, 0.12, 0, 0.1, 0);
    cone(hat, 0x5b3fb8, 0.43, 1.05, 0, 0.66, 0, 0, 0, 0.12);
    ball(hat, 0xffd54a, 0.075, 0.1, 0.45, 0.4, 1, 1, 0.5, { ol: 0 });
    ball(hat, 0xffd54a, 0.055, -0.08, 0.7, 0.34, 1, 1, 0.5, { ol: 0 });
    return r;
  },
  unicornio(c) {
    const S = 0xfff4fa;
    const r = rig(c, S);
    face(r, { my: -0.19 });
    const h = r.head;
    cone(h, 0xffd54a, 0.09, 0.52, 0, 0.68, 0.12, 0.28, 0, 0);
    for (const s of [-1, 1]) {
      cone(h, S, 0.12, 0.28, s * 0.24, 0.5, -0.04, 0, 0, -s * 0.25);
      cone(h, 0xffb3d9, 0.06, 0.16, s * 0.24, 0.48, 0.02, 0, 0, -s * 0.25, { ol: 0 });
    }
    const manes = [[0, 0.5, -0.17, 0.17, 0xff7eb6], [0, 0.34, -0.36, 0.18, 0xb388ff], [0, 0.1, -0.46, 0.17, 0x7ee0ff], [0.12, 0.5, 0.1, 0.12, 0xff7eb6], [-0.12, 0.5, 0.1, 0.12, 0xb388ff]];
    for (const [x, y, z, rad, col] of manes) ball(h, col, rad, x, y, z);
    const tl = tail(r, 0xff7eb6, [[0, 0.06, -0.08, 0.14, 0xff7eb6], [0, -0.06, -0.22, 0.13, 0xb388ff], [0, -0.2, -0.3, 0.12, 0x7ee0ff]], [0, 0.45, -0.38]);
    r.update = (t) => { tl.rotation.x = Math.sin(t * 3) * 0.3; };
    return r;
  },
  dino(c) {
    const S = 0x52d6a8;
    const r = rig(c, S);
    face(r, { ey: 0.15, ex: 0.2, my: -0.2, mz: 0.7, noCheeks: true });
    const h = r.head;
    ball(h, S, 0.28, 0, -0.1, 0.4, 1, 0.8, 1.1);
    for (const s of [-1, 1]) ball(h, INK, 0.03, s * 0.09, -0.02, 0.69, 1, 1, 1, { ol: 0 });
    for (const [y, z, hh] of [[0.52, -0.05, 0.24], [0.42, -0.3, 0.22], [0.25, -0.45, 0.2]]) cone(h, 0xff9f43, 0.12, hh, 0, y, z, -0.5, 0, 0);
    for (const y of [0.95, 0.75]) cone(r.body, 0xff9f43, 0.11, 0.22, 0, y, -0.36, -0.9, 0, 0);
    const tl = tail(r, S, [[0, 0.02, -0.12, 0.2], [0, 0.0, -0.36, 0.15], [0, -0.02, -0.56, 0.1]], [0, 0.3, -0.3]);
    r.update = (t) => { tl.rotation.y = Math.sin(t * 3.5) * 0.35; };
    return r;
  },
  pato(c) {
    const S = 0xffe45c;
    const r = rig(c, S, { foot: 0xff9f1c });
    face(r, { noMouth: true, ey: 0.14, ex: 0.2 });
    const h = r.head;
    ball(h, 0xff9f1c, 0.2, 0, -0.07, 0.5, 1.25, 0.5, 0.9);
    ball(h, 0xf08a00, 0.15, 0, -0.16, 0.48, 1.15, 0.4, 0.8);
    for (const x of [-0.07, 0, 0.07]) ball(h, S, 0.07, x, 0.52 + (x === 0 ? 0.04 : 0), 0.0);
    cone(r.body, S, 0.13, 0.26, 0, 0.45, -0.42, -0.9, 0, 0);
    return r;
  },
};

export function buildAvatar(id, color) {
  return (SP[id] || SP.gato)(color);
}

// ---------- ficha de jugador (equipo) ----------
export class Token {
  constructor(avatarId, color) {
    this.group = new THREE.Group();
    this.holder = new THREE.Group();
    this.group.add(this.holder);
    this.color = color;
    mk(this.group, U.y(), color, [0, 0.04, 0], [0.52, 0.08, 0.52], null, { ol: 0.1 });
    this.arrow = new THREE.Group();
    this.group.add(this.arrow);
    cone(this.arrow, color, 0.3, 0.55, 0, 0, 0, Math.PI, 0, 0, { ol: 0.12 });
    this.arrow.visible = false;
    this.base = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.faceCam = false;
    this.camPos = null;
    this.seed = Math.random() * 10;
    this.t = this.seed;
    this.hop = null;
    this.act = null;
    this.active = false;
    this.blinkT = 2 + Math.random() * 2;
    this.blink = 0;
    this.avatarId = null;
    this.rig = null;
    this.setAvatar(avatarId);
  }

  setAvatar(id) {
    if (this.avatarId === id) return;
    if (this.rig) this.holder.remove(this.rig.root);
    this.rig = buildAvatar(id, this.color);
    this.holder.add(this.rig.root);
    this.avatarId = id;
  }

  place(v) {
    this.base.copy(v);
    this.group.position.copy(v);
    this.hop = null;
  }

  face(angle) { this.targetYaw = angle; }

  hopTo(to, dur = 0.42, h = 1.1) {
    return new Promise((res) => {
      const from = this.base.clone();
      const d = to.clone().sub(from);
      if (d.x || d.z) this.targetYaw = Math.atan2(d.x, d.z);
      this.hop = { from, to: to.clone(), k: 0, dur, h, res };
    });
  }

  _act(type, dur) {
    if (this.act && this.act.type === 'dance') return Promise.resolve();
    return new Promise((res) => { this.act = { type, t: 0, dur, res }; });
  }
  cheer(dur = 1.7) { return this._act('cheer', dur); }
  sad(dur = 1.9) { return this._act('sad', dur); }
  dance() { return this._act('dance', 1e9); }
  stop() {
    if (this.act) { const r = this.act.res; this.act = null; r(); }
  }

  update(dt) {
    const rig = this.rig;
    if (!rig) return;
    this.t += dt;
    const t = this.t;
    if (this.faceCam && this.camPos && !this.hop) {
      this.targetYaw = Math.atan2(this.camPos.x - this.base.x, this.camPos.z - this.base.z);
    }

    let lift = 0;
    let sq = Math.sin(t * 3) * 0.018;
    let aL = -0.32 + Math.sin(t * 2) * 0.06;
    let aR = 0.32 - Math.sin(t * 2) * 0.06;
    let headX = 0;
    let mouth = 0;

    if (this.hop) {
      const H = this.hop;
      H.k += dt / H.dur;
      const k = Math.min(1, H.k);
      this.base.lerpVectors(H.from, H.to, k);
      lift = Math.sin(Math.PI * k) * H.h;
      sq = 0.22 * Math.max(0, 1 - k / 0.18) + 0.22 * Math.max(0, (k - 0.85) / 0.15) - 0.12 * Math.sin(Math.PI * k);
      aL = -1.25;
      aR = 1.25;
      if (k >= 1) { this.hop = null; H.res(); }
    }

    const A = this.act;
    if (A) {
      A.t += dt;
      const k = Math.min(1, A.t / A.dur);
      if (A.type === 'cheer') {
        lift += Math.abs(Math.sin(Math.PI * 3 * k)) * 0.8;
        aL = -2.7 + Math.sin(t * 14) * 0.25;
        aR = 2.7 - Math.sin(t * 14) * 0.25;
        headX = -0.15;
      } else if (A.type === 'sad') {
        aL = -0.08;
        aR = 0.08;
        headX = 0.5;
        mouth = Math.PI;
        sq = 0.07;
        this.targetYaw += Math.sin(t * 18) * dt * 0.8;
      } else if (A.type === 'dance') {
        lift += Math.abs(Math.sin(t * 6)) * 0.9;
        aL = -2.5 + Math.sin(t * 12) * 0.4;
        aR = 2.5 - Math.sin(t * 12) * 0.4;
        this.yaw += dt * 5;
        this.targetYaw = this.yaw;
        headX = -0.1;
      }
      if (A.type !== 'dance' && k >= 1) { this.act = null; A.res(); }
    }

    let dy = this.targetYaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * Math.min(1, dt * 9);
    this.holder.rotation.y = this.yaw;

    this.group.position.set(this.base.x, this.base.y + lift, this.base.z);
    this.holder.scale.set(1 + sq * 0.7, 1 - sq, 1 + sq * 0.7);

    const f = Math.min(1, dt * 14);
    rig.armL.rotation.z += (aL - rig.armL.rotation.z) * f;
    rig.armR.rotation.z += (aR - rig.armR.rotation.z) * f;
    rig.head.rotation.x += (headX - rig.head.rotation.x) * Math.min(1, dt * 8);
    if (rig.mouth) rig.mouth.rotation.z += (mouth - rig.mouth.rotation.z) * Math.min(1, dt * 10);
    if (rig.update) rig.update(t, dt);
    if (rig.eyes) {
      this.blinkT -= dt;
      if (this.blinkT < 0) { this.blinkT = 2.5 + Math.random() * 3; this.blink = 0.13; }
      if (this.blink > 0) { this.blink -= dt; rig.eyes.scale.y = 0.1; } else rig.eyes.scale.y = 1;
    }
    this.arrow.visible = this.active;
    if (this.active) {
      this.arrow.position.y = 2.7 + Math.sin(t * 5) * 0.14 + lift * 0.0;
      this.arrow.rotation.y = t * 2;
    }
  }
}

// ---------- monstruos ----------
function buildBlob() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const GR = 0x58c84a;
  ball(body, GR, 1.05, 0, 1.0, 0, 1, 0.95, 1);
  ball(body, 0xcdf28f, 0.72, 0, 0.85, 0.62, 1, 0.95, 0.5);
  for (const [x, y, z, r] of [[-0.5, 1.85, 0.25, 0.16], [0.35, 1.95, 0.05, 0.12], [0.68, 1.55, 0.3, 0.11], [-0.7, 1.4, 0.4, 0.1]]) ball(body, 0x3ea437, r, x, y, z, 1, 0.6, 1, { ol: 0 });
  for (const s of [-1, 1]) cone(body, 0xfff0c9, 0.22, 0.62, s * 0.55, 2.0, 0.1, 0, 0, -s * 0.4);
  const eyes = new THREE.Group();
  eyes.position.y = 1.5; // el grupo gira alrededor de la altura de los ojos (para parpadear bien)
  body.add(eyes);
  for (const s of [-1, 1]) {
    ball(eyes, 0xffffff, 0.24, s * 0.38, 0, 0.78, 1, 1.1, 0.6);
    ball(eyes, INK, 0.12, s * 0.38, -0.02, 0.9, 1, 1.1, 0.6, { ol: 0 });
    ball(eyes, 0xffffff, 0.04, s * 0.41, 0.04, 0.95, 1, 1, 1, { ol: 0 });
    box(eyes, INK, 0.42, 0.09, 0.07, s * 0.38, 0.34, 0.86, 0, 0, s * 0.42, { ol: 0 });
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.98, 0.94);
  body.add(jaw);
  ball(jaw, 0x2a1020, 0.5, 0, 0, 0, 1, 0.62, 0.3, { ol: 0.06 });
  for (const x of [-0.27, -0.09, 0.09, 0.27]) cone(jaw, 0xffffff, 0.07, 0.17, x, 0.14, 0.12, Math.PI, 0, 0, { ol: 0.12 });
  for (const x of [-0.18, 0, 0.18]) cone(jaw, 0xffffff, 0.07, 0.15, x, -0.14, 0.12, 0, 0, 0, { ol: 0.12 });
  ball(jaw, 0xff7a93, 0.17, 0, -0.1, 0.1, 1, 0.5, 0.5, { ol: 0 });
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-1.0, 1.15, 0.2);
  armR.position.set(1.0, 1.15, 0.2);
  body.add(armL, armR);
  for (const a of [armL, armR]) ball(a, GR, 0.3, 0, -0.4, 0, 1, 1.6, 1);
  for (const s of [-1, 1]) ball(body, 0x3ea437, 0.42, s * 0.5, 0.28, 0.4, 1, 0.6, 1.3);
  return {
    root, body, jaw, eyes, height: 2.6,
    pose(t, k) {
      body.scale.y = 1 + Math.sin(t * 2) * 0.025 + k.roar * 0.06;
      armL.rotation.z = -0.35 + Math.sin(t * 2.2) * 0.1 - k.roar * 1.3;
      armR.rotation.z = 0.35 - Math.sin(t * 2.2 + 1) * 0.1 + k.roar * 1.3;
    },
  };
}

function buildCyclops() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const P = 0x9b5de5, D = 0x7b3fcf;
  ball(body, P, 1.0, 0, 1.0, 0);
  cone(body, D, 0.18, 0.5, 0, 2.02, 0);
  for (const s of [-1, 1]) {
    cone(body, D, 0.16, 0.45, s * 0.35, 1.93, 0.05, 0, 0, -s * 0.45);
    cone(body, 0xfff0c9, 0.15, 0.4, s * 0.8, 1.55, 0.1, 0, 0, -s * 0.8);
  }
  const eyes = new THREE.Group();
  eyes.position.y = 1.2;
  body.add(eyes);
  ball(eyes, 0xffffff, 0.5, 0, 0, 0.7, 1, 1, 0.55);
  ball(eyes, 0xff5a5f, 0.28, 0, 0, 0.96, 1, 1, 0.35, { ol: 0 });
  ball(eyes, INK, 0.15, 0, 0, 1.04, 1, 1, 0.3, { ol: 0 });
  ball(eyes, 0xffffff, 0.06, 0.08, 0.08, 1.1, 1, 1, 0.5, { ol: 0 });
  for (const s of [-1, 1]) box(body, INK, 0.5, 0.12, 0.1, s * 0.27, 1.86, 0.84, 0, 0, s * 0.35, { ol: 0 });
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.55, 0.9);
  body.add(jaw);
  ball(jaw, 0x2a1020, 0.45, 0, 0, 0, 1, 0.6, 0.3, { ol: 0.06 });
  for (const x of [-0.14, 0.14]) box(jaw, 0xffffff, 0.16, 0.2, 0.08, x, 0.1, 0.12, 0, 0, 0, { ol: 0.1 });
  ball(jaw, 0xff7a93, 0.14, 0, -0.1, 0.1, 1, 0.5, 0.5, { ol: 0 });
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-1.0, 1.0, 0.1);
  armR.position.set(1.0, 1.0, 0.1);
  body.add(armL, armR);
  for (const a of [armL, armR]) ball(a, P, 0.28, 0, -0.4, 0, 1, 1.6, 1);
  const club = new THREE.Group();
  club.position.set(0.05, -0.7, 0.18);
  armR.add(club);
  cyl(club, 0x8d5a2b, 0.17, 1.4, 0, 0.7, 0);
  ball(club, 0x8d5a2b, 0.32, 0, 1.5, 0, 1, 1.2, 1);
  for (const [x, y, z] of [[0.3, 1.5, 0], [-0.3, 1.5, 0], [0, 1.5, 0.3], [0, 1.78, 0]]) ball(club, 0xb8b8c8, 0.07, x, y, z, 1, 1, 1, { ol: 0 });
  for (const s of [-1, 1]) ball(body, D, 0.4, s * 0.45, 0.28, 0.35, 1, 0.6, 1.3);
  return {
    root, body, jaw, eyes, height: 2.5,
    pose(t, k) {
      body.scale.y = 1 + Math.sin(t * 1.8) * 0.025;
      armL.rotation.z = -0.35 + Math.sin(t * 2) * 0.08 - k.roar * 0.8;
      armR.rotation.z = 0.5 - Math.sin(t * 1.5) * 0.08 + k.roar * 1.5;
    },
  };
}

function buildDragon() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const R = 0xe8453c, L = 0xffe3a3, W = 0xf2765b;
  ball(body, R, 1.0, 0, 1.0, 0, 1, 0.9, 1.15);
  ball(body, L, 0.7, 0, 0.85, 0.62, 1, 0.85, 0.5);
  for (const [y, z] of [[2.0, 0], [1.95, -0.35], [1.8, -0.7]]) cone(body, L, 0.14, 0.35, 0, y, z, -0.4, 0, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.95, 0.6);
  body.add(head);
  ball(head, R, 0.62);
  ball(head, R, 0.36, 0, -0.12, 0.52, 1, 0.75, 1.1);
  const eyes = new THREE.Group();
  eyes.position.y = 0.12;
  head.add(eyes);
  for (const s of [-1, 1]) {
    ball(head, INK, 0.04, s * 0.1, -0.04, 0.92, 1, 1, 1, { ol: 0 });
    ball(eyes, 0xfff2a8, 0.17, s * 0.3, 0, 0.5, 1, 1.1, 0.6);
    ball(eyes, INK, 0.1, s * 0.3, 0, 0.6, 0.45, 1.2, 0.5, { ol: 0 });
    box(head, INK, 0.3, 0.07, 0.07, s * 0.3, 0.36, 0.54, 0, 0, s * 0.4, { ol: 0 });
    cone(head, L, 0.13, 0.6, s * 0.3, 0.62, -0.15, -0.5, 0, -s * 0.25);
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.27, 0.72);
  head.add(jaw);
  ball(jaw, 0x2a1020, 0.26, 0, 0, 0, 1, 0.4, 0.85, { ol: 0.06 });
  for (const x of [-0.12, 0, 0.12]) cone(jaw, 0xffffff, 0.05, 0.12, x, 0.07, 0.12, Math.PI, 0, 0, { ol: 0.1 });
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group();
    p.position.set(s * 0.7, 1.45, -0.3);
    body.add(p);
    mk(p, U.c(), W, [s * 0.6, 0.75, 0], [0.75, 1.7, 0.1], [0, 0, -s * 0.75]);
    return p;
  });
  const tl = new THREE.Group();
  tl.position.set(0, 0.5, -1.0);
  body.add(tl);
  for (let i = 0; i < 4; i++) ball(tl, R, 0.42 - i * 0.08, 0, i * 0.04, -0.2 - i * 0.45);
  cone(tl, L, 0.14, 0.4, 0, 0.1, -2.2, -Math.PI / 2, 0, 0);
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.85, 1.1, 0.55);
  armR.position.set(0.85, 1.1, 0.55);
  body.add(armL, armR);
  for (const a of [armL, armR]) ball(a, R, 0.22, 0, -0.3, 0, 1, 1.5, 1);
  for (const s of [-1, 1]) ball(body, 0xc23a30, 0.4, s * 0.5, 0.28, 0.45, 1, 0.6, 1.3);
  return {
    root, body, jaw, eyes, height: 3.3,
    pose(t, k) {
      wings.forEach((p, i) => { const s = i ? 1 : -1; p.rotation.z = -s * (Math.sin(t * 3.5) * 0.25 + k.roar * 0.6); });
      tl.rotation.y = Math.sin(t * 2) * 0.35;
      head.rotation.x = -k.roar * 0.45;
      armL.rotation.z = -0.3 - k.roar * 0.8;
      armR.rotation.z = 0.3 + k.roar * 0.8;
      body.scale.y = 1 + Math.sin(t * 2) * 0.02;
    },
  };
}

const BUILD = [buildBlob, buildCyclops, buildDragon];

function bubbleTexture(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf2';
  g.strokeStyle = '#1d1b3a';
  g.lineWidth = 10;
  g.lineJoin = 'round';
  const x = 20, y = 14, w = 216, h = 178, r = 42;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.lineTo(146, y + h);
  g.lineTo(128, 240);
  g.lineTo(110, y + h);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#1d1b3a';
  g.font = '700 38px Fredoka, system-ui, sans-serif';
  g.fillText('¡Saca un!', 128, 58);
  g.fillStyle = '#e5493a';
  g.font = '700 112px Fredoka, system-ui, sans-serif';
  g.fillText(String(n), 128, 133);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Monster {
  constructor(kind, size = 1.4) {
    this.b = BUILD[kind % BUILD.length]();
    this.group = new THREE.Group();
    this.group.add(this.b.root);
    this.size = size;
    this.group.scale.setScalar(size);
    this.t = Math.random() * 10;
    this.act = null;
    this.blinkT = 2;
    this.blink = 0;
    this.need = 0;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
    this.sprite.scale.set(2.8 / size, 2.8 / size, 1);
    this.sprite.position.y = this.b.height + 1.3;
    this.sprite.renderOrder = 20;
    this.sprite.visible = false;
    this.group.add(this.sprite);
    this.stars = new THREE.Group();
    this.stars.position.y = this.b.height + 0.2;
    this.stars.visible = false;
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(U.o(), glow(0xffd54a));
      const a = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9);
      s.scale.setScalar(0.22);
      this.stars.add(s);
    }
    this.group.add(this.stars);
  }

  setNeed(n) {
    if (n === this.need) return;
    this.need = n;
    if (!n) { this.sprite.visible = false; return; }
    const old = this.sprite.material.map;
    this.sprite.material.map = bubbleTexture(n);
    this.sprite.material.needsUpdate = true;
    if (old) old.dispose();
    this.sprite.visible = true;
  }

  _act(type, dur) {
    return new Promise((res) => {
      if (this.act) this.act.res();
      this.act = { type, t: 0, dur, res };
    });
  }
  roar() { return this._act('roar', 1.4); }
  taunt() { return this._act('taunt', 1.0); }
  hurt(flee) { return this._act(flee ? 'flee' : 'hurt', flee ? 1.4 : 1.6); }

  reset() {
    this.group.visible = true;
    this.group.scale.setScalar(this.size);
    this.act = null;
    this.b.root.position.set(0, 0, 0);
    this.b.root.rotation.set(0, 0, 0);
    this.stars.visible = false;
  }

  update(dt) {
    this.t += dt;
    const b = this.b;
    const k = { roar: 0 };
    const A = this.act;
    if (A) {
      A.t += dt;
      const p = Math.min(1, A.t / A.dur);
      if (A.type === 'roar') {
        k.roar = Math.sin(Math.PI * Math.min(1, p * 1.15));
        b.root.position.x = Math.sin(A.t * 40) * 0.03 * k.roar;
      } else if (A.type === 'taunt') {
        k.roar = 0.5 * Math.sin(Math.PI * p);
        b.root.rotation.y = Math.sin(A.t * 16) * 0.3 * (1 - p);
      } else if (A.type === 'hurt') {
        b.root.rotation.z = Math.sin(A.t * 22) * 0.12 * (1 - p);
        b.root.position.z = -0.5 * Math.sin(Math.PI * p);
        this.stars.visible = true;
        this.stars.rotation.y += dt * 6;
      } else if (A.type === 'flee') {
        const s = Math.max(0.001, 1 - p * p);
        this.group.scale.setScalar(this.size * s);
        b.root.rotation.y = p * 10;
        b.root.position.y = Math.sin(p * Math.PI) * 1.8;
        if (p >= 1) this.group.visible = false;
      }
      if (p >= 1) {
        if (A.type !== 'flee') {
          b.root.position.set(0, 0, 0);
          b.root.rotation.set(0, 0, 0);
          this.stars.visible = false;
        }
        this.act = null;
        A.res();
      }
    }
    b.jaw.scale.y = 1 + k.roar * 1.4;
    b.body.rotation.x = -k.roar * 0.18;
    b.pose(this.t, k);
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blinkT = 2 + Math.random() * 3; this.blink = 0.15; }
    if (this.blink > 0) { this.blink -= dt; b.eyes.scale.y = 0.1; } else b.eyes.scale.y = 1;
  }
}
