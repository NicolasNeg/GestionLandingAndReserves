# Migración Opción B — Supabase full (Fase 5)

## 1. Estado actual

- **Datos canónicos**: Firebase Data Connect (Postgres gestionado por Firebase) cuando `VITE_BACKEND_PROVIDER=firebase`, o **Supabase Postgres** cuando `VITE_BACKEND_PROVIDER=supabase` (`src/lib/dataLayer.js` → `supabaseData` vs `@dataconnect/generated`).
- **Auth**: Firebase Auth (`src/firebase-config.js`) en casi todas las vistas.
- **Permisos**: `accessControl.js` combina perfil Data Connect (`getUserProfile`), documentos Firestore `users`, `userPermissions`, `roles`.
- **Realtime auxiliar**: Firestore colecciones `mesaReservasLive`, `parkingSpots`; `realtimeSync.js` para fan-out de eventos.
- **Tema**: Firestore `appConfig/theme`.
- **Storage**: Firebase Storage (`uploadProductImage.js`).
- **SDK**: `src/dataconnect-generated` permanece para la ruta Firebase.

## 2. Estado objetivo

- **Supabase Postgres** como fuente canónica de negocio.
- **Supabase Auth** sustituye Firebase Auth.
- **Supabase Realtime** (Postgres changes / broadcast) sustituye Firestore para mesas/parking/sync.
- **RLS** en Supabase sustituye la lógica de permisos en Firestore + reglas dispersas.
- **Supabase Storage** sustituye Firebase Storage para imágenes.
- **Firebase / Data Connect / Firestore**: eliminables por fases cuando no queden lecturas.

## 3. Inventario Firebase (archivos relevantes)

### A) Auth

| Área | Archivo / uso |
|------|----------------|
| Config | `src/firebase-config.js` |
| Login | `src/views/Login.js` — `signInWithPopup`, `signOut`, providers |
| Layout | `src/lib/layout.js` — `onAuthStateChanged`, `signOut` |
| Cliente | `src/views/ClienteDashboard.js` — `signOut`, `updateProfile`, `onAuthStateChanged` |
| Reservar / Landing / Checkout / Admin / Escaner | `auth` desde `firebase-config.js` |
| Router | `src/router.js` — parámetros de acción de correo |
| Supabase data | `src/lib/supabaseData.js` — `firebaseAuth.currentUser` para `uid` en inserts |

### B) Permisos

| Área | Archivo |
|------|---------|
| Core | `src/lib/accessControl.js` — Firestore `users`, `userPermissions`, `roles` + DC perfil |

### C) Realtime

| Área | Archivo |
|------|---------|
| Mesas | `src/lib/mesaRealtime.js` |
| Parking | `src/lib/parkingRealtime.js` |
| Sync app | `src/lib/realtimeSync.js` |

### D) Tema / config

| Área | Archivo |
|------|---------|
| Tema | `src/lib/theme.js` — `appConfig/theme` |

### E) Storage

| Área | Archivo |
|------|---------|
| Imágenes | `src/lib/uploadProductImage.js` — productos, servicios, avatares |

### F) Data Connect

| Área | Archivo |
|------|---------|
| API | `dataconnect/example/*.gql`, `dataconnect/schema/schema.gql` |
| Cliente | `src/dataconnect-generated/*`, consumo vía `src/lib/dataLayer.js` |

### G) Otros Firestore

| Área | Archivo |
|------|---------|
| Programador | `src/views/ProgramadorDashboard.js` — `roles`, `users`, `appConfig/theme` |

### Errores

- Código usa mensajes/ helpers en `src/lib/dataConnectErrors.js`; no hay import global de `FirebaseError` como tipo.

## 4. Inventario Supabase actual

| Recurso | Cobertura |
|---------|-----------|
| `src/supabase/client.js` | Cliente JS; se crea si **cualquier** `VITE_*_PROVIDER` o backend es `supabase` (`migrationEnv.js`). |
| `src/lib/supabaseData.js` | Landing, servicios, productos, paquetes, tickets, movimientos, descuentos, configuración, usuarios, **mesa_reservas** (incl. campos monetizables), etc. |
| `supabase/schema.sql` | `users` (rol, permissions jsonb, `avatar_url`), tablas de negocio, `mesa_reservas`, `role_permissions` (vacía opcional), RLS inicial en lecturas públicas / tickets propios. |

**No cubierto en SQL todavía como sustituto directo de Firestore**: documentos `userPermissions`/`roles` por UID (parcialmente sustituibles por `users.permissions` + `role_permissions`), colecciones realtime, `appConfig/theme`.

## 5. Adaptadores añadidos (Fase 5A)

| Módulo | Rol |
|--------|-----|
| `src/lib/migrationEnv.js` | Flags `VITE_*` centralizados. |
| `src/lib/authProvider.js` + `authFirebase.js` + `authSupabase.js` | Fachada Auth; por defecto Firebase. |
| `src/lib/permissionsProvider.js` + `permissionsSupabase.js` | Fachada permisos; por defecto `getUserAccess` actual. |
| `src/lib/realtimeProvider.js` + `realtimeFirebase.js` + `realtimeSupabase.js` | Fachada realtime; Supabase = no-op hasta Fase 5D. |
| `src/lib/storageProvider.js` + `storageFirebase.js` + `storageSupabase.js` | Fachada storage; Supabase = pendiente 5E. |

Las vistas **siguen** importando `firebase-config` y módulos actuales; los adaptadores son el punto de corte para migraciones posteriores sin cambiar UX en 5A.

## 6. Fases recomendadas

| Fase | Contenido |
|------|-----------|
| **5A** | Auditoría, adaptadores, documento, build estable (esta entrega). |
| **5B** | Sustituir imports de `auth` por `authProvider` en login/layout/dashboards; habilitar Google/email en Supabase Auth; sync `public.users` con trigger o upsert al login. |
| **5C** | `getUserAccessResolved` en lugar de `getUserAccess`; políticas RLS; poblar `role_permissions`; eliminar lecturas Firestore de permisos. |
| **5D** | Implementar `realtimeSupabase.js` (channels o `postgres_changes`); sustituir imports en Admin/Reservar/Parking. |
| **5E** | Buckets Supabase + `storageProvider` real; migración de URLs en DB. |
| **5F** | Quitar Data Connect, reglas Firestore, dependencias Firebase no usadas. |

## 7. Riesgos

- **IDs distintos**: Firebase UID (string) vs UUID Supabase Auth — alinear `public.users.id` y migración de referencias.
- **RLS**: `auth.uid()` en Postgres debe coincidir con sesión Supabase; hoy hay políticas orientadas a transición.
- **Doble fuente**: Si solo se cambia `VITE_AUTH_PROVIDER` sin datos en `users`, permisos pueden quedar en rol `cliente`.
- **Realtime Supabase** hoy es simulado: no usar `VITE_REALTIME_PROVIDER=supabase` en producción hasta 5D.

## 8. Checklist de QA

- [ ] `npm run build` sin errores.
- [ ] Sin variables nuevas → comportamiento idéntico al histórico (Firebase paths).
- [ ] Con `VITE_SUPABASE_*` + proveedor `supabase` → cliente inicializa (según combinación).
- [ ] Login / reservar / admin / checkout / mapas no regresan errores de import.

## 9. Variables necesarias

Ver `.env.example`. Regla: **cada cambio de `VITE_*` requiere reiniciar Vite** y redeploy en hosting.

## 10. Tablas / RLS pendientes

- Poblar `role_permissions` o equivalente y ajustar `getUserAccessSupabase`.
- RLS por rol para escrituras admin (productos, landing, etc.).
- Tablas o topics para reemplazar `mesaReservasLive` / `parkingSpots` si no se usa solo Realtime broadcast.

## 11. Plan de rollback

- Volver `VITE_BACKEND_PROVIDER`, `VITE_AUTH_PROVIDER`, `VITE_REALTIME_PROVIDER`, `VITE_STORAGE_PROVIDER`, `VITE_PERMISSIONS_PROVIDER` a `firebase`.
- Restaurar variables Firebase completas en `.env`.
- Redeploy / reiniciar dev server.
