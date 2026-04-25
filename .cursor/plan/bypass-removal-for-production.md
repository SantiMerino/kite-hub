# Retiro del bypass de desarrollo para producción

## Scope

Guía de ejecución para eliminar completamente el bypass de autenticación (`DEV_AUTH_BYPASS`) antes de un release productivo. El bypass es legítimo en desarrollo pero representa una backdoor si se filtra a producción. Este plan define la secuencia de pasos a seguir **una sola vez** cuando el producto esté listo para su primer despliegue real.

## Pre-condiciones

Antes de comenzar:
- Auth0 configurado con tenant, aplicación y reglas de roles.
- Al menos un usuario real con rol `admin` en Auth0 y en la base de datos.
- Variables de entorno de producción disponibles (Auth0 + DATABASE_URL + KIOSK_SECRET + CRON_SECRET).

---

## Paso 1 — Verificar que el kill-switch funciona

`src/lib/dev-bypass.ts` ya lanza un error en startup si `DEV_AUTH_BYPASS=true` fuera de `development`. Confirmar antes de continuar:

```bash
NODE_ENV=production DEV_AUTH_BYPASS=true node -e "require('./src/lib/dev-bypass')"
# Debe lanzar: "[dev-bypass] DEV_AUTH_BYPASS=true is set outside of NODE_ENV=development..."
```

## Paso 2 — Correr el script de verificación de entorno

```bash
npm run check:no-bypass-prod
```

Este script (en `scripts/check-no-dev-bypass-prod.js`) falla si:
- `DEV_AUTH_BYPASS=true` está seteado en el entorno actual.
- Encuentra importaciones de `dev-bypass` en código de producción fuera de `src/lib/`.

Debe pasar con exit code 0 antes de cualquier deploy.

## Paso 3 — Desactivar bypass en staging/preprod

En tu entorno de staging (Heroku, Vercel, Railway, etc.):
1. Verificar que `DEV_AUTH_BYPASS` **no** esté seteada o esté en `false`.
2. Verificar que `NODE_ENV=production` o `NODE_ENV=staging`.
3. Hacer un deploy de staging y probar el flujo de login completo con Auth0.

## Paso 4 — Smoke test end-to-end en staging

- [ ] Ir a `/` → redirige a `/kiosk` (no hay sesión).
- [ ] Hacer clic en "Panel staff →" → redirige a Auth0 login.
- [ ] Hacer login con usuario real (rol `staff` o `admin`).
- [ ] Auth0 redirige a `/admin/dashboard` → se ve el panel.
- [ ] Usuario con rol `student` → se redirige a `/kiosk` (layout guard de rol).
- [ ] API `/api/admin/loans` sin sesión → 401.
- [ ] API `/api/admin/loans` con sesión de `student` → 403.

## Paso 5 — Eliminación de código (después de validar staging)

Una vez que staging funciona correctamente con Auth0 real, eliminar el código de bypass en producción:

### 5.1 Eliminar ramas condicionales de bypass

**`src/lib/auth.ts`** — remover el bloque `if (isDevAuthBypassEnabled())` completo (líneas 43–75) y las importaciones de `dev-bypass`.

**`src/lib/auth0.ts`** — remover `DevAuth0Client`, `DEV_SESSION`, y la lógica condicional. Dejar solo:
```ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";
export const auth0 = new Auth0Client();
```

**`src/components/layout/TopBar.tsx`** — remover el import de `isDevAuthBypassEnabled` y `withDevDatabaseFallback`; simplificar el conteo de notificaciones a una sola llamada Prisma directa.

### 5.2 Eliminar el módulo de bypass completo

Borrar `src/lib/dev-bypass.ts`.

Actualizar cualquier import que lo referencie (verificar con `grep -r "dev-bypass" src/`).

### 5.3 Limpiar documentación

**`.env.example`** — eliminar la sección `Dev Auth Bypass` completa.

**`.cursor/rules/auth-bypass-routes.mdc`** — eliminar las secciones "4. Dev auth bypass rules" y "6. Pre-release checklist".

**`scripts/check-no-dev-bypass-prod.js`** — ya no es necesario; puede eliminarse también.

## Paso 6 — Deploy a producción

```bash
npm run check:no-bypass-prod  # debe pasar
git add -A
git commit -m "chore: remove dev auth bypass for production release"
git push origin main
```

## File change summary

| File | Action |
|---|---|
| `src/lib/dev-bypass.ts` | Delete |
| `src/lib/auth.ts` | Modify (remove bypass branch) |
| `src/lib/auth0.ts` | Modify (remove DevAuth0Client) |
| `src/components/layout/TopBar.tsx` | Modify (simplify notification query) |
| `.env.example` | Modify (remove bypass section) |
| `.cursor/rules/auth-bypass-routes.mdc` | Modify (remove bypass sections) |
| `scripts/check-no-dev-bypass-prod.js` | Delete (optional) |
