import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ToolCondition = "excellent" | "good" | "fair" | "poor";

export async function getAllTools() {
  return prisma.tool.findMany({
    include: { inventory: true },
    orderBy: { toolId: "asc" },
  });
}

export async function getToolById(id: number) {
  return prisma.tool.findUniqueOrThrow({
    where: { id },
    include: { inventory: true },
  });
}

export async function createTool(
  data: {
    toolId: string;
    name: string;
    description?: string;
    category: string;
    condition?: ToolCondition;
    location: string;
    qrCode?: string;
  },
  actorId: number
) {
  const tool = await prisma.$transaction(async (tx) => {
    const t = await tx.tool.create({
      data: {
        toolId: data.toolId.trim().toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        condition: data.condition ?? "good",
        location: data.location,
        qrCode: data.qrCode ?? data.toolId.trim().toUpperCase(),
      },
    });

    await tx.inventory.create({
      data: {
        toolId: t.id,
        totalQuantity: 1,
        availableQuantity: 1,
        borrowedQuantity: 0,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "CREATE_TOOL",
        entityType: "TOOL",
        entityId: t.id,
        userId: actorId,
        toolId: t.id,
        details: JSON.stringify(data),
      },
    });

    return t;
  });

  return tool;
}

export async function updateTool(
  id: number,
  updates: Prisma.ToolUpdateInput,
  actorId: number
) {
  const tool = await prisma.tool.update({ where: { id }, data: updates });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_TOOL",
      entityType: "TOOL",
      entityId: id,
      userId: actorId,
      toolId: id,
      details: JSON.stringify(updates),
    },
  });

  return tool;
}

export async function deleteTool(id: number, actorId: number) {
  await prisma.$transaction(async (tx) => {
    await tx.inventory.deleteMany({ where: { toolId: id } });
    await tx.tool.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE_TOOL",
        entityType: "TOOL",
        entityId: id,
        userId: actorId,
        details: JSON.stringify({ deletedToolId: id }),
      },
    });
  });
}
