import { prisma } from "@/lib/prisma";
import { normalizeCardKey, isValidCardKey } from "@/lib/utils";
import { getBlockingSanctionForStudent } from "@/services/sanction.service";
import { notifyLoanDeniedByEmail } from "@/services/loan-notification.service";
import { Prisma } from "@prisma/client";

type ToolCondition = "excellent" | "good" | "fair" | "poor";
type LoanStatus =
  | "requested"
  | "approved"
  | "denied"
  | "cancelled"
  | "active"
  | "returned"
  | "overdue"
  | "lost";

export type LoanOrReturnResult =
  | { action: "borrowed"; loanId: number; toolName: string; studentName: string; expectedReturnDate: Date }
  | { action: "requested"; loanId: number; toolName: string; studentName: string; message: string }
  | { action: "returned"; loanId: number; toolName: string; studentName: string }
  | { action: "conflict"; message: string; borrowerName: string | null };

const DEFAULT_LOAN_DAYS = 7;

export class LoanBlockedError extends Error {
  details: {
    reason: string;
    isPermanent: boolean;
    endsAt: Date | null;
    startsAt: Date | null;
    appealMessage: string;
  };

  constructor(details: LoanBlockedError["details"]) {
    super(details.reason);
    this.name = "LoanBlockedError";
    this.details = details;
  }
}

export async function loanOrReturn(
  toolPayload: string,
  rawCardKey: string,
  opts?: {
    conditionOnBorrow?: ToolCondition;
    conditionOnReturn?: ToolCondition;
    notes?: string;
    idempotencyKey?: string;
  }
): Promise<LoanOrReturnResult> {
  const cardKey = normalizeCardKey(rawCardKey);

  if (!isValidCardKey(cardKey)) {
    throw new Error(`Formato de carné inválido. Se esperaba KEY_XXXXXX, se recibió: ${cardKey}`);
  }

  // Idempotency check
  if (opts?.idempotencyKey) {
    const existing = await prisma.loan.findUnique({
      where: { idempotencyKey: opts.idempotencyKey },
      include: { tool: true, student: true },
    });
    if (existing) {
      if (existing.status === "returned") {
        return {
          action: "returned",
          loanId: existing.id,
          toolName: existing.tool.name,
          studentName: existing.student.name ?? cardKey,
        };
      }
      if (existing.status === "requested") {
        return {
          action: "requested",
          loanId: existing.id,
          toolName: existing.tool.name,
          studentName: existing.student.name ?? cardKey,
          message: "Solicitud enviada. Un administrador debe aprobar el préstamo.",
        };
      }
      return {
        action: "borrowed",
        loanId: existing.id,
        toolName: existing.tool.name,
        studentName: existing.student.name ?? cardKey,
        expectedReturnDate: existing.expectedReturnDate,
      };
    }
  }

  // Resolve tool — payload is the toolId code (e.g. MAR_001)
  const tool = await prisma.tool.findUnique({
    where: { toolId: toolPayload.trim().toUpperCase() },
    include: { inventory: true },
  });

  if (!tool) {
    throw new Error(`Herramienta no encontrada: ${toolPayload}`);
  }

  // Resolve student
  const student = await prisma.user.findUnique({ where: { cardKey } });

  if (!student) {
    throw new Error(`Carné no registrado: ${cardKey}. Contacta al encargado del laboratorio.`);
  }

  // Check for legacy manual block from user flags.
  if (student.isBanned) {
    throw new LoanBlockedError({
      reason: student.banReason ?? "Acceso bloqueado por administración.",
      isPermanent: true,
      endsAt: null,
      startsAt: null,
      appealMessage: "Puedes apelar este bloqueo con administración.",
    });
  }

  // Check sanction-driven blocks (temporary or permanent).
  const blockingSanction = await getBlockingSanctionForStudent(student.id);
  if (blockingSanction) {
    throw new LoanBlockedError({
      reason: blockingSanction.description ?? "Tienes una sanción activa.",
      isPermanent: blockingSanction.isPermanent,
      startsAt: blockingSanction.startsAt,
      endsAt: blockingSanction.endsAt,
      appealMessage:
        blockingSanction.appealMessage ??
        "Puedes apelar esta sanción con el equipo administrativo del laboratorio.",
    });
  }

  // Find active loan for this tool
  const activeLoan = await prisma.loan.findFirst({
    where: { toolId: tool.id, status: { in: ["active", "approved", "overdue"] } },
    include: { student: true },
  });

  const pendingLoan = await prisma.loan.findFirst({
    where: { toolId: tool.id, status: "requested" },
    include: { student: true },
  });

  if (!activeLoan) {
    // ── BORROW FLOW ──────────────────────────────────────────────────────────
    if (pendingLoan) {
      return {
        action: "conflict",
        message: `La herramienta "${tool.name}" ya tiene una solicitud pendiente de aprobación.`,
        borrowerName: pendingLoan.student.name,
      };
    }

    if (!tool.inventory || tool.inventory.availableQuantity < 1) {
      throw new Error(`La herramienta "${tool.name}" no está disponible en este momento.`);
    }

    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + DEFAULT_LOAN_DAYS);

    const result = await prisma.$transaction(async (tx) => {
      const initialStatus: LoanStatus = tool.requiresApproval ? "requested" : "active";
      const loan = await tx.loan.create({
        data: {
          toolId: tool.id,
          studentId: student.id,
          borrowDate: new Date(),
          expectedReturnDate,
          status: initialStatus,
          conditionOnBorrow: opts?.conditionOnBorrow ?? "good",
          notes: opts?.notes ?? null,
          idempotencyKey: opts?.idempotencyKey ?? null,
        },
      });

      if (!tool.requiresApproval) {
        await tx.inventory.update({
          where: { toolId: tool.id },
          data: {
            availableQuantity: { decrement: 1 },
            borrowedQuantity: { increment: 1 },
            status: "borrowed",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: tool.requiresApproval ? "LOAN_REQUESTED" : "BORROW",
          entityType: "LOAN",
          entityId: loan.id,
          userId: student.id,
          toolId: tool.id,
          details: JSON.stringify({
            loanId: loan.id,
            studentId: student.id,
            cardKey,
            toolId: tool.toolId,
            expectedReturnDate,
            requiresApproval: tool.requiresApproval,
          }),
        },
      });

      return loan;
    });

    if (tool.requiresApproval) {
      return {
        action: "requested",
        loanId: result.id,
        toolName: tool.name,
        studentName: student.name ?? cardKey,
        message: "Solicitud enviada. Un administrador debe aprobar el préstamo.",
      };
    }

    return {
      action: "borrowed",
      loanId: result.id,
      toolName: tool.name,
      studentName: student.name ?? cardKey,
      expectedReturnDate,
    };
  }

  if (activeLoan.studentId !== student.id) {
    // ── CONFLICT: another student has the tool ────────────────────────────────
    return {
      action: "conflict",
      message: `La herramienta "${tool.name}" ya está prestada a otro estudiante.`,
      borrowerName: activeLoan.student.name,
    };
  }

  // ── RETURN FLOW ───────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: activeLoan.id },
      data: {
        status: "returned",
        actualReturnDate: new Date(),
        conditionOnReturn: opts?.conditionOnReturn ?? "good",
        notes: opts?.notes ?? activeLoan.notes,
      },
    });

    await tx.inventory.update({
      where: { toolId: tool.id },
      data: {
        availableQuantity: { increment: 1 },
        borrowedQuantity: { decrement: 1 },
        status: "available",
      },
    });

    await tx.auditLog.create({
      data: {
        action: "RETURN",
        entityType: "LOAN",
        entityId: activeLoan.id,
        userId: student.id,
        toolId: tool.id,
        details: JSON.stringify({
          loanId: activeLoan.id,
          studentId: student.id,
          cardKey,
          toolId: tool.toolId,
          returnedAt: new Date(),
        }),
      },
    });
  });

  return {
    action: "returned",
    loanId: activeLoan.id,
    toolName: tool.name,
    studentName: student.name ?? cardKey,
  };
}

export async function getActiveLoans() {
  return prisma.loan.findMany({
    where: { status: { in: ["active", "approved"] } },
    include: {
      tool: true,
      student: { select: { id: true, name: true, cardKey: true, email: true } },
    },
    orderBy: { expectedReturnDate: "asc" },
  });
}

export async function getOverdueLoans() {
  return prisma.loan.findMany({
    where: {
      status: "active",
      expectedReturnDate: { lt: new Date() },
    },
    include: {
      tool: true,
      student: { select: { id: true, name: true, cardKey: true, email: true } },
    },
    orderBy: { expectedReturnDate: "asc" },
  });
}

export async function getRequestedLoans() {
  return prisma.loan.findMany({
    where: { status: "requested" },
    include: {
      tool: true,
      student: { select: { id: true, name: true, cardKey: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getLoansByStudent(studentId: number) {
  return prisma.loan.findMany({
    where: { studentId },
    include: { tool: true },
    orderBy: { borrowDate: "desc" },
  });
}

export async function adminReturnLoan(
  loanId: number,
  actorId: number,
  data: { conditionOnReturn?: ToolCondition; notes?: string }
) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { tool: true },
  });

  if (!["active", "approved", "overdue"].includes(loan.status)) {
    throw new Error("Solo se pueden devolver préstamos activos/aprobados/vencidos.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "returned",
        actualReturnDate: new Date(),
        conditionOnReturn: data.conditionOnReturn ?? "good",
        notes: data.notes ?? loan.notes,
      },
    });

    await tx.inventory.update({
      where: { toolId: loan.toolId },
      data: {
        availableQuantity: { increment: 1 },
        borrowedQuantity: { decrement: 1 },
        status: "available",
      },
    });

    await tx.auditLog.create({
      data: {
        action: "ADMIN_RETURN",
        entityType: "LOAN",
        entityId: loanId,
        userId: actorId,
        toolId: loan.toolId,
        details: JSON.stringify({ loanId, actorId, ...data }),
      },
    });
  });
}

export async function approveLoan(loanId: number, actorId: number) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { tool: true },
  });

  if (loan.status !== "requested") {
    throw new Error("Solo se pueden aprobar préstamos en estado requested.");
  }

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({ where: { toolId: loan.toolId } });
    if (!inventory || inventory.availableQuantity < 1) {
      throw new Error("La herramienta no está disponible para aprobación.");
    }

    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "approved",
        borrowDate: new Date(),
      },
    });

    await tx.inventory.update({
      where: { toolId: loan.toolId },
      data: {
        availableQuantity: { decrement: 1 },
        borrowedQuantity: { increment: 1 },
        status: "borrowed",
      },
    });

    await tx.auditLog.create({
      data: {
        action: "LOAN_APPROVED",
        entityType: "LOAN",
        entityId: loanId,
        userId: actorId,
        toolId: loan.toolId,
        details: JSON.stringify({ loanId, actorId }),
      },
    });
  });
}

export async function denyLoan(loanId: number, actorId: number, reason: string) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { tool: true, student: true },
  });

  if (loan.status !== "requested") {
    throw new Error("Solo se pueden denegar préstamos en estado requested.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "denied",
        notes: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "LOAN_DENIED",
        entityType: "LOAN",
        entityId: loanId,
        userId: actorId,
        toolId: loan.toolId,
        details: JSON.stringify({ loanId, actorId, reason }),
      },
    });
  });

  await notifyLoanDeniedByEmail({
    loanId,
    studentId: loan.studentId,
    studentName: loan.student.name ?? loan.student.cardKey ?? `student-${loan.studentId}`,
    studentEmail: loan.student.email,
    toolName: loan.tool.name,
    toolCode: loan.tool.toolId,
    deniedReason: reason,
  });
}

export async function cancelLoan(loanId: number, actorId: number, reason?: string) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
  });

  await prisma.$transaction(async (tx) => {
    const updates: Prisma.LoanUpdateInput = {
      status: "cancelled",
      notes: reason ?? loan.notes,
    };
    await tx.loan.update({ where: { id: loanId }, data: updates });

    if (loan.status === "active" || loan.status === "approved" || loan.status === "overdue") {
      await tx.inventory.update({
        where: { toolId: loan.toolId },
        data: {
          availableQuantity: { increment: 1 },
          borrowedQuantity: { decrement: 1 },
          status: "available",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "LOAN_CANCELLED",
        entityType: "LOAN",
        entityId: loanId,
        userId: actorId,
        toolId: loan.toolId,
        details: JSON.stringify({ loanId, actorId, reason }),
      },
    });
  });
}

export async function deleteLoan(loanId: number, actorId: number) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
  });

  await prisma.$transaction(async (tx) => {
    if (loan.status === "active" || loan.status === "approved" || loan.status === "overdue") {
      await tx.inventory.update({
        where: { toolId: loan.toolId },
        data: {
          availableQuantity: { increment: 1 },
          borrowedQuantity: { decrement: 1 },
          status: "available",
        },
      });
    }

    await tx.loan.delete({ where: { id: loanId } });
    await tx.auditLog.create({
      data: {
        action: "DELETE_LOAN",
        entityType: "LOAN",
        entityId: loanId,
        userId: actorId,
        toolId: loan.toolId,
        details: JSON.stringify({ deletedLoanId: loanId }),
      },
    });
  });
}
