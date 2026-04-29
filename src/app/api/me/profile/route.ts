import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const actor = await requireRole(["staff", "admin"]);

    const [activeSanctions, activeLoans] = await Promise.all([
      prisma.sanction.count({
        where: { studentId: actor.id, status: "active" },
      }),
      prisma.loan.count({
        where: { studentId: actor.id, status: { in: ["active", "overdue"] } },
      }),
    ]);

    const isBlocked = actor.isBanned || activeSanctions > 0;

    return NextResponse.json({
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
      cardKey: actor.cardKey,
      isBlocked,
      isBanned: actor.isBanned,
      banReason: actor.banReason,
      activeSanctions,
      activeLoans,
      lastSignedIn: actor.lastSignedIn,
      auditHref: actor.cardKey ? `/admin/audit/${encodeURIComponent(actor.cardKey)}` : null,
    });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
