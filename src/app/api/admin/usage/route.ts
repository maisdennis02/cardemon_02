import { requireAdmin } from "@/lib/admin";
import { loadUsage } from "@/lib/usage";

/**
 * Who is using the product as JSON: every restaurant with its menu views,
 * WhatsApp taps and orders in the window. Admin only (ADMIN_EMAIL).
 * `?days=7|30|90`, default 30.
 *
 * /api/admin/events answers "what happened to the accounts created lately";
 * this answers "which menus are being opened at all". See src/lib/usage.ts.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate) return gate;

  const raw = new URL(request.url).searchParams.get("days");
  const days = Math.min(365, Math.max(1, Number(raw ?? 30) || 30));

  try {
    return Response.json(await loadUsage(days));
  } catch (err) {
    console.error("[admin/usage] usage failed:", err);
    return Response.json({ error: "database_unavailable" }, { status: 503 });
  }
}
