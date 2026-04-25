import { auth0 } from "@/lib/auth0";
import { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  return await auth0.middleware(req);
}

export const config = {
  matcher: [
    // Auth0 SDK routes (login, logout, callback, etc.)
    "/api/auth/:path*",
    // Protect all admin panel routes (/admin/dashboard, /admin/loans, etc.)
    "/admin/:path*",
  ],
};
