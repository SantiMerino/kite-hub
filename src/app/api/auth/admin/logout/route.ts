import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookieOptions } from "@/lib/admin-session";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearAdminSessionCookieOptions());
  return res;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.set(clearAdminSessionCookieOptions());
  return res;
}
