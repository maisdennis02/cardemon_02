import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Uptime probe target (e.g. UptimeRobot / Better Stack). Returns 503 when the
// database is unreachable so external monitoring alerts before customers do.
export async function GET(): Promise<Response> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db health check timed out")), 5_000),
      ),
    ]);
    // CDN-cache the healthy answer for 30s: each uncached hit wakes the Neon
    // compute (metered), and this endpoint is public — without the cache
    // anyone can spend our database compute by hammering it. Monitors probe
    // every 30min, so 30s staleness is irrelevant to them. Failures are NOT
    // cached: recovery should be visible immediately.
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "public, s-maxage=30, must-revalidate" } },
    );
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
