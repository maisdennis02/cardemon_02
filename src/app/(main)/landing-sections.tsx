import { HeroPhonePreview } from "./hero-phone-preview";
import { BrandedQrCode } from "./dashboard/branded-qr";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { format, type Locale } from "@/i18n/config";
import { formatPrice, headerColors, menuFontFamilies, type MenuFont } from "@/lib/menu";
import { cartTotals } from "@/lib/cart";
import { LANDING_DEMO, demoOrderLines, demoOrderMessage } from "@/lib/landing-demo";
import { FREE_ITEM_LIMIT } from "@/lib/pricing";
import { parseItemLine } from "@/lib/menu-parse";
import type { SerializableApp } from "@/lib/hero-mockup";
import { siteUrl } from "@/lib/site";

// The sections of the landing that show the text menu, WhatsApp orders and
// voice (spec 2026-10-10-landing-nova). Every picture is drawn in HTML from
// LANDING_DEMO, so it is sharp, light, translated, and — for the WhatsApp
// message — byte-for-byte what the product sends.

const ACCENT = "#c84630";

function totalText(locale: Locale): { count: number; total: string } {
  const totals = cartTotals(demoOrderLines(locale));
  return { count: totals.count, total: formatPrice(totals.cents, LANDING_DEMO[locale].country) };
}

// The hero's phone: a text menu with "+" on every item, one item already in
// the order and the bar that opens it. Labelled as an example.
export function TextMenuPhone({ locale, t }: { locale: Locale; t: Dictionary }) {
  const demo = LANDING_DEMO[locale];
  const inCart = new Map(demo.order.map((l) => [l.id, l.qty]));
  const { count, total } = totalText(locale);

  return (
    <div
      role="img"
      aria-label={t.landing.phonePreviewAlt}
      className="relative mx-auto h-[560px] w-[280px] overflow-hidden rounded-[2.6rem] border-[10px] border-[color:var(--color-navy)] bg-white text-left text-gray-900 shadow-2xl"
    >
      <div className="h-16" style={{ background: ACCENT }} />
      <span className="absolute right-4 top-4 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
        {t.landing.demoLabel}
      </span>
      <p className="mt-3 px-5 text-center font-serif text-xl font-bold" style={{ color: ACCENT }}>
        {t.landing.demoRestaurant}
      </p>
      <div className="px-5 pt-2">
        {demo.menu.sections.map((section) => (
          <div key={section.id} className="mt-3">
            <p
              className="mb-1 border-b pb-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: ACCENT, borderColor: ACCENT }}
            >
              {section.title}
            </p>
            {section.items.map((item) => {
              const qty = inCart.get(item.id) ?? 0;
              return (
                <div key={item.id} className="flex items-center gap-2 border-b border-gray-100 py-2 text-[13px]">
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="font-bold tabular-nums">{formatPrice(item.priceCents ?? 0, demo.country)}</span>
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: ACCENT }}
                  >
                    {qty > 0 ? qty : "+"}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        className="absolute inset-x-3 bottom-4 flex items-center justify-between gap-2 whitespace-nowrap rounded-full px-4 py-3 text-[11px] font-bold text-white shadow-lg"
        style={{ background: ACCENT }}
      >
        <span>{t.menu.order.viewOrder}</span>
        <span className="tabular-nums">
          {format(t.menu.order.count, { n: count })} · {total}
        </span>
      </div>
    </div>
  );
}

function ColumnTitle({ text, label }: { text: string; label: string }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
      {text}
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] tracking-wider text-gray-600">{label}</span>
    </p>
  );
}

// WhatsApp renders *text* as bold; so does this bubble.
function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block min-h-[1.2em]">
          {line.split(/(\*[^*]+\*)/).map((part, j) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
              <strong key={j}>{part.slice(1, -1)}</strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

export function OrderSection({ locale, t, signedIn }: { locale: Locale; t: Dictionary; signedIn: boolean }) {
  const lines = demoOrderLines(locale);
  const { count, total } = totalText(locale);
  const country = LANDING_DEMO[locale].country;
  const points = [t.landing.orderPoint1, t.landing.orderPoint2, t.landing.orderPoint3];

  return (
    <section className="border-t border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="lp-reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.orderHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.orderLead}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {points.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF1E0] px-3 py-1.5 text-sm font-semibold text-[#3f4d16]"
              >
                <CheckIcon size={14} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className="lp-reveal min-w-0">
            <ColumnTitle text={t.landing.orderCartTitle} label={t.landing.demoLabel} />
            <div className="card">
              <p className="mb-3 text-lg font-bold">{t.menu.order.sheetTitle}</p>
              <ul className="divide-y divide-gray-100">
                {lines.map(({ item, qty }) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                    <span aria-hidden className="flex items-center gap-2 text-sm font-bold tabular-nums">
                      <span className="flex size-7 items-center justify-center rounded-full border-2" style={{ borderColor: ACCENT, color: ACCENT }}>
                        −
                      </span>
                      {qty}
                      <span className="flex size-7 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}>
                        +
                      </span>
                    </span>
                    <span className="min-w-[5.5rem] whitespace-nowrap text-right font-bold tabular-nums">
                      {formatPrice((item.priceCents ?? 0) * qty, country)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t-2 border-gray-900 pt-3 font-bold">
                <span>
                  {t.menu.order.total} · {format(t.menu.order.count, { n: count })}
                </span>
                <span className="tabular-nums">{total}</span>
              </p>
              <span className="mt-4 block rounded-full bg-[#25d366] px-4 py-3 text-center text-sm font-bold text-white">
                {t.menu.order.send}
              </span>
            </div>
          </div>

          <div className="lp-reveal min-w-0">
            <ColumnTitle text={t.landing.orderChatTitle} label={t.landing.demoLabel} />
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  {LANDING_DEMO[locale].details.name.charAt(0)}
                </span>
                <span className="font-semibold">
                  {LANDING_DEMO[locale].details.name} · {t.landing.orderChatContact}
                </span>
              </div>
              <div className="bg-[#efe7dd] p-4">
                <div className="max-w-[92%] rounded-xl rounded-tl-none bg-white p-3 text-[13px] leading-snug text-gray-900 shadow-sm">
                  <WhatsAppText text={demoOrderMessage(locale, t)} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lp-reveal mt-10 flex justify-center">
          <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-primary lp-cta">
            {t.landing.orderCta}
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function BuildSection({ locale, t }: { locale: Locale; t: Dictionary }) {
  const country = LANDING_DEMO[locale].country;
  const said = t.landing.buildMicSays;
  const points = [t.landing.buildPoint1, t.landing.buildPoint2, format(t.landing.buildPoint3, { free: FREE_ITEM_LIMIT })];
  // The dictated line, read by the builder's own parser.
  const parsed = parseItemLine(said);
  const name = parsed?.name ?? said;
  const priceCents = parsed?.priceCents ?? 0;

  return (
    <section className="border-t border-gray-200/70 bg-[color:var(--color-cream-deep)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-2">
        <div className="lp-reveal min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.buildHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.buildLead}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full bg-[#EDF1E0] text-[#5C6E27]">
                  <CheckIcon size={14} />
                </span>
                <span className="text-gray-700">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lp-reveal card min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base">
              {said}
              <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-gray-700 motion-reduce:animate-none" />
            </span>
            <span className="flex size-11 flex-none scale-110 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
              <MicIcon />
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t.landing.buildMicHint}</p>
          <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
            <span className="flex-1 font-medium">{name}</span>
            <span className="font-bold tabular-nums">{formatPrice(priceCents, country)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const LOOKS: { color: string; band: boolean; font: MenuFont }[] = [
  { color: "#b91c1c", band: false, font: "default" },
  { color: "#15803d", band: true, font: "elegant" },
  { color: "#1d4ed8", band: true, font: "modern" },
  { color: "#7e22ce", band: false, font: "casual" },
];

export function LookSection({ t }: { t: Dictionary }) {
  return (
    <section className="border-t border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="lp-reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.lookHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.lookLead}</p>
        </div>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {LOOKS.map((look) => {
            const { accent, title } = headerColors(look.color);
            const fonts = menuFontFamilies(look.font);
            return (
              <li key={look.font} className="lp-reveal overflow-hidden rounded-2xl border border-gray-200 bg-white pb-5 text-center shadow-sm">
                {look.band ? <div className="h-10" style={{ background: accent }} /> : <div className="h-4" />}
                {/* Stands in for the owner's logo. */}
                <span
                  aria-hidden
                  className={`mx-auto flex size-9 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow ${look.band ? "-mt-5" : ""}`}
                  style={{ background: accent }}
                >
                  {t.landing.demoRestaurant.charAt(0)}
                </span>
                <p className="mt-2 px-2 text-lg font-bold leading-tight" style={{ color: title, fontFamily: fonts.title }}>
                  {t.landing.demoRestaurant}
                </p>
                {!look.band && <div className="mx-auto mt-2 h-0.5 w-10" style={{ background: accent }} />}
                <p className="mt-3 text-xs font-semibold text-gray-500" style={{ fontFamily: fonts.body }}>
                  {t.dashboard.builder.visual.fonts[look.font]} ·{" "}
                  {look.band ? t.dashboard.builder.visual.band : t.dashboard.builder.visual.centered}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function PhotoSection({
  t,
  heroImages,
  heroApps,
}: {
  t: Dictionary;
  heroImages: string[];
  heroApps: SerializableApp[];
}) {
  return (
    <section className="overflow-hidden border-t border-gray-200/70 bg-[color:var(--color-cream-deep)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 md:grid-cols-2">
        <div className="lp-reveal min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.photoHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.photoLead}</p>
        </div>
        <div className="lp-phone-wrap relative min-w-0">
          <div aria-hidden className="lp-phone-halo" />
          {/* The secondary path: a smaller phone on small screens. */}
          <div className="-mb-36 origin-top scale-[0.7] sm:mb-0 sm:scale-100">
            <HeroPhonePreview alt={t.landing.phonePreviewAlt} images={heroImages} apps={heroApps} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function InsightsSection({ t }: { t: Dictionary }) {
  const stats = [
    { label: t.landing.insightsViews, value: 128 },
    { label: t.landing.insightsClicks, value: 34 },
    { label: t.landing.insightsOrders, value: 12 },
  ];
  return (
    <section className="border-t border-gray-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-2">
        <div className="lp-reveal min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.insightsHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.insightsLead}</p>
          <p className="mt-4 font-semibold text-[color:var(--color-navy)]">{t.landing.insightsQr}</p>
        </div>
        <div className="lp-reveal flex min-w-0 flex-col items-center gap-6 sm:flex-row">
          <div className="card w-full flex-1">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--color-navy)]">
              {t.landing.insightsCaption}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {t.landing.demoLabel}
              </span>
            </p>
            <ul className="flex flex-col gap-3">
              {stats.map((s) => (
                <li key={s.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-gray-600">{s.label}</span>
                  <span className="text-2xl font-bold tabular-nums text-[color:var(--color-navy)]">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-[color:var(--color-brand-100)] bg-white p-3">
            <BrandedQrCode
                    embedFont={false}
              value={`${siteUrl()}/m/${t.landing.heroDemoSlug}`}
              title={t.landing.demoRestaurant}
              scanLabel={t.dashboard.qr.scanLabel}
              scanHint=""
              width={150}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
