import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: check that Google sign-in can link to every existing account.
//
//   npx tsx scripts/audit-emails.ts
//
// Linking matches the address Google reports against User.email as an exact
// string, and the Google side is lowercased (see the `profile` callback in
// src/auth.ts). So a stored address with any uppercase in it can never be
// matched — and because User.email is unique on the exact string, the
// differently-cased address inserts fine instead of being rejected. The owner
// would land in a new empty account with their restaurant left behind.
//
// Runs against whatever DATABASE_URL is in the environment — the local one is
// the dev branch; prefix with the prod URL pasted from Neon to check prod.

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        passwordHash: true,
        proExpiresAt: true,
        accounts: { select: { provider: true } },
        _count: { select: { restaurants: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const unlinkable = users.filter((u) => u.email !== u.email.toLowerCase());
    console.log(`${users.length} users, ${unlinkable.length} with a non-lowercase email`);

    if (unlinkable.length > 0) {
      console.log("\n!! these cannot be linked by Google sign-in:");
      for (const u of unlinkable) {
        console.log(`   ${u.email}  (${u._count.restaurants} restaurant(s))`);
      }
      console.log("\n   fix with: npx tsx scripts/change-email.ts <current> <lowercased>");
    }

    const now = new Date();
    console.log("\nemail                          pro    menus  signs in with");
    for (const u of users) {
      const providers = [
        u.passwordHash ? "password" : null,
        ...u.accounts.map((a) => a.provider),
      ].filter(Boolean);
      const pro = u.proExpiresAt && u.proExpiresAt > now ? "yes" : "no ";
      console.log(
        `${u.email.padEnd(30)} ${pro}    ${String(u._count.restaurants).padEnd(5)}  ${providers.join(" + ")}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
