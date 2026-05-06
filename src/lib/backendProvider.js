export const BACKEND_PROVIDER = String(import.meta.env.VITE_BACKEND_PROVIDER || 'supabase').toLowerCase();

export const isSupabaseBackend = () => BACKEND_PROVIDER === 'supabase';
