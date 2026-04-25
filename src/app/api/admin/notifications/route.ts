import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStaffNotifications, markNotificationRead } from "@/services/alert.service";

export async function GET() {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const notifications = await getStaffNotifications(actor.id);
    return NextResponse.json(notifications);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const { id } = await req.json() as { id: number };
    await markNotificationRead(id, actor.id);
    return NextResponse.json({ success: true });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
