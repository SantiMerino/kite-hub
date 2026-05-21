import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "kite_admin_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

export type AdminSessionPayload = {
  userId: number;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set (min 32 chars). Generate: openssl rand -hex 32",
    );
  }
  return secret;
}

function signPayload(payload: AdminSessionPayload): string {
  const data = JSON.stringify(payload);
  const sig = createHmac("sha256", getSessionSecret())
    .update(data)
    .digest("base64url");
  return `${Buffer.from(data, "utf8").toString("base64url")}.${sig}`;
}

function verifyToken(token: string): AdminSessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const dataB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let data: string;
  try {
    data = Buffer.from(dataB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(data) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.userId !== "number" ||
    !Number.isInteger(payload.userId) ||
    payload.userId < 1 ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (payload.exp * 1000 < Date.now()) return null;

  return payload;
}

export function createAdminSessionToken(userId: number): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  return signPayload({ userId, exp });
}

export function parseAdminSessionToken(token: string | undefined): AdminSessionPayload | null {
  if (!token?.trim()) return null;
  return verifyToken(token.trim());
}

export async function getAdminSessionFromCookies(): Promise<AdminSessionPayload | null> {
  const jar = await cookies();
  return parseAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export function getAdminSessionFromRequest(req: NextRequest): AdminSessionPayload | null {
  return parseAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function adminSessionCookieOptions(token: string) {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
