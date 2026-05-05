/**
 * Realtime Supabase (Fase 5D). Por ahora best-effort / no-op: la fuente canónica sigue siendo Postgres.
 */

function noopUnsub() {}

export function subscribeMesaReservasByFecha(fechaDia, onData, onError) {
  try {
    onData([]);
  } catch (e) {
    onError?.(e);
  }
  return noopUnsub;
}

export async function upsertMesaReservaLive(_payload) {
  return { ok: false, skipped: true, reason: 'supabase-realtime-pending' };
}

export async function clearMesaReservaLive(_fechaDia, _mapItemId) {
  return { ok: false, skipped: true, reason: 'supabase-realtime-pending' };
}

export async function claimMesaReservaLive({ userId }) {
  return {
    acquired: true,
    mine: true,
    ownerId: userId || '',
    skipped: true,
    reason: 'supabase-realtime-pending'
  };
}

export async function getMesaReservaLive() {
  return null;
}

export function subscribeParkingSpots(onData, onError) {
  try {
    onData([]);
  } catch (e) {
    onError?.(e);
  }
  return noopUnsub;
}

export async function upsertParkingSpot(_spot) {
  throw new Error('Parking realtime Supabase pendiente (fase 5D)');
}

export async function updateParkingSpot(_id, _patch) {
  throw new Error('Parking realtime Supabase pendiente (fase 5D)');
}

export async function removeParkingSpot(_id) {
  throw new Error('Parking realtime Supabase pendiente (fase 5D)');
}
