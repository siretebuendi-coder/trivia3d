// Lógica del juego. No sabe nada de gráficos: solo reglas, turnos y mensajes.
// La pantalla principal (host.js) le pasa un "stage" con las animaciones.

import {
  N, tileType, BONUS_STEPS, TRAP_STEPS, MINI_STEPS, QTIME, OPEN_TIME, MINI_TIME, DRAW_TIME, TEAMS, AVATARS, shuffle,
} from './shared.js';

// Mensajes que solo puede mandar la pantalla principal (no los móviles)
const HOST_ONLY = new Set(['hostroll', 'skip', 'hostjudge', 'hostreveal']);

export function createGame(opts) {
  const {
    bank,                       // { easy, hard, open, films, topics, guess, draw }
    publish = () => {},
    secret = () => {},          // mensajes privados (palabra a dibujar)
    rng = Math.random,
    qtime = QTIME,
    opentime = OPEN_TIME,
    minitime = MINI_TIME,
    drawtime = DRAW_TIME,
    used = new Set(),
    onUsed = () => {},
  } = opts;

  const noop = async () => {};
  const st = Object.assign(
    {
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      turnStart: noop,
      rollDice: noop,
      hop: noop,
      monsterRoar: noop,
      monsterTaunt: noop,
      monsterDefeated: noop,
      cheer: noop,
      sad: noop,
      win: noop,
      stroke: () => {},
      sfx: () => {},
    },
    opts.stage || {}
  );

  let joinSeq = 0;
  let runId = 0;
  let mgSeq = 0;
  let ans = -1;          // índice correcto del test actual (nunca se envía a los móviles)
  let openAns = '';      // respuesta de las preguntas de respuesta única
  let curSecret = null;  // { mgid, ids, word }
  const waiters = new Set();

  const freshTeams = (prev) =>
    TEAMS.map((_, i) => ({ pos: 0, av: prev ? prev[i].av : i, defeated: [], need: 0, nmax: 0, carry: 0 }));

  let S = {
    phase: 'lobby',     // lobby | roll | rolling | moving | question | judge | mini | result | over
    players: {},
    teams: freshTeams(),
    active: [],
    turn: 0,
    idx: [0, 0, 0, 0],
    cur: null,
    dice: 0,
    q: null,            // pregunta actual { kind:'mc'|'open'|'film', t, cat, o?, emojis?, hint?, img? }
    ansText: null,      // respuesta mostrada (respuesta única)
    mg: null,           // minijuego actual
    reveal: null,
    picked: null,
    deadline: 0,
    remaining: 0,
    qtime,
    msg: '',
    winner: null,
    streak: 0,
    seq: 0,
  };

  // ---------- utilidades ----------
  const members = (t) =>
    Object.entries(S.players)
      .filter(([, p]) => p.team === t)
      .sort((a, b) => a[1].n - b[1].n)
      .map(([id]) => id);

  const curId = () => {
    const m = members(S.turn);
    return m.length ? m[S.idx[S.turn] % m.length] : null;
  };
  const nameOf = (id) => (S.players[id] ? S.players[id].name : 'Jugador');

  function pub() {
    S.seq++;
    S.cur = S.phase === 'lobby' ? null : curId();
    if (S.deadline && (S.phase === 'question' || S.phase === 'mini')) S.remaining = Math.max(0, S.deadline - Date.now());
    publish(S);
  }

  function fixAvatars() {
    const taken = new Set();
    for (let t = 0; t < TEAMS.length; t++) {
      if (!members(t).length) continue;
      if (taken.has(S.teams[t].av)) {
        const free = AVATARS.findIndex((_, i) => !taken.has(i));
        if (free >= 0) S.teams[t].av = free;
      }
      taken.add(S.teams[t].av);
    }
  }

  // ---------- mensajes ----------
  function waitMsg(pred, ms) {
    return new Promise((res) => {
      const w = { pred, res, t: null };
      waiters.add(w);
      if (ms) w.t = setTimeout(() => { waiters.delete(w); res(null); }, ms);
    });
  }
  function dispatch(m) {
    for (const w of [...waiters]) {
      if (w.pred(m)) {
        waiters.delete(w);
        clearTimeout(w.t);
        w.res(m);
        return;
      }
    }
  }
  function abortWaiters() {
    for (const w of [...waiters]) {
      waiters.delete(w);
      clearTimeout(w.t);
      w.res({ k: 'abort' });
    }
  }

  function handle(m, remote = false) {
    if (!m || typeof m !== 'object') return;
    if (remote && HOST_ONLY.has(m.k)) return;
    switch (m.k) {
      case 'hello':
        return pub();
      case 'join': {
        const name = String(m.name || 'Jugador').trim().slice(0, 14) || 'Jugador';
        const p = S.players[m.id];
        if (p) p.name = name;
        else S.players[m.id] = { name, team: null, n: ++joinSeq };
        return pub();
      }
      case 'pick': {
        const p = S.players[m.id];
        if (!p) return;
        if (Number.isInteger(m.team) && m.team >= 0 && m.team < TEAMS.length) {
          const allowed = S.phase === 'lobby' || (p.team == null && S.active.includes(m.team));
          if (allowed) p.team = m.team;
        }
        if (Number.isInteger(m.av) && m.av >= 0 && m.av < AVATARS.length && S.phase === 'lobby' && p.team != null) {
          const clash = S.teams.some((x, i) => i !== p.team && x.av === m.av && members(i).length > 0);
          if (!clash) S.teams[p.team].av = m.av;
        }
        fixAvatars();
        return pub();
      }
      case 'stroke':
      case 'clear':
        if (S.phase === 'mini' && S.mg && S.mg.type === 'draw' && S.mg.stage === 'play' && m.id === S.mg.drawer) st.stroke(m);
        return;
      case 'roll':
      case 'answer':
      case 'mgpick':
      case 'mgjudge':
      case 'hostroll':
      case 'hostjudge':
      case 'hostreveal':
      case 'skip':
        return dispatch(m);
    }
  }

  // ---------- movimiento ----------
  async function advance(t, n, dir = 1) {
    const T = S.teams[t];
    for (let i = 0; i < n; i++) {
      const nx = Math.max(0, Math.min(N - 1, T.pos + dir));
      if (nx === T.pos) break;
      const from = T.pos;
      T.pos = nx;
      pub();
      await st.hop(t, from, nx);
      if (dir > 0 && nx === N - 1) return 'goal';
      if (dir > 0 && tileType(nx) === 'monster' && !T.defeated.includes(nx)) {
        // el monstruo pide un rango de 3 números (1-3 o 4-6): 50 % de pasar
        T.need = rng() < 0.5 ? 1 : 4;
        T.nmax = T.need + 2;
        T.carry = n - i - 1; // casillas que te sobraban
        S.msg = `¡Un monstruo bloquea el camino! Para pasar, saca del ${T.need} al ${T.nmax}`;
        pub();
        st.sfx('monster');
        await st.monsterRoar(nx);
        return 'monster';
      }
    }
    return 'ok';
  }

  // ---------- elegir contenido sin repetir ----------
  function pickIdx(prefix, arr) {
    let pool = [];
    for (let i = 0; i < arr.length; i++) if (!used.has(prefix + i)) pool.push(i);
    if (!pool.length) {
      for (let i = 0; i < arr.length; i++) used.delete(prefix + i);
      pool = arr.map((_, i) => i);
    }
    const i = pool[Math.floor(rng() * pool.length)];
    used.add(prefix + i);
    onUsed(used);
    return i;
  }

  function pickQuestion() {
    const r = rng();
    const hasFilms = bank.films && bank.films.length;
    if (r < 0.5 || (!bank.open.length && !hasFilms)) {
      const hard = bank.hard.length && (rng() < 0.85 || !bank.easy.length);
      const arr = hard ? bank.hard : bank.easy;
      const row = arr[pickIdx(hard ? 'h' : 'e', arr)];
      const [cat, t, right, ...wrong] = row;
      const o = shuffle([right, ...wrong], rng);
      ans = o.indexOf(right);
      return { kind: 'mc', t, o, cat };
    }
    if (r < 0.8 || !hasFilms) {
      const [cat, t, a] = bank.open[pickIdx('o', bank.open)];
      openAns = a;
      return { kind: 'open', t, cat };
    }
    const f = bank.films[pickIdx('f', bank.films)];
    openAns = f[1];
    const q = { kind: 'film', t: '¿Qué película es?', cat: 'film', emojis: f[0], hint: f[2] };
    if (f[3]) q.img = f[3];
    return q;
  }

  // ---------- pregunta ----------
  async function ask(t, pid) {
    S.q = pickQuestion();
    S.ansText = null;
    S.reveal = null;
    S.picked = null;
    S.mg = null;
    S.phase = 'question';
    S.msg = '';
    const open = S.q.kind !== 'mc';
    S.deadline = Date.now() + (open ? opentime : qtime) * 1000;
    pub();
    let ok;
    if (!open) {
      const m = await waitMsg(
        (x) => x.k === 'skip' || (x.k === 'answer' && x.id === pid && Number.isInteger(x.i) && x.i >= 0 && x.i < 4),
        qtime * 1000
      );
      if (m && m.k === 'abort') return null;
      const answered = m && m.k === 'answer';
      ok = answered && m.i === ans;
      S.phase = 'result';
      S.reveal = ans;
      S.picked = answered ? m.i : null;
      S.msg = ok ? '¡Correcto!' : answered ? 'Fallaste' : m ? 'Pregunta saltada' : '¡Se acabó el tiempo!';
    } else {
      // Se piensa en voz alta; al acabar el tiempo (o antes, con el botón) sale la respuesta y la pantalla decide.
      const m = await waitMsg((x) => x.k === 'hostreveal' || x.k === 'skip' || x.k === 'hostjudge', opentime * 1000);
      if (m && m.k === 'abort') return null;
      if (m && m.k === 'skip') { S.msg = 'Pregunta saltada'; ok = false; } else {
        S.phase = 'judge';
        S.ansText = openAns;
        S.deadline = 0;
        S.msg = '';
        pub();
        st.sfx('tick');
        const j = m && m.k === 'hostjudge' ? m : await waitMsg((x) => x.k === 'hostjudge' || x.k === 'skip');
        if (!j || j.k === 'abort') return null;
        ok = j.k === 'hostjudge' && !!j.ok;
        S.msg = ok ? '¡Han acertado!' : j.k === 'skip' ? 'Pregunta saltada' : 'Han fallado';
      }
      S.phase = 'result';
      S.ansText = openAns;
    }
    pub();
    st.sfx(ok ? 'ok' : 'bad');
    if (ok) st.cheer(t);
    else st.sad(t);
    await st.sleep(open ? 2000 : 2300);
    S.q = null;
    S.ansText = null;
    return ok;
  }

  // ---------- minijuegos de pareja ----------
  // Cada equipo suele tener UN móvil (la pareja lo comparte), pero también vale que cada uno tenga el suyo.
  // Devuelve true/false, o null si se abortó.
  async function party(t, pid) {
    const mem = members(t);
    const shared = mem.length < 2;               // un solo móvil para los dos
    const partner = shared ? null : mem[(mem.indexOf(pid) + 1) % mem.length];
    const rivalTeams = S.active.filter((a) => a !== t && members(a).length);
    const kinds = ['match', 'differ', 'guess'];
    if (rivalTeams.length) kinds.push('draw', 'draw');
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const mgid = ++mgSeq;
    S.q = null;
    S.reveal = null;
    S.picked = null;
    S.ansText = null;
    S.phase = 'mini';
    S.msg = '';

    if (kind === 'draw') {
      // La palabra le sale SOLO al móvil de otro equipo (nunca al de la pareja que dibuja y adivina).
      const word = bank.draw[pickIdx('d', bank.draw)];
      const rt = rivalTeams[Math.floor(rng() * rivalTeams.length)];
      const holders = members(rt);
      S.mg = { id: mgid, type: 'draw', title: '🎨 ¡A dibujar!', drawer: pid, guesser: partner, shared, rteam: rt, holders, stage: 'play' };
      curSecret = { mgid, ids: holders, word };
      secret({ k: 'secret', ...curSecret });
      S.deadline = Date.now() + drawtime * 1000;
      pub();
      const m = await waitMsg(
        (x) => x.k === 'skip' || x.k === 'hostjudge' || (x.k === 'mgjudge' && holders.includes(x.id)),
        drawtime * 1000
      );
      if (m && m.k === 'abort') { curSecret = null; return null; }
      const ok = !!m && m.k !== 'skip' && !!m.ok;
      S.deadline = 0;
      S.mg.stage = 'reveal';
      S.mg.word = word;
      S.mg.ok = ok;
      S.msg = ok ? '¡Lo han adivinado!' : !m ? '¡Se acabó el tiempo!' : 'No lo han adivinado';
      curSecret = null;
      secret({ k: 'secret', mgid, ids: [], word: '' });
      pub();
      st.sfx(ok ? 'ok' : 'bad');
      if (ok) st.cheer(t); else st.sad(t);
      await st.sleep(3200);
      S.mg = null;
      return ok;
    }

    let title, prompt, opts2;
    if (kind === 'guess') {
      const [q, o] = bank.guess[pickIdx('g', bank.guess)];
      title = '💞 ¿Cuánto me conoces?';
      prompt = q.replace('{A}', nameOf(pid));
      opts2 = o;
    } else {
      const [tema, o] = bank.topics[pickIdx('p', bank.topics)];
      title = kind === 'match' ? '🤝 ¡Coincidid!' : '🙅 ¡No coincidáis!';
      prompt = `Elegid en secreto: ${tema.toLowerCase()}`;
      opts2 = o;
    }
    // a = quien responde primero (en "conocerse", quien habla de sí mismo); b = su pareja
    S.mg = { id: mgid, type: kind, title, prompt, opts: opts2, a: pid, b: partner, shared, step: 'a', done: { a: false, b: false }, stage: 'play' };
    const total = (shared ? minitime * 2 : minitime) * 1000; // con un solo móvil hace falta tiempo para pasárselo
    S.deadline = Date.now() + total;
    pub();
    const picks = { a: null, b: null };
    const end = Date.now() + total;
    let skipped = false;
    const okPick = (x, who) => x.k === 'mgpick' && x.id === who && Number.isInteger(x.i) && x.i >= 0 && x.i < opts2.length;
    for (const role of ['a', 'b']) {
      const who = role === 'a' ? pid : shared ? pid : partner;
      S.mg.step = role;
      if (shared) pub();
      // con dos móviles los dos eligen a la vez; con uno, primero A y luego B
      if (!shared && role === 'b') break;
      const left = end - Date.now();
      if (left <= 0) break;
      const m = await waitMsg((x) => x.k === 'skip' || okPick(x, who), left);
      if (!m) break;
      if (m.k === 'abort') return null;
      if (m.k === 'skip') { skipped = true; break; }
      picks[role] = m.i;
      S.mg.done[role] = true;
      pub();
    }
    if (!shared && !skipped) {
      // dos móviles: recogemos las dos elecciones en cualquier orden
      picks.a = null; picks.b = null; S.mg.done = { a: false, b: false };
      S.mg.step = 'both';
      pub();
      while (picks.a == null || picks.b == null) {
        const left = end - Date.now();
        if (left <= 0) break;
        const m = await waitMsg(
          (x) => x.k === 'skip' || (okPick(x, pid) && picks.a == null) || (okPick(x, partner) && picks.b == null),
          left
        );
        if (!m) break;
        if (m.k === 'abort') return null;
        if (m.k === 'skip') { skipped = true; break; }
        const role = m.id === pid ? 'a' : 'b';
        picks[role] = m.i;
        S.mg.done[role] = true;
        pub();
      }
    }
    const both = picks.a != null && picks.b != null;
    const same = both && picks.a === picks.b;
    const ok = !skipped && both && (kind === 'differ' ? !same : same);
    S.deadline = 0;
    S.mg.stage = 'reveal';
    S.mg.reveal = { a: picks.a, b: picks.b };
    S.mg.ok = ok;
    S.msg = ok ? (kind === 'differ' ? '¡Distintos! Bien hecho' : '¡Coincidís!') : both ? (kind === 'differ' ? '¡Habéis coincidido!' : 'No coincidís') : '¡Se acabó el tiempo!';
    pub();
    st.sfx(ok ? 'ok' : 'bad');
    if (ok) st.cheer(t); else st.sad(t);
    await st.sleep(3800);
    S.mg = null;
    return ok;
  }

  // ---------- un lanzamiento de dado (con todo lo que provoca) ----------
  // Devuelve true si el mismo jugador tiene que volver a tirar.
  async function playOnce(t) {
    const T = S.teams[t];
    const pid = curId();
    const run0 = runId;
    const dead = () => runId !== run0; // true si se reinició la partida mientras animábamos
    S.phase = 'roll';
    S.dice = 0;
    S.q = null;
    S.mg = null;
    S.ansText = null;
    S.reveal = null;
    S.picked = null;
    S.msg = T.need ? `¡El monstruo pide del ${T.need} al ${T.nmax}!` : S.streak ? '¡Tira otra vez!' : 'Tira el dado';
    pub();

    const m = await waitMsg((x) => x.k === 'hostroll' || x.k === 'skip' || (x.k === 'roll' && x.id === pid));
    if (m.k === 'skip' || m.k === 'abort') return false;

    const d = 1 + Math.floor(rng() * 6);
    S.phase = 'rolling';
    S.msg = '';
    pub();
    await st.rollDice(d, t);
    if (dead()) return false;
    S.dice = d;
    S.phase = 'moving';

    let r;
    if (T.need) {
      if (d < T.need || d > T.nmax) {
        S.msg = `Sacó un ${d}... el monstruo pedía del ${T.need} al ${T.nmax}`;
        pub();
        st.sfx('bad');
        await st.monsterTaunt(T.pos);
        await st.sleep(1100);
        S.streak = 0;
        return false;
      }
      const tile = T.pos;
      T.defeated.push(tile);
      T.need = 0;
      T.nmax = 0;
      const rest = T.carry;
      T.carry = 0;
      S.msg = rest ? `¡Monstruo derrotado! Avanzas las ${rest} casillas que te sobraban` : '¡Monstruo derrotado!';
      pub();
      st.sfx('ok');
      const all = S.active.every((a) => S.teams[a].defeated.includes(tile));
      await st.monsterDefeated(tile, all, t);
      if (dead()) return false;
      if (!rest) {
        // Justo en la casilla del monstruo: te quedas ahí y en el próximo turno sigues sin duelo.
        S.streak = 0;
        return false;
      }
      r = await advance(t, rest);
    } else {
      S.msg = `¡Sacó un ${d}!`;
      pub();
      await st.sleep(450);
      r = await advance(t, d);
    }
    if (dead()) return false;
    if (r === 'goal') return win(t);
    if (r === 'monster') {
      S.streak++;
      return true; // el siguiente lanzamiento es el duelo con el monstruo
    }

    const k = tileType(T.pos);
    let ok = null;
    if (k === 'party') {
      ok = await party(t, pid);
    } else {
      ok = await ask(t, pid);
    }
    if (ok === null || dead()) return false;
    if (!ok) {
      if (k === 'trap') {
        S.phase = 'moving';
        S.msg = `¡Casilla trampa! Retrocedes ${TRAP_STEPS}`;
        pub();
        st.sfx('trap');
        await st.sleep(500);
        await advance(t, TRAP_STEPS, -1);
      }
      S.streak = 0;
      return false;
    }
    S.streak++;
    const extra = k === 'bonus' ? BONUS_STEPS : k === 'party' ? MINI_STEPS : 0;
    if (extra) {
      S.phase = 'moving';
      S.msg = k === 'bonus' ? `¡Casilla bonus! Avanzas ${extra}` : `¡Premio! Avanzáis ${extra} casillas`;
      S.q = null;
      pub();
      st.sfx('bonus');
      await st.sleep(500);
      const r2 = await advance(t, extra);
      if (dead()) return false;
      if (r2 === 'goal') return win(t);
    }
    return true;
  }

  async function win(t) {
    S.winner = t;
    S.phase = 'over';
    S.msg = '';
    st.sfx('win');
    pub();
    await st.win(t);
    return false;
  }

  function nextTurn() {
    S.idx[S.turn]++;
    const a = S.active;
    let i = a.indexOf(S.turn);
    for (let c = 0; c < a.length; c++) {
      i = (i + 1) % a.length;
      if (members(a[i]).length) break;
    }
    S.turn = a[i];
  }

  async function run(id) {
    while (S.winner == null && runId === id) {
      const t = S.turn;
      await st.turnStart(t);
      S.streak = 0;
      let keep = true;
      while (keep && S.winner == null && runId === id) keep = await playOnce(t);
      if (S.winner != null || runId !== id) break;
      nextTurn();
    }
  }

  // ---------- control desde la pantalla principal ----------
  function start(solo = false) {
    const act = TEAMS.map((_, i) => i).filter((i) => members(i).length);
    if (act.length < (solo ? 1 : 2)) return false;
    S.active = act;
    S.turn = act[0];
    S.idx = [0, 0, 0, 0];
    S.teams.forEach((T) => { T.pos = 0; T.defeated = []; T.need = 0; T.nmax = 0; T.carry = 0; });
    S.winner = null;
    S.streak = 0;
    S.mg = null;
    S.phase = 'roll';
    runId++;
    abortWaiters();
    run(runId);
    return true;
  }

  function reset() {
    runId++;
    abortWaiters();
    S.phase = 'lobby';
    S.teams = freshTeams(S.teams);
    S.active = [];
    S.idx = [0, 0, 0, 0];
    S.q = null;
    S.mg = null;
    S.ansText = null;
    S.reveal = null;
    S.picked = null;
    S.winner = null;
    S.msg = '';
    S.dice = 0;
    curSecret = null;
    pub();
  }

  return {
    get S() { return S; },
    get secret() { return curSecret; },
    handle,
    start,
    reset,
    members,
    curId,
    pub,
  };
}
