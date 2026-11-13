// Materiales de dibujo animado: sombreado en escalones + contorno oscuro.
import * as THREE from 'three';

let _grad = null;
export function gradientMap() {
  if (!_grad) {
    _grad = new THREE.DataTexture(new Uint8Array([110, 170, 220, 255]), 4, 1, THREE.RedFormat);
    _grad.minFilter = THREE.NearestFilter;
    _grad.magFilter = THREE.NearestFilter;
    _grad.generateMipmaps = false;
    _grad.needsUpdate = true;
  }
  return _grad;
}

const matCache = new Map();
export function toon(color, extra) {
  if (extra) return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra });
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
    matCache.set(color, m);
  }
  return m;
}

// Contorno: una copia ligeramente más grande, vista "por dentro", en color tinta.
export const INK = 0x1d1b3a;
export const OUTLINE = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
