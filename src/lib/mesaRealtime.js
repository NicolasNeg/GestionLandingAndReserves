/**
 * Realtime de mesas: Postgres + Supabase Realtime (postgres_changes). Best-effort; lectura canónica en DB.
 */
import { supabase } from '../supabase/client.js';
import { getCurrentUser } from './authProvider.js';
import { getBackendErrorMessage, isPermissionError } from './backendErrors.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
}

function mapLiveRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    fechaDia: r.fecha_dia,
    mapItemId: r.map_item_id,
    userId: r.user_id || '',
    estado: r.estado || ''
  };
}

async function fetchMesaRowsForFecha(fechaDia) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('id,fecha_dia,map_item_id,user_id,estado')
    .eq('fecha_dia', fechaDia)
    .order('creado_en', { ascending: false })
    .limit(800);
  if (error) throw error;
  return (data || []).map(mapLiveRow);
}

export function subscribeMesaReservasByFecha(fechaDia, onData, onError) {
  let cancelled = false;
  const push = () => {
    if (cancelled) return;
    fetchMesaRowsForFecha(fechaDia)
      .then((rows) => {
        if (!cancelled) onData(rows);
      })
      .catch((err) => {
        if (!cancelled) onError?.(err);
      });
  };

  push();

  const sb = requireClient();
  const channel = sb
    .channel(`mesa_reservas:${fechaDia}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mesa_reservas',
        filter: `fecha_dia=eq.${fechaDia}`
      },
      () => push()
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Realtime mesas: ${status}`));
      }
    });

  return () => {
    cancelled = true;
    sb.removeChannel(channel);
  };
}

export async function upsertMesaReservaLive({ fechaDia, mapItemId, userId, estado = 'apartada' }) {
  if (!getCurrentUser() || !userId) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  const sb = requireClient();
  const { error } = await sb
    .from('mesa_reservas')
    .update({ estado, user_id: userId })
    .eq('fecha_dia', fechaDia)
    .eq('map_item_id', mapItemId)
    .eq('user_id', userId);
  if (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime mesas sin permiso para actualizar:', getBackendErrorMessage(error));
      return { ok: false, skipped: true, reason: 'permission-denied', error };
    }
    throw error;
  }
  return { ok: true, skipped: false };
}

export async function clearMesaReservaLive(fechaDia, mapItemId) {
  const user = getCurrentUser();
  if (!user) {
    return { ok: false, skipped: true, reason: 'auth-required' };
  }
  const uid = user.uid ?? user.id;
  const sb = requireClient();
  const { error } = await sb
    .from('mesa_reservas')
    .delete()
    .eq('fecha_dia', fechaDia)
    .eq('map_item_id', mapItemId)
    .eq('user_id', uid)
    .eq('estado', 'apartada');
  if (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime mesas sin permiso para limpiar:', getBackendErrorMessage(error));
      return { ok: false, skipped: true, reason: 'permission-denied', error };
    }
    throw error;
  }
  return { ok: true, skipped: false };
}

export async function claimMesaReservaLive({ fechaDia, mapItemId, userId }) {
  if (!getCurrentUser() || !userId) {
    return { acquired: false, mine: false, ownerId: '', skipped: true, reason: 'auth-required' };
  }
  const sb = requireClient();
  const row = {
    fecha_dia: fechaDia,
    map_item_id: mapItemId,
    estado: 'apartada',
    user_id: userId
  };
  const { data, error } = await sb.from('mesa_reservas').insert(row).select('id,user_id').maybeSingle();
  if (!error && data) {
    return { acquired: true, mine: true, ownerId: userId || '', skipped: false };
  }
  if (error?.code === '23505') {
    const { data: existing, error: readErr } = await sb
      .from('mesa_reservas')
      .select('user_id')
      .eq('fecha_dia', fechaDia)
      .eq('map_item_id', mapItemId)
      .eq('estado', 'apartada')
      .maybeSingle();
    if (readErr) throw readErr;
    const ownerId = String(existing?.user_id || '');
    const isMine = ownerId && ownerId === userId;
    if (isMine) {
      return { acquired: true, mine: true, ownerId, skipped: false };
    }
    return { acquired: false, mine: false, ownerId, skipped: false };
  }
  if (isPermissionError(error)) {
    console.warn('Realtime mesas sin permiso para reclamar:', getBackendErrorMessage(error));
    return {
      acquired: true,
      mine: true,
      ownerId: userId || '',
      skipped: true,
      reason: 'permission-denied'
    };
  }
  throw error;
}

export async function getMesaReservaLive(fechaDia, mapItemId) {
  const sb = requireClient();
  const { data, error } = await sb
    .from('mesa_reservas')
    .select('id,fecha_dia,map_item_id,user_id,estado')
    .eq('fecha_dia', fechaDia)
    .eq('map_item_id', mapItemId)
    .eq('estado', 'apartada')
    .maybeSingle();
  if (error) {
    if (isPermissionError(error)) {
      console.warn('Realtime mesas sin permiso para leer:', getBackendErrorMessage(error));
      return null;
    }
    throw error;
  }
  return mapLiveRow(data);
}
