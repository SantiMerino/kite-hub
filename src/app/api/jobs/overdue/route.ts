import { NextRequest, NextResponse } from "next/server";
import { processOverdueLoans, drainEmailOutbox } from "@/services/alert.service";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { processed, newAlerts } = await processOverdueLoans();
  const { sent, failed } = await drainEmailOutbox();

  return NextResponse.json({ processed, newAlerts, emailsSent: sent, emailsFailed: failed });
}
