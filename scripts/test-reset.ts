import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "node:crypto";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Mirrors src/lib/password-reset.ts so we can exercise it end-to-end from a
// one-off script without depending on the Next.js runtime (cookies/i18n/etc).

const EMAIL = process.argv[2] ?? "dennisdjlee@yahoo.com";
const SITE_URL = process.env.APP_URL || "http://localhost:3000";
const IDENTIFIER_PREFIX = "password-reset:";
const TTL_MS = 60 * 60 * 1000;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const user = await prisma.user.findUnique({ where: { email: EMAIL.toLowerCase() } });
    if (!user) {
      console.error(`✗ no user with email ${EMAIL}`);
      process.exit(1);
    }
    console.log(`✓ user found: id=${user.id} email=${user.email} hasPassword=${!!user.passwordHash}`);

    const identifier = `${IDENTIFIER_PREFIX}${user.id}`;
    const rawToken = randomBytes(32).toString("base64url");
    const hashed = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + TTL_MS);

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token: hashed, expires },
    });

    const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
    console.log(`✓ token issued, expires ${expires.toISOString()}`);
    console.log("");
    console.log("Open this in a browser to reset:");
    console.log(resetUrl);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
