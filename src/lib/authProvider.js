/**
 * Fachada de autenticación: Supabase Auth.
 */
import * as authSupabase from './authSupabase.js';

export function resolveAuthProvider() {
  return 'supabase';
}

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
    provider: 'supabase',
    raw
  };
}

export function getCurrentUser() {
  return authSupabase.getCurrentUser();
}

export function onAuthChange(callback) {
  return authSupabase.onAuthChange(callback);
}

export function waitForAuthUser(timeoutMs) {
  return authSupabase.waitForAuthUser(timeoutMs);
}

export function signInWithGoogle() {
  return authSupabase.signInWithGoogle();
}

export function signInWithFacebook() {
  return authSupabase.signInWithFacebook();
}

export function signInWithEmail(email, password) {
  return authSupabase.signInWithEmail(email, password);
}

export function signUpWithEmail(email, password, metadata) {
  return authSupabase.signUpWithEmail(email, password, metadata);
}

export function sendPasswordReset(email, options) {
  return authSupabase.sendPasswordReset(email, options);
}

export function updateCurrentUserProfile(patch) {
  return authSupabase.updateCurrentUserProfile(patch);
}

export function resendEmailVerification(options) {
  return authSupabase.resendEmailVerification(options);
}

export function logout() {
  return authSupabase.logout();
}

export function getUserId() {
  return authSupabase.getUserId();
}

export function getUserEmail() {
  return authSupabase.getUserEmail();
}

export function getUserDisplayName() {
  return authSupabase.getUserDisplayName();
}

export function getUserPhotoURL() {
  return authSupabase.getUserPhotoURL();
}
