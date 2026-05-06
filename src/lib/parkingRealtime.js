/**
 * Parking en vivo: tabla public.parking_spots + Supabase Realtime.
 */
import { listParkingSpotsRows } from './supabaseData.js';
import { supabase } from '../supabase/client.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase no inicializado');
  return supabase;
}

function mapSpotRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    x: Number(r.x ?? 20),
    y: Number(r.y ?? 20),
    estado: r.estado || 'libre',
    tipoVehiculo: r.tipo_vehiculo || '',
    placas: r.placas || '',
    modelo: r.modelo || '',
    reservadoPor: r.reservado_por || '',
    ubicacion: r.ubicacion || 'patio'
  };
}

export function subscribeParkingSpots(onData, onError) {
  let cancelled = false;
  const push = () => {
    if (cancelled) return;
    listParkingSpotsRows()
      .then((rows) => {
        if (cancelled) return;
        const spots = (rows || []).map(mapSpotRow).sort((a, b) => String(a.id).localeCompare(String(b.id)));
        onData(spots);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === 'permission-denied' || /permission/i.test(String(err?.message || ''))) {
          onData([]);
          return;
        }
        onError?.(err);
      });
  };

  push();

  const sb = requireClient();
  const channel = sb
    .channel('parking_spots_global')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parking_spots' },
      () => push()
    )
    .subscribe();

  return () => {
    cancelled = true;
    sb.removeChannel(channel);
  };
}

export async function upsertParkingSpot(spot) {
  const sb = requireClient();
  const id = String(spot.id || '').trim();
  if (!id) throw new Error('Spot sin ID');
  const now = new Date().toISOString();
  const { error } = await sb.from('parking_spots').upsert(
    {
      id,
      x: Number(spot.x || 20),
      y: Number(spot.y || 20),
      estado: spot.estado || 'libre',
      tipo_vehiculo: spot.tipoVehiculo || '',
      placas: spot.placas || '',
      modelo: spot.modelo || '',
      reservado_por: spot.reservadoPor || '',
      ubicacion: spot.ubicacion || 'patio',
      updated_at: now
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function updateParkingSpot(id, patch) {
  const sb = requireClient();
  const row = {
    ...(patch.x != null ? { x: Number(patch.x) } : {}),
    ...(patch.y != null ? { y: Number(patch.y) } : {}),
    ...(patch.estado != null ? { estado: patch.estado } : {}),
    ...(patch.tipoVehiculo != null ? { tipo_vehiculo: patch.tipoVehiculo } : {}),
    ...(patch.placas != null ? { placas: patch.placas } : {}),
    ...(patch.modelo != null ? { modelo: patch.modelo } : {}),
    ...(patch.reservadoPor != null ? { reservado_por: patch.reservadoPor } : {}),
    ...(patch.ubicacion != null ? { ubicacion: patch.ubicacion } : {}),
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('parking_spots').update(row).eq('id', id);
  if (error) throw error;
}

export async function removeParkingSpot(id) {
  const sb = requireClient();
  const { error } = await sb.from('parking_spots').delete().eq('id', id);
  if (error) throw error;
}
