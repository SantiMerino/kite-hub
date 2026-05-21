import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  isDevAuthBypassEnabled,
  isDevSkipDatabase,
  isRecoverableDevDbError,
} from "@/lib/dev-bypass";
import { getAdminSessionFromCookies } from "@/lib/admin-session";
import { NextResponse } from "next/server";

export type UserRole = "student" | "staff" | "admin";

export type SessionUser = User;

const STAFF_ROLES: UserRole[] = ["staff", "admin"];

function buildInMemoryUser(input: {
  id: number;
  email: string | null;
  name: string | null;
  role: UserRole;
}): SessionUser {
  const now = new Date();
  return {
    id: input.id,
    auth0Sub: null,
    cardKey: null,
    name: input.name,
    email: input.email,
    role: input.role,
    isBanned: false,
    banReason: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

/**
 * Returns the current session user from the signed admin cookie.
 * In dev auth bypass, uses a hardcoded admin without OTP.
 */
export async function getAuthUser(): Promise<SessionUser | null> {
  if (isDevAuthBypassEnabled()) {
    const devUser = buildInMemoryUser({
      id: 0,
      email: "admin@dev.local",
      name: "Dev Admin",
      role: "admin",
    });

    if (isDevSkipDatabase()) {
      return devUser;
    }

    try {
      const row = await prisma.user.findFirst({
        where: { role: "admin", email: "admin@dev.local" },
      });
      if (row) {
        return prisma.user.update({
          where: { id: row.id },
          data: { lastSignedIn: new Date() },
        });
      }
      return prisma.user.create({
        data: {
          email: "admin@dev.local",
          name: "Dev Admin",
          role: "admin",
          lastSignedIn: new Date(),
        },
      });
    } catch (error) {
      if (isRecoverableDevDbError(error)) {
        return devUser;
      }
      throw error;
    }
  }

  const session = await getAdminSessionFromCookies();
  if (!session) return null;

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
    return buildInMemoryUser({
      id: session.userId,
      email: null,
      name: "Admin",
      role: "admin",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !STAFF_ROLES.includes(user.role as UserRole)) {
    return null;
  }

  return user;
}

/**
 * Route-handler guard. Throws a NextResponse (401/403) if the user lacks the required role.
 */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await getAuthUser();

  if (!user) {
    throw NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!roles.includes(user.role as UserRole)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}
