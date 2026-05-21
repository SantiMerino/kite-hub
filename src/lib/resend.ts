import { Resend } from "resend";

export const FROM_EMAIL =
  process.env.RESEND_FROM ?? "Kite Hub <noreply@kite-hub.app>";

export function getRequiredResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Set it in .env.local before sending emails."
    );
  }
  return apiKey;
}

let cachedResend: Resend | null = null;

/**
 * Lazy accessor for the Resend client.
 *
 * The Resend constructor throws synchronously when the API key is missing, so
 * eagerly instantiating it at module load breaks Vercel/Next.js build-time page
 * data collection in environments where `RESEND_API_KEY` is intentionally not
 * exposed (e.g. preview builds without secrets). Resolving the client on first
 * use keeps the failure scoped to actual send attempts, which already run
 * inside try/catch blocks at the service layer.
 */
export function getResend(): Resend {
  if (cachedResend) return cachedResend;
  cachedResend = new Resend(getRequiredResendApiKey());
  return cachedResend;
}

export interface ResendTestEmailPayload {
  toEmail: string;
  subject?: string;
  message?: string;
}

export function buildResendTestEmailPayload(payload: ResendTestEmailPayload) {
  return {
    from: FROM_EMAIL,
    to: payload.toEmail,
    subject: payload.subject ?? "Prueba de correo — Kite Hub",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Prueba Resend — Kite Hub</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr>
      <td style="background:#0f172a;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;">Kite Hub</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Verificacion de envio con Resend</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;color:#27272a;font-size:15px;line-height:1.5;">
        <p style="margin-top:0;">
          Este correo confirma que la integracion de Resend esta funcionando en tu entorno local.
        </p>
        <p style="margin-bottom:0;">
          ${payload.message ?? "Mensaje de prueba enviado desde scripts/test-resend-email.ts"}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

export interface OverdueEmailPayload {
  toEmail: string;
  studentName: string;
  toolName: string;
  daysOverdue: number;
  borrowDate: Date;
  expectedReturnDate: Date;
}

export interface LoanApprovalEmailPayload {
  studentName: string;
  studentCardKey: string;
  toolName: string;
  toolCode: string;
  toolCondition: string;
  inventoryStatus: string;
  expectedReturnDate: Date;
  auditUrl: string;
}

export function buildLoanApprovedEmailHtml(p: LoanApprovalEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Prestamo aprobado — Kite Hub</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <tr>
      <td style="background:#2563eb;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">Prestamo aprobado</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#3f3f46;font-size:16px">
          Se aprobo la solicitud de <strong>${p.studentName}</strong> (${p.studentCardKey}).
        </p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
          <tr><td style="padding:8px 12px;background:#f4f4f5;color:#71717a;font-size:13px">Herramienta</td><td style="padding:8px 12px;background:#f4f4f5;color:#18181b;font-weight:600">${p.toolName} (${p.toolCode})</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px">Estado actual</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b">${p.inventoryStatus}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px">Condicion de la herramienta</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b">${p.toolCondition}</td></tr>
          <tr><td style="padding:8px 12px;color:#71717a;font-size:13px">Fecha limite</td><td style="padding:8px 12px;color:#dc2626;font-weight:600">${p.expectedReturnDate.toLocaleDateString("es-MX")}</td></tr>
        </table>
        <p style="margin:0;color:#71717a;font-size:14px">
          Puedes revisar la bitacora del estudiante aqui:
          <a href="${p.auditUrl}" style="color:#2563eb">${p.auditUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildLoanRequestedEmailHtml(p: LoanApprovalEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Solicitud pendiente — Kite Hub</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <tr>
      <td style="background:#7c3aed;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">Solicitud de prestamo pendiente</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#3f3f46;font-size:16px">
          El estudiante <strong>${p.studentName}</strong> (${p.studentCardKey}) solicito una herramienta que requiere aprobacion.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
          <tr><td style="padding:8px 12px;background:#f4f4f5;color:#71717a;font-size:13px">Herramienta</td><td style="padding:8px 12px;background:#f4f4f5;color:#18181b;font-weight:600">${p.toolName} (${p.toolCode})</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px">Estado actual</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b">${p.inventoryStatus}</td></tr>
          <tr><td style="padding:8px 12px;color:#71717a;font-size:13px">Condicion</td><td style="padding:8px 12px;color:#18181b">${p.toolCondition}</td></tr>
        </table>
        <p style="margin:0;color:#71717a;font-size:14px">
          Revisa su bitacora y comportamiento historico:
          <a href="${p.auditUrl}" style="color:#2563eb">${p.auditUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export interface AdminOtpEmailPayload {
  code: string;
  expiresMinutes: number;
  recipientName?: string;
}

export function buildAdminOtpEmailHtml(p: AdminOtpEmailPayload): string {
  const greeting = p.recipientName
    ? `Hola, <strong>${p.recipientName}</strong>.`
    : "Hola.";
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Acceso administrativo — Kite Hub</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr>
      <td style="background:#5b21b6;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;">Kite Hub</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Acceso al panel administrativo</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;color:#27272a;font-size:15px;line-height:1.5;">
        <p style="margin-top:0;">${greeting}</p>
        <p>Tu código de verificación es:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.35em;text-align:center;color:#5b21b6;margin:24px 0;">${p.code}</p>
        <p style="margin-bottom:0;color:#71717a;font-size:14px;">
          Válido por ${p.expiresMinutes} minutos. Si no solicitaste este acceso, ignora este correo.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildOverdueEmailHtml(p: OverdueEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Alerta de atraso — Kite Hub</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <tr>
      <td style="background:#7c3aed;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">⚠️ Alerta de atraso en devolución</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <p style="margin:0 0 16px;color:#3f3f46;font-size:16px">
          El/la estudiante <strong>${p.studentName}</strong> presenta un atraso de
          <strong style="color:#dc2626">${p.daysOverdue} día(s)</strong> en la devolución de:
        </p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
          <tr>
            <td style="padding:8px 12px;background:#f4f4f5;border-radius:6px 6px 0 0;color:#71717a;font-size:13px">Herramienta</td>
            <td style="padding:8px 12px;background:#f4f4f5;border-radius:0 6px 0 0;font-weight:600;color:#18181b">${p.toolName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px">Fecha de préstamo</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b">${p.borrowDate.toLocaleDateString("es-MX")}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#71717a;font-size:13px">Fecha límite</td>
            <td style="padding:8px 12px;color:#dc2626;font-weight:600">${p.expectedReturnDate.toLocaleDateString("es-MX")}</td>
          </tr>
        </table>
        <p style="color:#71717a;font-size:14px;margin:0">
          Revisa el panel administrativo de Kite Hub para aplicar sanciones o contactar al estudiante.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f4f4f5;padding:16px 32px;text-align:center">
        <p style="margin:0;color:#a1a1aa;font-size:12px">Kite Hub — Sistema de préstamo de herramientas de laboratorio</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
