# Despliegue en Heroku

## Requisitos previos

- Heroku CLI instalado y autenticado
- SQL Server 2022 accesible desde internet (Azure SQL, AWS RDS SQL Server, o instancia propia)
- Cuenta Auth0 configurada
- Cuenta Resend con dominio verificado

---

## 1. Crear la app en Heroku

```bash
heroku create kite-hub-lab
```

## 2. Configurar variables de entorno

```bash
heroku config:set \
  DATABASE_URL="sqlserver://HOST:1433;database=kite_hub;user=SA;password=YourPass;encrypt=true;trustServerCertificate=false" \
  AUTH0_SECRET="$(openssl rand -hex 32)" \
  AUTH0_BASE_URL="https://kite-hub-lab.herokuapp.com" \
  AUTH0_DOMAIN="YOUR_DOMAIN.auth0.com" \
  AUTH0_CLIENT_ID="YOUR_CLIENT_ID" \
  AUTH0_CLIENT_SECRET="YOUR_CLIENT_SECRET" \
  KIOSK_SECRET="$(openssl rand -hex 32)" \
  CRON_SECRET="$(openssl rand -hex 32)" \
  RESEND_API_KEY="re_xxxx" \
  RESEND_FROM="Kite Hub <noreply@yourdomain.com>" \
  NODE_ENV="production"
```

## 3. Desplegar

```bash
git push heroku main
```

El `Procfile` ejecuta automáticamente `prisma migrate deploy` en el release phase.

## 4. Seed inicial (opcional)

```bash
heroku run npm run db:seed
```

## 5. Heroku Scheduler (reemplaza Vercel Cron)

Instala el addon gratuito:

```bash
heroku addons:create scheduler:standard
heroku addons:open scheduler
```

Configura el siguiente job:

| Comando           | Frecuencia    |
|-------------------|---------------|
| `npm run jobs:overdue` | Cada hora (o a medianoche) |

> El job usa `tsx` para ejecutar directamente `src/jobs/overdue.ts`.
> También puedes llamar `POST /api/jobs/overdue` con el header `x-cron-secret`
> desde cualquier sistema externo de cron (GitHub Actions, cron.io, etc.).

## 6. Auth0 — configuración de callback URLs

En el dashboard de Auth0, bajo tu Application:

- **Allowed Callback URLs**: `https://kite-hub-lab.herokuapp.com/api/auth/callback`
- **Allowed Logout URLs**: `https://kite-hub-lab.herokuapp.com`
- **Allowed Web Origins**: `https://kite-hub-lab.herokuapp.com`

Para mapear roles, agrega una Rule o Action en Auth0:

```javascript
// Auth0 Action — Login flow
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://kite-hub.app';
  const role = event.user.app_metadata?.role ?? 'staff';
  api.idToken.setCustomClaim(`${namespace}/role`, role);
  api.accessToken.setCustomClaim(`${namespace}/role`, role);
};
```

## 7. KIOSK_SECRET en el cliente

La página del quiosco lee `NEXT_PUBLIC_KIOSK_KEY` para enviar el header de autenticación.
Añade también:

```bash
heroku config:set NEXT_PUBLIC_KIOSK_KEY="$(heroku config:get KIOSK_SECRET)"
```

O mejor, sirve la clave desde un endpoint protegido si el quiosco es un dispositivo compartido fijo.
