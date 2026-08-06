import Link from "next/link";
import { auth } from "@/auth";
import { BrandedQrCode } from "./dashboard/branded-qr";
import { HeroPhonePreview } from "./hero-phone-preview";
import { Logo } from "@/components/logo";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  PhoneIcon,
  ShareIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n";
import { format } from "@/i18n/config";
import {
  detectCountry,
  mockupImagePaths,
  regionFromLocale,
  topAppsForCountry,
  type SerializableApp,
} from "@/lib/hero-mockup";
import {
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  currencyForLocale,
  pricesFor,
} from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import "./landing.css";

export default async function Home() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const country = await detectCountry(locale);
  const heroImages = mockupImagePaths(regionFromLocale(locale));
  const heroApps = topAppsForCountry(country, 2);
  const deliveryStrip = topAppsForCountry(country, 4);
  const prices = pricesFor(currencyForLocale(locale));
  const priceLabel = `${prices.symbol}${prices.monthly}`;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={!!session?.user} t={t} />
      <main className="flex flex-col">
        <Hero
          signedIn={!!session?.user}
          t={t}
          heroImages={heroImages}
          heroApps={heroApps}
          deliveryStrip={deliveryStrip}
        />
        <PainSolution t={t} />
        <AntiCanva t={t} priceLabel={priceLabel} />
        <Features t={t} />
        <Audience t={t} />
        <Examples t={t} />
        <Faq t={t} />
        <BottomCta signedIn={!!session?.user} t={t} priceLabel={priceLabel} />
      </main>
      <SiteFooter t={t} />
    </div>
  );
}

function SiteHeader({ signedIn, t }: { signedIn: boolean; t: Dictionary }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-navy)]/10 bg-[color:var(--background)]/80 backdrop-blur-md">
      <div
        aria-hidden
        className="h-0.5 bg-[linear-gradient(90deg,var(--color-brand),#e09a3c_50%,var(--color-brand))]"
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className="hidden min-h-11 items-center rounded-full px-3 py-2 text-sm font-bold text-[color:var(--color-navy)] hover:bg-gray-100 sm:inline-flex"
          >
            {t.common.pricing}
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              {t.common.dashboard}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-bold text-[color:var(--color-navy)] hover:bg-gray-100"
              >
                {t.common.logIn}
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                {t.common.getStarted}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({
  signedIn,
  t,
  heroImages,
  heroApps,
  deliveryStrip,
}: {
  signedIn: boolean;
  t: Dictionary;
  heroImages: string[];
  heroApps: SerializableApp[];
  deliveryStrip: SerializableApp[];
}) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="lp-grain absolute inset-0" />
      <div aria-hidden className="lp-dotgrid absolute inset-0" />
      <div
        aria-hidden
        className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(200,70,48,0.16),transparent_62%)]"
      />
      <div
        aria-hidden
        className="absolute -right-40 top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(224,154,60,0.18),transparent_62%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 md:grid-cols-[1.05fr_1fr] md:gap-14 md:py-28">
        <div className="flex min-w-0 flex-col gap-6">
          <span className="inline-flex items-center gap-2.5 self-start rounded-full border border-[color:var(--color-brand)]/20 bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--color-brand-700)] shadow-sm backdrop-blur">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-brand)] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-brand)]" />
            </span>
            {t.landing.badge}
          </span>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--color-navy)] sm:text-6xl lg:text-7xl">
            {t.landing.heroTitleLine1}
            <br />
            <span className="relative inline-block text-[color:var(--color-brand)]">
              {t.landing.heroTitleLine2}
              <svg
                aria-hidden
                className="lp-squiggle"
                viewBox="0 0 220 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M3 9C43 3 93 2.5 217 6"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-gray-600">
            {t.landing.heroLead}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="btn btn-primary lp-cta w-full sm:w-auto"
            >
              {signedIn ? t.landing.goToDashboard : t.common.startFree}
              <ArrowRightIcon size={16} />
            </Link>
            {!signedIn && (
              <Link href="/login" className="btn btn-secondary w-full sm:w-auto">
                {t.landing.iHaveAccount}
              </Link>
            )}
          </div>
          <Link
            href="/m/cavalo-marinho"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-[color:var(--color-brand)]/15 bg-[color:var(--color-brand-50)] px-4 py-2 text-sm font-bold text-[color:var(--color-brand-700)] transition hover:border-[color:var(--color-brand)]/30 hover:bg-[color:var(--color-brand-100)]"
          >
            {t.landing.heroDemoLink}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
              {t.landing.heroDeliveryLine}
            </span>
            <ul className="flex items-center gap-1.5">
              {deliveryStrip.map((app) => (
                <li
                  key={app.id}
                  title={app.displayName}
                  style={{ backgroundColor: app.brandColor }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {app.logoPath && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={app.logoPath}
                      alt={app.displayName}
                      className="h-4 w-4 object-contain"
                      style={
                        app.logoMatchesBrandColor
                          ? { filter: "brightness(0) invert(1)" }
                          : undefined
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lp-phone-wrap relative min-w-0">
          <div aria-hidden className="lp-phone-halo" />
          <div aria-hidden className="lp-phone-ring" />
          <div className="lp-phone-float">
            <div className="lp-phone-tilt">
              <HeroPhonePreview
                alt={t.landing.phonePreviewAlt}
                images={heroImages}
                apps={heroApps}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features({ t }: { t: Dictionary }) {
  const items = [
    { icon: UploadIcon, title: t.landing.feature1Title, body: t.landing.feature1Body },
    { icon: ShareIcon, title: t.landing.feature2Title, body: t.landing.feature2Body },
    { icon: PhoneIcon, title: t.landing.feature3Title, body: t.landing.feature3Body },
  ];

  return (
    <section className="border-t border-gray-200/70 bg-[color:var(--color-cream-deep)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <h2 className="lp-reveal mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.featuresHeading}
        </h2>
        <div className="relative grid gap-6 md:grid-cols-3">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[18%] right-[18%] top-[52px] hidden border-t-2 border-dashed border-[color:var(--color-brand-100)] md:block"
          />
          {items.map((it, i) => (
            <article
              key={i}
              className="card lp-reveal relative z-10 flex flex-col gap-4 overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span aria-hidden className="lp-ghost-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-700))] text-white shadow-md shadow-[color:var(--color-brand)]/25">
                  <it.icon size={22} />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-brand-700)] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[color:var(--color-navy)]">
                {it.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PainSolution({ t }: { t: Dictionary }) {
  const pairs = [
    { pain: t.landing.pain1, solution: t.landing.solution1 },
    { pain: t.landing.pain3, solution: t.landing.solution3 },
    { pain: t.landing.pain4, solution: t.landing.solution4 },
    { pain: t.landing.pain5, solution: t.landing.solution5 },
    { pain: t.landing.pain6, solution: t.landing.solution6 },
  ];

  return (
    <section className="border-t border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="lp-reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.painHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.painLead}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {pairs.map((p, i) => (
            <li
              key={i}
              className="lp-reveal grid gap-5 rounded-2xl border border-gray-200/80 bg-[color:var(--color-cream)] p-5 shadow-sm transition duration-300 hover:border-[color:var(--color-brand-100)] hover:shadow-md sm:p-6 md:grid-cols-[1fr_auto_1fr] md:gap-6"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                  <XIcon size={16} />
                </span>
                <p className="text-base leading-relaxed text-gray-700">
                  {p.pain}
                </p>
              </div>
              <div aria-hidden className="hidden items-center md:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--color-brand)] shadow-sm ring-1 ring-[color:var(--color-brand-100)]">
                  <ArrowRightIcon size={16} />
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#EDF1E0] text-[#5C6E27]">
                  <CheckIcon size={16} />
                </span>
                <p className="text-base font-medium leading-relaxed text-[color:var(--color-navy)]">
                  {p.solution}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AntiCanva({ t, priceLabel }: { t: Dictionary; priceLabel: string }) {
  const items = [
    { title: t.landing.antiCanva1Title, body: t.landing.antiCanva1Body },
    { title: t.landing.antiCanva2Title, body: t.landing.antiCanva2Body },
    { title: t.landing.antiCanva3Title, body: t.landing.antiCanva3Body },
    { title: t.landing.antiCanva4Title, body: t.landing.antiCanva4Body },
  ];

  return (
    <section className="lp-dark relative overflow-hidden bg-[color:var(--color-navy)]">
      <div aria-hidden className="lp-grain absolute inset-0" />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(200,70,48,0.35),transparent)] blur-2xl"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="lp-reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {format(t.landing.antiCanvaHeading, { price: priceLabel })}
          </h2>
          <p className="mt-4 text-white/70">{t.landing.antiCanvaLead}</p>
        </div>
        <ul className="grid gap-5 md:grid-cols-2 md:gap-6">
          {items.map((item, i) => (
            <li
              key={i}
              className="lp-reveal rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[color:var(--color-brand)]/60 hover:bg-white/[0.08] sm:p-6"
            >
              <h3 className="text-base font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="lp-reveal mt-10 text-center text-base font-medium text-white/85">
          {format(t.landing.antiCanvaClosePrefix, { price: priceLabel })}
          <Link
            href="/signup"
            className="font-semibold text-[color:var(--color-brand-100)] underline decoration-2 underline-offset-4 transition hover:text-white"
          >
            {t.landing.antiCanvaCloseCta}
          </Link>
          {t.landing.antiCanvaCloseSuffix}
        </p>
      </div>
    </section>
  );
}

function Audience({ t }: { t: Dictionary }) {
  const yes = [
    t.landing.audienceYes1,
    t.landing.audienceYes2,
    t.landing.audienceYes3,
    t.landing.audienceYes4,
  ];
  const no = [
    t.landing.audienceNo1,
    t.landing.audienceNo2,
    t.landing.audienceNo3,
    t.landing.audienceNo4,
  ];

  return (
    <section className="border-t border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="lp-reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.audienceHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.audienceLead}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="lp-reveal rounded-3xl border border-[#E3EAC9] bg-[#F7FAEC] p-6 shadow-sm sm:p-8">
            <h3 className="mb-4 text-base font-semibold text-[color:var(--color-navy)]">
              {t.landing.audienceYesHeading}
            </h3>
            <ul className="flex flex-col gap-3">
              {yes.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#EDF1E0] text-[#5C6E27]">
                    <CheckIcon size={14} />
                  </span>
                  <p className="text-sm leading-relaxed text-gray-700">{item}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-reveal rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
            <h3 className="mb-4 text-base font-semibold text-[color:var(--color-navy)]">
              {t.landing.audienceNoHeading}
            </h3>
            <ul className="flex flex-col gap-3">
              {no.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gray-200 text-gray-500">
                    <XIcon size={14} />
                  </span>
                  <p className="text-sm leading-relaxed text-gray-700">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Examples({ t }: { t: Dictionary }) {
  const items = [
    {
      restaurant: t.landing.testimonial3Restaurant,
      city: t.landing.testimonial3City,
      slug: t.landing.testimonial3Slug,
      quote: t.landing.testimonial3Quote,
      name: t.landing.testimonial3Name,
    },
    {
      restaurant: t.landing.testimonial1Restaurant,
      city: t.landing.testimonial1City,
      slug: t.landing.testimonial1Slug,
      quote: t.landing.testimonial1Quote,
      name: t.landing.testimonial1Name,
    },
    {
      restaurant: t.landing.testimonial2Restaurant,
      city: t.landing.testimonial2City,
      slug: t.landing.testimonial2Slug,
      quote: t.landing.testimonial2Quote,
      name: t.landing.testimonial2Name,
    },
  ];
  const tilts = ["md:-rotate-2", "md:rotate-[1.5deg]", "md:-rotate-1"];

  return (
    <section className="overflow-hidden border-t border-gray-200/70 bg-[color:var(--color-brand-50)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <h2 className="lp-reveal mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.testimonialsHeading}
        </h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <li key={i} className="lp-reveal flex">
              <Link
                href={`/m/${it.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={format(t.dashboard.qr.menuQrTitle, { name: it.restaurant })}
                className={`card flex w-full flex-col items-center gap-5 rounded-3xl text-center transition duration-300 ${tilts[i]} hover:-translate-y-2 hover:border-[color:var(--color-brand)]/50 hover:shadow-xl md:hover:rotate-0`}
              >
                <div className="rounded-2xl border-2 border-dashed border-[color:var(--color-brand-100)] bg-white p-3">
                  <BrandedQrCode
                    value={`${siteUrl()}/m/${it.slug}`}
                    title={format(t.dashboard.qr.menuQrTitle, { name: it.restaurant })}
                    scanLabel={t.dashboard.qr.scanLabel}
                    scanHint=""
                    width={170}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-base font-bold text-[color:var(--color-navy)]">
                    {it.restaurant}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    {it.city}
                  </div>
                </div>
                <blockquote className="relative w-full border-t border-gray-100 pt-4 text-sm italic leading-relaxed text-gray-600">
                  <span
                    aria-hidden
                    className="absolute -top-1 left-1/2 -translate-x-1/2 bg-white px-2 font-serif text-2xl leading-none text-[color:var(--color-brand)]"
                  >
                    &ldquo;
                  </span>
                  {it.quote}
                </blockquote>
                <div className="mt-auto text-xs font-medium text-gray-500">
                  — {it.name}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq({ t }: { t: Dictionary }) {
  const items = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    {
      q: t.landing.faq4Q,
      a: format(t.landing.faq4A, { free: FREE_IMAGE_LIMIT, pro: PRO_IMAGE_LIMIT }),
    },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
    { q: t.landing.faq6Q, a: t.landing.faq6A },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className="border-t border-gray-200/70 bg-[color:var(--background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h2 className="lp-reveal mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.faqHeading}
        </h2>
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <details
              key={i}
              className="lp-reveal group rounded-2xl border border-gray-200 bg-white px-5 py-1 shadow-sm transition open:border-[color:var(--color-brand)]/40 open:shadow-md sm:px-6"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-bold text-[color:var(--color-navy)]">
                  {it.q}
                </h3>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] transition-transform duration-300 group-open:rotate-180">
                  <ChevronDownIcon size={16} />
                </span>
              </summary>
              <p className="pb-4 pr-8 text-sm leading-relaxed text-gray-600">
                {it.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCta({
  signedIn,
  t,
  priceLabel,
}: {
  signedIn: boolean;
  t: Dictionary;
  priceLabel: string;
}) {
  if (signedIn) return null;
  return (
    <section className="bg-[color:var(--background)]">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <div className="lp-reveal relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#d95b3a,var(--color-brand)_45%,var(--color-brand-700))] px-6 py-14 text-center shadow-2xl sm:px-12 sm:py-16">
          <div aria-hidden className="lp-grain absolute inset-0 opacity-10" />
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-5">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.landing.ctaHeading}
            </h2>
            <p className="max-w-lg text-white/85">{t.landing.ctaLead}</p>
            <Link
              href="/signup"
              className="btn bg-white text-[color:var(--color-brand-700)] shadow-lg hover:-translate-y-0.5 hover:bg-[color:var(--color-brand-50)]"
            >
              {t.common.startFree}
              <ArrowRightIcon size={16} />
            </Link>
            <p className="text-sm text-white/80">
              {format(t.landing.pricingTeaserLine, {
                free: FREE_IMAGE_LIMIT,
                price: priceLabel,
              })}{" "}
              <Link
                href="/pricing"
                className="font-bold text-white underline decoration-2 underline-offset-4 hover:text-white/90"
              >
                {t.landing.pricingTeaserCta}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="lp-footer bg-[color:var(--color-navy)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-white/60 sm:flex-row">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span aria-hidden>·</span>
          <span>{t.landing.footerTagline}</span>
        </div>
        <p>© {new Date().getFullYear()} menulala</p>
      </div>
    </footer>
  );
}
