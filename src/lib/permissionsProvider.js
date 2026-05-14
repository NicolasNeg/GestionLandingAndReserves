/**
 * Permisos desde Postgres (public.users, role_permissions, RLS).
 */
import {
  buildDevSuperAccess,
  getSyntheticDevAuthUser,
  isDevBootstrapActive
} from './devBootstrap.js';
import { getUserAccessSupabase } from './permissionsSupabase.js';

function guestAccess() {
  return {
    user: null,
    userId: null,
    uid: null,
    name: 'Invitado',
    email: '',
    photoURL: '',
    role: 'invitado',
    roleLabel: 'Invitado',
    permissions: [],
    can: () => false,
    isProgramador: false,
    isAdmin: false,
    isStaff: false
  };
}

export function resolvePermissionsProvider() {
  return 'supabase';
}

export async function getUserAccessResolved(user) {
  if (isDevBootstrapActive()) {
    const u = user || getSyntheticDevAuthUser();
    return buildDevSuperAccess(u);
  }
  if (!user) return guestAccess();
  return getUserAccessSupabase(user);
}
