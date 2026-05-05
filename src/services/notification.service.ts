import { prisma } from "@/lib/prisma";
import type { UnifiedNotificationItem } from "@/types/admin-notifications";

export type { UnifiedNotificationItem } from "@/types/admin-notifications";

function htmlToPreview(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export async function getUnifiedNotifications(
  userId: number,
  take = 40,
): Promise<UnifiedNotificationItem[]> {
  const [staff, emails] = await Promise.all([
    prisma.staffNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        linkHref: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.emailOutbox.findMany({
      where: { userId, status: "sent" },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        subject: true,
        htmlBody: true,
        toEmail: true,
        sentAt: true,
        createdAt: true,
        recipientReadAt: true,
      },
    }),
  ]);

  const staffItems: UnifiedNotificationItem[] = staff.map((n) => ({
    kind: "staff",
    id: n.id,
    title: n.title,
    body: n.body,
    linkHref: n.linkHref,
    createdAt: n.createdAt.toISOString(),
    read: n.status === "read",
  }));

  const emailItems: UnifiedNotificationItem[] = emails.map((e) => ({
    kind: "email",
    id: e.id,
    title: e.subject,
    body: htmlToPreview(e.htmlBody),
    toEmail: e.toEmail,
    createdAt: (e.sentAt ?? e.createdAt).toISOString(),
    read: e.recipientReadAt != null,
  }));

  return [...staffItems, ...emailItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, take);
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const [staffUnread, emailUnread] = await Promise.all([
    prisma.staffNotification.count({ where: { userId, status: "unread" } }),
    prisma.emailOutbox.count({
      where: { userId, status: "sent", recipientReadAt: null },
    }),
  ]);
  return staffUnread + emailUnread;
}

export async function markStaffNotificationRead(id: number, userId: number) {
  return prisma.staffNotification.updateMany({
    where: { id, userId },
    data: { status: "read", readAt: new Date() },
  });
}

export async function markEmailNotificationRead(id: number, userId: number) {
  return prisma.emailOutbox.updateMany({
    where: { id, userId, status: "sent" },
    data: { recipientReadAt: new Date() },
  });
}
