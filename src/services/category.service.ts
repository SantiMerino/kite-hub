import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PatchCategoryInput = {
  name?: string;
  description?: string | null;
  color?: string | null;
};

export async function getAllCategories() {
  return prisma.toolCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string, description?: string, color?: string | null) {
  return prisma.toolCategory.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      color: color ?? null,
    },
  });
}

export async function patchCategory(id: number, data: PatchCategoryInput) {
  const existing = await prisma.toolCategory.findUniqueOrThrow({ where: { id } });

  const updateData: Prisma.ToolCategoryUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) {
    updateData.description =
      data.description === null ? null : data.description.trim() || null;
  }
  if (data.color !== undefined) updateData.color = data.color;

  if (Object.keys(updateData).length === 0) {
    return existing;
  }

  const nextName = data.name !== undefined ? data.name.trim() : existing.name;

  if (nextName !== existing.name) {
    await prisma.$transaction([
      prisma.tool.updateMany({
        where: { category: existing.name },
        data: { category: nextName },
      }),
      prisma.toolCategory.update({ where: { id }, data: updateData }),
    ]);
    return prisma.toolCategory.findUniqueOrThrow({ where: { id } });
  }

  return prisma.toolCategory.update({ where: { id }, data: updateData });
}

export async function deleteCategory(id: number) {
  const cat = await prisma.toolCategory.findUniqueOrThrow({ where: { id } });
  const toolCount = await prisma.tool.count({ where: { category: cat.name } });
  if (toolCount > 0) {
    throw new Error(
      `No se puede eliminar la categoría "${cat.name}" porque ${toolCount} herramienta(s) la utilizan.`
    );
  }
  return prisma.toolCategory.delete({ where: { id } });
}
