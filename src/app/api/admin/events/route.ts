import { requireAdmin } from "@/lib/admin";
import { loadFunnel } from "@/lib/funnel";

/**
 * The ad run's ground truth as JSON: who signed up, where from, and how far
 * each of them got. Admin only (ADMIN_EMAIL). `?days=7|30|90`, default 30.
 *
 * Read by the daily-ads-report skill before it opens the Google Ads UI —
 * source A of the three-source read. See src/lib/funnel.ts for what it can and
 * cannot answer.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;

  const raw = new URL(request.url).searchParams.get("days");
  const days = Math.min(365, Math.max(1, Number(raw ?? 30) || 30));

  try {
    return Response.json(await loadFunnel(days));
  } catch (err) {
    console.error("[admin/events] funnel failed:", err);
    return Response.json({ error: "database_unavailable" }, { status: 503 });
  }
}
