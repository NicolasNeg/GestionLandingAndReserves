/**
 * Selección de backend realtime: Firebase (Firestore) por defecto.
 */
import { isRealtimeSupabase } from './migrationEnv.js';
import * as rtFirebase from './realtimeFirebase.js';
import * as rtSupabase from './realtimeSupabase.js';

function impl() {
  return isRealtimeSupabase() ? rtSupabase : rtFirebase;
}

export function resolveRealtimeProvider() {
  return isRealtimeSupabase() ? 'supabase' : 'firebase';
}

export const subscribeMesaReservasByFecha = (...args) =>
  impl().subscribeMesaReservasByFecha(...args);
export const upsertMesaReservaLive = (...args) => impl().upsertMesaReservaLive(...args);
export const clearMesaReservaLive = (...args) => impl().clearMesaReservaLive(...args);
export const claimMesaReservaLive = (...args) => impl().claimMesaReservaLive(...args);
export const getMesaReservaLive = (...args) => impl().getMesaReservaLive(...args);

export const subscribeParkingSpots = (...args) => impl().subscribeParkingSpots(...args);
export const upsertParkingSpot = (...args) => impl().upsertParkingSpot(...args);
export const updateParkingSpot = (...args) => impl().updateParkingSpot(...args);
export const removeParkingSpot = (...args) => impl().removeParkingSpot(...args);
