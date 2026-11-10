// Pantalla principal (tele / ordenador): une el mundo 3D, los personajes, el dado y las reglas.
import * as THREE from 'three';
import { createWorld, TILES } from './world.js';
import { Token, Monster } from './chars.js';
import { createDice } from './dice.js';
import { createGame } from './game.js';
import { QUESTIONS, CATS } from './questions.js';
import { play, unlockAudio, setMuted, isMuted } from './sfx.js';
import { N, TEAMS, AVATARS, MONSTER, esc } from './shared.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fatal(msg) {
  const l = $('#loading');
  l.hidden = false;
  l.innerHTML = `<div class="logo">Isla Trivia</div><p class="err">${msg}</p>`;
}

// ---------- arrancar el 3D ----------
try { await Promise.race([document.fonts.load('700 48px Fredoka'), sleep(1800)]); } catch (e) { /* sin fuente: se usa la del sistema */ }
let world;
try {
  world = createWorld($('#c'));
} catch (e) {
  console.error(e);
  fatal('Este navegador no ha podido iniciar los gráficos 3D (WebGL). Prueba con Chrome o Edge actualizado.');
  throw e;
}
window.addEventListener('resize', () => world.resize());

// ---------- sala ----------
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let code = sessionStorage.getItem('isla-room');
if (!code) {
  code = Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  sessionStorage.setItem('isla-room', code);
}
const joinUrl = new URL('play.html?c=' + code, location.href).href;
const joinBase = new URL('play.html', location.href).href.replace(/^https?:\/\//, '');

// ---------- personajes, monstruos y dado ----------
const tokens = TEAMS.map((t, i) => {
  const k = new Token(AVATARS[i].id, t.hex);
  k.group.visible = false;
  world.add(k.group);
  k.place(world.tokenSpot(0, i));
  k.face(Math.atan2(TILES[0].tx, TILES[0].tz));
  return k;
});
const monsters = {};
const MSIZE = [1.2, 1.25, 1.12];
MONSTER.forEach((tile, idx) => {
  const m = new Monster(idx, MSIZE[idx]);
  const sp = world.monsterSpot(tile);
  m.group.position.copy(sp.pos);
  m.group.rotation.y = sp.yaw;
  world.add(m.group);
  monsters[tile] = m;
});
const dice = createDice();

// ---------- partida ----------
let used;
try { used = new Set(JSON.parse(localStorage.getItem('isla-used') || '[]').filter((i) => i < QUESTIONS.length)); } catch (e) { used = new Set(); }

let game;
let net = { send: () => {}, ready: Promise.resolve() };
const clone = (o) => JSON.parse(JSON.stringify(o));

const FLASH = { bonus: '⭐ ¡BONUS!', trap: '💥 ¡TRAMPA!', monster: '👹 ¡MONSTRUO!' };
function flash(text) {
  const el = $('#flash');
  el.textContent = text;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}
function toast(text, ms = 3500) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), ms);
}

const stage = {
  sleep,
  async turnStart(t) {
    tokens.forEach((k, i) => { k.active = i === t; k.faceCam = false; });
    await sleep(700);
  },
  async rollDice(v) {
    play('dice');
    document.body.classList.add('rolling');
    await dice.roll(v);
    document.body.classList.remove('rolling');
  },
  async hop(t, a, b) {
    play('hop');
    await tokens[t].hopTo(world.tokenSpot(b, t));
    world.bump(b);
  },
  async monsterRoar(tile) { await monsters[tile].roar(); },
  async monsterTaunt(tile) { await monsters[tile].taunt(); },
  async monsterDefeated(tile, all, t) {
    tokens[t].cheer();
    await monsters[tile].hurt(all);
  },
  cheer(t) { return tokens[t].cheer(); },
  sad(t) { return tokens[t].sad(); },
  async win(t) {
    tokens.forEach((k, i) => { k.faceCam = false; k.active = false; if (i !== t) k.sad(); });
    tokens[t].dance();
    world.setMode('win');
    startConfetti();
    await sleep(1600);
    renderOver(game.S);
  },
  sfx(name) {
    play(name);
    if (FLASH[name]) flash(FLASH[name]);
  },
};

game = createGame({
  questions: QUESTIONS,
  stage,
  used,
  onUsed: (s) => { try { localStorage.setItem('isla-used', JSON.stringify([...s])); } catch (e) { /* ignorar */ } },
  publish: (S) => {
    net.send({ k: 'state', s: clone(S) });
    onState(S);
  },
});

// ---------- red (Supabase) ----------
let netOk = false;
function netBanner(msg) {
  const b = $('#netbanner');
  b.textContent = msg || '';
  b.hidden = !msg;
}
try {
  const { connect } = await import('./net.js');
  net = connect(code, (m) => game.handle(m), (status) => {
    if (status === 'SUBSCRIBED') { netOk = true; netBanner(''); }
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      netBanner('⚠️ Sin conexión con la sala. Revisa config.js (URL y clave de Supabase) y que Realtime esté activado.');
    }
  });
  net.ready.catch(() => netBanner('⚠️ No se pudo abrir la sala. Revisa config.js (URL y clave de Supabase) y tu conexión.'));
} catch (e) {
  console.error(e);
  netBanner('⚠️ No se pudo conectar con Supabase: ' + (e && e.message ? e.message : e) + ' · Revisa config.js.');
}
setInterval(() => {
  const s = clone(game.S);
  if (s.phase === 'question') s.remaining = Math.max(0, s.deadline - Date.now());
  net.send({ k: 'state', s });
}, 4000);

// ---------- HUD ----------
const members = (t) => game.members(t);
const teamName = (t) => 'Equipo ' + TEAMS[t].name;
const avEmoji = (S, t) => AVATARS[S.teams[t].av].emoji;

let lastQKey = '';

function renderTurn(S) {
  const el = $('#turn');
  if (S.phase === 'lobby' || S.phase === 'over') { el.innerHTML = ''; return; }
  const t = S.turn, p = S.cur && S.players[S.cur];
  const T = S.teams[t];
  let msg = S.msg || '';
  if (S.phase === 'roll' && p) msg = `${esc(p.name)}, ¡tira el dado desde tu móvil!` + (T.need ? ` · El monstruo pide un ${T.need}` : '');
  if (S.phase === 'rolling') msg = '🎲 Rodando…';
  if (S.dice && (S.phase === 'moving')) msg = `🎲 ${S.dice} · ${msg}`;
  el.innerHTML = `<div class="pill" style="--c:${TEAMS[t].color}"><b>${avEmoji(S, t)}</b> ${teamName(t)}${p ? ' · ' + esc(p.name) : ''}${S.streak > 1 ? ` · 🔥 x${S.streak}` : ''}</div><div class="msg card">${msg}</div>`;
}

function renderBoard(S) {
  const el = $('#board');
  if (S.phase === 'lobby') { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = S.active.map((t) => {
    const T = S.teams[t], pct = Math.round((T.pos / (N - 1)) * 100);
    return `<div class="row ${t === S.turn && S.phase !== 'over' ? 'on' : ''}" style="--c:${TEAMS[t].color}">
      <span class="av">${avEmoji(S, t)}</span>
      <div class="info"><div class="nm">${TEAMS[t].name}${T.need ? ' 👹' : ''}</div><div class="bar"><i style="width:${Math.max(4, pct)}%"></i></div></div>
      <span class="tn">${T.pos}/${N - 1}</span></div>`;
  }).join('');
}

function renderQuestion(S) {
  const el = $('#qcard');
  if (!S.q) { el.hidden = true; el.innerHTML = ''; lastQKey = ''; return; }
  const key = S.q.t + '|' + S.phase;
  if (key === lastQKey) return;
  lastQKey = key;
  const cat = CATS[S.q.cat] || CATS.gen;
  const secs = Math.max(1, Math.round((S.deadline - Date.now()) / 1000));
  const opts = S.q.o.map((o, i) => {
    let cls = '';
    if (S.reveal != null) cls = i === S.reveal ? 'right' : i === S.picked ? 'wrong' : 'dim';
    return `<div class="opt c${i} ${cls}"><span class="l">${'ABCD'[i]}</span><span class="tx">${esc(o)}</span></div>`;
  }).join('');
  el.innerHTML = `<div class="chip" style="--c:${cat.color}">${cat.emoji} ${cat.name}</div>
    <div class="qt">${esc(S.q.t)}</div><div class="opts">${opts}</div>
    ${S.phase === 'question' ? `<div class="timer"><i style="--t:${secs}s"></i></div>` : ''}`;
  el.hidden = false;
}

function renderHint(S) {
  const el = $('#hint');
  el.textContent = S.phase === 'roll' ? 'Espacio: tirar el dado por el jugador · N: saltar turno' : '';
}

const tagEls = TEAMS.map((t) => {
  const d = document.createElement('div');
  d.className = 'tag';
  d.style.setProperty('--c', t.color);
  d.hidden = true;
  $('#tags').appendChild(d);
  return d;
});
function renderTags(S) {
  TEAMS.forEach((T, i) => {
    const occupied = members(i).length > 0;
    const inGame = S.phase === 'lobby' ? occupied : S.active.includes(i);
    tagEls[i].dataset.show = inGame ? '1' : '';
    const name = S.phase !== 'lobby' && i === S.turn && S.cur && S.players[S.cur] ? ' · ' + esc(S.players[S.cur].name) : '';
    tagEls[i].innerHTML = `${avEmoji(S, i)} ${T.name}${name}`;
    tagEls[i].classList.toggle('active', S.phase !== 'lobby' && i === S.turn && S.phase !== 'over');
  });
}

// --- sala de inicio ---
let qrDrawn = false;
async function drawQR() {
  if (qrDrawn) return;
  qrDrawn = true;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm');
    const qrcode = mod.default || mod;
    const qr = qrcode(0, 'M');
    qr.addData(joinUrl);
    qr.make();
    const n = qr.getModuleCount(), cell = 8, m = 2;
    const cv = $('#qr');
    cv.width = cv.height = (n + m * 2) * cell;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#1d1b3a';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
    cv.hidden = false;
  } catch (e) { console.warn('No se pudo dibujar el QR:', e); }
}
function renderLobby(S) {
  const el = $('#lobby');
  if (S.phase !== 'lobby') { el.hidden = true; return; }
  el.hidden = false;
  $('#lobbycode').textContent = code;
  $('#lobbyurl').textContent = joinBase;
  const teams = TEAMS.map((T, i) => {
    const ms = members(i);
    return `<div class="tc ${ms.length ? 'full' : ''}" style="--c:${T.color}">
      <div class="th"><span>${avEmoji(S, i)}</span> ${T.name}</div>
      <div class="pl">${ms.length ? ms.map((id) => `<span class="pc">${esc(S.players[id].name)}</span>`).join('') : '<em>Esperando jugadores…</em>'}</div></div>`;
  }).join('');
  $('#lobbyteams').innerHTML = teams;
  const nTeams = TEAMS.filter((_, i) => members(i).length).length;
  $('#btnStart').disabled = nTeams < 2;
  $('#lobbyhint').textContent = nTeams < 2 ? 'Hacen falta al menos 2 equipos con jugadores' : '¡Todo listo!';
  drawQR();
}

function renderRoomChip(S) {
  const el = $('#roomchip');
  el.hidden = S.phase === 'lobby';
  el.innerHTML = `📱 <b>${code}</b>`;
}

function renderOver(S) {
  const el = $('#over');
  if (S.phase !== 'over' || S.winner == null) { el.hidden = true; return; }
  el.hidden = false;
  const w = S.winner;
  $('#overtitle').innerHTML = `<span class="big">${avEmoji(S, w)}</span>¡Gana el Equipo ${TEAMS[w].name}!`;
  $('#over .box').style.setProperty('--c', TEAMS[w].color);
}

function onState(S) {
  // fichas
  TEAMS.forEach((T, i) => {
    const occupied = members(i).length > 0;
    tokens[i].group.visible = S.phase === 'lobby' ? occupied : S.active.includes(i);
    tokens[i].setAvatar(AVATARS[S.teams[i].av].id);
    if (S.phase === 'lobby') {
      tokens[i].place(world.tokenSpot(0, i));
      tokens[i].face(Math.atan2(TILES[0].tx, TILES[0].tz));
    }
  });
  // cara hacia la cámara mientras se responde
  if (S.phase !== 'lobby') tokens[S.turn].faceCam = S.phase === 'question' || S.phase === 'result';
  // burbuja de los monstruos
  for (const tile of MONSTER) {
    const T = S.teams[S.turn];
    const show = S.phase !== 'lobby' && S.phase !== 'over' && T.pos === tile && T.need && S.phase !== 'moving';
    monsters[tile].setNeed(show ? T.need : 0);
  }
  renderLobby(S);
  renderRoomChip(S);
  renderTurn(S);
  renderBoard(S);
  renderQuestion(S);
  renderHint(S);
  renderTags(S);
  if (S.phase !== 'over') $('#over').hidden = true;
}

// ---------- botones ----------
$('#btnStart').onclick = () => { unlockAudio(); play('pop'); startGame(false); };
$('#btnSolo').onclick = () => { unlockAudio(); startGame(true); };
function startGame(solo) {
  if (!game.start(solo)) { toast('Hacen falta al menos 2 equipos con jugadores'); return; }
  $('#lobby').hidden = true;
  world.setMode('auto');
}
$('#btnAgain').onclick = () => {
  stopConfetti();
  tokens.forEach((k, i) => { k.stop(); k.active = false; k.place(world.tokenSpot(0, i)); k.face(Math.atan2(TILES[0].tx, TILES[0].tz)); });
  Object.values(monsters).forEach((m) => m.reset());
  game.reset();
  world.setMode('lobby');
};
$('#btnView').onclick = () => { $('#over').hidden = true; };

document.querySelectorAll('[data-cam]').forEach((b) => {
  b.onclick = () => { unlockAudio(); camMode(b.dataset.cam); };
});
function camMode(m) {
  if (game.S.phase === 'lobby') return;
  world.setMode(m);
}
world.onMode = (m) => {
  document.querySelectorAll('[data-cam]').forEach((b) => {
    const on = b.dataset.cam === m || (b.dataset.cam === 'overview' && m === 'free');
    b.classList.toggle('on', on);
  });
  if (m === 'follow') toast('Cámara libre: arrastra para girar, rueda para acercar. 🎬 vuelve al modo automático.');
};
const soundBtn = $('#btnSound');
soundBtn.onclick = () => { unlockAudio(); setMuted(!isMuted()); soundBtn.textContent = isMuted() ? '🔇' : '🔊'; };
$('#btnFull').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};
addEventListener('pointerdown', unlockAudio);
addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); game.handle({ k: 'hostroll' }); }
  else if (k === 'n') game.handle({ k: 'skip' });
  else if (k === 'm') soundBtn.click();
  else if (k === 'f') $('#btnFull').click();
  else if (k === '1') camMode('auto');
  else if (k === '2') camMode('follow');
  else if (k === '3') camMode('overview');
});

// ---------- confeti ----------
const cf = $('#confetti');
const cg = cf.getContext('2d');
let parts = [], cfOn = false;
function startConfetti() {
  cfOn = true;
  cf.width = innerWidth;
  cf.height = innerHeight;
  const colors = ['#ff6b57', '#ffc933', '#5fcf5a', '#3fa9ff', '#a678ff', '#ff8fb1'];
  parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * cf.width, y: -Math.random() * cf.height, w: 8 + Math.random() * 8, h: 5 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
}
function stopConfetti() { cfOn = false; cg.clearRect(0, 0, cf.width, cf.height); }
function drawConfetti() {
  if (!cfOn) return;
  cg.clearRect(0, 0, cf.width, cf.height);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.r += p.vr;
    if (p.y > cf.height + 20) { p.y = -20; p.x = Math.random() * cf.width; }
    cg.save();
    cg.translate(p.x, p.y);
    cg.rotate(p.r);
    cg.fillStyle = p.c;
    cg.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cg.restore();
  }
}

// ---------- bucle principal ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  const S = game.S;
  const tk = tokens[S.turn];
  const tile = TILES[S.teams[S.turn].pos];
  world.setFocus(tk.base, tile.tx, tile.tz);
  tokens.forEach((k) => { k.camPos = world.camera.position; k.update(dt); });
  Object.values(monsters).forEach((m) => m.update(dt));
  dice.update(dt);
  world.update(dt, t);
  world.renderer.autoClear = true;
  world.renderer.render(world.scene, world.camera);
  dice.render(world.renderer);
  // etiquetas flotantes
  const W = innerWidth, H = innerHeight;
  tokens.forEach((k, i) => {
    const el = tagEls[i];
    if (!el.dataset.show) { el.hidden = true; return; }
    tmp.copy(k.group.position);
    tmp.y += 3.2;
    tmp.project(world.camera);
    if (tmp.z > 1 || tmp.z < -1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1) { el.hidden = true; return; }
    el.hidden = false;
    el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px, ${(-tmp.y * 0.5 + 0.5) * H}px) translate(-50%,-100%)`;
  });
  drawConfetti();
  requestAnimationFrame(frame);
}

// ---------- listo ----------
onState(game.S);
$('#loading').hidden = true;
$('#hud').hidden = false;
requestAnimationFrame(frame);
