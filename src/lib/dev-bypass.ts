/**
 * Centralized dev-only flags for Auth0 bypass and optional DB-free UI.
 *
 * PRODUCTION SAFETY: this module only activates in NODE_ENV=development.
 * Any attempt to enable the bypass outside of development throws at startup.
 */

export function isDevAuthBypassEnabled(): boolean {
  const isDev = process.env.NODE_ENV === "development";

  // Hard kill-switch: bypass must never run in production or staging.
  if (!isDev) {
    if (process.env.DEV_AUTH_BYPASS === "true") {
      throw new Error(
        "[dev-bypass] DEV_AUTH_BYPASS=true is set outside of NODE_ENV=development. " +
          "Remove this variable from your production/staging environment immediately.",
      );
    }
    return false;
  }

  const hasAuth0Env =
    Boolean(process.env.AUTH0_DOMAIN) &&
    Boolean(process.env.AUTH0_CLIENT_ID) &&
    Boolean(process.env.AUTH0_CLIENT_SECRET) &&
    Boolean(process.env.AUTH0_BASE_URL) &&
    Boolean(process.env.AUTH0_SECRET);

  return (
    process.env.DEV_AUTH_BYPASS === "true" ||
    (process.env.DEV_AUTH_BYPASS !== "false" && !hasAuth0Env)
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

/**
 * When auth bypass is on in development, avoid crashing the UI if DATABASE_URL
 * is wrong or SQL Server is down. Returns `fallback` without calling `fn` when
 * DEV_SKIP_DB is set or DATABASE_URL is missing.
 */
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
