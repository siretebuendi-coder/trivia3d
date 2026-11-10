// Datos y utilidades compartidas por la pantalla principal, los móviles y la lógica.

export const N = 36;                    // casillas del camino (0 = salida, N-1 = cima)
export const BONUS = [4, 13, 23, 29];   // aciertas -> avanzas BONUS_STEPS
export const TRAP = [7, 17, 26, 32];    // fallas -> retrocedes TRAP_STEPS
export const MONSTER = [10, 20, 30];    // te bloquean hasta sacar su número en el dado
export const BONUS_STEPS = 3;
export const TRAP_STEPS = 3;
export const QTIME = 25;                // segundos para responder

export function tileType(i) {
  if (i === 0) return 'start';
  if (i === N - 1) return 'goal';
  if (BONUS.includes(i)) return 'bonus';
  if (TRAP.includes(i)) return 'trap';
  if (MONSTER.includes(i)) return 'monster';
  return 'normal';
}

export const TEAMS = [
  { name: 'Azul', color: '#3b82f6', hex: 0x3b82f6, icon: '●' },
  { name: 'Rojo', color: '#ef4444', hex: 0xef4444, icon: '▲' },
  { name: 'Verde', color: '#22c55e', hex: 0x22c55e, icon: '■' },
  { name: 'Amarillo', color: '#f5b301', hex: 0xf5b301, icon: '★' },
];

export const AVATARS = [
  { id: 'gato', name: 'Gato', emoji: '🐱' },
  { id: 'rana', name: 'Rana', emoji: '🐸' },
  { id: 'oso', name: 'Oso', emoji: '🐻' },
  { id: 'robot', name: 'Robot', emoji: '🤖' },
  { id: 'mago', name: 'Mago', emoji: '🧙' },
  { id: 'unicornio', name: 'Unicornio', emoji: '🦄' },
  { id: 'dino', name: 'Dino', emoji: '🦖' },
  { id: 'pato', name: 'Pato', emoji: '🦆' },
];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Categorías de las preguntas
export const CATS = {
  geo: { name: 'Geografía', emoji: '🌍', color: '#1f9bd6' },
  hist: { name: 'Historia', emoji: '🏛️', color: '#d98a1f' },
  cien: { name: 'Ciencia', emoji: '🔬', color: '#22a860' },
  arte: { name: 'Arte y Literatura', emoji: '🎨', color: '#9a52e0' },
  depo: { name: 'Deportes', emoji: '⚽', color: '#e5493a' },
  ent: { name: 'Cine y Música', emoji: '🎬', color: '#e23d8f' },
  nat: { name: 'Naturaleza', emoji: '🦁', color: '#4f9d2b' },
  gen: { name: 'Cultura general', emoji: '💡', color: '#e0a800' },
};
