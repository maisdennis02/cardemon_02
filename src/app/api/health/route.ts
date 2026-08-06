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
    return Response.json({ ok: true });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
