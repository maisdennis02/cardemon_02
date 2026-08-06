import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neon's direct endpoint has a small connection limit that serverless fan-out
// can exhaust (the likely cause of full-site outages). The "-pooler" twin of
// the same host fronts PgBouncer and absorbs it; credentials are identical.
// Rewritten at runtime, not in DATABASE_URL itself, so Prisma migrations
// (prisma.config.ts) keep the direct endpoint they require.
function pooledConnectionString(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler")) {
      url.hostname = url.hostname.replace(/^(ep-[a-z0-9-]+)\./, "$1-pooler.");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  // Small pool with aggressive timeouts: on serverless every warm instance has
  // its own pool, so per-instance limits must stay low, and a struggling DB
  // should fail fast instead of piling up connections until Neon rejects them.
  const adapter = new PrismaPg({
    connectionString: pooledConnectionString(process.env.DATABASE_URL),
    max: 3,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;
