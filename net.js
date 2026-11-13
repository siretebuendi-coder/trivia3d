// Conexión en tiempo real con Supabase (canal "broadcast"; no usa tablas ni base de datos).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export function connect(code, onMsg, onStatus = () => {}) {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 30 } },
  });
  const ch = sb.channel('isla-' + code, { config: { broadcast: { self: false, ack: false } } });
  ch.on('broadcast', { event: 'm' }, ({ payload }) => {
    try { onMsg(payload); } catch (e) { console.error(e); }
  });
  let isReady = false;
  const ready = new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout')), 15000);
    ch.subscribe((status) => {
      onStatus(status);
      if (status === 'SUBSCRIBED') { isReady = true; clearTimeout(to); resolve(); }
      else if (status === 'CHANNEL_ERROR' && !isReady) { clearTimeout(to); reject(new Error('channel error')); }
    });
  });
  ready.catch(() => {});
  return {
    ready,
    send(payload) {
      if (!isReady) return;
      ch.send({ type: 'broadcast', event: 'm', payload }).catch(() => {});
    },
    close() { try { sb.removeChannel(ch); } catch (e) { /* nada */ } },
  };
}
