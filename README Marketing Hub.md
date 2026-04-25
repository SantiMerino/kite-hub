# Grow Hub — Team KPI Dashboard

Dashboard web para seguimiento de KPIs de **Attraction** (captación), **Development** (desarrollo / fundraising) y **Marketing**, con datos en **Supabase** y capa de federación (BFF) hacia **HubSpot** y **Meta (Facebook)**.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | [Next.js 15](https://nextjs.org) (App Router), `next dev --turbopack` |
| UI | [React 19](https://react.dev), TypeScript 5 |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com), `@tailwindcss/postcss`, `tw-animate-css` |
| Componentes | [shadcn/ui](https://ui.shadcn.com) (estilo **new-york**, base **neutral**), [Radix UI](https://www.radix-ui.com) |
| Iconos | [lucide-react](https://lucide.dev) |
| Formularios | [react-hook-form](https://react-hook-form.com), [Zod](https://zod.dev), `@hookform/resolvers` |
| Auth y datos | [Supabase](https://supabase.com) (`@supabase/supabase-js`, `@supabase/ssr`) |
| Gráficos | [Recharts](https://recharts.org) + componente `Chart` tipo shadcn |
| Animación | [Framer Motion](https://www.framer.com/motion/) |
| Fechas | [date-fns](https://date-fns.org), [react-day-picker](https://react-day-picker.js.org) |
| Exportación | [html-to-image](https://github.com/bubkoo/html-to-image) (PNG), [@react-pdf/renderer](https://react-pdf.org) (PDF) |
| Notificaciones | [Sileo](https://www.npmjs.com/package/sileo) (toasts en `layout.tsx`) |
| Integraciones server | HubSpot CRM API, Meta Marketing API (tokens en variables de entorno) |
| Calidad | ESLint 9 + `eslint-config-next` |

**Tipografía:** [Geist](https://vercel.com/font) (Google Fonts via `next/font`).

---

## Funcionalidades principales

### Autenticación y acceso

- Rutas públicas: `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- Sesión con **Supabase Auth**; callback en `/auth/callback`.
- Perfil en tabla `user_profiles`: `display_name`, `role`, `page_access`. Si no hay fila, se usa un perfil por defecto (admin con acceso completo) y nombre derivado del email.
- Roles: `admin`, `attraction`, `development`, `marketing` (badges y colores en `TopBar`).
- **Control por página:** el usuario solo ve enlaces del sidebar y solo puede entrar a `/attraction`, `/development` y `/marketing` si su `page_access` lo permite; la home `/` siempre consolidada según tabs.

### Navegación y filtros globales

- **Sidebar:** logo, acceso a home y a cada área (filtrado por permisos), selector de **año** y **mes** (contexto global `FilterProvider`).
- **TopBar:** saludo, rol, menú de usuario y cierre de sesión.
- Transición suave entre rutas (`animate-slide-up` en `AppShell`).

### Home (`/`)

- Tabs: **All Areas**, **Attraction**, **Development**, **Marketing** (según permisos).
- Paneles reutilizables: `AllPanel`, `AttractionPanel`, `DevelopmentPanel`, `MarketingPanel` con KPIs, tablas y exportación donde aplica.

### Attraction (`/attraction`)

- Métricas, visitas a colegios, eventos, comentarios y datos de “spots”; persistencia vía **repositorios/servicios** sobre Supabase.
- Carga del tablero: el servicio llama a **API BFF** `GET /api/attraction?year=&month=`, que agrega snapshot de Supabase + HubSpot (contactos y deals) en formato federado (`sources[]` con estado por fuente).
- **API** `POST /api/attraction/deals/[id]`: actualiza etapa de deal en HubSpot (body con `stage`, etc.).

### Development (`/development`)

- Dashboard de reuniones, donaciones, donantes, compromisos pendientes y números agregados del tablero (datos vía **Supabase** desde el cliente; sin ruta BFF dedicada como Attraction/Marketing).
- **Calendario unificado** (`UnifiedCalendar`) con tipos configurables (`calendarConfig.development`).
- CRUD en cliente mediante `useDevelopment` / `developmentService` → Supabase.
- Gráficos (barras, tendencias) con Recharts.

### Marketing (`/marketing`)

- Actividades, redes/plataformas, metas, tendencias mensuales y calendario editorial.
- Carga del tablero: el servicio llama a **API BFF** `GET /api/marketing?year=&month=` (snapshot Supabase + insights y campañas **Meta**, federado con manejo de errores por fuente).
- CRUD vía `useMarketing` / `marketingService` → Supabase.

### Exportación

- `ExportSection` y `ExportToolbar`: captura de regiones del DOM a **PNG** (alta resolución) y ensamblado de **PDF** multipágina.
- Pensado para compartir KPIs o bloques del dashboard sin depender del navegador.

### Arquitectura de datos

- **Servicios** (`src/lib/services/*`) orquestan lógica y llamadas a repos.
- **Repositorios** (`src/lib/repositories/*`) encapsulan Supabase.
- **Adaptadores** (`src/lib/adapters/hubspot`, `meta`) normalizan respuestas de APIs externas.
- Tipo común `FederatedResult` para respuestas multi-fuente en hooks y APIs.

---

## Estructura del proyecto (resumen)

```
src/
  app/                 # Rutas App Router, layouts, globals.css, API routes
  components/          # AppShell, Sidebar, TopBar, dashboards, UnifiedCalendar, ExportSection, ui/
  lib/
    adapters/          # HubSpot, Meta (cliente + tipos)
    hooks/             # useAttraction, useDevelopment, useMarketing
    repositories/      # Acceso Supabase por dominio
    services/          # Lógica de negocio y armado de snapshots
    types/             # Tipos TS por dominio + federation
  constants/           # Config de calendarios por área
```

Convenciones de diseño (tokens, colores por área, charts) están descritas en `.cursor/rules/design-system.mdc`.

---

## Requisitos

- **Node.js** 20+ (recomendado, acorde a `@types/node`).
- Cuenta **Supabase** con URL y anon key.
- Opcional para datos en vivo en APIs BFF: **HubSpot API key**, **Meta access token**.

---

## Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (cliente) |
| `HUBSPOT_API_KEY` | CRM (contactos/deals); usado en rutas API Attraction |
| `META_ACCESS_TOKEN` | Marketing API; usado en ruta API Marketing |

> No commitees `.env.local`. Los valores son secretos.

---

## Scripts

```bash
npm install
npm run dev      # Next.js con Turbopack — http://localhost:3000
npm run build    # Build de producción
npm run start    # Servidor tras build
npm run lint     # ESLint
```

---

## Despliegue

Compatible con cualquier hosting que soporte Next.js (por ejemplo [Vercel](https://vercel.com)). Define las mismas variables de entorno en el panel del proveedor.

---

## Licencia y nombre del paquete

El campo `name` en `package.json` puede seguir siendo el del template (`nextjs-new`); puedes renombrarlo al publicar o al mover el repo a un registro npm privado.
