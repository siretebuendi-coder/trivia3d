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

  if (S.phase === 'question' && S.q) {
    if (answeredQ !== S.q.t) myPick = null;
    const left = Math.max(1, Math.round((S.remaining - (Date.now() - recvAt)) / 1000));
    const cat = CATS[S.q.cat] || CATS.gen;
    if (myTurn) {
      const locked = answeredQ === S.q.t;
      const btns = S.q.o.map((o, i) => `<button class="abtn c${i} ${locked && myPick === i ? 'picked' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}><span class="l">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
      setHtml('q' + S.q.t + locked + myPick, `<div class="card"><div class="q">${cat.emoji} ${esc(S.q.t)}</div></div>
        <div class="tm"><i style="--t:${left}s"></i></div>
        <div class="ans">${btns}</div>
        ${locked ? '<div class="wait">¡Respuesta enviada! Mira la tele 📺</div>' : ''}`);
      body.querySelectorAll('[data-i]').forEach((b) => {
        b.onclick = () => {
          const i = +b.dataset.i;
          answeredQ = S.q.t;
          myPick = i;
          net.send({ k: 'answer', id, i });
          lastKey = '';
          render();
        };
      });
    } else {
      setHtml('qw' + S.q.t, `<h2>${TEAMS[S.turn].name} · ${turnName} está respondiendo</h2>
        <div class="card"><div class="q">${cat.emoji} ${esc(S.q.t)}</div></div>
        <div class="wait">¡Ayuda a tu equipo a pensar! 🤔</div>${progress()}`);
    }
    return;
  }

  if (S.phase === 'result') {
    const good = S.reveal != null && S.picked === S.reveal;
    setHtml('res' + S.seq, `<div class="big-msg">${good ? '🎉' : S.picked == null ? '⏰' : '😬'}<br>${esc(S.msg)}</div>${progress()}`);
    return;
  }

  if (S.phase === 'roll') {
    if (myTurn) {
      const need = T.need ? `<div class="need">👹 ¡Un monstruo te bloquea!<br>Necesitas sacar un ${T.need}</div>` : '';
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
      setHtml('rollw' + S.seq, `<h2>Turno de ${TEAMS[S.turn].name}</h2><div class="big-msg">${AVATARS[T.av].emoji}<br>${turnName} va a tirar el dado</div>${progress()}`);
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
