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
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
  const ok = rows[0]?.ok === 1;
  if (!ok) {
    console.error("Respuesta inesperada:", rows);
    process.exit(1);
  }
  console.log("Conexión correcta (SELECT 1).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Conexión fallida:");
  console.error(e instanceof Error ? e.message : e);
  void prisma.$disconnect().catch(() => {});
  process.exit(1);
});
