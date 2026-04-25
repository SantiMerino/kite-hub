/**
 * Overdue job — run via Heroku Scheduler or `npm run jobs:overdue`
 *
 * Heroku Scheduler: configure to run every hour (or daily at a set time).
 * Command: npm run jobs:overdue
 */
import { processOverdueLoans, drainEmailOutbox } from "@/services/alert.service";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log(`[jobs:overdue] Starting at ${new Date().toISOString()}`);

  const { processed, newAlerts } = await processOverdueLoans();
  console.log(`[jobs:overdue] Processed ${processed} overdue loans, created ${newAlerts} new alerts`);

  const { sent, failed } = await drainEmailOutbox();
  console.log(`[jobs:overdue] Email drain — sent: ${sent}, failed: ${failed}`);
}

main()
  .catch((err) => {
    console.error("[jobs:overdue] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
