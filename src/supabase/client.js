import { createClient } from '@supabase/supabase-js';
import { needsSupabaseJsClient } from '../lib/migrationEnv.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const shouldUseSupabase = needsSupabaseJsClient();

if (shouldUseSupabase && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Faltan variables Supabase: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
}

export const supabase = shouldUseSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function isSupabaseEnabled() {
  return shouldUseSupabase;
}
