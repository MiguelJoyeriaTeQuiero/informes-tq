# Informes Financieros · Joyerías Te Quiero

Panel financiero premium para la dirección: dashboard general, detalle por operación
(Ventas, Compras, Reservas, Ventas Recuperables, Trabajos), generador de presentaciones
PowerPoint para el comité, precios de oro/plata, gestión de usuarios/roles y
sincronización diaria automática con Metabase.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + Auth) · Tailwind · Recharts · pptxgenjs.

---

## Puesta en marcha (local)

### 1. Variables de entorno
Ya existe `.env.local` con las claves de Supabase y Metabase. Revisa que estén correctas
y **cambia `CRON_SECRET`** por un token aleatorio largo.

### 2. Crear el esquema en Supabase
En **Supabase Studio → SQL Editor**, ejecuta en este orden:
1. El contenido de [`supabase/schema.sql`](supabase/schema.sql) — tablas, roles, perfiles, RLS.
2. El contenido de [`supabase/functions.sql`](supabase/functions.sql) — vista unificada y funciones de agregación.

### 3. Instalar dependencias
```bash
npm install --legacy-peer-deps
```

### 4. Migrar el histórico (≈400k filas)
Carga el histórico de la app antigua (`../app vieja/jtq_datos (11).json`) en Supabase:
```bash
npm run migrate:historico
```
Es idempotente (puedes repetirlo sin duplicar). Tarda unos minutos.

### 5. Crear el usuario administrador
En **Supabase Studio → Authentication → Users → Add user**:
- Email + contraseña.
- En *User Metadata* (raw JSON) añade: `{ "full_name": "Tu Nombre", "role": "admin" }`

El perfil se crea automáticamente con ese rol. (Después podrás crear más usuarios desde
la propia app, en **Configuración**.)

### 6. Arrancar
```bash
npm run dev
```
Abre http://localhost:3000 → te redirige a `/login`.

---

## Sincronización con Metabase

- **Manual:** botón *Sincronizar ahora* en **Configuración** (roles admin/financiero).
- **Automática:** cron diario configurado en [`vercel.json`](vercel.json) que llama a
  `GET /api/cron/sync` (protegido con `CRON_SECRET`).

Los 5 informes se leen de los cards de Metabase de la colección **CF**:
| Operación | Card |
|---|---|
| Ventas | #379 |
| Compras | #310 |
| Reservas | #298 |
| Ventas Recuperables | #314 |
| Trabajos | #312 |

> Se usa el endpoint `/api/card/{id}/query/json?format_rows=false`, que devuelve **todas**
> las filas con valores crudos (fechas ISO). La normalización está en `lib/transform.ts`.

---

## Cron diario (L–V 08:00)

`vercel.json` programa `0 6 * * 1-5` (06:00 UTC ≈ 08:00 en horario de verano de España).

> **Nota DST:** Vercel Cron usa UTC. 06:00 UTC = 08:00 CEST (verano) y 07:00 CET (invierno).
> Si quieres exactamente las 08:00 todo el año necesitarías ajustar la expresión al cambio
> de hora, o usar un planificador con zona horaria. Para invierno usa `0 7 * * 1-5`.

En local puedes probarlo con:
```bash
curl "http://localhost:3000/api/cron/sync?token=TU_CRON_SECRET"
```

---

## Despliegue (cuando toque)
1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel y enlázalo al repo.
3. Configura las **mismas variables de entorno** en Vercel (Settings → Environment Variables).
4. El cron de `vercel.json` se activa solo en producción.

---

## Estructura
```
app/
  (app)/                 rutas protegidas (dashboard, detalle, presentaciones, configuración)
  login/                 acceso
  api/sync, api/cron/sync, api/ppt, auth/signout
components/              UI (sidebar, topbar, gráficos, KPIs, paneles de config)
lib/                     supabase, metabase, transform, queries, metals, ppt, auth
supabase/                schema.sql + functions.sql
scripts/migrar-historico.ts
```
