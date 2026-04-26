import { prisma } from "@/lib/prisma";

export type BlockingSanction = {
  id: number;
  description: string | null;
  isPermanent: boolean;
  startsAt: Date;
  endsAt: Date | null;
  appealMessage: string | null;
};

export async function getAllSanctions() {
  return prisma.sanction.findMany({
    include: {
      student: { select: { id: true, name: true, cardKey: true } },
      loan: { include: { tool: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSanction(
  actorId: number,
  data: {
    studentId: number;
    loanId?: number;
    sanctionType: "overdue" | "damage" | "loss" | "other";
    daysOverdue?: number;
    description?: string;
    startsAt?: Date;
    endsAt?: Date | null;
    isPermanent?: boolean;
    appealMessage?: string;
  }
) {
  const sanction = await prisma.sanction.create({
    data: {
      studentId: data.studentId,
      loanId: data.loanId ?? null,
      sanctionType: data.sanctionType,
      daysOverdue: data.daysOverdue ?? 0,
      description: data.description ?? null,
      startsAt: data.startsAt ?? new Date(),
      endsAt: data.isPermanent ? null : (data.endsAt ?? null),
      isPermanent: data.isPermanent ?? false,
      appealMessage:
        data.appealMessage ??
        "Puedes apelar esta sanción con el equipo administrativo del laboratorio.",
      status: "active",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "CREATE_SANCTION",
      entityType: "SANCTION",
      entityId: sanction.id,
      userId: actorId,
      details: JSON.stringify(data),
    },
  });

  return sanction;
}

export async function updateSanction(
  sanctionId: number,
  actorId: number,
  data: {
    status?: "active" | "resolved" | "appealed";
    description?: string;
    daysOverdue?: number;
    startsAt?: Date;
    endsAt?: Date | null;
    isPermanent?: boolean;
    appealMessage?: string;
  }
) {
  const updated = await prisma.sanction.update({
    where: { id: sanctionId },
    data: {
      status: data.status,
      description: data.description,
      daysOverdue: data.daysOverdue,
      startsAt: data.startsAt,
      endsAt: data.isPermanent ? null : data.endsAt,
      isPermanent: data.isPermanent,
      appealMessage: data.appealMessage,
      resolvedAt: data.status === "resolved" ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE_SANCTION",
      entityType: "SANCTION",
      entityId: sanctionId,
      userId: actorId,
      details: JSON.stringify(data),
    },
  });

  return updated;
}

export async function deleteSanction(sanctionId: number, actorId: number) {
  await prisma.sanction.delete({ where: { id: sanctionId } });
  await prisma.auditLog.create({
    data: {
      action: "DELETE_SANCTION",
      entityType: "SANCTION",
      entityId: sanctionId,
      userId: actorId,
      details: JSON.stringify({ deletedSanctionId: sanctionId }),
    },
  });
}

export async function getBlockingSanctionForStudent(
  studentId: number
): Promise<BlockingSanction | null> {
  const now = new Date();
  return prisma.sanction.findFirst({
    where: {
      studentId,
      status: "active",
      startsAt: { lte: now },
      OR: [
        { isPermanent: true },
        { endsAt: null },
        { endsAt: { gt: now } },
      ],
    },
    select: {
      id: true,
      description: true,
      isPermanent: true,
      startsAt: true,
      endsAt: true,
      appealMessage: true,
    },
    orderBy: [{ isPermanent: "desc" }, { createdAt: "desc" }],
  });
}
