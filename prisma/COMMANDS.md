# Prisma + SQL Server Commands (Kite Hub)

Comandos usados para forzar sincronizacion entre `prisma/schema.prisma` y la base SQL Server real.

## 1) Cargar variables de entorno

En Git Bash, antes de comandos Prisma:

```bash
set -a && source ".env.local" && set +a
```

## 2) Forzar esquema Prisma -> DB (sin migracion historica)

Esto crea/ajusta tablas para que Prisma y SQL queden alineados:

```bash
set -a && source ".env.local" && set +a && npx prisma db push --schema "prisma/schema.prisma" --skip-generate
```

## 3) Regenerar cliente Prisma

```bash
npx prisma generate --schema "prisma/schema.prisma"
```

## 4) Verificar conexion + esquema minimo

```bash
npm run db:test
```

## 4b) Seed demo (Prisma) — alineado a `sql/002_seed.sql`

```bash
set -a && source ".env.local" && set +a && npm run db:seed
# o: npx prisma db seed
```

Este test valida:
- `SELECT 1`
- DB y servidor actuales (`DB_NAME()`, `@@SERVERNAME`)
- tablas minimas: `users`, `tools`, `loans`, `alerts`

## 5) Flujo recomendado cuando cambies `schema.prisma`

```bash
set -a && source ".env.local" && set +a && \
npx prisma db push --schema "prisma/schema.prisma" --skip-generate && \
npx prisma generate --schema "prisma/schema.prisma" && \
npm run db:test
```

## 6) Generar SQL de diferencia (opcional, para guardar en `prisma/sql/`)

Si quieres un script SQL de los cambios del schema actual:

```bash
set -a && source ".env.local" && set +a && \
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel "prisma/schema.prisma" \
  --script > "prisma/sql/zzz_next_changes.sql"
```

Nota: en este repo, para entorno local rapido, usamos `db push` como fuente de verdad operativa.
