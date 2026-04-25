import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // Default loan rules (check first to avoid duplicates)
  const existingRules = await prisma.loanRule.count();
  if (existingRules === 0) await prisma.loanRule.createMany({
    data: [
      { minDays: 1, maxDays: 3, sanctionDescription: "Advertencia por atraso leve", canBorrow: true },
      { minDays: 4, maxDays: 7, sanctionDescription: "Suspensión temporal 1 semana", canBorrow: false },
      { minDays: 8, maxDays: null, sanctionDescription: "Suspensión indefinida, revisión por administración", canBorrow: false },
    ],
  });

  // Seed a few tools for demo
  const tools = [
    { toolId: "MAR_001", name: "Martillo de bola 16oz", category: "Herramientas Manuales", location: "Estante A-1", condition: "good" },
    { toolId: "TAL_001", name: "Taladro percutor 1/2\"", category: "Herramientas Eléctricas", location: "Estante B-2", condition: "excellent" },
    { toolId: "MUL_001", name: "Multímetro digital", category: "Instrumentos", location: "Estante C-1", condition: "good" },
    { toolId: "OSC_001", name: "Osciloscopio 100MHz", category: "Instrumentos", location: "Estante C-2", condition: "good" },
    { toolId: "SOL_001", name: "Cautín de punta fina", category: "Soldadura", location: "Estante D-1", condition: "fair" },
  ];

  for (const tool of tools) {
    const created = await prisma.tool.upsert({
      where: { toolId: tool.toolId },
      update: {},
      create: { ...tool, qrCode: tool.toolId },
    });

    await prisma.inventory.upsert({
      where: { toolId: created.id },
      update: {},
      create: {
        toolId: created.id,
        totalQuantity: 1,
        availableQuantity: 1,
        borrowedQuantity: 0,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
