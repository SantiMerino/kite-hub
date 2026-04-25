import { prisma } from "@/lib/prisma";
import { normalizeCardKey, isValidCardKey } from "@/lib/utils";

type ToolCondition = "excellent" | "good" | "fair" | "poor";
type LoanStatus = "active" | "returned" | "overdue" | "lost";

export type LoanOrReturnResult =
  | { action: "borrowed"; loanId: number; toolName: string; studentName: string; expectedReturnDate: Date }
  | { action: "returned"; loanId: number; toolName: string; studentName: string }
  | { action: "conflict"; message: string; borrowerName: string | null };

const DEFAULT_LOAN_DAYS = 7;

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

  if (student.isBanned) {
    throw new Error(`El estudiante tiene acceso bloqueado. Razón: ${student.banReason ?? "Contacta al encargado."}`);
  }

  // Check for active sanctions that block borrowing
  const blockingSanction = await prisma.sanction.findFirst({
    where: {
      studentId: student.id,
      status: "active",
    },
    include: {
      loan: {
        include: {
          tool: true,
        },
      },
    },
  });

  // Find active loan for this tool
  const activeLoan = await prisma.loan.findFirst({
    where: { toolId: tool.id, status: "active" },
    include: { student: true },
  });

  if (!activeLoan) {
    // ── BORROW FLOW ──────────────────────────────────────────────────────────
    if (blockingSanction) {
      throw new Error(
        `No puedes prestar: tienes una sanción activa. Contacta al encargado.`
      );
    }

    if (!tool.inventory || tool.inventory.availableQuantity < 1) {
      throw new Error(`La herramienta "${tool.name}" no está disponible en este momento.`);
    }

    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + DEFAULT_LOAN_DAYS);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          toolId: tool.id,
          studentId: student.id,
          borrowDate: new Date(),
          expectedReturnDate,
          status: "active",
          conditionOnBorrow: opts?.conditionOnBorrow ?? "good",
          notes: opts?.notes ?? null,
          idempotencyKey: opts?.idempotencyKey ?? null,
        },
      });

      await tx.inventory.update({
        where: { toolId: tool.id },
        data: {
          availableQuantity: { decrement: 1 },
          borrowedQuantity: { increment: 1 },
          status: "borrowed",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "BORROW",
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
          }),
        },
      });

      return loan;
    });

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
    where: { status: "active" },
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
