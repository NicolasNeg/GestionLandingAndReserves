/**
 * Punto de entrada para permisos (Firestore/Data Connect vs Postgres).
 */
import { getUserAccessFirebase } from './accessControlFirebaseCore.js';
import { getUserAccessSupabase } from './permissionsSupabase.js';
import { isPermissionsSupabase } from './migrationEnv.js';

function guestAccess() {
  return {
    user: null,
    uid: null,
    name: 'Invitado',
    email: '',
    photoURL: '',
    role: 'invitado',
    roleLabel: 'Invitado',
    permissions: [],
    can: () => false,
    isProgramador: false
  };
}

export function resolvePermissionsProvider() {
  return isPermissionsSupabase() ? 'supabase' : 'firebase';
}

export async function getUserAccessResolved(user) {
  if (!user) return guestAccess();
  if (resolvePermissionsProvider() === 'supabase') {
    return getUserAccessSupabase(user);
  }
  return getUserAccessFirebase(user);
}
