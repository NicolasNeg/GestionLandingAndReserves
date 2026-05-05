/**
 * Adaptador Auth sobre Supabase Auth (preparado para Fase 5B+).
 * Requiere VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY y VITE_AUTH_PROVIDER=supabase.
 */
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

function setSessionCache(session) {
  sessionCache = session?.user ? mapUser(session.user) : null;
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
  if (!supabase) return null;
  ensureAuthListener();
  return sessionCache;
}

export function onAuthChange(callback) {
  const sb = requireClient();
  ensureAuthListener();
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

export function waitForAuthUser(timeoutMs = AUTH_WAIT_MS) {
  const sb = requireClient();
  return new Promise((resolve) => {
    let done = false;
    let unsub = () => {};
    const finish = (u) => {
      if (done) return;
      done = true;
      clearTimeout(tid);
      unsub();
      resolve(u);
    };
    const tid = globalThis.setTimeout(() => finish(sessionCache), timeoutMs);
    unsub = onAuthChange((u) => finish(u));
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) finish(mapUser(session.user));
    });
  });
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
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, metadata = {}) {
  const sb = requireClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.nombre || metadata.name || '',
        ...metadata
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const sb = requireClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: loginRedirectUrl()
  });
  if (error) throw error;
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
    options: options.captchaToken ? { captchaToken: options.captchaToken } : undefined
  });
  if (error) throw error;
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
