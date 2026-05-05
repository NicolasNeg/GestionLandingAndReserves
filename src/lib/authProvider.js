/**
 * Fachada de autenticación: Firebase (por defecto) o Supabase según VITE_AUTH_PROVIDER.
 * Las vistas pueden seguir usando `firebase-config` hasta la Fase 5B; esta capa es el punto de migración.
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
