import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAdminEmail, requestAdminOtp } from "@/lib/admin-otp";

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(320)
    .email("Correo inválido."),
});

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
    const result = await requestAdminOtp(email);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Si tu correo está autorizado, recibirás un código en unos segundos.",
      maskedEmail: result.maskedEmail,
      resendAvailableAt: result.resendAvailableAt,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 500 },
    );
  }
}
