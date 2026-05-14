/**
 * Adaptador Auth sobre Supabase Auth (preparado para Fase 5B+).
 * Requiere VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY y VITE_AUTH_PROVIDER=supabase.
 */
import { getSyntheticDevAuthUser, isDevBootstrapActive } from './devBootstrap.js';
import { supabase } from '../supabase/client.js';

const AUTH_WAIT_MS = 6000;

let sessionCache = null;
let initPromise = null;

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase Auth requiere cliente: VITE_AUTH_PROVIDER=supabase y credenciales VITE_SUPABASE_*'
    );
  }
  return supabase;
}

function mapUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    uid: u.id,
    id: u.id,
    email: u.email ?? '',
    displayName: meta.full_name || meta.name || meta.display_name || '',
    photoURL: meta.avatar_url || meta.picture || '',
    emailVerified: !!u.email_confirmed_at,
    providerData: [],
    _auth: 'supabase',
    getIdToken: async () => {
      const { data } = await requireClient().auth.getSession();
      return data.session?.access_token ?? '';
    }
  };
}

function loginRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/login`;
}

function authError(message, code = 'auth_error') {
  const e = new Error(message);
  e.code = code;
  return e;
}

function normalizeAuthError(err, context = 'signin') {
  const raw = String(err?.message || err || '');
  const low = raw.toLowerCase();

  if (low.includes('email not confirmed')) {
    return authError('Debes confirmar tu correo antes de iniciar sesión.', 'email_not_confirmed');
  }
  if (
    low.includes('invalid login credentials') ||
    low.includes('invalid_credentials') ||
    low.includes('invalid grant') ||
    low.includes('invalid email or password')
  ) {
    return authError('Credenciales inválidas o usuario inexistente.', 'invalid_credentials');
  }
  if (low.includes('email provider is disabled') || low.includes('provider disabled')) {
    return authError('El inicio con correo/contraseña está deshabilitado en Supabase.', 'email_provider_disabled');
  }
  if (
    context === 'signin' &&
    (low.includes('oauth') || low.includes('sso') || low.includes('identity provider')) &&
    low.includes('not') &&
    low.includes('enabled')
  ) {
    return authError('Tu cuenta parece ser social/OAuth. Inicia con tu proveedor (Google/Facebook).', 'oauth_only');
  }
  return err instanceof Error ? err : authError(raw || 'No se pudo completar la autenticación.');
}

function setSessionCache(session) {
  if (session?.user) {
    sessionCache = mapUser(session.user);
    return;
  }
  if (isDevBootstrapActive()) {
    sessionCache = getSyntheticDevAuthUser();
    return;
  }
  sessionCache = null;
}

function ensureAuthListener() {
  const sb = supabase;
  if (!sb || initPromise) return initPromise;
  initPromise = (async () => {
    const { data: { session } } = await sb.auth.getSession();
    setSessionCache(session);
    sb.auth.onAuthStateChange((_event, sessionNext) => {
      setSessionCache(sessionNext);
    });
  })();
  return initPromise;
}

if (supabase) {
  ensureAuthListener();
}

export function getAuthBackendName() {
  return 'supabase';
}

export function getCurrentUser() {
  if (!supabase) {
    if (isDevBootstrapActive()) return getSyntheticDevAuthUser();
    return null;
  }
  ensureAuthListener();
  if (sessionCache) return sessionCache;
  if (isDevBootstrapActive()) return getSyntheticDevAuthUser();
  return null;
}

export function onAuthChange(callback) {
  const sb = requireClient();
  ensureAuthListener();
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(
      session?.user ? mapUser(session.user) : isDevBootstrapActive() ? getSyntheticDevAuthUser() : null
    );
  });
  return () => data.subscription.unsubscribe();
}

export function waitForAuthUser(timeoutMs = AUTH_WAIT_MS) {
  const sb = requireClient();
  return ensureAuthListener().then(
    () =>
      new Promise((resolve) => {
        let done = false;
        let unsub = () => {};
        const finish = (u) => {
          if (done) return;
          done = true;
          clearTimeout(tid);
          unsub();
          resolve(u);
        };
        const tid = globalThis.setTimeout(() => {
          if (isDevBootstrapActive() && !sessionCache) {
            sessionCache = getSyntheticDevAuthUser();
          }
          finish(sessionCache);
        }, timeoutMs);
        unsub = onAuthChange((u) => finish(u));
        sb.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) finish(mapUser(session.user));
          else if (isDevBootstrapActive()) finish(getSyntheticDevAuthUser());
        });
      })
  );
}

export async function signInWithGoogle() {
  const sb = requireClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: loginRedirectUrl() }
  });
  if (error) throw error;
}

export async function signInWithFacebook() {
  const sb = requireClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: loginRedirectUrl() }
  });
  if (error) throw error;
}

export async function signInWithEmail(email, password) {
  const sb = requireClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error, 'signin');
  return data;
}

export async function signUpWithEmail(email, password, metadata = {}) {
  const sb = requireClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: loginRedirectUrl(),
      data: {
        full_name: metadata.nombre || metadata.name || '',
        ...metadata
      }
    }
  });
  if (error) throw normalizeAuthError(error, 'signup');
  return data;
}

export async function sendPasswordReset(email) {
  const sb = requireClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: loginRedirectUrl()
  });
  if (error) throw normalizeAuthError(error, 'reset');
}

export async function updateCurrentUserProfile(patch) {
  const sb = requireClient();
  const dataPayload = {};
  if (patch?.displayName != null) {
    dataPayload.full_name = patch.displayName;
    dataPayload.name = patch.displayName;
  }
  if (patch?.photoURL != null) {
    dataPayload.avatar_url = patch.photoURL;
  }
  const { error } = await sb.auth.updateUser({
    data: dataPayload
  });
  if (error) throw error;
  const {
    data: { session }
  } = await sb.auth.getSession();
  setSessionCache(session);
}

export async function resendEmailVerification(options = {}) {
  const sb = requireClient();
  const email = options.email || sessionCache?.email;
  if (!email) throw new Error('Correo requerido para reenviar verificación');
  const { error } = await sb.auth.resend({
    type: 'signup',
    email,
    options: {
      ...(options.captchaToken ? { captchaToken: options.captchaToken } : {}),
      emailRedirectTo: loginRedirectUrl()
    }
  });
  if (error) throw normalizeAuthError(error, 'resend');
}

export async function logout() {
  const sb = requireClient();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export function getUserId() {
  return sessionCache?.uid ?? null;
}

export function getUserEmail() {
  return sessionCache?.email ?? '';
}

export function getUserDisplayName() {
  return sessionCache?.displayName ?? '';
}

export function getUserPhotoURL() {
  return sessionCache?.photoURL ?? '';
}
