/**
 * Fachada de autenticación: Firebase (por defecto) o Supabase según VITE_AUTH_PROVIDER.
 */
import { isAuthSupabase } from './migrationEnv.js';
import * as authFirebase from './authFirebase.js';
import * as authSupabase from './authSupabase.js';

function impl() {
  return isAuthSupabase() ? authSupabase : authFirebase;
}

export function resolveAuthProvider() {
  return isAuthSupabase() ? 'supabase' : 'firebase';
}

/**
 * Objeto estable para UI y permisos; `uid` siempre presente si hay usuario.
 */
export function normalizeAuthUser(raw) {
  if (!raw) return null;
  const uid = raw.uid ?? raw.id ?? null;
  if (!uid) return null;
  return {
    uid,
    id: uid,
    email: raw.email ?? '',
    displayName: raw.displayName ?? '',
    name: raw.displayName ?? raw.name ?? '',
    photoURL: raw.photoURL ?? '',
    emailVerified: raw.emailVerified !== undefined ? !!raw.emailVerified : false,
    provider: resolveAuthProvider(),
    raw
  };
}

export function getCurrentUser() {
  return impl().getCurrentUser();
}

export function onAuthChange(callback) {
  return impl().onAuthChange(callback);
}

export function waitForAuthUser(timeoutMs) {
  return impl().waitForAuthUser(timeoutMs);
}

export function signInWithGoogle() {
  return impl().signInWithGoogle();
}

export function signInWithFacebook() {
  return impl().signInWithFacebook();
}

export function signInWithEmail(email, password) {
  return impl().signInWithEmail(email, password);
}

export function signUpWithEmail(email, password, metadata) {
  return impl().signUpWithEmail(email, password, metadata);
}

export function sendPasswordReset(email, options) {
  return impl().sendPasswordReset(email, options);
}

export function updateCurrentUserProfile(patch) {
  return impl().updateCurrentUserProfile(patch);
}

export function resendEmailVerification(options) {
  return impl().resendEmailVerification(options);
}

export function logout() {
  return impl().logout();
}

export function getUserId() {
  return impl().getUserId();
}

export function getUserEmail() {
  return impl().getUserEmail();
}

export function getUserDisplayName() {
  return impl().getUserDisplayName();
}

export function getUserPhotoURL() {
  return impl().getUserPhotoURL();
}
