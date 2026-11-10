import { connect, curId, esc, AV } from './net.js';
const code = (new URLSearchParams(location.search).get('c') || '').toUpperCase();
const id = localStorage.pid || (localStorage.pid = Math.random().toString(36).slice(2, 8));
let S = null, name = localStorage.pname || '';
const app = document.getElementById('app');
const net = connect(code, m => { if (m.k === 'state') { S = m.s; draw(); } });
await net.ready;
if (name) net.send({ k: 'join', id, name }); else draw();
window.go = () => { name = (document.getElementById('n').value || 'Jugador').slice(0, 12); localStorage.pname = name; net.send({ k: 'join', id, name }); };
window.pick = (t, a) => net.send({ k: 'pick', id, team: t, av: a });
window.roll = () => net.send({ k: 'roll', id });
window.ans = i => net.send({ k: 'answer', id, i });
function draw() {
  const head = `<h3>Sala ${esc(code)}</h3>`;
  if (!S) { app.innerHTML = head + (name ? 'Conectando…' : '<input id="n" placeholder="Tu nombre"><br><button onclick="go()">Entrar</button>'); return; }
  const me = S.players[id];
  if (!me) { if (name) net.send({ k: 'join', id, name }); else app.innerHTML = head + '<input id="n" placeholder="Tu nombre"><br><button onclick="go()">Entrar</button>'; return; }
  if (S.phase === 'lobby') {
    app.innerHTML = head + `<p>Hola ${esc(me.name)}, elige equipo:</p><button class="t0" onclick="pick(0,null)">${me.team === 0 ? '✅ ' : ''}Equipo 1</button><button class="t1" onclick="pick(1,null)">${me.team === 1 ? '✅ ' : ''}Equipo 2</button>` +
      (me.team != null ? '<p>Avatar del equipo:</p>' + AV.map((a, i) => `<button class="a ${S.teams[me.team].av === i ? 'on' : ''}" onclick="pick(null,${i})">${a}</button>`).join('') : '');
    return;
  }
  if (S.phase === 'over') { app.innerHTML = head + `<h1>🏆 ¡Gana el Equipo ${S.winner + 1}!</h1>`; return; }
  if (me.team == null) { app.innerHTML = head + 'Partida en curso'; return; }
  const cur = curId(S), mine = cur === id, cn = cur ? esc(S.players[cur].name) : '';
  let h = head + `<p class="t${me.team}" style="padding:6px;border-radius:8px">Equipo ${me.team + 1}</p><p>${esc(S.msg || '')}</p>`;
  if (S.phase === 'roll') h += mine ? '<button onclick="roll()">🎲 Tirar dado</button>' : `<p>Turno de ${cn}</p>`;
  else if (S.phase === 'question') { h += `<h2>${esc(S.q.t)}</h2>`; h += mine ? S.q.o.map((o, i) => `<button onclick="ans(${i})">${esc(o)}</button>`).join('') : `<p>Responde ${cn}…</p>`; }
  else h += `<h1>${S.dice || ''}</h1>`;
  app.innerHTML = h;
}
