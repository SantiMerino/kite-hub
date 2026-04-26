/**
 * Demo seed (Prisma) — alineado a `prisma/sql/001_schema.sql`, `002_seed.sql` y
 * `003_tool_id_normalization.sql` (herramientas ya usan `PREFIX_NNN` + `prefix`).
 *
 * Orden recomendado: `prisma db push` → (opcional SQL por sqlcmd) → `npm run db:seed`
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { addDays, subDays } from "date-fns";
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

loadDotEnv([".env.local", ".env"]);

if (!process.env.DATABASE_URL?.startsWith("sqlserver://")) {
  console.error(
    "Falta DATABASE_URL (carga .env.local) o no es sqlserver://. No se puede ejecutar el seed.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const LOAN_RULES = [
  {
    minDays: 1,
    maxDays: 3,
    sanctionDescription: "Advertencia por atraso leve",
    canBorrow: true,
  },
  {
    minDays: 4,
    maxDays: 7,
    sanctionDescription: "Suspensión temporal 1 semana",
    canBorrow: false,
  },
  {
    minDays: 8,
    maxDays: null,
    sanctionDescription: "Suspensión indefinida, revisión por administración",
    canBorrow: false,
  },
] as const;

const USERS = [
  {
    auth0Sub: "dev|bypass-admin",
    cardKey: "KEY_900001",
    name: "Dev Admin",
    email: "admin@dev.local",
    role: "admin",
  },
  {
    auth0Sub: "auth0|staff001",
    cardKey: "KEY_900002",
    name: "María López",
    email: "maria@lab.local",
    role: "staff",
  },
  {
    auth0Sub: "seed|student001",
    cardKey: "KEY_000001",
    name: "Carlos Ramírez",
    email: "carlos@uni.local",
    role: "student",
  },
  {
    auth0Sub: "seed|student002",
    cardKey: "KEY_000002",
    name: "Laura Sánchez",
    email: "laura@uni.local",
    role: "student",
  },
  {
    auth0Sub: "seed|student003",
    cardKey: "KEY_000003",
    name: "Diego Flores",
    email: "diego@uni.local",
    role: "student",
  },
  {
    auth0Sub: "user",
    cardKey: "KEY_000112",
    name: "Santiago Merino",
    email: "santiago@lab.local",
    role: "admin",
  },
] as const;

const CATEGORIES = [
  { name: "Medición",     description: "Instrumentos de medición eléctrica y electrónica" },
  { name: "Ensamble",     description: "Herramientas para soldadura y ensamble de componentes" },
  { name: "Alimentación", description: "Fuentes de poder y suministro de energía regulable" },
] as const;

const LOCATIONS = [
  { name: "Estante A-1", locationType: "estante", area: "Mueble A" },
  { name: "Estante A-2", locationType: "estante", area: "Mueble A" },
  { name: "Estante A-3", locationType: "estante", area: "Mueble A" },
  { name: "Estante B-1", locationType: "estante", area: "Mueble B" },
  { name: "Estante B-2", locationType: "estante", area: "Mueble B" },
  { name: "Gaveta A-1",  locationType: "gaveta",  area: "Mueble A" },
  { name: "Gaveta B-1",  locationType: "gaveta",  area: "Mueble B" },
] as const;

const TOOLS = [
  {
    toolId: "MUL_001",
    prefix: "MUL",
    name: "Multímetro Digital",
    description:
      "Medición de voltaje, corriente y resistencia",
    category: "Medición",
    condition: "good",
    location: "Estante A-1",
    requiresApproval: false,
  },
  {
    toolId: "OSC_001",
    prefix: "OSC",
    name: "Osciloscopio 100 MHz",
    description:
      "Visualización de señales eléctricas en tiempo real",
    category: "Medición",
    condition: "excellent",
    location: "Estante A-2",
    requiresApproval: true,
  },
  {
    toolId: "SOL_001",
    prefix: "SOL",
    name: "Soldadora de Estaño",
    description: "Soldadura de componentes electrónicos",
    category: "Ensamble",
    condition: "fair",
    location: "Estante B-1",
    requiresApproval: false,
  },
  {
    toolId: "FUE_001",
    prefix: "FUE",
    name: "Fuente de Poder Variable",
    description: "Suministro regulable 0-30V / 0-5A",
    category: "Alimentación",
    condition: "good",
    location: "Estante B-2",
    requiresApproval: false,
  },
  {
    toolId: "GEN_001",
    prefix: "GEN",
    name: "Generador de Funciones",
    description: "Señales sen/cuad/tri hasta 10 MHz",
    category: "Medición",
    condition: "good",
    location: "Estante A-3",
    requiresApproval: true,
  },
] as const;

type ToolId = (typeof TOOLS)[number]["toolId"];

const INVENTORY_BY_TOOL: Record<
  ToolId,
  {
    totalQuantity: number;
    availableQuantity: number;
    borrowedQuantity: number;
    maintenanceQuantity: number;
    lostQuantity: number;
    status: string;
  }
> = {
  MUL_001: {
    totalQuantity: 1,
    availableQuantity: 0,
    borrowedQuantity: 1,
    maintenanceQuantity: 0,
    lostQuantity: 0,
    status: "borrowed",
  },
  OSC_001: {
    totalQuantity: 1,
    availableQuantity: 1,
    borrowedQuantity: 0,
    maintenanceQuantity: 0,
    lostQuantity: 0,
    status: "available",
  },
  SOL_001: {
    totalQuantity: 1,
    availableQuantity: 0,
    borrowedQuantity: 1,
    maintenanceQuantity: 0,
    lostQuantity: 0,
    status: "borrowed",
  },
  FUE_001: {
    totalQuantity: 1,
    availableQuantity: 0,
    borrowedQuantity: 0,
    maintenanceQuantity: 1,
    lostQuantity: 0,
    status: "maintenance",
  },
  GEN_001: {
    totalQuantity: 1,
    availableQuantity: 1,
    borrowedQuantity: 0,
    maintenanceQuantity: 0,
    lostQuantity: 0,
    status: "available",
  },
};

async function ensureLoanRules() {
  for (const r of LOAN_RULES) {
    const existing = await prisma.loanRule.findFirst({
      where: { minDays: r.minDays, maxDays: r.maxDays },
    });
    if (!existing) {
      await prisma.loanRule.create({ data: { ...r } });
    }
  }
}

async function upsertUsers() {
  for (const u of USERS) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ cardKey: u.cardKey }, { auth0Sub: u.auth0Sub }],
      },
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          auth0Sub: u.auth0Sub,
          cardKey: u.cardKey,
          name: u.name,
          email: u.email,
          role: u.role,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          auth0Sub: u.auth0Sub,
          cardKey: u.cardKey,
          name: u.name,
          email: u.email,
          role: u.role,
          isBanned: false,
        },
      });
    }
  }
}

async function upsertCategories() {
  for (const c of CATEGORIES) {
    await prisma.toolCategory.upsert({
      where: { name: c.name },
      create: { name: c.name, description: c.description },
      update: { description: c.description },
    });
  }
}

async function upsertLocations() {
  for (const l of LOCATIONS) {
    await prisma.toolLocation.upsert({
      where: { name: l.name },
      create: { name: l.name, locationType: l.locationType, area: l.area },
      update: { locationType: l.locationType, area: l.area },
    });
  }
}

async function main() {
  console.log("Seeding database (Prisma)…");

  await ensureLoanRules();
  await upsertUsers();
  await upsertCategories();
  await upsertLocations();

  const toolRows: Record<ToolId, { id: number; toolId: string }> = {
    MUL_001: { id: 0, toolId: "MUL_001" },
    OSC_001: { id: 0, toolId: "OSC_001" },
    SOL_001: { id: 0, toolId: "SOL_001" },
    FUE_001: { id: 0, toolId: "FUE_001" },
    GEN_001: { id: 0, toolId: "GEN_001" },
  };

  for (const t of TOOLS) {
    const created = await prisma.tool.upsert({
      where: { toolId: t.toolId },
      create: { ...t, qrCode: t.toolId },
      update: {
        name: t.name,
        description: t.description,
        category: t.category,
        condition: t.condition,
        location: t.location,
        requiresApproval: t.requiresApproval,
        prefix: t.prefix,
        qrCode: t.toolId,
      },
    });
    toolRows[t.toolId].id = created.id;

    const inv = INVENTORY_BY_TOOL[t.toolId];
    await prisma.inventory.upsert({
      where: { toolId: created.id },
      create: { toolId: created.id, ...inv },
      update: { ...inv },
    });
  }

  const userByCard = (card: string) =>
    prisma.user.findFirstOrThrow({ where: { cardKey: card } });
  const now = new Date();
  const tmrw = addDays(now, 1);
  const d3 = addDays(now, 3);
  const d5ago = subDays(now, 5);
  const d7ago = subDays(now, 7);
  const d8ago = subDays(now, 8);
  const d10ago = subDays(now, 10);

  const u1 = await userByCard("KEY_000001");
  const u2 = await userByCard("KEY_000002");
  const u3 = await userByCard("KEY_000003");
  const admin = await userByCard("KEY_900001");

  const mulId = toolRows.MUL_001.id;
  const oscId = toolRows.OSC_001.id;
  const solId = toolRows.SOL_001.id;

  const LOAN_SEEDS: Array<{
    key: string;
    toolId: number;
    studentId: number;
    borrowDate: Date;
    expected: Date;
    actual: Date | null;
    status: string;
    condition: string;
  }> = [
    {
      key: "seed-loan-001",
      toolId: mulId,
      studentId: u1.id,
      borrowDate: now,
      expected: tmrw,
      actual: null,
      status: "active",
      condition: "good",
    },
    {
      key: "seed-loan-002",
      toolId: oscId,
      studentId: u2.id,
      borrowDate: now,
      expected: d3,
      actual: null,
      status: "requested",
      condition: "excellent",
    },
    {
      key: "seed-loan-003",
      toolId: solId,
      studentId: u3.id,
      borrowDate: d10ago,
      expected: d7ago,
      actual: d7ago,
      status: "returned",
      condition: "fair",
    },
    {
      key: "seed-loan-004",
      toolId: solId,
      studentId: u1.id,
      borrowDate: d8ago,
      expected: d5ago,
      actual: null,
      status: "overdue",
      condition: "good",
    },
  ];

  for (const l of LOAN_SEEDS) {
    await prisma.loan.upsert({
      where: { idempotencyKey: l.key },
      create: {
        idempotencyKey: l.key,
        toolId: l.toolId,
        studentId: l.studentId,
        borrowDate: l.borrowDate,
        expectedReturnDate: l.expected,
        actualReturnDate: l.actual,
        status: l.status,
        conditionOnBorrow: l.condition,
      },
      update: {
        toolId: l.toolId,
        studentId: l.studentId,
        borrowDate: l.borrowDate,
        expectedReturnDate: l.expected,
        actualReturnDate: l.actual,
        status: l.status,
        conditionOnBorrow: l.condition,
      },
    });
  }

  const loan4 = await prisma.loan.findUniqueOrThrow({
    where: { idempotencyKey: "seed-loan-004" },
  });

  const s1 = await prisma.sanction.findFirst({
    where: { description: "Devolución pendiente con 5 días de atraso en SOL_001." },
  });
  if (!s1) {
    await prisma.sanction.create({
      data: {
        studentId: u1.id,
        loanId: loan4.id,
        sanctionType: "overdue",
        daysOverdue: 5,
        description: "Devolución pendiente con 5 días de atraso en SOL_001.",
        status: "active",
        isPermanent: false,
        startsAt: subDays(now, 2),
        endsAt: addDays(now, 5),
        appealMessage:
          "Si necesitas esta herramienta para práctica, solicita apelación en administración.",
      },
    });
  }

  const s2 = await prisma.sanction.findFirst({
    where: { description: "Uso indebido del laboratorio. Bloqueo permanente." },
  });
  if (!s2) {
    await prisma.sanction.create({
      data: {
        studentId: u2.id,
        loanId: null,
        sanctionType: "other",
        daysOverdue: 0,
        description: "Uso indebido del laboratorio. Bloqueo permanente.",
        status: "active",
        isPermanent: true,
        startsAt: subDays(now, 10),
        endsAt: null,
        appealMessage:
          "Debes conversar con administración para apelar este bloqueo.",
      },
    });
  }

  const auditRows: Array<{
    action: string;
    idempotency: string;
    toolCode: ToolId;
    details: string;
  }> = [
    {
      action: "LOAN_CREATED",
      idempotency: "seed-loan-001",
      toolCode: "MUL_001",
      details: '{"seed":"seed-audit-001","note":"Préstamo MUL_001 creado por admin dev"}',
    },
    {
      action: "LOAN_REQUESTED",
      idempotency: "seed-loan-002",
      toolCode: "OSC_001",
      details: '{"seed":"seed-audit-004","note":"Solicitud OSC_001 pendiente de aprobación"}',
    },
    {
      action: "LOAN_CREATED",
      idempotency: "seed-loan-004",
      toolCode: "SOL_001",
      details: '{"seed":"seed-audit-002","note":"Préstamo SOL_001 creado por admin dev"}',
    },
    {
      action: "LOAN_OVERDUE",
      idempotency: "seed-loan-004",
      toolCode: "SOL_001",
      details: '{"seed":"seed-audit-003","daysOverdue":5,"note":"Marcado como vencido por job automático"}',
    },
  ];

  for (const a of auditRows) {
    const exists = await prisma.auditLog.findFirst({
      where: { details: a.details },
    });
    if (exists) continue;
    const loan = await prisma.loan.findUniqueOrThrow({
      where: { idempotencyKey: a.idempotency },
    });
    const tool = toolRows[a.toolCode];
    await prisma.auditLog.create({
      data: {
        action: a.action,
        entityType: "Loan",
        entityId: loan.id,
        userId: admin.id,
        toolId: tool.id,
        details: a.details,
      },
    });
  }

  console.log("Seed complete (users, tools+inventory, loans, sanctions, audit).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
