/**
 * Usuario de sesión canónico para backend Supabase + rutas migradas.
 */
import { getCurrentUser, normalizeAuthUser } from './authProvider.js';

export function getCanonicalAuthUser() {
  return normalizeAuthUser(getCurrentUser());
}

export function getCanonicalUserId() {
  const u = getCanonicalAuthUser();
  return u?.uid ?? null;
}
