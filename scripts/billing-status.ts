import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: print a user's billing/reminder state.
//
//   npx tsx scripts/billing-status.ts <email>
//
// Runs against whatever DATABASE_URL is in the environment — the local one is
// the dev branch; prefix with the prod URL pasted from Neon to check prod.

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("usage: npx tsx scripts/billing-status.ts <email>");
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const u = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        proExpiresAt: true,
        billingCycle: true,
        billingCancelAtPeriodEnd: true,
        billingCustomerId: true,
        billingSubscriptionId: true,
        proEndingReminderSentAt: true,
        restaurants: { select: { slug: true, country: true } },
      },
    });
    if (!u) {
      console.error(`no user with email ${email}`);
      process.exit(1);
    }
    console.log(u);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
