/**
 * Prueba manual de envio de correo con Resend.
 * Uso:
 *   npm run email:test
 *   npm run email:test -- otro@correo.com "Asunto opcional"
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_TO_EMAIL = "jose.merino@keyinstitute.edu.sv";

function loadDotEnv(files: string[]) {
  for (const file of files) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  loadDotEnv([".env.local", ".env"]);
  const { buildResendTestEmailPayload, getRequiredResendApiKey, getResend } =
    await import("../src/lib/resend");
  getRequiredResendApiKey();
  const resend = getResend();

  const toEmail = process.argv[2] ?? DEFAULT_TO_EMAIL;
  const subjectFromArg = process.argv[3];

  const payload = buildResendTestEmailPayload({
    toEmail,
    subject: subjectFromArg,
    message: `Correo de prueba generado el ${new Date().toLocaleString("es-SV")}.`,
  });

  let result = await resend.emails.send(payload);
  if (
    result.error &&
    result.error.name === "validation_error" &&
    /domain is not verified/i.test(result.error.message)
  ) {
    result = await resend.emails.send({
      ...payload,
      from: "onboarding@resend.dev",
    });
  }

  if (result.error) {
    throw new Error(`${result.error.name}: ${result.error.message}`);
  }

  console.log("Correo enviado con Resend.");
  console.log(`Destino: ${toEmail}`);
  console.log(`Message ID: ${result.data?.id ?? "(sin id)"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Fallo al enviar correo de prueba con Resend.");
  console.error(message);
  process.exit(1);
});
