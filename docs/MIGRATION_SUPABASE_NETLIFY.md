# Migracion Supabase + Netlify

## Checklist rapido

1. Configurar variables de entorno.
2. Ejecutar `supabase/schema.sql` en SQL Editor.
3. Mientras el login siga en **Firebase Auth**, ejecuta tambien `supabase/rls_disable_for_firebase_auth_bridge.sql` (si no, Postgres bloquea lecturas/escrituras porque `auth.uid()` de Supabase viene vacio).
4. Instalar SDK de Supabase en frontend.
5. Cambiar provider a `supabase`.
6. Deploy en Netlify.

La app ya enruta datos por `src/lib/dataLayer.js`: con `VITE_BACKEND_PROVIDER=supabase` usa tablas Postgres; si no, sigue Data Connect.

## 1) Variables de entorno

En local (`.env`):

```bash
VITE_BACKEND_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Auth con Supabase (Fase 5B)

Para login/sesión nativos en Supabase (además del backend Postgres):

```bash
VITE_BACKEND_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
VITE_PERMISSIONS_PROVIDER=supabase
VITE_REALTIME_PROVIDER=firebase
VITE_STORAGE_PROVIDER=firebase
```

- Habilita proveedores en **Supabase Dashboard → Authentication → Providers** (Google, email, etc.).
- Para Google OAuth, añade **Redirect URLs**: `http://localhost:5173/login` y tu dominio en producción con `/login`.
- Los roles/RLS completos siguen en **Fase 5C**; sin fila en `public.users` la app cae en rol **cliente** (nunca admin por defecto).

### Programador bootstrap (Fase 5B → 5C)

- La inserción automática de fila en `public.users` **ya no asigna `programador` por email** (evita promoción insegura).
- Otorgar rol `programador` o `jefe` solo vía **SQL** en Supabase o con un usuario que ya sea `jefe`/`programador` en el panel programador (cuando RLS lo permita):

```sql
update public.users set rol = 'programador', permissions = '[]'::jsonb where email = 'tu@correo.com';
```

(Revisa también filas en `role_permissions` si personalizas permisos por rol.)

En Netlify (Site settings -> Environment variables):

- `VITE_BACKEND_PROVIDER=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 2) Base de datos en Supabase

- Abrir SQL Editor de Supabase.
- Ejecutar `supabase/schema.sql`.
- Si usas Firebase Auth + anon key: ejecutar `supabase/rls_disable_for_firebase_auth_bridge.sql` (transicion) o definir politicas RLS con Supabase Auth / JWT.

## 3) Frontend

```bash
npm install @supabase/supabase-js
npm run build
```

El cliente base queda en `src/supabase/client.js`.

## 4) Deploy Netlify

Archivo `netlify.toml`:

- `build.command = "npm run build"`
- `build.publish = "dist"`
- redirect SPA `/* -> /index.html`

Comandos:

```bash
npm i -D netlify-cli
npx netlify login
npx netlify init
npx netlify deploy --build
npx netlify deploy --build --prod
```

## 5) Estrategia recomendada de corte

- Migrar primero `configuracion + descuentos + tickets`.
- Luego `mesa_reservas` y realtime.
- Finalmente storage (`avatars`, `productos`, `servicios`).
- Mantener Firebase activo como fallback 48-72h.

