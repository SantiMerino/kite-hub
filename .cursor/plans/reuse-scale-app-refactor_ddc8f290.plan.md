---
name: reuse-scale-app-refactor
overview: Refactorizar `src/app` completo en fases para que cada página funcione como contenedor liviano y la lógica/UI reusable viva en `src/components` por feature, con reglas estrictas de escalabilidad y una exportación por archivo TSX.
todos:
  - id: baseline-guardrails
    content: Definir convenciones y reglas de arquitectura/lint para páginas delgadas y 1 export por TSX.
    status: pending
  - id: admin-route-single-source
    content: Consolidar rutas admin para dejar src/app/admin como única fuente y eliminar wrappers/(admin).
    status: completed
  - id: refactor-tools
    content: Extraer feature tools a src/components/features/tools y adelgazar page.tsx.
    status: completed
  - id: refactor-sanctions
    content: Extraer feature sanctions a src/components/features/sanctions y separar lógica de negocio de UI.
    status: completed
  - id: refactor-loans
    content: Extraer feature loans a src/components/features/loans y modularizar acciones por estado.
    status: completed
  - id: refactor-students-analytics-audit
    content: Extraer students, analytics y audit a componentes reutilizables por feature.
    status: completed
  - id: global-export-compliance
    content: Aplicar cumplimiento global de un export por archivo TSX en src/app y wrappers admin.
    status: completed
  - id: hardening-validation
    content: Validar build/lint/smoke por fase y cerrar riesgos server-client y contratos tipados.
    status: in_progress
isProject: false
---

# Plan de refactor reusable y escalable (src/app → src/components)

## Scope
- Analizar y refactorizar **todas** las páginas bajo [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app) para que actúen como contenedores de composición/estado mínimo.
- Migrar UI reutilizable, tipos, constantes y hooks a una arquitectura por feature en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components).
- Aplicar la regla en **todo el código existente**: máximo una exportación por archivo `.tsx`.

## Arquitectura objetivo (feature-first)
- Estructura base por feature:
  - `src/components/features/<feature>/components/*`
  - `src/components/features/<feature>/sections/*`
  - `src/components/features/<feature>/hooks/*`
  - `src/components/features/<feature>/constants/*`
  - `src/components/features/<feature>/types/*`
  - `src/components/features/<feature>/table-columns/*` (si aplica)
  - `src/components/features/<feature>/form-schemas/*` (si aplica)
- Regla de responsabilidad:
  - `src/app/**/page.tsx`: composición de secciones + wiring de estado básico.
  - `hooks`: orquestación de estado, side-effects y mutaciones.
  - `constants/types`: contratos compartidos del feature.
  - `components/sections`: render reusable y testeable.

## Fase 0 — Guardrails y baseline
1. Definir convenciones de feature folders y naming para todo nuevo módulo.
2. Definir y habilitar reglas de lint/arquitectura para sostener:
   - un export por `.tsx`,
   - páginas delgadas,
   - prohibición de lógica de dominio inline en `page.tsx`.
3. Crear baseline de calidad (build + lint + smoke de rutas admin/kiosk) para validar cada PR.

## Fase 1 — Fuente única de rutas admin
1. ✅ Establecer `src/app/admin/` como única fuente de páginas para URLs `/admin/*`.
2. ✅ Mover implementación de `src/app/(admin)/*/page.tsx` a `src/components/features/*/pages/*` y dejar `src/app/admin/*/page.tsx` como contenedores delgados.
3. ✅ Consolidar auth/layout en `src/app/admin/layout.tsx` (guard de sesión + rol `staff|admin`) y retirar `src/app/(admin)/layout.tsx`.
4. ✅ Eliminar el árbol `src/app/(admin)` y actualizar imports/rutas internas para evitar referencias residuales.
5. ⏳ Validar que no existan rutas top-level no deseadas (`/dashboard`, `/loans`, etc.) y que toda navegación use `/admin/*`.

## Fase 2 — Feature Tools (máxima prioridad)
- Origen: [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/tools/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/tools/page.tsx)
- Extraer a `src/components/features/tools/`:
  - tipos de dominio (`ToolRow`, categorías, ubicaciones),
  - constantes (`CONDITION_*`, acentos/labels),
  - subcomponentes inline (ej. combobox catálogo),
  - secciones (filtros, creación, clusters, CRUD de catálogo),
  - hooks de estado (`useToolsAdmin`, `useToolFilters`).
- ✅ Resultado esperado: `page.tsx` ahora es contenedor delgado y la implementación vive en `src/components/features/tools/pages/ToolsAdminPage.tsx`.

## Fase 3 — Feature Sanctions
- Origen: [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/sanctions/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/sanctions/page.tsx)
- Extraer a `src/components/features/sanctions/`:
  - constantes de labels/estado,
  - tipos de fila/payload,
  - tabla inline y secciones de formulario/histórico,
  - hooks de sanitización/input + mutaciones,
  - schema de formulario si aplica.
- ✅ Resultado esperado: `page.tsx` del admin quedó delgado y el feature está en `src/components/features/sanctions/pages/SanctionsAdminPage.tsx`.

## Fase 4 — Feature Loans
- Origen: [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/loans/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/loans/page.tsx)
- Extraer a `src/components/features/loans/`:
  - tabla y secciones por estado (requested/active/overdue/history),
  - constantes de acciones/etiquetas,
  - hooks `useLoanActions` + `useLoansAdmin` para ruteo de acciones.
- ✅ Resultado esperado: `page.tsx` del admin quedó delgado y el feature está en `src/components/features/loans/pages/LoansAdminPage.tsx`.

## Fase 5 — Features Students, Dashboard, Metrics, Audit
- Orígenes:
  - [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/students/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/students/page.tsx)
  - [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/dashboard/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/dashboard/page.tsx)
  - [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/metrics/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/metrics/page.tsx)
  - [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/audit/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/audit/page.tsx)
- Extraer a features `students`, `analytics`, `audit`:
  - filtros/tablas/paginación,
  - constantes visuales (ej. `ACTION_COLORS`, KPI metadata),
  - componentes server-presentacionales reutilizables.
- ✅ Implementado en:
  - `src/components/features/students/pages/StudentsAdminPage.tsx`
  - `src/components/features/analytics/pages/DashboardAdminPage.tsx`
  - `src/components/features/analytics/pages/MetricsAdminPage.tsx`
  - `src/components/features/audit/pages/AuditAdminPage.tsx`

## Fase 6 — Cumplimiento global de “1 export por TSX”
1. ✅ Corregir todos los TSX de `src/app` con múltiples exports (`dynamic`, `metadata`, re-exports + default).
2. ✅ Para páginas Next que requieren `default export`, mantener contenedores delgados con un solo export por `page.tsx`.
3. ✅ Verificar que no persistan re-exports/aliases de transición en `src/app/admin`.

## Fase 7 — Hardening de escalabilidad
1. Unificar contratos de tipos por feature para consumo UI/API.
2. Estandarizar clientes `fetch` tipados por feature.
3. Validar límites server/client y serialización de datos.
4. ⏳ Ejecutar validación por fase: lint, build, smoke funcional de flujos críticos (tools, sanctions, loans, kiosk).
   - ✅ `npm run typecheck` pasa.
   - ⚠️ `npm run lint` falla por script de Next (`next lint` interpreta `lint` como directorio).
   - ⚠️ `npm run build` falla en `prisma generate` por `EPERM` al renombrar `query_engine-windows.dll.node` (archivo bloqueado).

## Orden de PRs (incremental)
1. PR-1: guardrails + convenciones + baseline.
2. PR-2: consolidación de rutas admin (fuente única `src/app/admin`).
3. PR-3: refactor `tools`.
4. PR-4: refactor `sanctions`.
5. PR-5: refactor `loans`.
6. PR-6: refactor `students` + `dashboard/metrics/audit`.
7. PR-7: cumplimiento final 1 export por TSX + hardening.

## File change summary
| File | Action |
|---|---|
| `src/app/admin/tools/page.tsx` | Modify |
| `src/app/admin/sanctions/page.tsx` | Modify |
| `src/app/admin/loans/page.tsx` | Modify |
| `src/app/admin/students/page.tsx` | Modify |
| `src/app/admin/dashboard/page.tsx` | Modify |
| `src/app/admin/metrics/page.tsx` | Modify |
| `src/app/admin/audit/page.tsx` | Modify |
| `src/app/(admin)/layout.tsx` | Delete |
| `src/app/(admin)/tools/page.tsx` | Delete |
| `src/app/(admin)/sanctions/page.tsx` | Delete |
| `src/app/(admin)/loans/page.tsx` | Delete |
| `src/app/(admin)/students/page.tsx` | Delete |
| `src/app/(admin)/dashboard/page.tsx` | Delete |
| `src/app/(admin)/metrics/page.tsx` | Delete |
| `src/app/(admin)/audit/page.tsx` | Delete |
| `src/components/features/tools/pages/ToolsAdminPage.tsx` | Create |
| `src/components/features/sanctions/pages/SanctionsAdminPage.tsx` | Create |
| `src/components/features/loans/pages/LoansAdminPage.tsx` | Create |
| `src/components/features/students/pages/StudentsAdminPage.tsx` | Create |
| `src/components/features/analytics/pages/DashboardAdminPage.tsx` | Create |
| `src/components/features/analytics/pages/MetricsAdminPage.tsx` | Create |
| `src/components/features/audit/pages/AuditAdminPage.tsx` | Create |