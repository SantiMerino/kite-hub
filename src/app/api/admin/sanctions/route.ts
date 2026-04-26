import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSanction, getAllSanctions } from "@/services/sanction.service";

// Acepta `cardKey` (carné KEY_######) o `studentId` interno (no ambos).
// JSON.stringify convierte Number.NaN en null; el cliente puede enviar strings.
const createSchema = z
  .object({
  cardKey: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim().toUpperCase()),
    z.string().optional(),
  ),
  studentId: z.preprocess(
    (v) => (v === null || v === "" || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  loanId: z.preprocess(
    (v) =>
      v === null || v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))
        ? undefined
        : v,
    z.coerce.number().int().positive().optional(),
  ),
  sanctionType: z.enum(["overdue", "damage", "loss", "other"]),
  daysOverdue: z.preprocess(
    (v) => (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? 0 : v),
    z.coerce.number().int().min(0),
  ),
  description: z.string().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isPermanent: z.boolean().optional(),
  appealMessage: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.string().max(500).optional(),
  ),
})
  .superRefine((data, ctx) => {
    if (!data.cardKey && !data.studentId) {
      ctx.addIssue({
        code: "custom",
        message: "Requiere carné (KEY_ + 6 dígitos) o ID interno de usuario.",
        path: ["cardKey"],
      });
    }
    if (data.cardKey && data.studentId) {
      ctx.addIssue({
        code: "custom",
        message: "Envía solo el carné o solo el ID interno, no ambos.",
        path: ["cardKey"],
      });
    }
    if (data.cardKey && !/^KEY_\d{6}$/i.test(data.cardKey)) {
      ctx.addIssue({
        code: "custom",
        message: "Formato de carné inválido. Use KEY_ seguido de 6 dígitos (ej. KEY_000001).",
        path: ["cardKey"],
      });
    }
  });

export async function GET() {
  try {
    await requireRole(["staff", "admin"]);
    const sanctions = await getAllSanctions();
    return NextResponse.json(sanctions);
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole(["staff", "admin"]);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 422 },
      );
    }
    const { cardKey, studentId: bodyStudentId, ...createFields } = parsed.data;
    let studentId: number;
    if (cardKey) {
      const user = await prisma.user.findFirst({ where: { cardKey } });
      if (!user) {
        return NextResponse.json(
          { error: "No hay ningún usuario registrado con el carné indicado." },
          { status: 404 },
        );
      }
      studentId = user.id;
    } else {
      studentId = bodyStudentId as number;
    }
    const sanction = await createSanction(actor.id, { ...createFields, studentId });

    return NextResponse.json(sanction, { status: 201 });
  } catch (res) {
    if (res instanceof NextResponse) return res;
    throw res;
  }
}
