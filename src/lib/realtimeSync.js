import { getCurrentUser } from './authProvider.js';
import { supabase } from '../supabase/client.js';

const BROADCAST_CH = 'app-broadcast';
const EVENT = 'app_update';
const CLIENT_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let lastKey = '';

export async function publishAppUpdate(scope = 'general', detail = '') {
  if (!supabase) {
    return { ok: false, skipped: true, reason: 'no-supabase' };
  }
  const u = getCurrentUser();
  if (!u) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  const ch = supabase.channel(BROADCAST_CH);
  await new Promise((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  await ch.send({
    type: 'broadcast',
    event: EVENT,
    payload: {
      scope,
      detail,
      source: CLIENT_ID,
      updatedBy: u.uid ?? u.id ?? null
    }
  });
  await supabase.removeChannel(ch);
  return { ok: true, skipped: false };
}

export function initRealtimeSync(onRemoteUpdate) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(BROADCAST_CH)
    .on('broadcast', { event: EVENT }, (msg) => {
      const p = msg?.payload || {};
      if (p.source === CLIENT_ID) return;
      const key = `${p.scope || ''}_${p.source || ''}_${p.detail || ''}`;
      if (key === lastKey) return;
      lastKey = key;
      onRemoteUpdate?.(p.scope || 'general', p);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
