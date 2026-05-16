import type { Dictionary } from "@/i18n";

type Props = {
  totalViews: number;
  last7Days: number;
  t: Dictionary;
};

export function MenuStatsCard({ totalViews, last7Days, t }: Props) {
  const nf = new Intl.NumberFormat();
  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.stats.title}</h2>
      <p className="mt-1 text-sm text-gray-600">{t.dashboard.stats.lead}</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label={t.dashboard.stats.totalViews} value={nf.format(totalViews)} />
        <Stat label={t.dashboard.stats.last7Days} value={nf.format(last7Days)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
