/**
 * Centralized dev-only flags for admin auth bypass and optional DB-free UI.
 *
 * PRODUCTION SAFETY: this module only activates in NODE_ENV=development.
 * Any attempt to enable the bypass outside of development throws at startup.
 */

export function isDevAuthBypassEnabled(): boolean {
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      throw new Error(
        "[dev-bypass] DEV_AUTH_BYPASS=true is set outside of NODE_ENV=development. " +
          "Remove this variable from your production/staging environment immediately.",
      );
    }
    return false;
  }

  const hasAdminSessionSecret = Boolean(
    process.env.ADMIN_SESSION_SECRET?.trim() &&
      process.env.ADMIN_SESSION_SECRET.trim().length >= 32,
  );

  return (
    process.env.DEV_AUTH_BYPASS === "true" ||
    (process.env.DEV_AUTH_BYPASS !== "false" && !hasAdminSessionSecret)
  );
}

/** Skip real DB access in dev (no DATABASE_URL or explicit flag). */
export function isDevSkipDatabase(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.DEV_SKIP_DB === "true") return true;
  return !process.env.DATABASE_URL;
}

export function isRecoverableDevDbError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Environment variable not found: DATABASE_URL") ||
    msg.includes("Authentication failed") ||
    msg.includes("Login failed for user") ||
    msg.includes("P1000") ||
    msg.includes("P1001") ||
    msg.includes("P1017") ||
    msg.includes("Can't reach database server") ||
    msg.includes("The provided database credentials")
  );
}

export async function withDevDatabaseFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (process.env.NODE_ENV !== "development" || !isDevAuthBypassEnabled()) {
    return fn();
  }

  if (isDevSkipDatabase()) {
    return fallback;
  }

  try {
    return await fn();
  } catch (error) {
    if (isRecoverableDevDbError(error)) {
      return fallback;
    }
    throw error;
  }
}
