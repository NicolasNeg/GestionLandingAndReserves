/**
 * Modo desarrollo: sesión ficticia + permisos totales en localhost.
 *
 * Por defecto: `npm run dev` + hostname localhost → activo (sin variables ni scripts).
 * Desactivar: en `.env.local` pon `VITE_DEV_BOOTSTRAP=0` (o `false`) y reinicia Vite.
 * Nunca en producción (`import.meta.env.PROD`).
 */
import { PERMISSIONS, labelRole } from './permissionsConstants.js';

const SYNTHETIC_UID = '00000000-0000-4000-8000-000000000001';

export function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

function isDevBootstrapExplicitlyDisabled() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  const v = String(import.meta.env.VITE_DEV_BOOTSTRAP || '')
    .toLowerCase()
    .trim();
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}

/** Sesión + permisos elevados en `vite` (npm run dev) sobre localhost, salvo que se desactive con env. */
export function isDevBootstrapActive() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  if (import.meta.env.PROD) return false;
  if (!import.meta.env.DEV) return false;
  if (!isLocalDevHost()) return false;
  if (isDevBootstrapExplicitlyDisabled()) return false;
  return true;
}

export function getSyntheticDevAuthUser() {
  return {
    uid: SYNTHETIC_UID,
    id: SYNTHETIC_UID,
    email: 'dev-bootstrap@localhost',
    displayName: 'Dev bootstrap',
    photoURL: '',
    emailVerified: true,
    providerData: [],
    _auth: 'supabase-dev-bootstrap',
    getIdToken: async () => ''
  };
}

export function buildDevSuperAccess(user) {
  const uid = user?.uid ?? user?.id ?? SYNTHETIC_UID;
  const all = PERMISSIONS.map((p) => p.key);
  const can = (_permission) => true;
  return {
    user,
    userId: uid,
    uid,
    name: user?.displayName || 'Dev bootstrap',
    email: user?.email || 'dev-bootstrap@localhost',
    photoURL: user?.photoURL || '',
    role: 'programador',
    roleLabel: labelRole('programador'),
    permissions: all,
    can,
    isProgramador: true,
    isAdmin: true,
    isStaff: true
  };
}
