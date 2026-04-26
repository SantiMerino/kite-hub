import { prisma } from "@/lib/prisma";

export async function getAllLocations() {
  return prisma.toolLocation.findMany({ orderBy: [{ area: "asc" }, { name: "asc" }] });
}

export async function createLocation(data: {
  name: string;
  locationType: string;
  area: string;
}) {
  return prisma.toolLocation.create({
    data: {
      name: data.name.trim(),
      locationType: data.locationType.trim() || "estante",
      area: data.area.trim(),
    },
  });
}

export async function updateLocation(
  id: number,
  data: { name?: string; locationType?: string; area?: string }
) {
  return prisma.toolLocation.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.locationType !== undefined && { locationType: data.locationType.trim() }),
      ...(data.area !== undefined && { area: data.area.trim() }),
    },
  });
}

export async function deleteLocation(id: number) {
  const loc = await prisma.toolLocation.findUniqueOrThrow({ where: { id } });
  const toolCount = await prisma.tool.count({ where: { location: loc.name } });
  if (toolCount > 0) {
    throw new Error(
      `No se puede eliminar la ubicación "${loc.name}" porque ${toolCount} herramienta(s) la utilizan.`
    );
  }
  return prisma.toolLocation.delete({ where: { id } });
}
