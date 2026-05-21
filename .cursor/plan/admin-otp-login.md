# Admin OTP login (Resend)

## Scope

Reemplazar Auth0 por inicio de sesión administrativo con OTP por correo (Resend). Kiosk como página principal; acceso admin desde header del kiosk.

## Overview

- Sesión firmada en cookie `httpOnly` (`ADMIN_SESSION_SECRET`)
- OTP de 6 dígitos hasheado (SHA-256 + pepper), tabla `admin_login_otps`
- Solo usuarios con `role` `admin` o `staff` y email en BD
- Sin registro de cuentas; solo login

## Steps

1. ✅ Modelo Prisma `AdminLoginOtp`
2. ✅ `src/lib/admin-session.ts`, `src/lib/admin-otp.ts`
3. ✅ APIs `/api/auth/admin/{request-otp,resend-otp,verify-otp,logout}`
4. ✅ UI `/admin/login` + botón en kiosk
5. ✅ Rutas admin en `(protected)/` con layout con guard
6. ✅ Eliminar `src/lib/auth0.ts` y uso en app
7. ✅ Actualizar `.env.example`, `check-no-dev-bypass-prod.js`

## File change summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify |
| `src/lib/admin-session.ts` | Create |
| `src/lib/admin-otp.ts` | Create |
| `src/lib/auth.ts` | Modify |
| `src/lib/auth0.ts` | Delete |
| `src/lib/dev-bypass.ts` | Modify |
| `src/lib/resend.ts` | Modify |
| `src/proxy.ts` | Modify |
| `src/app/page.tsx` | Modify |
| `src/app/kiosk/page.tsx` | Modify |
| `src/app/admin/login/page.tsx` | Create |
| `src/app/admin/(protected)/**` | Move |
| `src/components/auth/AdminLoginForm.tsx` | Create |
| `src/components/layout/TopBar.tsx` | Modify |
| `src/app/api/auth/admin/**` | Create |
| `.env.example` | Modify |
| `scripts/check-no-dev-bypass-prod.js` | Modify |
