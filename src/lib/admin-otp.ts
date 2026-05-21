import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL, buildAdminOtpEmailHtml } from "@/lib/resend";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_REQUESTS_PER_EMAIL_PER_HOUR = 8;
const STAFF_ROLES = ["admin", "staff"] as const;

function getOtpPepper(): string {
  const pepper = process.env.ADMIN_OTP_PEPPER?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!pepper || pepper.length < 32) {
    throw new Error(
      "ADMIN_OTP_PEPPER or ADMIN_SESSION_SECRET (min 32 chars) required for OTP hashing.",
    );
  }
  return pepper;
}

export function normalizeAdminEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function hashOtpCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${getOtpPepper()}:${normalizeAdminEmail(email)}:${code}`)
    .digest("hex");
}

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
}

function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function findStaffUserByEmail(email: string) {
  const normalized = normalizeAdminEmail(email);
  return prisma.user.findFirst({
    where: {
      email: normalized,
      role: { in: [...STAFF_ROLES] },
    },
  });
}

async function countRecentOtpRequests(email: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.adminLoginOtp.count({
    where: {
      email: normalizeAdminEmail(email),
      createdAt: { gte: since },
    },
  });
}

async function invalidatePendingOtps(email: string) {
  const normalized = normalizeAdminEmail(email);
  await prisma.adminLoginOtp.deleteMany({
    where: {
      email: normalized,
      expiresAt: { gt: new Date() },
    },
  });
}

export type RequestOtpResult =
  | { ok: true; maskedEmail: string; resendAvailableAt: number }
  | { ok: false; error: string; status: number };

export async function requestAdminOtp(email: string): Promise<RequestOtpResult> {
  const normalized = normalizeAdminEmail(email);
  const user = await findStaffUserByEmail(normalized);

  const genericOk: RequestOtpResult = {
    ok: true,
    maskedEmail: maskEmail(normalized),
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
  };

  if (!user?.email) {
    await delayResponse();
    return genericOk;
  }

  const recentCount = await countRecentOtpRequests(normalized);
  if (recentCount >= MAX_OTP_REQUESTS_PER_EMAIL_PER_HOUR) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
      status: 429,
    };
  }

  await invalidatePendingOtps(normalized);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.adminLoginOtp.create({
    data: {
      email: normalized,
      codeHash: hashOtpCode(normalized, code),
      expiresAt,
    },
  });

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalized,
      subject: "Código de acceso — Kite Hub",
      html: buildAdminOtpEmailHtml({
        code,
        expiresMinutes: OTP_TTL_MS / 60_000,
        recipientName: user.name ?? undefined,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "No se pudo enviar el correo. Verifica la configuración de Resend.",
      status: 503,
    };
  }

  return {
    ok: true,
    maskedEmail: maskEmail(normalized),
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
  };
}

export type VerifyOtpResult =
  | { ok: true; userId: number }
  | { ok: false; error: string; status: number };

export async function verifyAdminOtp(
  email: string,
  code: string,
): Promise<VerifyOtpResult> {
  const normalized = normalizeAdminEmail(email);
  const sanitizedCode = code.replace(/\D/g, "").slice(0, OTP_LENGTH);

  if (sanitizedCode.length !== OTP_LENGTH) {
    return { ok: false, error: "Código inválido.", status: 400 };
  }

  const user = await findStaffUserByEmail(normalized);
  if (!user) {
    await delayResponse();
    return { ok: false, error: "Código incorrecto o expirado.", status: 401 };
  }

  const challenge = await prisma.adminLoginOtp.findFirst({
    where: {
      email: normalized,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, error: "Código incorrecto o expirado.", status: 401 };
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    await prisma.adminLoginOtp.delete({ where: { id: challenge.id } });
    return {
      ok: false,
      error: "Demasiados intentos. Solicita un nuevo código.",
      status: 429,
    };
  }

  const expectedHash = hashOtpCode(normalized, sanitizedCode);
  const valid = safeCompareHash(expectedHash, challenge.codeHash);

  if (!valid) {
    await prisma.adminLoginOtp.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Código incorrecto o expirado.", status: 401 };
  }

  await prisma.adminLoginOtp.delete({ where: { id: challenge.id } });
  await prisma.adminLoginOtp.deleteMany({ where: { email: normalized } });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSignedIn: new Date() },
  });

  return { ok: true, userId: user.id };
}

export async function resendAdminOtp(email: string): Promise<RequestOtpResult> {
  const normalized = normalizeAdminEmail(email);
  const latest = await prisma.adminLoginOtp.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: "desc" },
  });

  if (latest) {
    const elapsed = Date.now() - latest.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Espera antes de reenviar el código.",
        status: 429,
      };
    }
  }

  return requestAdminOtp(normalized);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.length <= 2 ? "*" : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

async function delayResponse() {
  await new Promise((r) => setTimeout(r, 400 + randomInt(0, 200)));
}
