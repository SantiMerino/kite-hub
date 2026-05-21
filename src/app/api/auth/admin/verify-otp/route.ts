import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminSessionCookieOptions,
  createAdminSessionToken,
} from "@/lib/admin-session";
import { normalizeAdminEmail, verifyAdminOtp } from "@/lib/admin-otp";

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(320)
    .email("Correo inválido."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
});

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.includes("://")) {
    return "/admin/dashboard";
  }
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const email = normalizeAdminEmail(parsed.data.email);
    const result = await verifyAdminOtp(email, parsed.data.code);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const token = createAdminSessionToken(result.userId);
    const res = NextResponse.json({ ok: true, returnTo });
    res.cookies.set(adminSessionCookieOptions(token));
    return res;
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar el código." },
      { status: 500 },
    );
  }
}
