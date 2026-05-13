# KITE Lab System — Kite Hub

**Kite Hub** es la aplicación web del laboratorio **KITE** para gestionar préstamos y devoluciones de herramientas con **código QR / carné**, inventario, **roles** (estudiante / encargado / admin), **sanciones**, **alertas**, **notificaciones** (en app y correo) y **auditoría**. La interfaz sigue la misma línea que la plantilla **Grow Hub**: Next.js App Router, shadcn/ui (variante **new-york**, tokens OKLCH), **Geist** y patrones de layout; la convención de diseño está en `.cursor/rules/design-system.mdc`.

## Descripción general

Aplicación full-stack pensada para el **mostrador o estante**: un flujo **kiosk** (`/kiosk`) para préstamo y devolución en dos pasos (herramienta → carné), y un **panel staff/admin** (`/admin/*`) para operación diaria, catálogo, estudiantes, sanciones y bitácora. Los datos persisten en **Microsoft SQL Server** mediante **Prisma**; la autenticación del personal usa **Auth0** (`@auth0/nextjs-auth0`).

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router), `next dev` con host `0.0.0.0` |
| UI | [React 19](https://react.dev), TypeScript 5 |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com), `@tailwindcss/postcss`, `tw-animate-css` |
| Componentes | [shadcn/ui](https://ui.shadcn.com) (new-york, neutral), [Radix UI](https://www.radix-ui.com) |
| Iconos | [lucide-react](https://lucide.dev) |
| Formularios / validación | [react-hook-form](https://react-hook-form.com), [Zod](https://zod.dev), `@hookform/resolvers` |
| Datos | [Prisma 6](https://www.prisma.io) + **SQL Server 2022** (`DATABASE_URL`) |
| Auth | [Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0) v4; bypass opcional solo en desarrollo |
| QR (kiosk) | `html5-qrcode`, `jsqr` |
| Gráficos | [Recharts](https://recharts.org) |
| Tema | [next-themes](https://github.com/pacocoursey/next-themes) |
| Correo | [Resend](https://resend.com) |
| Toasts | [Sileo](https://www.npmjs.com/package/sileo) (`KiteToaster` en `layout.tsx`) |
| Calidad | ESLint 9 + `eslint-config-next` |

**Tipografía:** [Geist](https://vercel.com/font) y Geist Mono (`next/font/google`).

**Red frontera (auth):** `src/proxy.ts` (convención Next.js 16) — matcher para `/api/auth/*` y `/admin/*` con el cliente Auth0.

## Funcionalidades del producto

### Kiosk — préstamo y devolución (`/kiosk`)

- Flujo guiado **1 · Herramienta → 2 · Carné** (`KEY_XXXXXX`).
- **Escaneo por cámara** (modal) o **entrada manual**; compatible con **lector tipo cuña USB** (línea saneada de CR/LF/BOM).
- Resolución de herramienta por **`toolId`** (p. ej. `MAR_001`), por **`qrCode`** almacenado, o **código embebido** en texto/URL del QR.
- **Vista previa** de la herramienta tras el primer escaneo (`/api/kiosk/tool-preview`).
- **Préstamo inmediato** o **solicitud** si la herramienta tiene `requiresApproval`; respuestas tipadas (`borrowed`, `requested`, `returned`, `conflict`).
- **Devolución** al escanear de nuevo una herramienta con préstamo abierto del mismo estudiante (misma sesión de flujo).
- **Idempotencia** opcional vía cabecera `idempotency-key` (evita dobles altas ante reintentos).
- Seguridad: cabecera **`x-kiosk-key`** (secreto servidor `KIOSK_SECRET` / clave pública `NEXT_PUBLIC_KIOSK_KEY`), **rate limit** por IP en `loan-or-return`.
- **Bloqueo de préstamo** por estudiante **sancionado** (ventana activa / permanente) o **vetado** (`isBanned`), con mensaje claro en UI.

### Panel administrativo (`/admin/*`)

Acceso solo para roles **`staff`** y **`admin`** (redirección a `/kiosk` para otros). Navegación principal:

| Ruta | Contenido |
|------|-----------|
| `/admin/dashboard` | Panel: KPIs (activos, vencidos, alertas pendientes, herramientas, estudiantes, tasa de devolución 30d, sanciones), préstamos recientes, sección de métricas (incl. herramientas más prestadas). |
| `/admin/loans` | Préstamos en pestañas: **pendientes de aprobación**, **vencidos**, **activos**, **denegados/cancelados**, **devoluciones recientes**; acciones staff según API (aprobar, denegar, cancelar, registrar devolución). |
| `/admin/tools` | **Herramientas:** CRUD, filtros, inventario (cantidades disponible/total), condición, ubicación, flag **requiere aprobación**, asignación de **QR**. Pestañas **Espacios** (ubicaciones tipo estante/gaveta/mueble) y **Categorías** (catálogo con color opcional). |
| `/admin/students` | Listado de estudiantes; **alta** (admin) con nombre, email opcional y carné `KEY_XXXXXX`; indicadores de préstamos activos y sanciones; **bloqueo / desbloqueo** (admin) con motivo y auditoría. |
| `/admin/sanctions` | Gestión de sanciones (altas, edición, resolución, tipos `overdue` \| `damage` \| `loss` \| `other`, permanentes o con fin). |
| `/admin/audit` | **Bitácora** con filtros por **grupo de acción** (préstamos, devoluciones, herramientas, sanciones, cuentas), **rango de fechas** y **paginación**; enlace a vista por **carné** (`/admin/audit/[cardKey]`). |
| `/admin/profile` | Perfil del usuario autenticado: datos de cuenta, carné vinculado, estado bloqueado/activo, resumen de sanciones/préstamos y acceso a bitácora por carné. |
| `/admin/metrics` | Redirige al ancla de métricas en el dashboard (`#metricas`). |

**TopBar:** cierre de sesión, **tema claro/oscuro**, **campana de notificaciones** (notificaciones in-app de staff + estado de correos enviados vía outbox, unificadas en `/api/admin/notifications`).

### Alertas, correo y trabajos programados

- Trabajo **`POST /api/jobs/overdue`** (cabecera `x-cron-secret` = `CRON_SECRET`): marca préstamos vencidos como `overdue`, crea **alertas** `overdue` si no existen, encola **emails** a staff/admin (Resend) y crea **notificaciones in-app** enlazadas a préstamos.
- El mismo endpoint puede **drenar la cola** `email_outbox` (envío de pendientes).
- Script local: `npm run jobs:overdue` (ver `src/jobs/overdue.ts`).

### Auditoría y cumplimiento

- Tabla `audit_log` con acciones coherentes con el dominio (`BORROW`, `RETURN`, `LOAN_REQUESTED`, `LOAN_APPROVED`, `LOAN_DENIED`, CRUD herramientas/sanciones, `BAN_STUDENT`, etc.).
- Consulta filtrada desde la UI de bitácora.

### Autenticación y desarrollo

- **Producción:** Auth0; claims de rol en `https://kite-hub.app/role` (`student` \| `staff` \| `admin`); usuario **upsert** en SQL Server por `auth0Sub`.
- **Desarrollo:** `DEV_AUTH_BYPASS=true` (solo con `NODE_ENV=development`) omite Auth0 y usa sesión de admin de desarrollo; opcionalmente `DEV_SKIP_DB=true` para UI sin base de datos.
- Comprobación de release: `npm run check:no-bypass-prod`.

### Modelo de datos (Prisma / SQL Server)

Entidades principales mapeadas en `prisma/schema.prisma`:

- **users** — `auth0Sub`, `cardKey`, rol, `isBanned` / `banReason`.
- **tools** + **inventory** — catálogo, cantidades y estado lógico de inventario.
- **loans** — ciclo de vida incl. `requested`, aprobación, `active`, `returned`, `overdue`, etc.; `idempotencyKey`.
- **sanctions**, **alerts**.
- **audit_log**.
- **staff_notifications**, **email_outbox**.
- **tool_categories**, **tool_locations**.
- **loan_rules** — reglas semilla en `prisma/seed.ts` (tabla lista para evolución; el **bloqueo efectivo** en kiosk usa **sanciones activas** y **ban**).

## Flujos de uso

### Estudiante / mostrador (kiosk)

1. Abrir `/kiosk` (móvil en la misma red o túnel HTTPS si iOS exige contexto seguro para la cámara).
2. Escanear o teclear el identificador de la **herramienta**.
3. Escanear o teclear el **carné** `KEY_XXXXXX`.
4. Recibir confirmación de préstamo, solicitud pendiente, devolución o error (incl. bloqueo por sanción o veto).

### Encargado / administrador

1. Iniciar sesión vía Auth0 (`/api/auth/login?returnTo=/admin/dashboard`).
2. Usar **Panel**, **Préstamos**, **Herramientas**, **Estudiantes**, **Sanciones** y **Bitácora** según el caso.
3. Resolver solicitudes que requieran aprobación; registrar devoluciones o cancelaciones desde el panel si aplica.

## Instalación y configuración

### Requisitos

- **Node.js 20+**
- **SQL Server** accesible (local, Azure, Heroku MSSQL, etc.) y cadena **`DATABASE_URL`** en formato Prisma `sqlserver://…`

### Pasos

```bash
git clone <url-del-repositorio>
cd Kite-Hub-Projecct

npm install

cp .env.example .env.local
# Completa DATABASE_URL, Auth0, KIOSK_SECRET, NEXT_PUBLIC_KIOSK_KEY, CRON_SECRET, Resend (según entorno)

npx prisma migrate deploy
# o, en entornos de desarrollo sin migraciones previas:
# npx prisma db push --schema prisma/schema.prisma

npm run db:seed   # opcional: datos demo

npm run dev
```

Validar conectividad y tablas mínimas:

```bash
npm run db:test
```

### Variables de entorno (resumen)

Copia desde **`.env.example`** (no commitees `.env.local`). Incluye, entre otras:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | SQL Server (Prisma) |
| `AUTH0_*` | Dominio, cliente, secreto, `AUTH0_BASE_URL` |
| `KIOSK_SECRET` / `NEXT_PUBLIC_KIOSK_KEY` | API kiosk (deben coincidir en desarrollo) |
| `CRON_SECRET` | Job de atrasos |
| `RESEND_API_KEY` / `RESEND_FROM` | Correo transaccional |
| `DEV_AUTH_BYPASS` | Solo desarrollo; nunca en producción |

### Scripts npm

```bash
npm run dev              # Next en 0.0.0.0:3000
npm run dev:local        # Next por defecto (localhost)
npm run build            # prisma generate && next build
npm run start            # producción (respeta PORT)
npm run lint
npm run typecheck
npm run db:migrate       # prisma migrate deploy con .env.local
npm run db:generate
npm run db:studio
npm run db:seed
npm run db:test
npm run jobs:overdue
npm run email:test       # prueba Resend (script)
npm run check:no-bypass-prod
```

## Probar el kiosk desde iPhone (misma LAN)

1. En `.env.local`, alinea `KIOSK_SECRET` y `NEXT_PUBLIC_KIOSK_KEY` (mismo valor en local para pruebas).
2. `npm run dev` y anota la IP LAN de la PC (`ipconfig` en Windows).
3. En Safari: `http://<IP>:3000/kiosk` y permite cámara.
4. Si el navegador bloquea HTTP, usa **túnel HTTPS** (`cloudflared` o `ngrok`) y añade el origen a `allowedDevOrigins` en `next.config.ts` si hace falta.

## Testing

No hay suite de tests automatizados fija en el repo; puedes añadir Vitest, Playwright u otro runner según necesidad.

## Despliegue

Cualquier hosting compatible con **Next.js** (p. ej. Vercel, Node en VM, etc.): mismas variables que en local, **SQL Server** alcanzable desde el runtime, y **cron** o worker externo que invoque `POST /api/jobs/overdue` con `CRON_SECRET`.

## Diseño e interfaz (obligatorio en el repo)

- Tokens semánticos y **modo oscuro** (`next-themes` + clase `.dark`); ver `.cursor/rules/design-system.mdc`.
- Colores de dominio: préstamos **blue**, inventario **emerald**, alertas/sanciones **purple**, admin **violet**.

## Roadmap / extensiones posibles

- Lectores QR dedicados (Arduino u otros).
- Más canales de notificación (SMS, push).
- App móvil nativa.
- Informes exportables (PDF/Excel) desde el panel.
- Tiempo real (WebSockets) para tableros en vivo.

## Soporte y contribuciones

Para bugs, sugerencias o contribuciones, contactar al equipo de desarrollo.

## Licencia

Proyecto académico (Programación Orientada a Objetos) sujeto a los términos de la institución.

---

**Versión:** 1.0.0  
**Última actualización:** mayo 2026  
**Laboratorio:** KITE  
**Identidad visual:** plantilla Grow Hub aplicada a Kite Hub — `.cursor/rules/design-system.mdc`
