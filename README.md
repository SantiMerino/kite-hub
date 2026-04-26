# KITE Lab System — Sistema de gestión de préstamos de herramientas

Este repositorio (**Kite Hub**) es la aplicación del laboratorio KITE: préstamos de herramientas con QR, roles, sanciones, alertas y auditoría. Comparte **stack, sistema de diseño e identidad visual** con la plantilla **Grow Hub** (Next.js 15, Supabase, shadcn, tokens OKLCH, misma tipografía y patrones de layout). La convención de UI está en `.cursor/rules/design-system.mdc` (y `design-system.mdc` en la raíz).

## Descripción general

El **KITE Lab System** es una aplicación web para la gestión eficiente de préstamos de herramientas en laboratorios académicos. Permite registrar, controlar y auditar préstamos mediante escaneo QR, con autenticación por roles, alertas de atrasos y sanciones configurables.

## Diseño e interfaz (obligatorio)

- **Misma base que Grow Hub:** App Router, `AppShell`, sidebar/topbar, animaciones (`animate-slide-up`, etc.), toasts **Sileo** en `layout.tsx`, exportación PNG/PDF si aplica a reportes del lab.
- **Stack UI:** shadcn/ui **new-york**, `baseColor: neutral`, **Tailwind CSS v4** (`globals.css`, `@theme inline`), **Geist** + **lucide-react**, **CVA** + **`cn()`**.
- **Tokens:** paleta semántica única (`background`, `foreground`, `card`, `primary`, `muted`, `destructive`, `border`, `sidebar-*`, …); gráficos con `chart-1` … `chart-5` y Recharts.
- **Dominio Kite Hub:** préstamos / flujo estudiante `blue`, inventario / herramientas `emerald`, alertas / sanciones `purple`, encargado / administración `violet` — una familia por dominio, sin mezclar.
- **Modo oscuro:** clase `.dark` y variables del tema en todas las vistas.
- **Detalle:** `.cursor/rules/design-system.mdc`.

## Características principales

### 1. Autenticación y control de acceso

- **Roles diferenciados:** estudiante y encargado/administrador
- **Autenticación:** Supabase Auth (sesión en servidor/cliente con `@supabase/ssr`)
- **Rutas protegidas:** middleware o guards de layout según rol
- **Permisos:** RLS en Supabase + reglas de UI (sidebar/topbar filtrado por rol, mismo patrón visual que Grow Hub)

### 2. Gestión de herramientas

- **CRUD completo:** crear, leer, actualizar y eliminar herramientas
- **Identificadores únicos:** formato estándar (ej. MAR_001, DES_002)
- **Categorización:** herramientas manuales, equipos electrónicos, medición, seguridad
- **Estados de condición:** excelente, buena, regular, mala
- **Ubicación en estantes:** registro de localización física

### 3. Control de inventario

- **Disponibilidad en tiempo real:** cantidad disponible, prestada, en mantenimiento, extraviada
- **Estados de inventario:** disponible, prestado, mantenimiento, extraviado
- **Gestión de cantidades:** varias unidades por herramienta
- **Actualizaciones automáticas:** al prestar o devolver

### 4. Sistema de préstamos

- **Escaneo QR:** registro rápido con QR de herramienta y carné
- **Entrada manual:** alternativa al escaneo
- **Registro automático:** fecha, hora, responsable y condición
- **Detección inteligente:** escaneo repetido → devolución automática
- **Interfaz optimizada:** uso en estantes (touch, feedback claro con tokens del diseño)

### 5. Sistema de devoluciones

- **Detección automática:** si la herramienta está prestada → devolución
- **Registro de condición:** estado al devolver
- **Actualización de estado:** vuelve a disponible
- **Auditoría:** quién devuelve y cuándo

### 6. Alertas y sanciones

- **Cálculo automático:** días de atraso en tiempo real
- **Alertas por atraso:** cuando vence la devolución
- **Alertas de proximidad:** aviso 1 día antes del vencimiento
- **Sanciones configurables:** reglas por días de atraso
- **Restricción de préstamos:** usuarios con atrasos severos no pueden prestar

### 7. Reportes y auditoría

- **Bitácora completa:** operaciones (BORROW, RETURN, CREATE, UPDATE, DELETE)
- **Filtros avanzados:** usuario, herramienta, fechas, tipo de acción
- **Reportes estadísticos:** herramientas más solicitadas, usuarios más activos
- **Historial:** trazabilidad para cumplimiento

### 8. Dashboard administrativo

- **Estadísticas en tiempo real:** préstamos activos, atrasos, usuarios
- **Gráficos de tendencias:** herramientas más solicitadas (series con `chart-*` del diseño)
- **Alertas prioritarias:** atrasos y eventos críticos
- **Gestión centralizada:** control del laboratorio

## Arquitectura técnica

### Stack tecnológico (misma base que Grow Hub / README Marketing Hub)

| Capa | Tecnología |
|------|------------|
| Framework | [Next.js 15](https://nextjs.org) (App Router), `next dev --turbopack` |
| UI | [React 19](https://react.dev), TypeScript 5 |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com), `@tailwindcss/postcss`, `tw-animate-css` |
| Componentes | [shadcn/ui](https://ui.shadcn.com) (estilo **new-york**, base **neutral**), [Radix UI](https://www.radix-ui.com) |
| Iconos | [lucide-react](https://lucide.dev) |
| Formularios | [react-hook-form](https://react-hook-form.com), [Zod](https://zod.dev), `@hookform/resolvers` |
| Auth y datos | [Supabase](https://supabase.com) (`@supabase/supabase-js`, `@supabase/ssr`) — tablas y RLS para usuarios, herramientas, préstamos, sanciones, alertas y auditoría |
| Gráficos | [Recharts](https://recharts.org) + componente `Chart` tipo shadcn |
| Animación | [Framer Motion](https://www.framer.com/motion/) |
| Fechas | [date-fns](https://date-fns.org), [react-day-picker](https://react-day-picker.js.org) |
| Exportación | [html-to-image](https://github.com/bubkoo/html-to-image) (PNG), [@react-pdf/renderer](https://react-pdf.org) (PDF) — reportes / listados del laboratorio |
| Notificaciones | [Sileo](https://www.npmjs.com/package/sileo) (toasts en `layout.tsx`) |
| Calidad | ESLint 9 + `eslint-config-next` |

**Tipografía:** [Geist](https://vercel.com/font) (`next/font`).

Los datos del producto viven en **Supabase (Postgres)**; no se usa el stack Express + tRPC + MySQL de la idea original. Las **funcionalidades** (préstamos, QR, sanciones, inventario, auditoría) se implementan con este stack.

### Estructura de base de datos (modelo lógico en Supabase/Postgres)

#### Tablas principales

1. **users** — usuarios (estudiantes y administradores)
2. **tools** — catálogo de herramientas
3. **inventory** — disponibilidad y cantidades
4. **loans** — préstamos
5. **sanctions** — sanciones activas por usuario
6. **alerts** — alertas (atrasos, proximidad)
7. **auditLog** — bitácora de operaciones
8. **loanRules** — reglas de sanciones

### Capa de aplicación (patrón alineado a Grow Hub)

- **Servicios** (`src/lib/services/*`) — reglas de préstamo, devolución, sanciones, alertas.
- **Repositorios** (`src/lib/repositories/*`) — consultas y mutaciones Supabase (con RLS según rol estudiante / encargado).
- **Rutas** — App Router, **Route Handlers** y/o **Server Actions** donde haga falta (escaneo QR, registro de préstamo, etc.).

Operaciones de dominio equivalentes a la idea original (expresadas como capacidades, no como tRPC):

| Área | Capacidades |
|------|-------------|
| Autenticación | Sesión Supabase Auth; perfil con rol (`student` / `staff` o similar); cierre de sesión |
| Herramientas | Listar, obtener por id / código, CRUD admin |
| Inventario | Estado por herramienta; altas admin |
| Préstamos | Por estudiante; crear préstamo; registrar devolución |
| Sanciones y alertas | Reglas configurables; notificaciones en UI (toasts / paneles) |
| Auditoría | Inserción y consulta de bitácora desde servicios |

## Flujos de uso

### Flujo de préstamo (estudiante)

1. Acercarse al estante con lector QR
2. Escanear QR de la herramienta
3. Escanear o ingresar carné
4. El sistema registra el préstamo
5. Feedback visual conforme al diseño (tokens, estados de éxito/error)

### Flujo de devolución (estudiante)

1. Acercarse al estante con lector QR
2. Escanear el mismo QR de la herramienta
3. El sistema detecta préstamo activo
4. Registra devolución
5. Confirmación de condición
6. Estado actualizado a disponible

### Flujo de gestión (administrador)

1. Panel de control (layout sidebar/topbar coherente con la regla de diseño)
2. Estadísticas en tiempo real
3. CRUD de herramientas
4. Revisión de alertas y atrasos
5. Sanciones y reglas
6. Reportes y auditoría

## Reglas de sanciones (configurables)

| Rango de atraso | Descripción      | ¿Puede prestar? |
|-----------------|------------------|-----------------|
| 1–2 días        | Atraso leve      | Sí              |
| 3–5 días        | Atraso moderado  | No              |
| 6–10 días       | Atraso severo    | No              |
| +11 días        | Atraso crítico   | No              |

## Seguridad

- **Supabase Auth** y políticas **RLS** en tablas sensibles
- **Control de roles** en capa datos y en rutas Next
- **Validación de entrada** con Zod (formularios y payloads de API/Server Actions)
- **Auditoría** de operaciones en tabla de bitácora
- **Protección de rutas** App Router + comprobación de sesión

## Instalación y configuración

### Requisitos previos

- Node.js 20+ (recomendado, alineado al stack Grow Hub)
- Proyecto **Supabase** (URL + anon key; migraciones SQL o CLI según definas el esquema)

### Pasos

```bash
git clone <url-del-repositorio>
cd Kite-Hub-Projecct

npm install

cp .env.local.example .env.local
# Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

npm run dev
```

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor, si usas jobs/admin que bypassen RLS con cuidado |

> No commitees `.env.local`.

### Scripts

```bash
npm run dev      # Next.js con Turbopack
npm run dev:local
npm run build
npm run start
npm run lint
```

### Probar `kiosk` desde iPhone (misma LAN)

1. Configura secretos de kiosk en `.env.local`:

```env
KIOSK_SECRET="dev-kiosk-secret-local"
NEXT_PUBLIC_KIOSK_KEY="dev-kiosk-secret-local"
```

2. Inicia el servidor para red local:

```bash
npm run dev
```

3. Desde la PC, identifica tu IP LAN (ejemplo en Windows):

```bash
ipconfig
```

4. En iPhone (Safari), abre:
   - `http://<IP_DE_TU_PC>:3000/kiosk`
5. Permite acceso a la camara cuando Safari lo solicite y prueba:
   - Escaneo de herramienta (QR 1)
   - Escaneo de carne (QR 2)

Si iOS bloquea el uso de camara por contexto no seguro, usa un tunel HTTPS:

```bash
# Opcion A: cloudflared
cloudflared tunnel --url http://localhost:3000

# Opcion B: ngrok
ngrok http 3000
```

Abre la URL `https://...` que te entregue el tunel y repite la prueba en `/kiosk`.

## Testing

Añade el runner que elijas (Vitest, Playwright, etc.) cuando el código base esté creado; el README de referencia Grow Hub no impone uno concreto.

## Despliegue

Compatible con hosting **Next.js** (p. ej. [Vercel](https://vercel.com)): mismas variables de entorno que en local. Supabase gestiona la base Postgres, backups y auth.

## Roadmap futuro

- [ ] Integración con Arduino para lectores QR automáticos
- [ ] Notificaciones por email/SMS
- [ ] App móvil nativa (React Native)
- [ ] Identificación biométrica
- [ ] Análisis predictivo de atrasos
- [ ] Integración con inventarios externos
- [ ] Exportación PDF/Excel
- [ ] Dashboard en tiempo real con WebSockets

## Soporte y contribuciones

Para bugs, sugerencias o contribuciones, contactar al equipo de desarrollo.

## Licencia

Proyecto académico (Programación Orientada a Objetos) sujeto a los términos de la institución.

---

**Versión:** 1.0.0  
**Última actualización:** abril 2026  
**Laboratorio:** KITE  
**Identidad visual:** plantilla Grow Hub (tokens, componentes) aplicada a Kite Hub — `.cursor/rules/design-system.mdc`
