import { isAuthSupabase, isBackendSupabase } from './migrationEnv.js';
import { mergeUserProfileFromAuth } from './supabaseData.js';

/** Tras login o refresco de sesión: sincroniza `public.users` desde Supabase Auth (sin pisar roles elevados). */
export async function syncAuthProfileAfterSession(userLike) {
  if (!isAuthSupabase() || !isBackendSupabase()) return;
  try {
    await mergeUserProfileFromAuth(userLike);
  } catch (e) {
    console.warn('[syncAuthProfile]', e?.message || e);
  }
}
