# Conexión de SQL Server 2022 Local a Kite Hub

Guía paso a paso para levantar una instancia local de SQL Server 2022, crear la base de datos `kite_hub` y conectarla al proyecto en modo desarrollo.

---

## Requisitos previos

- Windows 10/11 (64-bit)
- Node.js ≥ 18 y npm instalados
- SSMS (SQL Server Management Studio) — opcional pero recomendado

---

## 1. Instalar SQL Server 2022 Developer Edition

1. Descarga el instalador desde [https://www.microsoft.com/en-us/sql-server/sql-server-downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) → elige **Developer** (gratis para desarrollo).
2. Ejecuta el instalador y elige **Basic** o **Custom**.
   - En Custom: selecciona el motor de base de datos (`Database Engine Services`).
   - Acepta todas las opciones por defecto para una instalación local.
3. Al finalizar, anota el nombre de la instancia (por defecto es `MSSQLSERVER`, lo que expone la instancia como `localhost`).

> **Alternativa Docker** (si prefieres no instalar): ver sección al final.

---

## 2. Habilitar autenticación mixta y el usuario SA

SQL Server por defecto solo permite autenticación de Windows. Kite Hub usa autenticación SQL (usuario/contraseña), así que debes habilitarla:

1. Abre **SSMS** y conéctate con **Windows Authentication**.
2. Haz clic derecho sobre el servidor → **Properties → Security**.
3. Cambia **Server authentication** a `SQL Server and Windows Authentication mode`.
4. Haz clic en **OK** y **reinicia el servicio** de SQL Server (botón derecho sobre el servidor → Restart).
5. Expande **Security → Logins → SA**.
6. Haz doble clic en `SA` → pestaña **General**: pon una contraseña fuerte (ej. `YourStrong!Pass`).
7. Pestaña **Status**: cambia **Login** a `Enabled`.
8. Haz clic en **OK**.

---

## 3. Habilitar TCP/IP en el puerto 1433

1. Abre **SQL Server Configuration Manager** (búscalo en el menú Inicio).
2. Expande **SQL Server Network Configuration → Protocols for MSSQLSERVER**.
3. Haz clic derecho en **TCP/IP** → **Enable**.
4. Haz doble clic en **TCP/IP** → pestaña **IP Addresses** → baja hasta **IPAll**:
   - Borra el valor de **TCP Dynamic Ports** (déjalo vacío).
   - Escribe `1433` en **TCP Port**.
5. Haz clic en **OK**.
6. En **SQL Server Services**, haz clic derecho en **SQL Server (MSSQLSERVER)** → **Restart**.

### SQL Server Express (`SQLEXPRESS`)

Si tu instancia se llama `.\SQLEXPRESS` o `localhost\SQLEXPRESS`:

1. En **SQL Server Configuration Manager**, abre **Protocols for SQLEXPRESS** (no *MSSQLSERVER*).
2. Habilita **TCP/IP**, asigna un **puerto estático** en **IPAll** (por ejemplo `1433`) o anota el **TCP Dynamic Port** que use la instancia.
3. Reinicia el servicio **SQL Server (SQLEXPRESS)**.

**`DATABASE_URL` para Prisma:** las URLs no pueden llevar `\` sin escapar. Usa una de estas formas:

- **Instancia en el host (recomendado si ya tienes TCP fijo):** misma cadena que la instancia por defecto, con host y puerto:

  ```env
  DATABASE_URL="sqlserver://localhost:1433;database=kite_hub;user=SA;password=TuPassword;encrypt=true;trustServerCertificate=true"
  ```

  Sustituye `1433` por el puerto TCP real de `SQLEXPRESS` si no es 1433.

- **Nombre de instancia en la URL:** codifica la barra como `%5C` (equivalente a `localhost\SQLEXPRESS`):

  ```env
  DATABASE_URL="sqlserver://localhost%5CSQLEXPRESS;database=kite_hub;user=SA;password=TuPassword;encrypt=true;trustServerCertificate=true"
  ```

  No añadas `:1433` (ni ningún puerto) en el mismo segmento que el nombre de instancia. Si lo haces, Prisma intentará conectarse a un host inválido (`localhost%5CSQLEXPRESS:1433`) y verás *Can't reach database server*.

  Si quieres usar puerto explícito, usa solo `host:puerto` (sin `%5CSQLEXPRESS`), con el **TCP Port** real que figura en **IPAll** de la instancia **SQLEXPRESS**.

En **bash/Git Bash**, si pones la URL entre comillas dobles, `%5C` se interpreta bien; no uses `\` suelto dentro de la URL.

---

## 4. Crear la base de datos

En SSMS (conectado como SA o con Windows Auth), abre una nueva query y ejecuta:

```sql
CREATE DATABASE kite_hub;
GO
```

Verifica que aparece en el árbol de **Databases**.

---

## 5. Ejecutar el esquema

El esquema T-SQL completo está en `prisma/sql/001_schema.sql`.

**Opción A — SSMS:**
1. Abre SSMS → File → Open → `prisma/sql/001_schema.sql`.
2. Asegúrate de que la base de datos activa es `kite_hub` (selector arriba a la izquierda).
3. Presiona **F5** para ejecutar.

**Opción B — sqlcmd (línea de comandos):**

```bash
sqlcmd -S localhost,1433 -U SA -P "YourStrong!Pass" -i "prisma/sql/001_schema.sql"
```

Deberías ver al final:
```
Kite Hub schema created successfully.
```

---

## 6. Cargar los datos de prueba (seed)

```bash
sqlcmd -S localhost,1433 -U SA -P "YourStrong!Pass" -i "prisma/sql/002_seed.sql"
```

Esto inserta:
- 5 usuarios (1 admin dev, 1 staff, 3 estudiantes)
- 5 herramientas con inventario
- 4 préstamos (activos, devuelto, vencido)
- 1 sanción
- 3 entradas de auditoría
- 2 reglas de préstamo

---

## 7. Configurar `.env.local`

Crea el archivo `.env.local` en la raíz del proyecto (Next.js lo carga automáticamente y **no lo sube a git**):

```env
# Base de datos local
DATABASE_URL="sqlserver://localhost:1433;database=kite_hub;user=SA;password=YourStrong!Pass;encrypt=true;trustServerCertificate=true"

# Bypass de Auth0 para desarrollo
DEV_AUTH_BYPASS="true"

# Secrets de desarrollo (valores de prueba, cámbialos en producción)
KIOSK_SECRET="dev-kiosk-secret-local"
CRON_SECRET="dev-cron-secret-local"

# Email (desactiva el envío real en dev dejando la key vacía o usando un sandbox)
RESEND_API_KEY=""
RESEND_FROM="Kite Hub Dev <noreply@localhost>"
```

> `trustServerCertificate=true` es necesario para conexiones locales sin certificado TLS firmado. **Nunca uses esto en producción.**

---

## 8. Generar el cliente Prisma

```bash
npx prisma generate
```

Para verificar que Prisma puede conectarse:

```bash
npx prisma db pull
```

Si el comando termina sin errores y lista las tablas, la conexión está funcionando.

---

## 9. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Con `DEV_AUTH_BYPASS=true`, el sistema te loguea automáticamente como **Dev Admin** sin necesidad de Auth0. El panel de administración en `/admin/dashboard` debe cargar directamente.

---

## Alternativa: SQL Server 2022 en Docker

Si prefieres no instalar SQL Server localmente:

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Pass" \
  -p 1433:1433 --name kite-mssql -d \
  mcr.microsoft.com/mssql/server:2022-latest
```

Luego sigue los pasos 4–9 normalmente. La `DATABASE_URL` es idéntica.

---

## Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Cannot connect to localhost:1433` | TCP/IP no habilitado o firewall | Revisar paso 3; agregar regla de firewall para el puerto 1433 |
| `Login failed for user SA` | SA deshabilitado o contraseña incorrecta | Revisar paso 2 |
| `Prisma: Environment variable not found: DATABASE_URL` | Falta `.env.local` | Crear el archivo (paso 7) |
| `trustServerCertificate` error en prod | Flag puesto en producción | Quitar `trustServerCertificate=true` y usar certificado real |
