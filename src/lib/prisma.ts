import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function warnIfConflictingSqlServerUrl() {
  if (process.env.NODE_ENV !== "development") return;
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("sqlserver://")) return;
  const hostSegment = url.slice("sqlserver://".length).split(";")[0];
  if (/%5c/i.test(hostSegment) && /:\d+$/.test(hostSegment)) {
    console.warn(
      "\n[kite-hub] DATABASE_URL inválida: no mezcles instancia nombrada (%5C) con :puerto en el mismo host.\n" +
        "  Mal:  sqlserver://localhost%5CSQLEXPRESS:1433;...\n" +
        "  Bien: sqlserver://localhost%5CSQLEXPRESS;...   (sin :puerto; suele requerir SQL Browser)\n" +
        "  Bien: sqlserver://localhost:1433;...         (solo puerto TCP de SQLEXPRESS en IPAll)\n",
    );
  }
}

warnIfConflictingSqlServerUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
