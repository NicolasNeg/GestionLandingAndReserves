/**
 * Realtime: Supabase (postgres_changes / broadcast).
 */
import * as rtSupabase from './realtimeSupabase.js';

export function resolveRealtimeProvider() {
  return 'supabase';
}

export const subscribeMesaReservasByFecha = (...args) =>
  rtSupabase.subscribeMesaReservasByFecha(...args);
export const upsertMesaReservaLive = (...args) => rtSupabase.upsertMesaReservaLive(...args);
export const clearMesaReservaLive = (...args) => rtSupabase.clearMesaReservaLive(...args);
export const claimMesaReservaLive = (...args) => rtSupabase.claimMesaReservaLive(...args);
export const getMesaReservaLive = (...args) => rtSupabase.getMesaReservaLive(...args);

export const subscribeParkingSpots = (...args) => rtSupabase.subscribeParkingSpots(...args);
export const upsertParkingSpot = (...args) => rtSupabase.upsertParkingSpot(...args);
export const updateParkingSpot = (...args) => rtSupabase.updateParkingSpot(...args);
export const removeParkingSpot = (...args) => rtSupabase.removeParkingSpot(...args);
