---
name: Sileo toasts admin tabs
overview: Integrar la librería `sileo` con un único `<Toaster />` en `top-center`, tema alineado al sitio, y helpers reutilizables que reemplazan los banners `Card` + `message`/`error` en las vistas con pestañas (Inventario y Préstamos), extendiendo el mismo patrón a otras pantallas admin que ya usan mensajes inline.
todos:
  - id: dep-toaster
    content: Añadir dependencia sileo y crear KiteToaster (top-center, theme system, defaults fill/styles) montado en layout bajo ThemeProvider
    status: completed
  - id: lib-helpers
    content: Crear src/lib/kite-sileo.ts con wrappers kiteSuccess/Error/Warning/Info/Promise/Action y defaults de copy
    status: completed
  - id: tools-tabs
    content: "Migrar ToolsAdminPage: carga + CRUD herramientas/espacios/categorías a sileo; retirar Cards message/error y unificar errores inline donde aplique"
    status: completed
  - id: loans-tabs
    content: "Migrar LoansAdminPage: carga + acciones por pestaña (promise/success/warning/info/action según criterios)"
    status: completed
  - id: admin-rest
    content: Migrar StudentsAdminPage y SanctionsAdminPage a toasts para consistencia
    status: completed
  - id: verify-themes
    content: Verificar contraste light/dark y ausencia de dobles toasts
    status: completed
isProject: false
---

# Plan: Sileo en pestañas admin (top-center)

## Contexto del repo

- En [`package.json`](package.json) existe **`sonner`** pero **no hay imports en [`src/`](src/)**; no hay `<Toaster>` montado en [`src/app/layout.tsx`](src/app/layout.tsx).
- Notificaciones actuales: estado local `message` / `error` (y errores inline `locCrudError` / `catCrudError`) renderizados como **Cards** encima del contenido en:
  - [`src/components/admin/tools/ToolsAdminPage.tsx`](src/components/admin/tools/ToolsAdminPage.tsx) — **3 pestañas** URL (`?tab=`): `herramientas`, `espacios`, `categorias` ([`tools-admin-tabs.ts`](src/components/admin/tools/tools-admin-tabs.ts)).
  - [`src/components/admin/loans/LoansAdminPage.tsx`](src/components/admin/loans/LoansAdminPage.tsx) — **5 pestañas**: pendientes, vencidos, activos, denegados, devoluciones ([`loans-admin-tabs.ts`](src/components/admin/loans/loans-admin-tabs.ts)).
- Otras pantallas admin **sin** componente `Tabs`, pero con el mismo patrón mensaje/error: [`StudentsAdminPage.tsx`](src/components/admin/students/StudentsAdminPage.tsx), [`SanctionsAdminPage.tsx`](src/components/admin/sanctions/SanctionsAdminPage.tsx). Conviene unificar con Sileo para experiencia homogénea.

Documentación de referencia: [Toaster](https://sileo.aaryan.design/docs/api/toaster), [API `sileo`](https://sileo.aaryan.design/docs/api).

## 1. Dependencia y montaje global

- Añadir **`sileo`** (`npm install sileo`).
- Crear un componente cliente **`KiteToaster`** (por ejemplo [`src/components/providers/kite-toaster.tsx`](src/components/providers/kite-toaster.tsx) o [`src/components/ui/kite-toaster.tsx`](src/components/ui/kite-toaster.tsx)) que exporte:
  - `import { Toaster } from "sileo"` con **`position="top-center"`** (requisito explícito).
  - `theme="system"` (o derivado de `next-themes` si hace falta forzar coherencia con `.dark`).
  - `options` por defecto: `fill` legible en claro/oscuro (valores OKLCH/hex acordes a [`src/app/globals.css`](src/app/globals.css), p. ej. acercarse a **card/popover**, no a “main” de página) y `styles` base para `title` / `description` (tipografía y contraste; descripciones con utilidades tipo `text-muted-foreground` donde aplique, como en tu ejemplo con JSX).
- Montar **una sola vez** `<KiteToaster />` dentro de **`ThemeProvider`** en [`src/app/layout.tsx`](src/app/layout.tsx) (junto a `{children}`), para que tema claro/oscuro y tokens sigan intactos.

Opcional posterior: eliminar **`sonner`** del `package.json` si confirmaís que no se usa en otro script (hoy no aparece en `src/`).

## 2. Capa reutilizable (API interna)

Crear algo tipo [`src/lib/kite-sileo.ts`](src/lib/kite-sileo.ts) (nombre a convenir) que **reenvíe** `import { sileo } from "sileo"` con funciones de dominio cortas:

| Helper | Uso |
|--------|-----|
| `kiteSuccess`, `kiteError`, `kiteWarning`, `kiteInfo` | Atajos con **títulos cortos** y `description` opcional (string o JSX estructurado: filas, badges, `span` con `text-xs` + `text-muted-foreground`). |
| `kitePromise` | Envolver `fetch` / acciones async con loading → success/error (ver §3). |
| `kiteAction` | Casos con **botón** (p. ej. enlace a auditoría o acción secundaria). |

Cada helper fusiona **defaults** (`duration` razonable, `position` heredada del Toaster salvo override) con overrides por llamada. Documentar en comentarios que **`fill` / `styles`** son el mecanismo para “respetar el estilo de la página” sin romper el tema (como en el snippet que compartiste con `styles.description`).

## 3. Criterios por tipo de Sileo (intuitivo y por pestaña)

Criterios generales (aplican a **todas** las pestañas y a las mutaciones):

- **`sileo.error`**: fallo de red, 4xx/5xx, validación del servidor, carga inicial fallida.
- **`sileo.success`**: operación **concluida correctamente** (CRUD, aprobar, devolver, etc.) con título fijo + detalle mínimo (ID, código herramienta, carné).
- **`sileo.warning`**: situación **corregible o delicada** (p. ej. cancelar préstamo, eliminar con impacto, avisos de validación fuerte) — más visible que `info`, sin ser error.
- **`sileo.info`**: hechos **neutros** o contexto (p. ej. “cola vacía” solo si no es ruido; mejor reservar para copy explicativo breve tras una acción ambigua, o estados informativos que antes no eran “error”).
- **`sileo.promise`**: acciones que **tardan** y mejoran UX: **carga inicial** `loadData` / `loadTools` y **mutaciones** (aprobar, denegar, devolver, guardar herramienta, CRUD espacio/categoría) con toast de “Procesando…” → éxito o error. Evitar doble toast (un solo flujo promise por acción).
- **`sileo.action`**: cuando haya **siguiente paso claro** (p. ej. tras devolución: botón “Ver auditoría del carné” si la ruta existe; o “Copiar ID”). Usar con moderación para no saturar.

### Inventario — [`ToolsAdminPage`](src/components/admin/tools/ToolsAdminPage.tsx)

| Pestaña | Situación | Sileo |
|---------|-----------|--------|
| **Herramientas** | Error al cargar listado | `error` |
| **Herramientas** | Crear / actualizar / eliminar herramienta | `promise` (o `success`/`error` si el flujo ya no necesita loading explícito) |
| **Espacios** | Crear / editar / eliminar ubicación (hoy `setLocCrudError` + feedback implícito) | `success` / `error` o `promise`; **eliminar** los Cards de error inline o dejar solo campo local si el formulario lo requiere |
| **Categorías** | Crear / editar / eliminar categoría | igual que Espacios |

Quitar o reducir los **Cards verdes/rojos** globales de mensaje/error en esta página una vez los toasts cubran los mismos casos.

### Préstamos — [`LoansAdminPage`](src/components/admin/loans/LoansAdminPage.tsx)

| Pestaña | Situación | Sileo |
|---------|-----------|--------|
| **Pendientes** | Aprobar / denegar / eliminar | `promise` recomendado; éxito con detalle (herramienta / ID); denegación puede titularse en tono neutro (`success` o `info` según copy — **success** si prioridad es “acción registrada”, **info** si se quiere matizar sin tono “celebratorio”) |
| **Vencidos / Activos** | Registrar devolución / cancelar | `promise`; **cancelar** → `warning` en éxito si el producto debe sentirse “delicado”, o `success` con título sobrio |
| **Denegados** | Solo lectura + error de carga | `error` en fallo de fetch |
| **Devoluciones** | Lista reciente + error de carga | `error` en fallo de fetch |

Opcional: tras devolución, **`action`** con botón a [`/admin/audit/...`](src/app/admin/audit/[cardKey]/page.tsx) si el `cardKey` está disponible en la fila.

### Fuera de tabs (misma entrega recomendada)

- **Sanciones**: crear / editar / eliminar → `success`/`error` o `promise`; QR inválido → `warning` o `error` según severidad percibida por el usuario.
- **Estudiantes**: error de carga → `error`.

## 4. Iconos y estructura del contenido

- Donde Sileo permita **`icon`**, usar iconos **lucide-react** alineados al dominio (p. ej. `CheckCircle2`, `AlertTriangle`, `Info`, `Ban`) para refuerzo visual sin sustituir el color semántico del toast.
- Descripciones en **bloques pequeños** (`flex flex-col gap-1` / `gap-2`), línea principal + línea secundaria `text-xs text-muted-foreground`, siguiendo tu ejemplo de JSX + clases forzadas en `styles` si hace falta compatibilidad con el SVG/fondo del toast.

## 5. Verificación

- Probar en **claro y oscuro** que `fill` + `styles` mantienen **contraste** (regla de diseño del proyecto).
- Comprobar que no hay **doble notificación** (promise + success manual).
- Navegar cada pestaña de herramientas y préstamos y ejecutar al menos una acción por pestaña donde aplique.

## File change summary

| File | Action |
|------|--------|
| [`package.json`](package.json) | Modify — dependencia `sileo` |
| Nuevo: `KiteToaster` client component | Create |
| Nuevo: [`src/lib/kite-sileo.ts`](src/lib/kite-sileo.ts) (o equivalente) | Create |
| [`src/app/layout.tsx`](src/app/layout.tsx) | Modify — render `<KiteToaster />` |
| [`ToolsAdminPage.tsx`](src/components/admin/tools/ToolsAdminPage.tsx) | Modify — sustituir Cards mensaje/error y mapear CRUD + carga |
| [`LoansAdminPage.tsx`](src/components/admin/loans/LoansAdminPage.tsx) | Modify — sustituir Cards y mapear acciones por pestaña |
| [`SanctionsAdminPage.tsx`](src/components/admin/sanctions/SanctionsAdminPage.tsx), [`StudentsAdminPage.tsx`](src/components/admin/students/StudentsAdminPage.tsx) | Modify — alinear con toasts (opcional pero recomendado en mismo PR si el alcance es “toda la UX admin”) |
