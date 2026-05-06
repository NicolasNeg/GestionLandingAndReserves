/**
 * Permisos desde Postgres (public.users + public.role_permissions).
 * Sin elevación por email ni fallback admin/programador (Fase 5C).
 */
import { getUserProfile } from './supabaseData.js';
import { mergeUserProfileFromAuth } from './supabaseData.js';
import { supabase } from '../supabase/client.js';
import { isBackendOperationUnavailable, isPermissionError } from './backendErrors.js';
import {
  DEFAULT_ROLE_PERMISSIONS,
  labelRole,
  normalizeRole,
  PERMISSIONS,
  uniquePermissions
} from './permissionsConstants.js';

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

function userIdFrom(user) {
  if (!user) return null;
  return user.uid ?? user.id ?? null;
}

async function fetchRolePermissionsForRole(role) {
  const normalized = normalizeRole(role);
  if (!supabase || normalized === 'invitado') return [];
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role', normalized);
    if (error) {
      console.warn('[permissionsSupabase] role_permissions:', error.message);
      return [];
    }
    return (data || []).map((r) => r.permission).filter(Boolean);
  } catch (e) {
    console.warn('[permissionsSupabase] role_permissions:', e?.message || e);
    return [];
  }
}

export async function getUserAccessSupabase(user) {
  if (!user) return guestAccess();

  const uid = userIdFrom(user);
  if (!uid) return guestAccess();

  let row = null;
  try {
    const profile = await getUserProfile({ id: uid });
    row = profile.data?.user || null;
  } catch (error) {
    if (!isPermissionError(error) && !isBackendOperationUnavailable(error)) {
      console.warn('Perfil Postgres no disponible para permisos:', error);
    }
  }

  if (!row) {
    try {
      await mergeUserProfileFromAuth(user);
      const profile2 = await getUserProfile({ id: uid });
      row = profile2.data?.user || null;
    } catch (e) {
      console.warn(
        '[permissionsSupabase] Sin fila users; merge falló (¿RLS?). Rol cliente.',
        e?.message || e
      );
    }
  }

  const normalizedRole = normalizeRole(row?.rol);

  const ownPermissions = Array.isArray(row?.permissions) ? row.permissions : [];

  const permsFromTable = await fetchRolePermissionsForRole(normalizedRole);
  const defaultsForRole = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
  const baseFromRole =
    permsFromTable.length > 0 ? permsFromTable : defaultsForRole;

  const permissions =
    normalizedRole === 'programador'
      ? PERMISSIONS.map((p) => p.key)
      : uniquePermissions(baseFromRole, ownPermissions);

  const name = row?.nombre || user.displayName || 'Usuario';
  const email = row?.email || user.email || '';
  const photoURL = row?.photoURL || user.photoURL || '';

  const isProgramador = normalizedRole === 'programador';
  const isStaff = normalizedRole === 'trabajador';
  const isAdmin = normalizedRole === 'jefe';

  const can = (permission) =>
    isProgramador || permissions.includes(permission);

  return {
    user,
    userId: uid,
    uid,
    name,
    email,
    photoURL,
    role: normalizedRole,
    roleLabel: labelRole(normalizedRole),
    permissions,
    can,
    isProgramador,
    isAdmin,
    isStaff
  };
}
