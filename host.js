import * as THREE from 'three';
import { connect, curId, members, esc, AV } from './net.js';
import { Q } from './questions.js';
const N = 30, code = Math.random().toString(36).slice(2, 6).toUpperCase();
const BON = [4, 11, 17, 24], TRAP = [7, 14, 21, 27], MON = [9, 19];
const ty = i => i === N - 1 ? 'e' : BON.includes(i) ? 'b' : TRAP.includes(i) ? 't' : MON.includes(i) ? 'm' : 'n';
const COL = { n: 0xdddddd, b: 0x2ecc71, t: 0xe74c3c, m: 0x8e44ad, e: 0xf1c40f };
const P = i => new THREE.Vector3(i * 2.6, 0, Math.sin(i * 0.5) * 5);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = { phase: 'lobby', players: {}, teams: [0, 1].map(() => ({ pos: 0, av: 0, blocked: 0, cleared: [] })), turn: 0, idx: [0, 0], dice: 0, q: null, reveal: null, msg: '', winner: null };
const used = new Set();
const net = connect(code, m => {
  if (m.k === 'join') { S.players[m.id] = S.players[m.id] || { name: m.name, team: null }; S.players[m.id].name = m.name; pub(); }
  else if (m.k === 'pick' && S.players[m.id] && S.phase === 'lobby') { const p = S.players[m.id]; if (m.team != null) p.team = m.team; if (m.av != null && p.team != null) S.teams[p.team].av = m.av; pub(); }
  else if (m.k === 'roll' && S.phase === 'roll' && m.id === curId(S)) doRoll();
  else if (m.k === 'answer' && S.phase === 'question' && m.id === curId(S)) answer(m.i);
});
const pub = () => { net.send({ k: 'state', s: { ...S, q: S.q && { t: S.q[0], o: S.q[1] } } }); render(); };
// ---------- 3D ----------
const sc = new THREE.Scene(); sc.background = new THREE.Color(0x87ceeb);
const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 300);
const ren = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true }); ren.setSize(innerWidth, innerHeight);
addEventListener('resize', () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
sc.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(10, 20, 10); sc.add(dl);
const mesh = (g, c, x = 0, y = 0, z = 0, parent = sc) => { const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); parent.add(m); return m; };
mesh(new THREE.PlaneGeometry(400, 400), 0x3a7d44).rotation.x = -Math.PI / 2; sc.children.at(-1).position.y = -.2;
for (let i = 0; i < N; i++) {
  const p = P(i), k = ty(i);
  mesh(new THREE.CylinderGeometry(1.1, 1.1, k === 'e' ? .8 : .3, 6), COL[k], p.x, 0, p.z);
  if (k === 'm') { const g = new THREE.Group(); g.position.set(p.x, 1, p.z); sc.add(g); mesh(new THREE.SphereGeometry(.8), 0xc0392b, 0, 0, 0, g); mesh(new THREE.ConeGeometry(.2, .6), 0xffffff, -.5, .8, 0, g); mesh(new THREE.ConeGeometry(.2, .6), 0xffffff, .5, .8, 0, g); mesh(new THREE.SphereGeometry(.15), 0xffff00, -.3, .2, .7, g); mesh(new THREE.SphereGeometry(.15), 0xffff00, .3, .2, .7, g); }
}
function makeAv(k, c) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(.35, .45, .9), c, 0, .55, 0, g);
  k === 0 ? mesh(new THREE.BoxGeometry(.7, .6, .7), 0xbbbbbb, 0, 1.3, 0, g) : mesh(new THREE.SphereGeometry(.38), k === 4 ? 0x55cc55 : 0xffddb0, 0, 1.3, 0, g);
  if (k === 1) { mesh(new THREE.ConeGeometry(.12, .3), 0xffddb0, -.25, 1.7, 0, g); mesh(new THREE.ConeGeometry(.12, .3), 0xffddb0, .25, 1.7, 0, g); }
  if (k === 2) mesh(new THREE.ConeGeometry(.4, .8), 0x6a2c91, 0, 1.9, 0, g);
  if (k === 3) mesh(new THREE.CylinderGeometry(.3, .3, .25), 0xf1c40f, 0, 1.75, 0, g);
  if (k === 4) { mesh(new THREE.SphereGeometry(.12), 0xffffff, -.2, 1.65, 0, g); mesh(new THREE.SphereGeometry(.12), 0xffffff, .2, 1.65, 0, g); }
  if (k === 5) mesh(new THREE.ConeGeometry(.1, .5), 0xffffff, 0, 1.85, 0, g);
  return g;
}
const tilePos = (i, t) => P(i).add(new THREE.Vector3(0, .2, t ? .7 : -.7));
const tok = [0, 1].map(t => { const g = new THREE.Group(); g.userData.av = -1; g.position.copy(tilePos(0, t)); sc.add(g); return g; });
const tw = [], look = new THREE.Vector3(), CC = [0x3498db, 0xe74c3c];
const hop = t => new Promise(res => tw.push({ t, from: tok[t].position.clone(), to: tilePos(S.teams[t].pos, t), k: 0, res }));
let last = performance.now();
(function loop(now) {
  const dt = (now - last) / 1000; last = now;
  for (const w of [...tw]) { w.k += dt / .35; const k = Math.min(w.k, 1); tok[w.t].position.lerpVectors(w.from, w.to, k); tok[w.t].position.y += Math.sin(Math.PI * k) * 1.2; if (k >= 1) { tw.splice(tw.indexOf(w), 1); w.res(); } }
  const a = Math.min(S.teams[S.turn].pos, N - 2), fwd = P(a + 1).sub(P(a)).normalize(), tk = tok[S.turn];
  cam.position.lerp(tk.position.clone().addScaledVector(fwd, -7).add(new THREE.Vector3(0, 4.5, 0)), .04);
  look.lerp(tk.position.clone().addScaledVector(fwd, 3), .06); cam.lookAt(look);
  ren.render(sc, cam); requestAnimationFrame(loop);
})(last);
// ---------- Juego ----------
async function move(t, n, dir = 1) {
  const T = S.teams[t];
  for (let i = 0; i < n; i++) {
    const nx = Math.max(0, Math.min(N - 1, T.pos + dir)); if (nx === T.pos) break;
    T.pos = nx; await hop(t);
    if (nx === N - 1 && dir > 0) return 'win';
    if (dir > 0 && ty(nx) === 'm' && !T.cleared.includes(nx)) { T.blocked = 1 + Math.random() * 6 | 0; S.msg = `¡Monstruo! Saca un ${T.blocked} para pasar`; pub(); await sleep(2500); return 'stop'; }
  }
}
function next() { S.idx[S.turn]++; S.turn = 1 - S.turn; S.phase = 'roll'; S.q = null; S.reveal = null; S.dice = 0; S.msg = ''; pub(); }
function win(t) { S.phase = 'over'; S.winner = t; pub(); }
async function doRoll() {
  S.phase = 'busy'; const t = S.turn, T = S.teams[t], d = 1 + Math.random() * 6 | 0; S.dice = d;
  if (T.blocked) {
    if (d === T.blocked) { T.cleared.push(T.pos); T.blocked = 0; S.msg = '¡Monstruo derrotado! Seguís en el próximo turno'; } else S.msg = `Sacó ${d}. Necesita un ${T.blocked}`;
    pub(); await sleep(2500); return next();
  }
  S.msg = `Sacó un ${d}`; pub();
  const r = await move(t, d);
  if (r === 'win') return win(t); if (r === 'stop') return next();
  let pool = Q.map((_, i) => i).filter(i => !used.has(i)); if (!pool.length) { used.clear(); pool = Q.map((_, i) => i); }
  const x = pool[Math.random() * pool.length | 0]; used.add(x); S.q = Q[x]; S.phase = 'question'; S.msg = ''; pub();
}
async function answer(i) {
  S.phase = 'busy'; const t = S.turn, k = ty(S.teams[t].pos), ok = i === S.q[2];
  S.reveal = S.q[2]; S.msg = ok ? '¡Correcto!' : 'Fallaste'; pub(); await sleep(1800);
  let r; if (ok) r = await move(t, k === 'b' ? 3 : 1); else if (k === 't') r = await move(t, 3, -1);
  if (r === 'win') return win(t); next();
}
window.start = () => { if ([0, 1].every(t => members(S, t).length)) { S.phase = 'roll'; pub(); } else alert('Cada equipo necesita al menos 1 jugador'); };
function render() {
  for (const t of [0, 1]) if (tok[t].userData.av !== S.teams[t].av) { tok[t].clear(); tok[t].add(makeAv(S.teams[t].av, CC[t])); tok[t].userData.av = S.teams[t].av; }
  const cur = curId(S), nm = cur ? esc(S.players[cur].name) : '', ui = document.getElementById('ui'); let h = '';
  if (S.phase === 'lobby') h = `<div class="box"><div class="big">Sala ${code}</div><div>Entra en <b>${location.origin}/play.html</b> e introduce el código</div>` +
    [0, 1].map(t => `<div style="color:${t ? '#ff8a80' : '#80d8ff'}">Equipo ${t + 1} ${AV[S.teams[t].av]}: ${members(S, t).map(([, p]) => esc(p.name)).join(', ')}</div>`).join('') + '<br><button onclick="start()">▶ Empezar</button></div>';
  else if (S.phase === 'over') h = `<div class="box big">🏆 ¡Gana el Equipo ${S.winner + 1}!</div>`;
  else {
    h = `<div class="box">Turno: Equipo ${S.turn + 1} · ${nm} ${S.dice ? ' · 🎲 ' + S.dice : ''}<br>${esc(S.msg)}</div>`;
    if (S.q) h += `<br><div class="box"><div class="big">${esc(S.q[0])}</div>${S.q[1].map((o, i) => `<span class="o ${S.reveal === i ? 'ok' : ''}">${'ABCD'[i]}) ${esc(o)}</span>`).join('')}</div>`;
  }
  ui.innerHTML = h;
}
render();
