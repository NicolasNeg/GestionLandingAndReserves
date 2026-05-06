# Proyecto Supabase-only

La aplicación usa **únicamente Supabase**: Postgres como fuente canónica, **Supabase Auth**, **Realtime** (postgres_changes / broadcast), **Storage** e **RLS**. No hay Firebase en producción, no hay migración automática de usuarios desde Firebase y no hay modo híbrido soportado.

## Variables obligatorias (Vite)

Copia `.env.example` y define:

| Variable | Valor |
|----------|--------|
| `VITE_BACKEND_PROVIDER` | `supabase` |
| `VITE_AUTH_PROVIDER` | `supabase` |
| `VITE_PERMISSIONS_PROVIDER` | `supabase` |
| `VITE_REALTIME_PROVIDER` | `supabase` |
| `VITE_STORAGE_PROVIDER` | `supabase` |
| `VITE_SUPABASE_URL` | URL del proyecto |
| `VITE_SUPABASE_ANON_KEY` | anon key (pública) |

Opcional:

- `VITE_SUPABASE_STORAGE_BUCKET` — bucket de imágenes (por defecto `app-uploads`). Tipos: imágenes hasta 6 MB (`storageSupabase.js`). Políticas sugeridas: lectura pública si el bucket es público; escritura para usuarios autenticados con prefijo `{productos|servicios|avatars}/{uid}/`.

Reinicia `npm run dev` tras cambiar variables.

## Base de datos y seguridad

1. En Supabase **SQL Editor**, ejecuta `supabase/schema.sql` completo (o fusiona con cuidado si ya tenías objetos).
2. **Auth**: habilita proveedores en **Authentication → Providers** (email, Google, etc.). Añade URLs de redirección (`https://tu-dominio/login`, `http://localhost:5173/login`).
3. **Usuarios de negocio**: la tabla `public.users` debe alinearse con `auth.users.id`. Los registros nuevos obtienen rol **cliente** vía `mergeUserProfileFromAuth` en `supabaseData.js`. **Jefe**, **programador** y permisos elevados se asignan solo en `public.users` (SQL o panel programador), nunca por email en código.
4. **Permisos**: `public.role_permissions`, `users.permissions` (jsonb), funciones SQL `app_has_permission` / `app_is_role_manager` según tu `schema.sql`, y políticas **RLS**.
5. No uses `supabase/rls_disable_legacy_auth_bridge.sql` en producción con Supabase Auth; está marcado como obsoleto.

## Carpetas legacy en el repo

- `dataconnect/` — esquema histórico Firebase Data Connect; no lo consume el frontend. Puede eliminarse en un commit aparte si ya no lo necesitas para referencia.
- `firebase.json`, `firestore.rules` — artefactos históricos; la app no los usa en runtime.

## Build

```bash
npm install
npm run build
```

## Documentación obsoleta

Los planes detallados de migración híbrida viven archivados en `docs/MIGRATION_SUPABASE_FULL.md`. Para operación actual usa este archivo y `.env.example`.
