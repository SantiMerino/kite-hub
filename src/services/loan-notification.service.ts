import {
  buildLoanApprovedEmailHtml,
  buildLoanRequestedEmailHtml,
  FROM_EMAIL,
  resend,
} from "@/lib/resend";
import { prisma } from "@/lib/prisma";

type LoanDeniedNotificationPayload = {
  loanId: number;
  studentId: number;
  studentName: string;
  studentEmail: string | null;
  toolName: string;
  toolCode: string;
  deniedReason: string;
};

export async function notifyLoanDeniedByEmail(
  payload: LoanDeniedNotificationPayload
): Promise<{ queued: false; reason: string; payload: LoanDeniedNotificationPayload }> {
  return {
    queued: false,
    reason: "Email sending is intentionally disabled in this phase.",
    payload,
  };
}

type LoanApprovalNotificationPayload = {
  loanId: number;
  studentName: string;
  studentCardKey: string;
  studentEmail: string | null;
  toolName: string;
  toolCode: string;
  toolCondition: string;
  inventoryStatus: string;
  expectedReturnDate: Date;
};

function getAuditUrlByCardKey(cardKey: string) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/admin/audit/${encodeURIComponent(cardKey)}`;
}

export async function notifyLoanRequestedByEmail(payload: LoanApprovalNotificationPayload) {
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["staff", "admin"] }, email: { not: null } },
    select: { email: true },
  });

  const uniqueEmails = Array.from(new Set(adminUsers.map((u) => u.email).filter(Boolean))) as string[];
  if (uniqueEmails.length === 0) return { notified: 0 };

  const html = buildLoanRequestedEmailHtml({
    studentName: payload.studentName,
    studentCardKey: payload.studentCardKey,
    toolName: payload.toolName,
    toolCode: payload.toolCode,
    toolCondition: payload.toolCondition,
    inventoryStatus: payload.inventoryStatus,
    expectedReturnDate: payload.expectedReturnDate,
    auditUrl: getAuditUrlByCardKey(payload.studentCardKey),
  });

  for (const email of uniqueEmails) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Solicitud pendiente: ${payload.studentCardKey} / ${payload.toolName}`,
        html,
      });
    } catch (error) {
      console.error("No se pudo enviar correo de solicitud pendiente", error);
    }
  }

  return { notified: uniqueEmails.length };
}

export async function notifyLoanApprovedByEmail(payload: LoanApprovalNotificationPayload) {
  const auditUrl = getAuditUrlByCardKey(payload.studentCardKey);
  const html = buildLoanApprovedEmailHtml({
    studentName: payload.studentName,
    studentCardKey: payload.studentCardKey,
    toolName: payload.toolName,
    toolCode: payload.toolCode,
    toolCondition: payload.toolCondition,
    inventoryStatus: payload.inventoryStatus,
    expectedReturnDate: payload.expectedReturnDate,
    auditUrl,
  });

  const targets = new Set<string>();
  if (payload.studentEmail) targets.add(payload.studentEmail);

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["staff", "admin"] }, email: { not: null } },
    select: { email: true },
  });
  for (const user of adminUsers) {
    if (user.email) targets.add(user.email);
  }

  const uniqueEmails = Array.from(targets);
  if (uniqueEmails.length === 0) return { notified: 0, auditUrl };

  for (const email of uniqueEmails) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Prestamo aprobado: ${payload.studentCardKey} / ${payload.toolName}`,
        html,
      });
    } catch (error) {
      console.error("No se pudo enviar correo de aprobacion", error);
    }
  }

  return { notified: uniqueEmails.length, auditUrl };
}
