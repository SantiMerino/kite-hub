import { prisma } from "@/lib/prisma";
import { resend, FROM_EMAIL, buildOverdueEmailHtml } from "@/lib/resend";
import { daysOverdue } from "@/lib/utils";

/**
 * Processes all active overdue loans:
 * 1. Marks loans as overdue
 * 2. Creates alerts if not already present
 * 3. Enqueues email outbox entries for staff
 * 4. Creates in-app staff notifications
 */
export async function processOverdueLoans(): Promise<{ processed: number; newAlerts: number }> {
  const now = new Date();

    const overdueLoans = await prisma.loan.findMany({
    where: {
      status: { in: ["active", "approved", "overdue"] },
      expectedReturnDate: { lt: now },
    },
    include: {
      tool: true,
      student: true,
    },
  });

  let newAlerts = 0;

  for (const loan of overdueLoans) {
    const days = daysOverdue(loan.expectedReturnDate);

    // Mark loan as overdue
    if (loan.status !== "overdue") {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "overdue" },
      });
    }

    // Check for existing pending alert to avoid duplicates
    const existingAlert = await prisma.alert.findFirst({
      where: {
        loanId: loan.id,
        status: "pending",
        alertType: "overdue",
      },
    });

    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          loanId: loan.id,
          studentId: loan.studentId,
          alertType: "overdue",
          daysOverdue: days,
          status: "pending",
        },
      });
      newAlerts++;

      // Enqueue email for staff
      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ["staff", "admin"] }, email: { not: null } },
        select: { id: true, email: true },
      });

      for (const staff of staffUsers) {
        if (!staff.email) continue;
        await prisma.emailOutbox.create({
          data: {
            userId: staff.id,
            toEmail: staff.email,
            subject: `⚠️ Atraso ${days}d — ${loan.student.name ?? loan.student.cardKey} / ${loan.tool.name}`,
            htmlBody: buildOverdueEmailHtml({
              toEmail: staff.email,
              studentName: loan.student.name ?? loan.student.cardKey ?? "Estudiante",
              toolName: loan.tool.name,
              daysOverdue: days,
              borrowDate: loan.borrowDate,
              expectedReturnDate: loan.expectedReturnDate,
            }),
            status: "pending",
          },
        });

        // In-app notification
        await prisma.staffNotification.create({
          data: {
            userId: staff.id,
            title: `Atraso: ${loan.tool.name}`,
            body: `${loan.student.name ?? loan.student.cardKey} lleva ${days} día(s) de atraso.`,
            linkHref: `/admin/loans`,
            status: "unread",
          },
        });
      }
    }
  }

  return { processed: overdueLoans.length, newAlerts };
}

/**
 * Drains the email outbox — sends pending emails via Resend.
 * Call this from the same job or a separate cron.
 */
export async function drainEmailOutbox(limit = 50): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.emailOutbox.findMany({
    where: { status: "pending" },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: item.toEmail,
        subject: item.subject,
        html: item.htmlBody,
      });

      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: { status: "sent", sentAt: new Date(), attempts: { increment: 1 } },
      });

      sent++;
    } catch (err) {
      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: {
          attempts: { increment: 1 },
          lastError: String(err),
          status: item.attempts >= 3 ? "failed" : "pending",
        },
      });
      failed++;
    }
  }

  return { sent, failed };
}

export async function getStaffNotifications(userId: number) {
  return prisma.staffNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: number, userId: number) {
  return prisma.staffNotification.updateMany({
    where: { id, userId },
    data: { status: "read", readAt: new Date() },
  });
}
