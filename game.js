// Lógica del juego. No sabe nada de gráficos: solo reglas, turnos y mensajes.
// La pantalla principal (host.js) le pasa un "stage" con las animaciones.

import { N, tileType, BONUS_STEPS, TRAP_STEPS, QTIME, TEAMS, AVATARS, shuffle } from './shared.js';

export function createGame(opts) {
  const {
    questions,
    publish = () => {},
    rng = Math.random,
    qtime = QTIME,
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
      sfx: () => {},
    },
    opts.stage || {}
  );

  let joinSeq = 0;
  let runId = 0;
  let ans = -1; // índice correcto de la pregunta actual (nunca se envía a los móviles)
  const waiters = new Set();

  const freshTeams = (prev) =>
    TEAMS.map((_, i) => ({ pos: 0, av: prev ? prev[i].av : i, defeated: [], need: 0 }));

  let S = {
    phase: 'lobby',
    players: {},
    teams: freshTeams(),
    active: [],
    turn: 0,
    idx: [0, 0, 0, 0],
    cur: null,
    dice: 0,
    q: null,
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

  function pub() {
    S.seq++;
    S.cur = S.phase === 'lobby' ? null : curId();
    if (S.phase === 'question') S.remaining = Math.max(0, S.deadline - Date.now());
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

  // ---------- mensajes de los jugadores ----------
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

  function handle(m) {
    if (!m || typeof m !== 'object') return;
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
      case 'roll':
      case 'answer':
      case 'hostroll':
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
        T.need = 1 + Math.floor(rng() * 6);
        S.msg = `¡Un monstruo bloquea el camino! Necesitas sacar un ${T.need}`;
        pub();
        st.sfx('monster');
        await st.monsterRoar(nx);
        return 'monster';
      }
    }
    return 'ok';
  }

  // ---------- pregunta ----------
  function pickQuestion() {
    let pool = [];
    for (let i = 0; i < questions.length; i++) if (!used.has(i)) pool.push(i);
    if (!pool.length) {
      used.clear();
      for (let i = 0; i < questions.length; i++) pool.push(i);
    }
    const i = pool[Math.floor(rng() * pool.length)];
    used.add(i);
    onUsed(used);
    const [cat, t, right, ...wrong] = questions[i];
    const o = shuffle([right, ...wrong], rng);
    ans = o.indexOf(right);
    return { t, o, cat };
  }

  async function ask(t, pid) {
    S.q = pickQuestion();
    S.reveal = null;
    S.picked = null;
    S.phase = 'question';
    S.msg = '';
    S.deadline = Date.now() + qtime * 1000;
    pub();
    const m = await waitMsg(
      (x) => x.k === 'skip' || (x.k === 'answer' && x.id === pid && Number.isInteger(x.i) && x.i >= 0 && x.i < 4),
      qtime * 1000
    );
    if (m && m.k === 'abort') return null;
    const answered = m && m.k === 'answer';
    const ok = answered && m.i === ans;
    S.phase = 'result';
    S.reveal = ans;
    S.picked = answered ? m.i : null;
    S.msg = ok ? '¡Correcto!' : answered ? 'Fallaste' : m ? 'Pregunta saltada' : '¡Se acabó el tiempo!';
    pub();
    st.sfx(ok ? 'ok' : 'bad');
    if (ok) st.cheer(t);
    else st.sad(t);
    await st.sleep(2300);
    S.q = null;
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
    S.reveal = null;
    S.picked = null;
    S.msg = T.need ? `¡El monstruo pide un ${T.need}!` : S.streak ? '¡Tira otra vez!' : 'Tira el dado';
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

    if (T.need) {
      if (d !== T.need) {
        S.msg = `Sacó un ${d}... el monstruo quería un ${T.need}`;
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
      S.msg = '¡Monstruo derrotado!';
      pub();
      st.sfx('ok');
      const all = S.active.every((a) => S.teams[a].defeated.includes(tile));
      await st.monsterDefeated(tile, all, t);
      // el mismo dado sirve para seguir avanzando
    } else {
      S.msg = `¡Sacó un ${d}!`;
      pub();
      await st.sleep(450);
    }

    const r = await advance(t, d);
    if (dead()) return false;
    if (r === 'goal') return win(t);
    if (r === 'monster') {
      S.streak++;
      return true; // el siguiente lanzamiento es el duelo con el monstruo
    }

    const k = tileType(T.pos);
    const ok = await ask(t, pid);
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
    if (k === 'bonus') {
      S.phase = 'moving';
      S.msg = `¡Casilla bonus! Avanzas ${BONUS_STEPS}`;
      pub();
      st.sfx('bonus');
      await st.sleep(500);
      const r2 = await advance(t, BONUS_STEPS);
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
    S.teams.forEach((T) => { T.pos = 0; T.defeated = []; T.need = 0; });
    S.winner = null;
    S.streak = 0;
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
    S.reveal = null;
    S.picked = null;
    S.winner = null;
    S.msg = '';
    S.dice = 0;
    pub();
  }

  return {
    get S() { return S; },
    handle,
    start,
    reset,
    members,
    curId,
    pub,
  };
}
