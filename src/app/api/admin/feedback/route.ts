import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { shapeFeedback } from "@/lib/feedback";

/**
 * "Sugestões e dúvidas" sent from the dashboard, for the owner's session
 * reviews. Admin only (ADMIN_EMAIL), like /api/admin/events.
 *
 *   GET  ?days=90            → { totals, pending[], answered[] }, pending oldest first
 *   POST { id, answered? }   → marks one message answered (default true) or pending again
 *
 * The agent reads GET on every status review and lists what is pending; the
 * owner replies by e-mail (Reply-To is the restaurant) and the message is
 * then marked answered here.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;

  const raw = new URL(request.url).searchParams.get("days");
  const days = Math.min(365, Math.max(1, Number(raw ?? 90) || 90));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const rows = await prisma.feedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        answeredAt: true,
        message: true,
        locale: true,
        user: { select: { email: true } },
        restaurant: { select: { name: true, slug: true } },
      },
    });
    return Response.json(
      shapeFeedback(
        rows.map((r) => ({ ...r, email: r.user.email })),
        new Date(),
      ),
    );
  } catch (err) {
    console.error("[admin/feedback] query failed:", err);
    return Response.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;

  let body: { id?: unknown; answered?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !body.id) {
    return Response.json({ error: "id_required" }, { status: 400 });
  }
  const answered = body.answered !== false;

  try {
    const row = await prisma.feedback.update({
      where: { id: body.id },
      data: { answeredAt: answered ? new Date() : null },
      select: { id: true, answeredAt: true },
    });
    return Response.json(row);
  } catch (err) {
    console.error("[admin/feedback] update failed:", err);
    return Response.json({ error: "update_failed" }, { status: 404 });
  }
}
