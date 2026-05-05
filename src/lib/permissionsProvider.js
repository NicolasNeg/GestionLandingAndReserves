/**
 * Punto de entrada para permisos (Firestore/Data Connect vs Postgres).
 * Por defecto = mismo comportamiento que antes (`accessControl.getUserAccess`).
 */
import { getUserAccess as getUserAccessFirebase } from './accessControl.js';
import { getUserAccessSupabase } from './permissionsSupabase.js';
import { isPermissionsSupabase } from './migrationEnv.js';

export function resolvePermissionsProvider() {
  return isPermissionsSupabase() ? 'supabase' : 'firebase';
}

export async function getUserAccessResolved(user) {
  if (resolvePermissionsProvider() === 'supabase') {
    return getUserAccessSupabase(user);
  }
  return getUserAccessFirebase(user);
}
