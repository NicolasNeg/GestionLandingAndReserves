/**
 * Resolución de permisos desde Postgres (public.users) + defaults.
 * No usa Firestore. Fase 5C añadirá RLS estricta y tablas de rol.
 */
import { getUserProfile } from './dataLayer.js';
import { isDataConnectNotDeployed, isPermissionError } from './dataConnectErrors.js';
import {
  DEFAULT_ROLE_PERMISSIONS,
  isBootstrapProgramadorEmail,
  labelRole,
  normalizeRole,
  PERMISSIONS,
  uniquePermissions
} from './permissionsConstants.js';

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

function userIdFrom(user) {
  if (!user) return null;
  return user.uid ?? user.id ?? null;
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
    if (!isPermissionError(error) && !isDataConnectNotDeployed(error)) {
      console.warn('Perfil Supabase/Postgres no disponible para permisos:', error);
    }
  }

  const role = isBootstrapProgramadorEmail(user.email || row?.email)
    ? 'programador'
    : normalizeRole(row?.rol);

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
  const ownPermissions = Array.isArray(row?.permissions) ? row.permissions : [];

  const permissions =
    role === 'programador'
      ? PERMISSIONS.map((p) => p.key)
      : uniquePermissions(roleDefaults, ownPermissions);

  const name = row?.nombre || user.displayName || 'Usuario';
  const email = row?.email || user.email || '';
  const photoURL = row?.photoURL || user.photoURL || '';

  return {
    user,
    uid,
    name,
    email,
    photoURL,
    role,
    roleLabel: labelRole(role),
    permissions,
    can: (permission) => role === 'programador' || permissions.includes(permission),
    isProgramador: role === 'programador'
  };
}
