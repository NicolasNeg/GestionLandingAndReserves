# QA Fase 5C.1 — Supabase Auth + permisos + RLS

Guía para validar en **tu** proyecto Supabase (local o staging). No sustituye la ejecución real: anota resultados en las tablas de la sección *Registro de resultados* al final.

## PASO 1 — Variables locales (`.env`)

```bash
VITE_BACKEND_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
VITE_PERMISSIONS_PROVIDER=supabase
VITE_REALTIME_PROVIDER=supabase
VITE_STORAGE_PROVIDER=supabase

VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Tras cambiar `VITE_*`, reinicia `npm run dev`.

## PASO 2 — Aplicar SQL

1. En **Supabase → SQL → New query**, pega y ejecuta el archivo `supabase/schema.sql` completo (o aplica por bloques si tu base ya tenía partes antiguas; en ese caso unifica con cuidado).
2. Comprueba en el catálogo que existen `public.users`, `public.role_permissions`, y que RLS está `ON` en las tablas previstas.

### Comprobaciones SQL (read-only)

```sql
-- Seeds / matriz de permisos
select * from public.role_permissions order by role, permission;

-- Usuarios (ajusta si hay mucho ruido)
select id, email, rol, permissions, updated_at from public.users order by updated_at desc limit 20;
```

### `app_has_permission` y `app_is_role_manager` desde el SQL Editor

- Esas funciones usan `auth.uid()` del **JWT de la sesión actual**.
- En el **SQL Editor** de Supabase la consulta corre normalmente con rol de servicio / sin JWT de un usuario de la app, por lo que **`auth.uid()` suele ser NULL** y `app_has_permission(...)` devuelve **false** aunque exista un usuario con permisos.
- Para probar el valor real, hazlo **desde la app** (red/PostgREST con anon + sesión) o con un flujo que inyecte JWT (p. ej. pruebas con `supabase` client en consola del navegador con sesión iniciada), no solo con el editor “en frío”.

Si quieres un sanity check **sin sesión** en SQL Editor, al menos confirma que la función existe:

```sql
select proname from pg_proc
where proname in ('app_has_permission', 'app_is_role_manager');
```

### Trigger anti-escalado

```sql
select tgname, tgenabled from pg_trigger
where tgrelid = 'public.users'::regclass;
```

## PASO 3 — Bootstrap programador (manual, sin commitear secretos)

**No** subas correos reales al repositorio. En local, usa un correo tuyo y reemplaza el placeholder.

1. Crea o inicia sesión con el usuario en la app (quedará fila en `public.users` como `cliente` o tras merge).
2. Promociona **solo** con SQL en el proyecto (ejemplo genérico):

```sql
-- Sustituye :user_id por el UUID de auth.users (mismo id que public.users.id en texto)
update public.users
set rol = 'programador',
    permissions = '[]'::jsonb,
    updated_at = now()
where id = ':user_id';
```

Alternativa por email (solo entorno local):

```sql
update public.users
set rol = 'programador', permissions = '[]'::jsonb, updated_at = now()
where lower(trim(email)) = lower(trim('TU_EMAIL_LOCAL'));
```

Anota en tu bitácora interna el SQL exacto usado; **no** lo pegues en el repo.

## PASO 4 — Usuario anónimo

Sin iniciar sesión, comprueba rutas y que la consola del navegador no muestre errores fatales por RLS en cargas públicas.

| Ruta | Esperado |
|------|-----------|
| `/home` | Carga |
| `/reservar` | Carga |
| `/checkout` | Carga si catálogo/config lo permiten |
| `/admin/dashboard` | Guard / alerta / redirección (sin permiso) |
| `/escaner` | Bloqueado |
| `/programador` | Bloqueado |

## PASO 5 — Usuario cliente (Supabase Auth)

Crear usuario email/password en Dashboard Auth o registro en `/login`.

Verificar: login, logout, recarga con sesión; fila en `public.users` con `rol = cliente`, `permissions = []`; rutas admin/escáner/programador bloqueadas.

## PASO 6 — Usuario trabajador

```sql
update public.users set rol = 'trabajador', updated_at = now() where id = 'UUID_DEL_USUARIO';
```

Validar permisos según seeds (`role_permissions` para `trabajador`): p. ej. `tickets.scan`, sin `admin.panel` si no está en la matriz; intento de cambiar propio `rol`/`permissions` vía UI debe fallar por RLS/trigger si no eres gestor.

## PASO 7 — Usuario jefe

```sql
update public.users set rol = 'jefe', updated_at = now() where id = 'UUID_DEL_USUARIO';
```

Validar `/admin/dashboard`, secciones landing/inventario/paquetes/parking según UI y permisos.

## PASO 8 — Usuario programador

Tras PASO 3, validar `/programador`, lista de usuarios Postgres, matriz de roles (solo lectura si así quedó), actualización de `rol`/`permissions` de **otros** usuarios si RLS lo permite.

## PASO 9 — RLS datos principales

Prueba manual desde la app (cliente vs staff vs admin): landing lectura pública; escritura solo con permiso; mesas/tickets/productos según políticas del `schema.sql`.

## PASO 10 — Build y rutas HTTP

```bash
npm run build
npm run dev
```

Probar en navegador:

- `/login`
- `/home`
- `/reservar`
- `/checkout`
- `/admin/dashboard?section=sitio&mapfocus=1`
- `/admin/dashboard?section=parking`
- `/escaner`
- `/programador`

---

## Registro de resultados (rellenar tras QA real)

| Ítem | Resultado |
|------|------------|
| 1. Aplicación `schema.sql` | *Pendiente / OK / Errores (resumen)* |
| 2. SQL bootstrap programador | *Solo en bitácora local; no repo* |
| 3. Anónimo | *Pendiente* |
| 4. Cliente | *Pendiente* |
| 5. Trabajador | *Pendiente* |
| 6. Jefe | *Pendiente* |
| 7. Programador | *Pendiente* |
| 8. Errores RLS | *Ninguno / lista* |
| 9. Fixes aplicados | *Ninguno / referencia PR* |
| 10. `npm run build` | **OK** en última verificación del repo (re-ejecutar tras cambios) |
| 11. Rutas HTTP | *Pendiente (manual)* |
| 12. Riesgos pendientes | *Panel roles completo, ajustes RLS según políticas locales, buckets Storage.* |

---

## Nota de esta sesión (agente)

- **Build**: `npm run build` ejecutado correctamente en el repositorio.
- **QA en Supabase real / navegador**: no ejecutada desde el agente (sin credenciales ni sesión). Completa la tabla *Registro de resultados* en tu máquina.
