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
  payload: LoanDeniedNotificationPayload,
): Promise<{ queued: false; reason: string; payload: LoanDeniedNotificationPayload }> {
  return {
    queued: false,
    reason: "Email sending is intentionally disabled in this phase.",
    payload,
  };
}

type LoanApprovalNotificationPayload = {
  loanId: number;
  studentId: number;
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

async function recordSentEmail(args: {
  userId: number | null;
  toEmail: string;
  subject: string;
  htmlBody: string;
}) {
  await prisma.emailOutbox.create({
    data: {
      userId: args.userId,
      toEmail: args.toEmail,
      subject: args.subject,
      htmlBody: args.htmlBody,
      status: "sent",
      sentAt: new Date(),
    },
  });
}

export async function notifyLoanRequestedByEmail(payload: LoanApprovalNotificationPayload) {
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["staff", "admin"] }, email: { not: null } },
    select: { id: true, email: true },
  });

  if (adminUsers.length === 0) return { notified: 0 };

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

  const subject = `Solicitud pendiente: ${payload.studentCardKey} / ${payload.toolName}`;
  let notified = 0;

  for (const u of adminUsers) {
    if (!u.email) continue;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: u.email,
        subject,
        html,
      });
      await recordSentEmail({
        userId: u.id,
        toEmail: u.email,
        subject,
        htmlBody: html,
      });
      notified++;
    } catch (error) {
      console.error("No se pudo enviar correo de solicitud pendiente", error);
    }
  }

  return { notified };
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

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["staff", "admin"] }, email: { not: null } },
    select: { id: true, email: true },
  });

  const targets = new Map<string, number | null>();
  if (payload.studentEmail) {
    targets.set(payload.studentEmail, payload.studentId);
  }
  for (const u of adminUsers) {
    if (u.email) targets.set(u.email, u.id);
  }

  const subject = `Préstamo aprobado: ${payload.studentCardKey} / ${payload.toolName}`;
  let notified = 0;

  for (const [email, userId] of targets) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      await recordSentEmail({
        userId,
        toEmail: email,
        subject,
        htmlBody: html,
      });
      notified++;
    } catch (error) {
      console.error("No se pudo enviar correo de aprobación", error);
    }
  }

  return { notified, auditUrl };
}
