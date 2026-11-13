// Dado 3D: aparece en el centro de la pantalla, gira, rebota y se para en el número que toca.
import * as THREE from 'three';
import { toon, OUTLINE } from './toon.js';

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.3, 0.24], [0.3, 0.5], [0.3, 0.76], [0.7, 0.24], [0.7, 0.5], [0.7, 0.76]],
};

function faceTexture(v) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e3d9bd';
  g.fillRect(0, 0, 256, 256);
  const r = 40, x = 12, y = 12, w = 232;
  g.fillStyle = '#fffdf4';
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + w, r);
  g.arcTo(x + w, y + w, x, y + w, r);
  g.arcTo(x, y + w, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
  g.fillStyle = v === 1 ? '#e5493a' : '#26254a';
  for (const [px, py] of PIPS[v]) {
    g.beginPath();
    g.arc(px * 256, py * 256, v === 1 ? 46 : 27, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z (opuestas suman 7)
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const NORMALS = {
  3: [1, 0, 0], 4: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1],
};

export function createDice() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 7.6, 6.2);
  camera.lookAt(0, -0.1, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(3, 8, 4);
  scene.add(sun);

  const mats = FACE_VALUES.map((v) => toon(0xffffff, { map: faceTexture(v) }));
  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const die = new THREE.Mesh(geo, mats);
  const hull = new THREE.Mesh(geo, OUTLINE);
  hull.scale.setScalar(1.06);
  die.add(hull);
  scene.add(die);

  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.78;
  scene.add(shadow);

  const qFinal = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();
  const axis = new THREE.Vector3(1, 1, 0).normalize();
  const UP = new THREE.Vector3(0, 1, 0);
  // Hacia dónde apunta "arriba del dibujo" de cada cara (en BoxGeometry)
  const TEXUP = {
    3: [0, 1, 0], 4: [0, 1, 0], 1: [0, 0, -1], 6: [0, 0, 1], 2: [0, 1, 0], 5: [0, 1, 0],
  };

  const S = { state: 'idle', t: 0, dur: 1.9, spin: 0, res: null, hold: 0, scale: 0 };
  die.visible = false;
  shadow.visible = false;

  function roll(value) {
    return new Promise((res) => {
      if (S.res) S.res();
      const n = NORMALS[value] || NORMALS[1];
      // La cara con el número rodará hasta quedar mirando hacia ARRIBA (como en un dado de verdad).
      qFinal.setFromUnitVectors(new THREE.Vector3(n[0], n[1], n[2]), UP);
      // giramos el dado sobre sí mismo para que el número se lea derecho desde la cámara
      const tu = TEXUP[value] || TEXUP[1];
      const v = new THREE.Vector3(tu[0], tu[1], tu[2]).applyQuaternion(qFinal);
      const a = Math.atan2(v.x, v.z);
      qYaw.setFromAxisAngle(UP, Math.PI - a + (Math.random() - 0.5) * 0.7);
      qFinal.premultiply(qYaw);
      axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      if (axis.lengthSq() < 0.01) axis.set(1, 1, 0);
      axis.normalize();
      S.spin = (7 + Math.random() * 4) * Math.PI;
      S.state = 'roll';
      S.t = 0;
      S.hold = 0;
      S.scale = 0;
      S.res = res;
      die.visible = true;
      shadow.visible = true;
    });
  }

  function update(dt) {
    if (S.state === 'idle') return;
    if (S.state === 'roll') {
      S.t += dt;
      const k = Math.min(1, S.t / S.dur);
      const e = 1 - Math.pow(1 - k, 3);
      qSpin.setFromAxisAngle(axis, S.spin * (1 - e));
      die.quaternion.copy(qFinal).multiply(qSpin);
      const bounce = Math.abs(Math.cos(k * Math.PI * 3.5));
      const y = 2.6 * Math.pow(1 - k, 2) * bounce;
      die.position.set(Math.sin(k * 7) * 0.5 * (1 - k), y, 0);
      S.scale = Math.min(1, S.t * 6);
      die.scale.setScalar(S.scale);
      shadow.position.x = die.position.x;
      shadow.scale.setScalar(Math.max(0.3, 1 - y * 0.25) * S.scale);
      shadow.material.opacity = Math.max(0.2, 1 - y * 0.3);
      if (k >= 1) { S.state = 'hold'; S.hold = 0; }
    } else if (S.state === 'hold') {
      S.hold += dt;
      const pulse = 1 + 0.07 * Math.sin(Math.min(1, S.hold / 0.35) * Math.PI);
      die.scale.setScalar(pulse);
      if (S.hold > 1.0) { S.state = 'hide'; S.hold = 0; }
    } else if (S.state === 'hide') {
      S.hold += dt;
      const k = Math.min(1, S.hold / 0.25);
      die.scale.setScalar(1 - k);
      shadow.scale.setScalar(1 - k);
      if (k >= 1) {
        S.state = 'idle';
        die.visible = false;
        shadow.visible = false;
        const r = S.res;
        S.res = null;
        if (r) r();
      }
    }
  }

  function render(renderer) {
    if (S.state === 'idle') return;
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    const size = Math.round(Math.min(W, H) * 0.5);
    const x = Math.round((W - size) / 2);
    const y = Math.round((H - size) / 2 + H * 0.04);
    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, size, size);
    renderer.setScissor(x, y, size, size);
    renderer.clearDepth();
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.autoClear = true;
  }

  return { roll, update, render, get active() { return S.state !== 'idle'; }, get state() { return S.state; } };
}
