---
name: tema-oscuro-y-perfil-self
overview: Implementar tema oscuro con detección por preferencia del navegador y switch manual, además de una vista de perfil propio para usuario autenticado con acceso restringido a su propia información/auditoría.
todos:
  - id: wire-runtime-theme
    content: Conectar ThemeProvider global con soporte system + manual toggle
    status: in_progress
  - id: adapt-color-tokens
    content: Mapear la paleta solicitada a tokens semánticos clave en globals.css
    status: pending
  - id: add-profile-route
    content: Agregar navegación y página /admin/profile con vista informativa
    status: pending
  - id: enforce-self-access
    content: Asegurar que perfil y enlace de auditoría solo expongan datos del usuario autenticado
    status: pending
  - id: validate-theme-and-access
    content: Probar contraste, persistencia de tema y restricciones de acceso
    status: pending
isProject: false
---

# Tema oscuro y perfil propio

## Scope
Implementar dark mode funcional en runtime (sistema + manual), adaptar paleta de color al sistema de tokens de UI y crear una sección de perfil informativo con acceso solo al propio usuario.

## Supuestos por omisión de respuesta
- Se aplicará enfoque **híbrido** de color: actualizar tokens clave (`primary`, `ring`, `sidebar`, `chart-*`) con tu paleta y mantener base neutral para legibilidad.
- En esta iteración, la página de perfil quedará en el panel actual para usuarios `staff/admin` y preparada para abrirla luego a `student` sin rehacer arquitectura.

## Implementación propuesta
1. **Conectar theming en runtime (sistema + manual)**
   - Crear provider cliente para tema con `next-themes` (`defaultTheme="system"`, `enableSystem`) en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/providers/theme-provider.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/providers/theme-provider.tsx).
   - Envolver árbol raíz en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/layout.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/layout.tsx) con ese provider.
   - Agregar `ThemeToggle` (light/dark/system) en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/TopBar.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/TopBar.tsx) para control manual.

2. **Adaptar paleta a tokens del sistema (sin romper shadcn/new-york)**
   - Actualizar variables en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/globals.css`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/globals.css):
     - Key colors origen: `#000000`, `#006FFF`, `#FFFFFF`, `#9746FF`, `#00E379`, `#F3F300`.
     - Mapear a tokens semánticos clave y variantes `.dark` garantizando contraste AA en texto/superficies.
   - Mantener colores de dominio en navegación/badges (blue/emerald/purple/violet) y ajustar solo donde choquen con la nueva paleta.

3. **Crear pestaña de perfil y ruta informativa propia**
   - Agregar item `Perfil` en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/Sidebar.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/Sidebar.tsx) hacia `/admin/profile`.
   - Crear wrapper de ruta en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/profile/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/profile/page.tsx).
   - Implementar vista en [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/admin/profile/ProfileAdminPage.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/admin/profile/ProfileAdminPage.tsx) con:
     - datos básicos del usuario autenticado,
     - estado de bloqueo/sanción,
     - acceso a su propio `audit/mi_carne` (solo su cardKey).

4. **Restringir acceso a datos “solo propios”**
   - Reutilizar helpers de auth de [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/lib/auth.ts`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/lib/auth.ts).
   - Añadir endpoint/view-model de perfil propio (por ejemplo `GET /api/me/profile`) en `src/app/api/...` para no exponer consultas arbitrarias por `userId` desde cliente.
   - Enlace de auditoría desde perfil apuntando únicamente al `cardKey` del usuario actual.

5. **Validación funcional y visual**
   - Probar dark mode en tres escenarios: preferencia de sistema, toggle manual, persistencia al recargar.
   - Probar acceso: usuario A no puede ver perfil/auditoría de usuario B.
   - Verificar estilos en `Sidebar`, `TopBar`, cards y estados críticos con nueva paleta.

## Riesgos y mitigación
- **Contraste insuficiente** tras cambio de tokens: ajustar pares `foreground/*-foreground` y `muted`/`card` en light/dark.
- **Hardcodes de color** (`bg-white`, `hover:bg-slate-50`) en layout: reemplazar progresivamente por tokens para consistencia.
- **Ruta de perfil acoplada a /admin**: dejar lista una expansión posterior a `/me` para `student`.

## File change summary
- `Create` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/providers/theme-provider.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/providers/theme-provider.tsx)
- `Create` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/theme/theme-toggle.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/theme/theme-toggle.tsx)
- `Modify` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/layout.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/layout.tsx)
- `Modify` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/globals.css`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/globals.css)
- `Modify` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/TopBar.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/TopBar.tsx)
- `Modify` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/Sidebar.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/layout/Sidebar.tsx)
- `Create` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/profile/page.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/app/admin/profile/page.tsx)
- `Create` [`C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/admin/profile/ProfileAdminPage.tsx`](C:/Users/JoseSantiagoMerinoHe/Desktop/Kite-Hub-Projecct/src/components/admin/profile/ProfileAdminPage.tsx)
- `Create/Modify` endpoint(s) en `src/app/api/**` para perfil propio (ruta exacta a definir durante implementación)