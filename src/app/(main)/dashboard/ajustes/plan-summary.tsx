import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { format } from "@/i18n/config";
import type { PlanState } from "@/lib/pricing";

// The plan card's contents in Ajustes. Courtesy Pro (granted by hand, no
// Stripe subscription) gets its own line and a link to /pricing: the Stripe
// portal has nothing to manage for it.
export function PlanSummary({ t, state, date }: { t: Dictionary; state: PlanState; date: string | null }) {
  const p = t.dashboard.plan;
  const line =
    state === "courtesy" ? p.proCourtesy : state === "ending" ? p.proUntil : state === "renewing" ? p.proRenews : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[color:var(--color-navy)]">{p.title}</h2>
        {line && date && <p className="text-sm text-gray-600">{format(line, { date })}</p>}
      </div>
      {state === "renewing" || state === "ending" ? (
        <form action="/api/stripe/portal" method="post">
          <button className="btn btn-secondary btn-sm">{t.dashboard.managePlan}</button>
        </form>
      ) : (
        <Link href="/pricing" className="btn btn-primary btn-sm self-start">
          {state === "courtesy" ? t.dashboard.subscribePro : t.dashboard.upgrade}
        </Link>
      )}
    </>
  );
}
