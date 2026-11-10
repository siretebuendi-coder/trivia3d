import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
export function connect(code, onMsg) {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const ch = sb.channel('room-' + code, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
  const ready = new Promise(r => ch.subscribe(s => { if (s === 'SUBSCRIBED') r(); }));
  return { ready, send: p => ch.send({ type: 'broadcast', event: 'm', payload: p }) };
}
export const members = (s, t) => Object.entries(s.players).filter(([, p]) => p.team === t).sort(([a], [b]) => (a < b ? -1 : 1));
export const curId = s => { const m = members(s, s.turn); return m.length ? m[s.idx[s.turn] % m.length][0] : null; };
export const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
export const AV = ['🤖', '🐱', '🧙', '👑', '🐸', '🦄'];
