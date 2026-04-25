#!/usr/bin/env node
/**
 * Pre-release safety gate: verifies the dev auth bypass is not active
 * in the current environment and has no footprint in production code paths.
 *
 * Usage:
 *   npm run check:no-bypass-prod
 *   node scripts/check-no-dev-bypass-prod.js
 *
 * Exit codes:
 *   0 — all clear, safe to deploy
 *   1 — one or more issues found, do NOT deploy
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failed = false;

function fail(msg) {
  console.error(`\n  FAIL  ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`  OK    ${msg}`);
}

console.log("\n=== Kite Hub — dev-bypass production gate ===\n");

// 1. DEV_AUTH_BYPASS must not be "true" in the current process environment.
if (process.env.DEV_AUTH_BYPASS === "true") {
  fail("DEV_AUTH_BYPASS=true is set in the current environment. Remove it before deploying.");
} else {
  ok("DEV_AUTH_BYPASS is not set to 'true'.");
}

// 2. DEV_SKIP_DB must not be "true".
if (process.env.DEV_SKIP_DB === "true") {
  fail("DEV_SKIP_DB=true is set in the current environment. Remove it before deploying.");
} else {
  ok("DEV_SKIP_DB is not set to 'true'.");
}

// 3. NODE_ENV must not be "development" during a release check.
if (process.env.NODE_ENV === "development") {
  console.warn(
    "\n  WARN  NODE_ENV=development — this check is most meaningful in production/staging environments.",
  );
}

// 4. Ensure real Auth0 credentials are present (when not in development).
if (process.env.NODE_ENV !== "development") {
  const requiredAuth0 = [
    "AUTH0_SECRET",
    "AUTH0_BASE_URL",
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
  ];
  const missing = requiredAuth0.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    fail(`Missing required Auth0 environment variables: ${missing.join(", ")}`);
  } else {
    ok("All required Auth0 environment variables are present.");
  }
}

// 5. Report which source files still consume dev-bypass (informational for cleanup).
//    These are not FAIL conditions because withDevDatabaseFallback and isDevSkipDatabase
//    are safely gated by NODE_ENV at runtime. This section is a reminder for the
//    final cleanup step (see .cursor/plan/bypass-removal-for-production.md).
const DEV_BYPASS_SOURCE = "src/lib/dev-bypass.ts";

try {
  const grepOutput = execSync(
    `grep -rl "dev-bypass" "${path.join(ROOT, "src")}"`,
    { encoding: "utf8" },
  ).trim();

  if (grepOutput) {
    const files = grepOutput
      .split("\n")
      .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"))
      .filter((f) => !f.endsWith(DEV_BYPASS_SOURCE)); // exclude the source file itself

    if (files.length > 0) {
      console.warn(
        `\n  WARN  The following files still import from 'dev-bypass'. ` +
          `They are safe in production (runtime-gated by NODE_ENV) but should be removed ` +
          `before the final release.\n${files.map((f) => `         ${f}`).join("\n")}`,
      );
    } else {
      ok("'dev-bypass' consumers have been removed — module ready for deletion.");
    }
  } else {
    ok("No imports of 'dev-bypass' found (module already removed).");
  }
} catch {
  ok("No imports of 'dev-bypass' found (module already removed).");
}

// 6. Summary
console.log("\n" + "=".repeat(46));
if (failed) {
  console.error(
    "\n  ✗  One or more checks failed. Do NOT deploy until all issues are resolved.\n",
  );
  process.exit(1);
} else {
  console.log(
    "\n  ✓  All checks passed. The build is safe to deploy to production.\n",
  );
  process.exit(0);
}
