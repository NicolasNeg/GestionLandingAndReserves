/**
 * Entorno Supabase-only (Postgres + Auth + Realtime + Storage).
 */

function env(key, fallback = '') {
  const v = import.meta.env[key];
  return v === undefined || v === null ? fallback : String(v);
}

export function viteEnv(key, fallback = '') {
  return env(key, fallback);
}

export function isBackendSupabase() {
  return env('VITE_BACKEND_PROVIDER', 'supabase').toLowerCase() === 'supabase';
}

export function isAuthSupabase() {
  return env('VITE_AUTH_PROVIDER', 'supabase').toLowerCase() === 'supabase';
}

export function isPermissionsSupabase() {
  return env('VITE_PERMISSIONS_PROVIDER', 'supabase').toLowerCase() === 'supabase';
}

export function isRealtimeSupabase() {
  return env('VITE_REALTIME_PROVIDER', 'supabase').toLowerCase() === 'supabase';
}

export function isStorageSupabase() {
  return env('VITE_STORAGE_PROVIDER', 'supabase').toLowerCase() === 'supabase';
}

/** Siempre true en este proyecto: credenciales obligatorias en build/runtime. */
export function needsSupabaseJsClient() {
  return true;
}
