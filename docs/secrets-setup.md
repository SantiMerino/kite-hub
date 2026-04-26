# Configuración de Secrets: KIOSK_SECRET y CRON_SECRET

Kite Hub protege endpoints sensibles con tokens estáticos. Esta guía explica para qué sirve cada uno, cómo generarlo y cómo usarlo en desarrollo y producción.

---

## KIOSK_SECRET

### ¿Para qué sirve?

`KIOSK_SECRET` es el token que autentifica al **terminal kiosco** (la pantalla física del laboratorio) cuando realiza operaciones de préstamo o devolución.

El endpoint protegido es:

```
POST /api/kiosk/loan-or-return
```

El kiosco debe enviar el token en el header `x-kiosk-key` (desde `NEXT_PUBLIC_KIOSK_KEY` en cliente):

```
x-kiosk-key: <KIOSK_SECRET>
```

Si el header está ausente o el token no coincide, el endpoint responde `401 Unauthorized`.

### ¿Cómo generar un valor seguro?

**Opción A — OpenSSL (recomendado en Linux/macOS/WSL):**

```bash
openssl rand -hex 32
```

**Opción B — Node.js (funciona en Windows sin WSL):**

```js
// Ejecuta en una terminal con Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ambos producen una cadena hexadecimal de 64 caracteres, por ejemplo:

```
a3f8c2e1b7d94056ef12309a1c8b2d3f7e9a0b1c4d5e6f70123456789abcdef
```

### Configuración local (`.env.local`)

```env
KIOSK_SECRET="<valor-generado>"
```

Para probar el endpoint desde la terminal:

```bash
curl -X POST http://localhost:3000/api/kiosk/loan-or-return \
  -H "Content-Type: application/json" \
  -H "x-kiosk-key: <KIOSK_SECRET>" \
  -d '{"cardKey":"KEY_000001","toolPayload":"MAR_001"}'
```

Si pruebas desde la UI de `/kiosk`, configura tambien:

```env
NEXT_PUBLIC_KIOSK_KEY="<mismo-valor-de-KIOSK_SECRET>"
```

### Configuración en producción

Agrega `KIOSK_SECRET` como variable de entorno en tu plataforma de hosting:

- **Heroku:** `heroku config:set KIOSK_SECRET="<valor>"`
- **Vercel:** Dashboard → Project → Settings → Environment Variables
- **Railway / Render:** panel de Environment Variables del servicio

---

## CRON_SECRET

### ¿Para qué sirve?

`CRON_SECRET` autentifica al **cron runner** (Heroku Scheduler, GitHub Actions, cURL manual, etc.) cuando dispara el job automático que marca préstamos vencidos y aplica sanciones.

El endpoint protegido es:

```
POST /api/jobs/overdue
```

El runner debe enviar el token en el header `Authorization`:

```
Authorization: Bearer <CRON_SECRET>
```

### ¿Cómo generar un valor seguro?

Usa el mismo método que para `KIOSK_SECRET`, pero **genera un valor diferente**. Nunca reutilices el mismo secret para dos propósitos distintos.

```bash
openssl rand -hex 32
```

### Configuración local (`.env.local`)

```env
CRON_SECRET="<valor-generado-diferente-al-kiosk>"
```

Para disparar el job manualmente en desarrollo:

```bash
curl -X POST http://localhost:3000/api/jobs/overdue \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Deberías recibir una respuesta JSON con el resumen de préstamos procesados.

### Configuración del cron en producción

**Heroku Scheduler:**

1. En el dashboard de Heroku, ve a tu app → Add-ons → **Heroku Scheduler**.
2. Agrega un nuevo job con el comando:
   ```bash
   curl -X POST $APP_URL/api/jobs/overdue -H "Authorization: Bearer $CRON_SECRET"
   ```
3. Configura la frecuencia (recomendado: cada hora o diariamente a las 00:00).

**GitHub Actions (`cron`):**

```yaml
# .github/workflows/overdue-job.yml
name: Overdue Loans Job
on:
  schedule:
    - cron: '0 6 * * *'   # Diario a las 06:00 UTC
  workflow_dispatch:        # Permite ejecución manual

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger overdue job
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/jobs/overdue \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            --fail
```

Agrega `APP_URL` y `CRON_SECRET` en **Repository Settings → Secrets and variables → Actions**.

---

## Resumen rápido

| Variable | Endpoint protegido | Quién la envía | Cómo generar |
|---|---|---|---|
| `KIOSK_SECRET` | `POST /api/kiosk/loan-or-return` | Terminal kiosco físico | `openssl rand -hex 32` |
| `CRON_SECRET` | `POST /api/jobs/overdue` | Scheduler / cron runner | `openssl rand -hex 32` (valor distinto) |

### Reglas de seguridad

- Usa valores **distintos** para cada secret.
- Nunca los incluyas en el código fuente ni en commits.
- Rota los secrets si sospechas que fueron expuestos (actualiza `.env.local` y la plataforma de hosting).
- En producción, usa **HTTPS** siempre — los tokens viajan en headers HTTP.
