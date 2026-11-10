// Efectos de sonido sintetizados (no hace falta ningún archivo de audio).
let ctx = null;
let muted = false;
let noiseBuf = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* sin audio */ }
}
export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, t0, dur, type = 'sine', vol = 0.16, slideTo = null) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + t0;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t0, dur, vol = 0.12, freq = 1800) {
  if (!ctx || muted) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + t0;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  hop() { tone(420, 0, 0.14, 'sine', 0.14, 760); },
  dice() { for (let i = 0; i < 9; i++) noise(i * 0.16, 0.07, 0.1 + 0.02 * (i % 3), 1200 + (i % 4) * 500); },
  ok() { tone(523, 0, 0.14, 'triangle'); tone(659, 0.12, 0.14, 'triangle'); tone(784, 0.24, 0.3, 'triangle'); },
  bad() { tone(220, 0, 0.25, 'sawtooth', 0.12, 110); tone(160, 0.18, 0.35, 'sawtooth', 0.12, 80); },
  bonus() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, 'square', 0.08)); },
  trap() { tone(300, 0, 0.5, 'sawtooth', 0.1, 70); },
  monster() { tone(110, 0, 0.7, 'sawtooth', 0.16, 55); tone(95, 0.05, 0.7, 'square', 0.08, 50); noise(0, 0.5, 0.1, 400); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.14, 0.3, 'triangle', 0.14)); },
  tick() { tone(900, 0, 0.05, 'square', 0.05); },
  pop() { tone(500, 0, 0.1, 'sine', 0.12, 900); },
};
export function play(name) { if (sfx[name]) sfx[name](); }
