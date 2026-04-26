import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ToolCondition = "excellent" | "good" | "fair" | "poor";
type PrefixSuggestion = { prefix: string; nextToolId: string };

const TOOL_ID_PATTERN = /^([A-Z0-9]{3})_(\d{3})$/;

export class ToolPrefixConflictError extends Error {
  suggestions: PrefixSuggestion[];

  constructor(message: string, suggestions: PrefixSuggestion[]) {
    super(message);
    this.name = "ToolPrefixConflictError";
    this.suggestions = suggestions;
  }
}

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
    toolId?: string;
    prefixChoice?: string;
    name: string;
    description?: string;
    category: string;
    condition?: ToolCondition;
    location: string;
    requiresApproval?: boolean;
    qrCode?: string;
  },
  actorId: number
) {
  const candidatePrefixes = buildPrefixCandidates(data.name);
  const chosenPrefix = normalizePrefix(data.prefixChoice) ?? candidatePrefixes[0];

  if (!chosenPrefix) {
    throw new Error("No se pudo generar un prefijo para la herramienta.");
  }

  let resolvedToolId = data.toolId?.trim().toUpperCase();
  if (resolvedToolId) {
    if (!TOOL_ID_PATTERN.test(resolvedToolId)) {
      throw new Error("El identificador debe seguir el formato PREFIX_NNN (ej. MAR_001).");
    }
  } else {
    resolvedToolId = await buildNextToolId(chosenPrefix);
  }

  const tool = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.tool.findUnique({ where: { toolId: resolvedToolId } });
    if (duplicate) {
      const suggestions = await getPrefixSuggestions(data.name);
      throw new ToolPrefixConflictError(
        `El identificador ${resolvedToolId} ya existe. Elige otro prefijo sugerido.`,
        suggestions
      );
    }

    const t = await tx.tool.create({
      data: {
        toolId: resolvedToolId,
        prefix: resolvedToolId.split("_")[0] ?? chosenPrefix,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        condition: data.condition ?? "good",
        location: data.location,
        requiresApproval: data.requiresApproval ?? false,
        qrCode: data.qrCode ?? resolvedToolId,
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
        details: JSON.stringify({
          ...data,
          prefixCandidates: candidatePrefixes,
          resolvedToolId,
        }),
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

export async function getPrefixSuggestions(name: string): Promise<PrefixSuggestion[]> {
  const prefixes = buildPrefixCandidates(name).slice(0, 4);
  const suggestions = await Promise.all(
    prefixes.map(async (prefix) => ({
      prefix,
      nextToolId: await buildNextToolId(prefix),
    }))
  );
  return suggestions;
}

function normalizePrefix(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return null;
  return cleaned.slice(0, 3).padEnd(3, "X");
}

function buildPrefixCandidates(name: string): string[] {
  const words = name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  const primaryWord = words[0] ?? "TOOL";
  const compact = words.join("");
  const consonants = primaryWord.replace(/[AEIOU]/g, "");
  const fromWords = words.map((word) => word[0]).join("");
  const fromTail = `${primaryWord.slice(0, 1)}${primaryWord.slice(-2)}`;

  const raw = [
    primaryWord.slice(0, 3),
    `${primaryWord.slice(0, 1)}${consonants.slice(0, 2)}`,
    fromWords.slice(0, 3),
    fromTail,
    compact.slice(0, 3),
  ];

  return [...new Set(raw.map((item) => item.replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "X")))].filter(
    Boolean
  );
}

async function buildNextToolId(prefix: string): Promise<string> {
  const tools = await prisma.tool.findMany({
    where: { prefix },
    select: { toolId: true },
  });

  let maxSequence = 0;
  for (const tool of tools) {
    const match = tool.toolId.match(TOOL_ID_PATTERN);
    if (!match) continue;
    if (match[1] !== prefix) continue;
    const sequence = Number(match[2]);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  const next = String(maxSequence + 1).padStart(3, "0");
  return `${prefix}_${next}`;
}
