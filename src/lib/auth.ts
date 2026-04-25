import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  isDevAuthBypassEnabled,
  isDevSkipDatabase,
  isRecoverableDevDbError,
} from "@/lib/dev-bypass";
import { NextResponse } from "next/server";

export type UserRole = "student" | "staff" | "admin";

export type SessionUser = User;

function buildInMemoryUser(input: {
  auth0Sub: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}): SessionUser {
  const now = new Date();
  return {
    id: 0,
    auth0Sub: input.auth0Sub,
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
 * Returns the current session user and syncs them to the local DB.
 * In dev auth bypass, uses in-memory user if DB is skipped or unreachable.
 * Call from Server Components and Route Handlers.
 */
export async function getAuthUser(): Promise<SessionUser | null> {
  if (isDevAuthBypassEnabled()) {
    const devUser = buildInMemoryUser({
      auth0Sub: "dev|bypass-admin",
      email: "admin@dev.local",
      name: "Dev Admin",
      role: "admin",
    });

    if (isDevSkipDatabase()) {
      return devUser;
    }

    try {
      return await prisma.user.upsert({
        where: { auth0Sub: "dev|bypass-admin" },
        create: {
          auth0Sub: "dev|bypass-admin",
          email: "admin@dev.local",
          name: "Dev Admin",
          role: "admin",
          lastSignedIn: new Date(),
        },
        update: {
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

  const session = await auth0.getSession();
  if (!session?.user) return null;

  const sub = session.user.sub as string;
  const email = session.user.email as string | undefined;
  const name = session.user.name as string | undefined;

  const rawRole =
    (session.user["https://kite-hub.app/role"] as string | undefined) ??
    "staff";

  const role: UserRole = (["admin", "staff", "student"].includes(rawRole)
    ? rawRole
    : "staff") as UserRole;

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
    return buildInMemoryUser({
      auth0Sub: sub,
      email: email ?? null,
      name: name ?? null,
      role,
    });
  }

  const user = await prisma.user.upsert({
    where: { auth0Sub: sub },
    create: {
      auth0Sub: sub,
      email: email ?? null,
      name: name ?? null,
      role,
      lastSignedIn: new Date(),
    },
    update: {
      email: email ?? undefined,
      name: name ?? undefined,
      role,
      lastSignedIn: new Date(),
    },
  });

  return user;
}

/**
 * Route-handler guard. Throws a NextResponse (401/403) if the user lacks the required role.
 * Usage:  const actor = await requireRole(["admin"]);
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
