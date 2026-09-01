import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// One-off: change a user's login email (and keep their Stripe customer in sync).
//
//   npx tsx scripts/change-email.ts <current-email> <new-email> [--yes]
//
// Without --yes it only prints what it would do. Runs against whatever
// DATABASE_URL / STRIPE_SECRET_KEY are in the environment — the local .env is
// the dev branch, NOT prod. To hit prod, prefix the command with the prod
// values pasted from Neon / Stripe:
//
//   DATABASE_URL='postgresql://…' STRIPE_SECRET_KEY='sk_live_…' npx tsx scripts/change-email.ts old new --yes

const [currentArg, nextArg, ...flags] = process.argv.slice(2);
const apply = flags.includes("--yes");

if (!currentArg || !nextArg) {
  console.error("usage: npx tsx scripts/change-email.ts <current-email> <new-email> [--yes]");
  process.exit(1);
}

// Same normalization as signup/login (actions.ts): lowercase, trimmed.
const current = currentArg.trim().toLowerCase();
const next = nextArg.trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
  console.error(`"${next}" does not look like an email address`);
  process.exit(1);
}
if (current === next) {
  console.error("current and new email are the same");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const user = await prisma.user.findUnique({
      where: { email: current },
      select: {
        id: true,
        email: true,
        name: true,
        billingCustomerId: true,
        proExpiresAt: true,
        restaurants: { select: { slug: true } },
        accounts: { select: { provider: true } },
      },
    });
    if (!user) {
      console.error(`no user with email ${current}`);
      process.exit(1);
    }
    const taken = await prisma.user.findUnique({ where: { email: next }, select: { id: true } });
    if (taken) {
      console.error(`${next} is already used by user ${taken.id}`);
      process.exit(1);
    }

    console.log(`user        ${user.id} (${user.name ?? "no name"})`);
    console.log(`restaurants ${user.restaurants.map((r) => r.slug).join(", ") || "(none)"}`);
    console.log(`oauth       ${user.accounts.map((a) => a.provider).join(", ") || "(none — password login)"}`);
    console.log(`pro until   ${user.proExpiresAt?.toISOString() ?? "(free)"}`);
    console.log(`stripe      ${user.billingCustomerId ?? "(no customer)"}`);
    console.log(`email       ${user.email}  ->  ${next}`);

    if (!apply) {
      console.log("\ndry run — re-run with --yes to apply");
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { email: next } });
    console.log("\nDB updated");

    if (user.billingCustomerId) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn("STRIPE_SECRET_KEY not set — update the Stripe customer email by hand");
        return;
      }
      const stripe = new Stripe(key);
      await stripe.customers.update(user.billingCustomerId, { email: next });
      console.log(`Stripe customer ${user.billingCustomerId} updated`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
