# Supabase + Netlify

Guía corta para desplegar el frontend **Supabase-only**. Detalle de RLS, buckets y Auth: **[SUPABASE_ONLY.md](SUPABASE_ONLY.md)**.

## Checklist

1. Variables de entorno (Netlify + local) según `.env.example`.
2. En Supabase SQL Editor: ejecutar `supabase/schema.sql`.
3. Auth: proveedores y redirect URLs (`…/login`).
4. Storage: crear bucket (p. ej. `app-uploads`) y políticas; opcional `VITE_SUPABASE_STORAGE_BUCKET`.
5. `npm install` y `npm run build`.

## Variables en Netlify

Site settings → Environment variables (mismas claves que `.env.example`):

- `VITE_BACKEND_PROVIDER=supabase`
- `VITE_AUTH_PROVIDER=supabase`
- `VITE_PERMISSIONS_PROVIDER=supabase`
- `VITE_REALTIME_PROVIDER=supabase`
- `VITE_STORAGE_PROVIDER=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Roles elevados

Sin fila en `public.users` la app crea perfil con rol **cliente**. Para **jefe** o **programador**, actualiza la fila en SQL o desde el panel programador (según RLS).

## Deploy

`netlify.toml` debe publicar `dist` tras `npm run build` y redirect SPA a `index.html`.
