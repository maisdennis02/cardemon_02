import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// One-off: change a user's login email (and keep their Stripe customer in sync).
//
//   npx tsx scripts/change-email.ts <current-email> <new-email> [--unlink-google] [--yes]
//
// Without --yes it only prints what it would do.
//
// --unlink-google also deletes the user's linked Google account row. Changing
// the email alone does NOT stop the old Google identity from opening the
// account: Auth.js matches a linked account by Google's `sub` before it ever
// looks at the address (handle-login.js:175 runs before :232). Pass this when
// the owner has lost control of the old address, not for a routine rename. Runs against whatever
// DATABASE_URL / STRIPE_SECRET_KEY are in the environment — the local .env is
// the dev branch, NOT prod. To hit prod, prefix the command with the prod
// values pasted from Neon / Stripe:
//
//   DATABASE_URL='postgresql://…' STRIPE_SECRET_KEY='sk_live_…' npx tsx scripts/change-email.ts old new --yes

const [currentArg, nextArg, ...flags] = process.argv.slice(2);
const apply = flags.includes("--yes");
const unlinkGoogle = flags.includes("--unlink-google");

const unknownFlag = flags.find((f) => f !== "--yes" && f !== "--unlink-google");
if (!currentArg || !nextArg || unknownFlag) {
  if (unknownFlag) console.error(`unknown flag ${unknownFlag}`);
  console.error(
    "usage: npx tsx scripts/change-email.ts <current-email> <new-email> [--unlink-google] [--yes]",
  );
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
        passwordHash: true,
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

    const googleAccounts = user.accounts.filter((a) => a.provider === "google");
    if (unlinkGoogle) {
      if (googleAccounts.length === 0) {
        console.log("unlink      nothing to unlink (no Google account linked)");
      } else {
        console.log(`unlink      ${googleAccounts.length} Google account row(s) will be deleted`);
        if (!user.passwordHash) {
          // Recoverable, but only via the new address — worth saying out loud
          // before someone runs this on an owner who is standing right there.
          console.log(
            "\n!! this account has NO password: after unlinking, the only way back in\n" +
              `   is "Forgot password" on ${next}. Make sure the owner controls it.`,
          );
        }
      }
    } else if (googleAccounts.length > 0) {
      console.log(
        "unlink      no (--unlink-google not passed; the old Google account\n" +
          "            will still open this account after the email change)",
      );
    }

    if (!apply) {
      console.log("\ndry run — re-run with --yes to apply");
      return;
    }

    // One transaction: an email change that half-applies would leave the old
    // Google identity attached to the new address.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { email: next } });
      if (unlinkGoogle && googleAccounts.length > 0) {
        await tx.account.deleteMany({ where: { userId: user.id, provider: "google" } });
      }
    });
    console.log("\nDB updated");
    if (unlinkGoogle && googleAccounts.length > 0) {
      console.log(`Google account unlinked (${googleAccounts.length} row(s) deleted)`);
    }

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
