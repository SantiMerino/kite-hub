import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getUnifiedNotifications,
  markEmailNotificationRead,
  markStaffNotificationRead,
} from "@/services/notification.service";

const markReadSchema = z.object({
  kind: z.enum(["staff", "email"]),
  id: z.number().int().positive(),
});

export async function GET() {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const notifications = await getUnifiedNotifications(actor.id);
    return NextResponse.json(notifications);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { kind, id } = parsed.data;
    if (kind === "staff") {
      await markStaffNotificationRead(id, actor.id);
    } else {
      await markEmailNotificationRead(id, actor.id);
    }
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
