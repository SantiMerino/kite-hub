import { prisma } from "@/lib/prisma";

export async function getAllCategories() {
  return prisma.toolCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string, description?: string) {
  return prisma.toolCategory.create({
    data: { name: name.trim(), description: description?.trim() ?? null },
  });
}

export async function updateCategory(id: number, name: string, description?: string) {
  return prisma.toolCategory.update({
    where: { id },
    data: { name: name.trim(), description: description?.trim() ?? null },
  });
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
