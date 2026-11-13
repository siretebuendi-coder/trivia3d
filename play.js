// Mando del móvil: elegir nombre/equipo/avatar, tirar el dado y responder.
import { connect } from './net.js';
import { TEAMS, AVATARS, CATS, esc, N } from './shared.js';

const $ = (s) => document.querySelector(s);
const body = $('#body');
const params = new URLSearchParams(location.search);
const code = (params.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

if (!code) {
  location.replace('index.html');
}
$('#room').innerHTML = `Sala <b>${esc(code)}</b>`;

let id = null;
try { id = localStorage.getItem('isla-pid'); } catch (e) { /* sin almacenamiento */ }
if (!id) {
  id = Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem('isla-pid', id); } catch (e) { /* nada */ }
}
let name = '';
try { name = localStorage.getItem('isla-name') || ''; } catch (e) { /* nada */ }

let S = null;       // último estado recibido
let recvAt = 0;
let joined = false;
let connected = false;
let answeredQ = null; // texto de la pregunta que ya he contestado
let myPick = null;
let lastKey = '';
let draftName = name;

const net = connect(code, (m) => {
  if (m && m.k === 'state') {
    S = m.s;
    recvAt = Date.now();
    render();
  } else if (m && m.k === 'secret') {
    if (Array.isArray(m.ids) && m.ids.includes(id)) {
      secretMsg = { mgid: m.mgid, word: m.word };
      const dw = $('#dword');
      if (dw) dw.textContent = m.word; else render();
    }
  }
}, (status) => {
  if (status === 'SUBSCRIBED') {
    connected = true;
    net.send({ k: 'hello' });
    if (name) { join(); }
    render();
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    connected = false;
    render();
  }
});
net.ready.catch(() => render());

function join() {
  net.send({ k: 'join', id, name });
  joined = true;
}
// Si la tele se reinicia o perdemos algún mensaje, volvemos a presentarnos.
setInterval(() => {
  if (!connected) return;
  if (joined && S && !S.players[id]) join();
  if (!S) net.send({ k: 'hello' });
}, 3000);

const me = () => (S && S.players[id]) || null;

function setHtml(key, html) {
  if (key === lastKey) return;
  lastKey = key;
  body.innerHTML = html;
}

function render() {
  const mp = me();
  const top = $('#me');
  if (mp && mp.team != null) {
    top.hidden = false;
    top.style.setProperty('--c', TEAMS[mp.team].color);
    top.textContent = `${AVATARS[S.teams[mp.team].av].emoji} ${mp.name}`;
  } else top.hidden = true;

  if (!connected) {
    setHtml('conn', `<h1>Conectando…</h1><div class="wait">Si tarda mucho, comprueba que el código <b>${esc(code)}</b> es el que sale en la tele y que tienes internet.</div>`);
    return;
  }
  if (!joined) return renderName();
  if (!S) {
    setHtml('wait', `<h1>Esperando a la tele…</h1><div class="wait">¿Está abierta la pantalla con el código <b>${esc(code)}</b>?</div>`);
    return;
  }
  if (!mp) { join(); return; }
  if (S.phase === 'lobby') return renderLobby(mp);
  if (S.phase === 'over') return renderOver(mp);
  renderGame(mp);
}

function renderName() {
  setHtml('name', `<h1>🏝️ Isla Trivia</h1>
    <div class="card"><h2>¿Cómo te llamas?</h2><br>
    <input class="name" id="nm" maxlength="14" placeholder="Tu nombre" autocomplete="off" value="${esc(draftName)}">
    <br><br><button class="btn green big" id="go" style="width:100%">Entrar</button></div>`);
  const inp = $('#nm'), go = $('#go');
  inp.oninput = () => { draftName = inp.value; };
  const doGo = () => {
    const v = inp.value.trim();
    if (!v) { inp.focus(); return; }
    name = v;
    try { localStorage.setItem('isla-name', name); } catch (e) { /* nada */ }
    join();
    lastKey = '';
    render();
  };
  go.onclick = doGo;
  inp.onkeydown = (e) => { if (e.key === 'Enter') doGo(); };
}

function members(t) {
  return Object.entries(S.players).filter(([, p]) => p.team === t).map(([, p]) => p);
}

function renderLobby(mp) {
  const team = mp.team;
  if (team == null) {
    const btns = TEAMS.map((T, i) => {
      const n = members(i).length;
      return `<button class="tbtn" data-t="${i}" style="--c:${T.color}"><span style="font-size:2rem">${AVATARS[S.teams[i].av].emoji}</span>${T.name}<small>${n ? n + (n === 1 ? ' jugador' : ' jugadores') : 'vacío'}</small></button>`;
    }).join('');
    setHtml('pick' + S.teams.map((t) => t.av).join(''), `<h1>Elige tu equipo</h1><div class="teams">${btns}</div>`);
    body.querySelectorAll('[data-t]').forEach((b) => {
      b.onclick = () => { net.send({ k: 'pick', id, team: +b.dataset.t }); };
    });
    return;
  }
  const T = TEAMS[team];
  const myAv = S.teams[team].av;
  const takenBy = (a) => S.teams.some((x, i) => i !== team && x.av === a && members(i).length > 0);
  const avs = AVATARS.map((A, i) => `<button class="avb ${i === myAv ? 'sel' : ''} ${takenBy(i) ? 'taken' : ''}" data-a="${i}" style="--c:${T.color}">${A.emoji}</button>`).join('');
  const mates = members(team).map((p) => esc(p.name)).join(', ');
  const key = ['lobby', team, myAv, S.teams.map((x, i) => i + ':' + members(i).length + x.av).join(',')].join('|');
  setHtml(key, `<h1 style="color:${T.color};filter:brightness(.8)">Equipo ${T.name}</h1>
    <div class="card"><h2>Elige tu avatar</h2><br><div class="avs">${avs}</div><p class="wait" style="margin-bottom:0">Tu equipo: ${mates}</p></div>
    <div class="teams">${TEAMS.map((x, i) => `<button class="tbtn ${i === team ? 'sel' : ''}" data-t="${i}" style="--c:${x.color};padding:8px">${x.name}<small>${members(i).length}</small></button>`).join('')}</div>
    <div class="wait">👀 Mira la tele. ¡La partida empieza pronto!</div>`);
  body.querySelectorAll('[data-a]').forEach((b) => {
    b.onclick = () => { if (!b.classList.contains('taken')) net.send({ k: 'pick', id, av: +b.dataset.a }); };
  });
  body.querySelectorAll('[data-t]').forEach((b) => {
    b.onclick = () => { net.send({ k: 'pick', id, team: +b.dataset.t }); };
  });
}

function progress() {
  return `<div class="card prog">${S.active.map((t) => {
    const T = S.teams[t], pct = Math.round((T.pos / (N - 1)) * 100);
    return `<div class="row"><span>${AVATARS[T.av].emoji}</span><div class="bar" style="--c:${TEAMS[t].color}"><i style="width:${Math.max(4, pct)}%"></i></div><span>${T.pos}</span></div>`;
  }).join('')}</div>`;
}

// ---------- minijuegos ----------
let pickedMg = {};
const readyB = {};   // mgid -> opción que elegí
let secretMsg = null; // { mgid, word }
let drawColor = '#1d1b3a', drawW = 0.012;

function renderMini(mp) {
  const mg = S.mg;
  const me2 = id;
  const isDrawer = mg.type === 'draw' && mg.drawer === me2;
  const isHolder = mg.type === 'draw' && (mg.holders || []).includes(me2);
  const nm = (pid) => esc((S.players[pid] || {}).name || '?');
  const left = Math.max(1, Math.round((S.remaining - (Date.now() - recvAt)) / 1000));

  if (mg.stage === 'reveal') {
    const good = !!mg.ok;
    setHtml('mgr' + mg.id, `<div class="big-msg">${good ? '🎉' : '😬'}<br>${esc(S.msg)}</div>${mg.word ? `<div class="card"><div class="q">Era: ${esc(mg.word)}</div></div>` : ''}${progress()}`);
    return;
  }
  if (mg.type === 'draw') {
    const rt = TEAMS[mg.rteam];
    if (isDrawer) return renderDrawer(mg, left);
    if (isHolder) {
      const word = secretMsg && secretMsg.mgid === mg.id ? secretMsg.word : '';
      setHtml('mgw' + mg.id + word, `<h2>🤫 ¡Solo vosotros veis la palabra!</h2>
        <div class="card" style="text-align:center"><small>${nm(mg.drawer)} (${TEAMS[S.turn].name}) tiene que dibujar:</small><div class="bigword">${word ? esc(word) : '…'}</div></div>
        <div class="wait"><b>Enséñale este móvil a ${nm(mg.drawer)}</b> sin que lo vea su pareja${mg.guesser || mg.shared ? '' : ''}. Cuando lo adivinen, pulsad el botón.</div>
        <button class="btn green big" id="yes" style="width:100%">✅ ¡Lo han adivinado!</button>
        <button class="btn red" id="no" style="width:100%">❌ No lo han adivinado</button>`);
      $('#yes').onclick = () => net.send({ k: 'mgjudge', id, ok: true });
      $('#no').onclick = () => net.send({ k: 'mgjudge', id, ok: false });
      return;
    }
    const isMyTeam = mp.team === S.turn;
    setHtml('mgd' + mg.id + (isMyTeam ? 'm' : 'o'), `<h2>🎨 ¡A dibujar!</h2>
      <div class="big-msg">${isMyTeam ? '🔎<br>Mira la tele y adivina lo que dibuja ' + nm(mg.drawer) : '👀<br>' + nm(mg.drawer) + ' está dibujando.<br><small>La palabra la tiene el equipo ' + rt.name + '</small>'}</div>${progress()}`);
    return;
  }
  // elegir / coincidir / adivinar
  const inPair = me2 === mg.a || me2 === mg.b;
  if (inPair) {
    // con un solo móvil se juega por turnos: primero A, luego B
    const role = mg.shared ? (mg.step === 'b' ? 'b' : 'a') : (me2 === mg.a ? 'a' : 'b');
    const mine = pickedMg[mg.id + role];
    const done = mine != null || (!mg.shared && mg.done[role]);
    const aName = nm(mg.a);
    let who = '';
    if (mg.type === 'guess') who = role === 'a' ? 'Elige lo que TÚ harías o prefieres. Tu pareja intentará adivinarlo.' : `Adivina qué ha elegido ${aName}.`;
    else if (mg.type === 'match') who = '¡Tenéis que elegir lo mismo! Pensad como tu pareja.';
    else who = '¡Tenéis que elegir cosas DISTINTAS!';
    // pasar el móvil entre los dos (solo si comparten móvil)
    if (mg.shared && role === 'b' && !readyB[mg.id]) {
      setHtml('mgpass' + mg.id, `<h2>${mg.title}</h2><div class="big-msg">📱➡️🧑<br>¡Pasa el móvil a tu pareja!</div>
        <div class="wait">Que no vea lo que elegiste. Cuando lo tenga en la mano, que pulse el botón.</div>
        <button class="btn green big" id="ready" style="width:100%">Ya lo tengo yo</button>`);
      $('#ready').onclick = () => { readyB[mg.id] = true; lastKey = ''; render(); };
      return;
    }
    if (mg.shared && role === 'a' && mine != null) {
      setHtml('mgwait' + mg.id, `<h2>${mg.title}</h2><div class="big-msg">✅ ¡Elegido!<br>📱➡️🧑</div><div class="wait">Pasa el móvil a tu pareja…</div>`);
      return;
    }
    const btns = mg.opts.map((o, i) => `<button class="abtn c${i % 4} ${mine === i ? 'picked' : ''}" data-i="${i}" ${done ? 'disabled' : ''}><span>${esc(o)}</span></button>`).join('');
    setHtml('mgp' + mg.id + role + (done ? 'd' + mine : ''), `<h2>${mg.title}</h2><div class="card"><div class="q">${esc(mg.prompt)}</div></div>
      <div class="wait">${who}</div><div class="tm"><i style="--t:${left}s"></i></div>
      <div class="ans two">${btns}</div>${done ? '<div class="wait">¡Elegido! Esperando… 🤞</div>' : ''}`);
    body.querySelectorAll('[data-i]').forEach((btn) => {
      btn.onclick = () => {
        const i = +btn.dataset.i;
        pickedMg[mg.id + role] = i;
        if (navigator.vibrate) navigator.vibrate(30);
        net.send({ k: 'mgpick', id, i });
        lastKey = '';
        render();
      };
    });
    return;
  }
  setHtml('mgo' + mg.id, `<h2>${mg.title}</h2><div class="big-msg">${nm(mg.a)} y su pareja están jugando</div>${progress()}<div class="wait">Mira la tele 📺</div>`);
}

function renderDrawer(mg, left) {
  const COLORS = ['#1d1b3a', '#e5484d', '#2f7de1', '#2eae62', '#e0a100', '#8b5cf6', '#ffffff'];
  const key = 'draw' + mg.id;
  const first = lastKey !== key;
  setHtml(key, `<h2>🎨 ¡Dibuja! Tu pareja lo adivina mirando la tele</h2>
    <div class="card" style="text-align:center;padding:10px"><b>Pídele a ${TEAMS[mg.rteam].name} que te enseñe la palabra en su móvil</b><br><small>¡Que no la vea tu pareja! Y no vale hablar ni escribir letras.</small></div>
    <canvas id="pad" width="800" height="600"></canvas>
    <div class="colors">${COLORS.map((c) => `<button class="col" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
    <div class="tools2"><button class="btn ghost" id="thin">Fino</button><button class="btn ghost" id="thick">Grueso</button><button class="btn ghost" id="clr">🗑️ Borrar todo</button></div>`);
  if (!first) return;
  const cv = $('#pad'), cx = cv.getContext('2d');
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, 800, 600);
  let pts = [], drawing = false, startFlag = true, last = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const seg = (p) => {
    cx.strokeStyle = drawColor;
    cx.lineWidth = drawW * 800;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.beginPath();
    if (last) cx.moveTo(last[0] * 800, last[1] * 600); else cx.moveTo(p[0] * 800, p[1] * 600);
    cx.lineTo(p[0] * 800 + (last ? 0 : 0.1), p[1] * 600);
    cx.stroke();
    last = p;
  };
  const flush = () => {
    if (!pts.length) return;
    net.send({ k: 'stroke', id, c: drawColor, w: drawW, s: startFlag, pts });
    startFlag = false;
    pts = [];
  };
  const timer = setInterval(() => { if (!document.body.contains(cv)) clearInterval(timer); else flush(); }, 60);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; startFlag = true; last = null; const p = pos(e); seg(p); pts.push(p); });
  cv.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); seg(p); pts.push(p); });
  const end = () => { if (!drawing) return; drawing = false; flush(); last = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  body.querySelectorAll('.col').forEach((b) => { b.onclick = () => { drawColor = b.dataset.c; drawW = drawColor === '#ffffff' ? 0.04 : drawW; }; });
  $('#thin').onclick = () => { drawW = 0.008; };
  $('#thick').onclick = () => { drawW = 0.022; };
  $('#clr').onclick = () => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, 800, 600); net.send({ k: 'clear', id }); };
}

function renderGame(mp) {
  // Me uno a mitad de partida sin equipo
  if (mp.team == null) {
    const opts = S.active.map((t) => `<button class="tbtn" data-t="${t}" style="--c:${TEAMS[t].color}"><span style="font-size:2rem">${AVATARS[S.teams[t].av].emoji}</span>${TEAMS[t].name}</button>`).join('');
    setHtml('late' + S.active.join(''), `<h1>La partida ya empezó</h1><h2>Únete a un equipo</h2><div class="teams">${opts}</div>`);
    body.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => net.send({ k: 'pick', id, team: +b.dataset.t }); });
    return;
  }
  const myTurn = S.cur === id;
  const T = S.teams[S.turn];
  const turnName = S.players[S.cur] ? esc(S.players[S.cur].name) : '';

  if (S.phase === 'mini' && S.mg) return renderMini(mp);

  if (S.phase === 'judge' && S.q) {
    setHtml('judge' + S.seq, `<div class="big-msg">🧐<br>La pantalla está decidiendo si ${myTurn ? 'habéis' : 'han'} acertado…</div>${progress()}`);
    return;
  }

  if (S.phase === 'question' && S.q) {
    const q = S.q;
    const cat = CATS[q.cat] || CATS.gen;
    if (q.kind !== 'mc') {
      const left2 = Math.max(1, Math.round((S.remaining - (Date.now() - recvAt)) / 1000));
      const extra = q.kind === 'film' ? `<div class="emojis">${esc(q.emojis)}</div><div class="wait">${esc(q.hint || '')}</div>` : '';
      setHtml('oq' + q.t + q.kind, `<h2>${TEAMS[S.turn].name} · ${turnName}</h2>
        <div class="card"><div class="q">${cat.emoji} ${esc(q.t)}</div>${extra}</div>
        <div class="tm"><i style="--t:${left2}s"></i></div>
        <div class="big-msg" style="font-size:1.3rem">${myTurn || S.cur && S.players[S.cur] && S.players[S.cur].team === mp.team ? '💬 ¡Hablad entre vosotros y decidlo en voz alta!' : '🤐 Los rivales piensan… ¡silencio!'}</div>`);
      return;
    }
    if (answeredQ !== q.t) myPick = null;
    const left = Math.max(1, Math.round((S.remaining - (Date.now() - recvAt)) / 1000));
    if (myTurn) {
      const locked = answeredQ === q.t;
      const btns = q.o.map((o, i) => `<button class="abtn c${i} ${locked && myPick === i ? 'picked' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}><span class="l">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
      setHtml('q' + q.t + locked + myPick, `<div class="card"><div class="q">${cat.emoji} ${esc(q.t)}</div></div>
        <div class="tm"><i style="--t:${left}s"></i></div>
        <div class="ans">${btns}</div>
        ${locked ? '<div class="wait">¡Respuesta enviada! Mira la tele 📺</div>' : ''}`);
      body.querySelectorAll('[data-i]').forEach((b) => {
        b.onclick = () => {
          const i = +b.dataset.i;
          answeredQ = q.t;
          myPick = i;
          net.send({ k: 'answer', id, i });
          lastKey = '';
          render();
        };
      });
    } else {
      setHtml('qw' + q.t, `<h2>${TEAMS[S.turn].name} · ${turnName} está respondiendo</h2>
        <div class="card"><div class="q">${cat.emoji} ${esc(q.t)}</div></div>
        <div class="wait">¡Ayuda a tu equipo a pensar! 🤔</div>${progress()}`);
    }
    return;
  }

  if (S.phase === 'result') {
    const good = S.reveal != null ? S.picked === S.reveal : /acertado|Correcto/.test(S.msg || '');
    setHtml('res' + S.seq, `<div class="big-msg">${good ? '🎉' : S.picked == null && S.reveal != null ? '⏰' : '😬'}<br>${esc(S.msg)}</div>${S.ansText ? `<div class="card"><div class="q">${esc(S.ansText)}</div></div>` : ''}${progress()}`);
    return;
  }

  if (S.phase === 'roll') {
    if (myTurn) {
      const need = T.need ? `<div class="need">👹 ¡Un monstruo te bloquea!<br>Necesitas sacar del ${T.need} al ${T.nmax}</div>` : '';
      setHtml('roll' + S.seq, `<h2>${S.streak ? '¡Sigues tú! Tira otra vez' : '¡Es tu turno!'}</h2>${need}
        <button class="bigdie" id="die">🎲</button><div class="wait">Pulsa el dado</div>`);
      $('#die').onclick = () => {
        const d = $('#die');
        if (d.classList.contains('off')) return;
        d.classList.add('off');
        if (navigator.vibrate) navigator.vibrate(40);
        net.send({ k: 'roll', id });
      };
    } else {
      const need2 = T.need ? `<div class="need">👹 El monstruo pide del ${T.need} al ${T.nmax}</div>` : '';
      setHtml('rollw' + S.seq, `<h2>Turno de ${TEAMS[S.turn].name}</h2><div class="big-msg">${AVATARS[T.av].emoji}<br>${turnName} va a tirar el dado</div>${need2}${progress()}`);
    }
    return;
  }

  // rolling / moving
  const txt = S.phase === 'rolling' ? '🎲 ¡Rodando el dado!' : esc(S.msg || '…');
  setHtml('mv' + S.seq + S.phase, `<div class="big-msg">${txt}</div>${progress()}<div class="wait">Mira la tele 📺</div>`);
}

function renderOver() {
  const w = S.winner;
  const mine = me() && me().team === w;
  setHtml('over' + w, `<div class="big-msg" style="font-size:2.2rem">${mine ? '🏆 ¡HABÉIS GANADO!' : '🏁 Fin de la partida'}<br><span style="color:${TEAMS[w].color};filter:brightness(.8)">Equipo ${TEAMS[w].name}</span><br>${AVATARS[S.teams[w].av].emoji}</div>
    <div class="wait">Mira la tele para jugar otra vez.</div>`);
}
