import type { ReactNode } from "react";
import { countMenuEvents } from "@/lib/menu-view-counts";
import { DELIVERY_APP_IDS, DELIVERY_APPS } from "@/lib/delivery-apps";
import { WhatsAppIcon, InstagramIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n";
import { format } from "@/i18n/config";

export type MenuStats = {
  totalViews: number;
  last7Days: number;
  orders7Days: number;
  clicks: Record<string, number>;
};

export type MenuStatsRestaurant = {
  whatsappNumber: string | null;
  instagramUrl: string | null;
  ifoodUrl: string | null;
  ubereatsUrl: string | null;
  doordashUrl: string | null;
  rappiUrl: string | null;
  grubhubUrl: string | null;
  pedidosyaUrl: string | null;
  didifoodUrl: string | null;
};

// Crawler bursts are left out (see countMenuEvents): an owner reading "120
// views" should be reading diners.
export async function loadMenuStats(
  restaurantId: string,
  sevenDaysAgo: Date,
): Promise<MenuStats> {
  const counts = await countMenuEvents([restaurantId], sevenDaysAgo);
  const view = counts.find((c) => c.kind === "view");
  const clicks: Record<string, number> = {};
  for (const c of counts) {
    if (c.kind.startsWith("click_")) clicks[c.kind] = c.total;
  }

  return {
    totalViews: view?.total ?? 0,
    last7Days: view?.recent ?? 0,
    orders7Days: counts.find((c) => c.kind === "click_order")?.recent ?? 0,
    clicks,
  };
}

export function MenuStatsCard({
  stats,
  restaurant,
  t,
}: {
  stats: MenuStats;
  restaurant: MenuStatsRestaurant;
  t: Dictionary;
}) {
  const nf = new Intl.NumberFormat();
  const clickRows = buildClickRows(stats.clicks, restaurant, t);
  return (
    <section className="card">
      {/* The home shows one line; the full breakdown stays one tap away. */}
      <p className="text-base font-semibold text-[color:var(--color-navy)]">
        {format(t.dashboard.home.statsLine, {
          views: nf.format(stats.last7Days),
          orders: nf.format(stats.orders7Days),
        })}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer py-1 text-sm font-semibold text-[color:var(--color-brand)]">
          {t.dashboard.stats.title}
        </summary>
        <p className="mt-1 text-sm text-gray-600">{t.dashboard.stats.lead}</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Stat label={t.dashboard.stats.totalViews} value={nf.format(stats.totalViews)} />
          <Stat label={t.dashboard.stats.last7Days} value={nf.format(stats.last7Days)} />
        </div>
        {clickRows.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">
              {t.dashboard.stats.buttonClicks}
            </h3>
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {clickRows.map(({ key, label, value, icon }) => (
                <li key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-3 text-gray-700">
                    {icon}
                    {label}
                  </span>
                  <span className="font-semibold tabular-nums text-gray-900">
                    {nf.format(value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
    </section>
  );
}

function buildClickRows(
  clicks: Record<string, number>,
  r: MenuStatsRestaurant,
  t: Dictionary,
) {
  const rows: { key: string; label: string; value: number; icon: ReactNode }[] = [];

  if (r.whatsappNumber) {
    rows.push({
      key: "click_whatsapp",
      label: t.dashboard.stats.clickWhatsapp,
      value: clicks["click_whatsapp"] ?? 0,
      icon: (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#4bcc5b] text-white">
          <WhatsAppIcon size={16} />
        </span>
      ),
    });
  }
  if (r.whatsappNumber) {
    rows.push({
      key: "click_order",
      label: t.dashboard.stats.clickOrder,
      value: clicks["click_order"] ?? 0,
      icon: (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-sm text-white">
          🛎️
        </span>
      ),
    });
  }
  if (r.instagramUrl) {
    rows.push({
      key: "click_instagram",
      label: t.dashboard.stats.clickInstagram,
      value: clicks["click_instagram"] ?? 0,
      icon: (
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white"
          style={{
            background:
              "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
          }}
        >
          <InstagramIcon size={16} />
        </span>
      ),
    });
  }

  for (const appId of DELIVERY_APP_IDS) {
    const app = DELIVERY_APPS[appId];
    if (r[app.column]) {
      const kind = `click_${appId}`;
      rows.push({
        key: kind,
        label: app.displayName,
        value: clicks[kind] ?? 0,
        icon: (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: app.brandColor }}
          >
            {app.logoPath ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={app.logoPath} alt="" aria-hidden className="h-4 w-4" />
            ) : null}
          </span>
        ),
      });
    }
  }

  return rows;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
