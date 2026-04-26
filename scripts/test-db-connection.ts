/**
 * Prueba rápida de DATABASE_URL sin levantar Next.js.
 * Uso: npm run db:test
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadDotEnv(files: string[]) {
  for (const file of files) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

function maskDatabaseUrl(url: string): string {
  return url.replace(/(password=)([^;]+)/i, "$1***");
}

const REQUIRED_TABLES = ["users", "tools", "loans", "alerts"] as const;

loadDotEnv([".env.local", ".env"]);

const url = process.env.DATABASE_URL;
if (!url?.startsWith("sqlserver://")) {
  console.error(
    "Falta DATABASE_URL o no es sqlserver://. Revisa .env.local o .env",
  );
  process.exit(1);
}

const hostSegment = url.slice("sqlserver://".length).split(";")[0];
if (/%5c/i.test(hostSegment) && /:\d+$/.test(hostSegment)) {
  console.error(
    "DATABASE_URL inválida: no mezcles instancia (%5C) con :puerto en el host.\n" +
      "  Mal:  sqlserver://localhost%5CSQLEXPRESS:1433;...\n" +
      "  Bien: sqlserver://localhost%5CSQLEXPRESS;... o sqlserver://localhost:1433;...",
  );
  process.exit(1);
}

console.log("Probando:", maskDatabaseUrl(url.split(";").slice(0, 3).join(";") + ";..."));

const prisma = new PrismaClient({ log: [] });

async function main() {
  await prisma.$connect();
  const dbCtx = await prisma.$queryRaw<
    Array<{ db: string; server: string }>
  >`SELECT DB_NAME() AS db, @@SERVERNAME AS server`;
  const currentDb = dbCtx[0]?.db ?? "(unknown-db)";
  const currentServer = dbCtx[0]?.server ?? "(unknown-server)";

  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
  const ok = rows[0]?.ok === 1;
  if (!ok) {
    console.error("Respuesta inesperada:", rows);
    process.exit(1);
  }

  const existingTables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name
    FROM sys.tables
    WHERE name IN ('users', 'tools', 'loans', 'alerts')
  `;
  const existingNames = new Set(existingTables.map((t) => t.name.toLowerCase()));
  const missing = REQUIRED_TABLES.filter((name) => !existingNames.has(name));
  if (missing.length > 0) {
    console.error(
      `Conexión SQL OK pero esquema incompleto en ${currentServer}/${currentDb}.`,
    );
    console.error(`Faltan tablas: ${missing.join(", ")}.`);
    console.error(
      "Sugerencia: ejecuta `npx prisma db push --schema prisma/schema.prisma` con DATABASE_URL cargada.",
    );
    process.exit(1);
  }

  console.log(`Conexión y esquema correctos en ${currentServer}/${currentDb}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Conexión fallida:");
  console.error(e instanceof Error ? e.message : e);
  void prisma.$disconnect().catch(() => {});
  process.exit(1);
});
