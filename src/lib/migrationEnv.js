/**
 * Flags para migración Firebase → Supabase (Fase 5+).
 * Valores por defecto mantienen el comportamiento histórico (Firebase).
 */

function env(key, fallback = '') {
  const v = import.meta.env[key];
  return v === undefined || v === null ? fallback : String(v);
}

export function viteEnv(key, fallback = '') {
  return env(key, fallback);
}

/** Backend de datos: firebase (Data Connect) | supabase */
export function isBackendSupabase() {
  return env('VITE_BACKEND_PROVIDER', 'firebase').toLowerCase() === 'supabase';
}

/** Auth: firebase | supabase (por defecto firebase si no se define) */
export function isAuthSupabase() {
  return env('VITE_AUTH_PROVIDER', 'firebase').toLowerCase() === 'supabase';
}

/** Permisos: firebase (Firestore + DC) | supabase (Postgres). Por defecto sigue a auth si no hay override. */
export function isPermissionsSupabase() {
  const explicit = env('VITE_PERMISSIONS_PROVIDER', '').toLowerCase();
  if (explicit === 'supabase') return true;
  if (explicit === 'firebase') return false;
  return isAuthSupabase();
}

/** Realtime auxiliar: firebase (Firestore) | supabase (Realtime API), best-effort */
export function isRealtimeSupabase() {
  return env('VITE_REALTIME_PROVIDER', 'firebase').toLowerCase() === 'supabase';
}

/** Storage de archivos: firebase | supabase */
export function isStorageSupabase() {
  return env('VITE_STORAGE_PROVIDER', 'firebase').toLowerCase() === 'supabase';
}

/**
 * Crear cliente JS de Supabase si cualquier subsistema lo requiere,
 * aunque el backend de datos siga en Data Connect temporalmente.
 */
export function needsSupabaseJsClient() {
  return (
    isBackendSupabase() ||
    isAuthSupabase() ||
    env('VITE_PERMISSIONS_PROVIDER', '').toLowerCase() === 'supabase' ||
    isRealtimeSupabase() ||
    isStorageSupabase()
  );
}
