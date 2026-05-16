import Link from "next/link";
import { auth } from "@/auth";
import { BrandedQrCode } from "@/app/dashboard/branded-qr";
import { HeroPhonePreview } from "@/app/hero-phone-preview";
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

export default async function Home() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const country = await detectCountry(locale);
  const heroImages = mockupImagePaths(regionFromLocale(locale));
  const heroApps = topAppsForCountry(country, 2);
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
    <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-[color:var(--background)]">
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
}: {
  signedIn: boolean;
  t: Dictionary;
  heroImages: string[];
  heroApps: SerializableApp[];
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:py-20 md:grid-cols-[1.05fr_1fr] md:gap-14 md:py-24">
        <div className="flex flex-col gap-6">
          <span className="self-start rounded-full bg-[color:var(--color-brand-50)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-brand-700)]">
            {t.landing.badge}
          </span>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--color-navy)] sm:text-5xl md:text-6xl">
            {t.landing.heroTitleLine1}
            <br />
            <span className="text-[color:var(--color-brand)]">{t.landing.heroTitleLine2}</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-gray-600">
            {t.landing.heroLead}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="btn btn-primary w-full sm:w-auto"
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
            href="/m/demo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-[color:var(--color-brand-50)] px-4 py-2 text-sm font-bold text-[color:var(--color-brand-700)] transition hover:bg-[color:var(--color-brand-100)]"
          >
            {t.landing.heroDemoLink}
          </Link>
        </div>

        <HeroPhonePreview
          alt={t.landing.phonePreviewAlt}
          images={heroImages}
          apps={heroApps}
        />
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
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.featuresHeading}
        </h2>
        <div className="relative grid gap-6 md:grid-cols-3">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[18%] right-[18%] top-[46px] hidden border-t border-dashed border-[color:var(--color-brand-100)] md:block"
          />
          {items.map((it, i) => (
            <article
              key={i}
              className="card relative z-10 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand)] text-base font-bold tabular-nums text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand)]">
                  <it.icon size={22} />
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
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.painHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.painLead}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {pairs.map((p, i) => (
            <li
              key={i}
              className="grid gap-5 rounded-2xl border border-gray-200 bg-[color:var(--color-cream)] p-5 shadow-sm sm:p-6 md:grid-cols-2 md:gap-8"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                  <XIcon size={16} />
                </span>
                <p className="text-base leading-relaxed text-gray-700">
                  {p.pain}
                </p>
              </div>
              <div className="flex items-start gap-3 md:border-l md:border-gray-200 md:pl-8">
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
    <section className="border-t border-gray-200/70 bg-[color:var(--color-brand-50)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {format(t.landing.antiCanvaHeading, { price: priceLabel })}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.antiCanvaLead}</p>
        </div>
        <ul className="grid gap-5 md:grid-cols-2 md:gap-6">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h3 className="text-base font-semibold text-[color:var(--color-navy)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-base font-medium text-[color:var(--color-navy)]">
          {format(t.landing.antiCanvaClosePrefix, { price: priceLabel })}
          <Link
            href="/signup"
            className="font-semibold text-[color:var(--color-brand)] underline decoration-2 underline-offset-4 transition hover:text-[color:var(--color-brand-700)]"
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
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.audienceHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.audienceLead}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div className="rounded-2xl border border-gray-200 bg-[color:var(--color-cream)] p-6 shadow-sm sm:p-7">
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
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-7">
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

  return (
    <section className="border-t border-gray-200/70 bg-[color:var(--color-brand-50)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.testimonialsHeading}
        </h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <li key={i} className="flex">
              <Link
                href={`/m/${it.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={format(t.dashboard.qr.menuQrTitle, { name: it.restaurant })}
                className="card flex w-full flex-col items-center gap-5 text-center transition duration-200 hover:-translate-y-1 hover:border-[color:var(--color-brand)]/50 hover:shadow-lg"
              >
                <BrandedQrCode
                  value={`${siteUrl()}/m/${it.slug}`}
                  title={format(t.dashboard.qr.menuQrTitle, { name: it.restaurant })}
                  scanLabel={t.dashboard.qr.scanLabel}
                  scanHint=""
                  width={170}
                />
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.faqHeading}
        </h2>
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-gray-200 bg-white px-5 py-1 shadow-sm transition open:shadow-md sm:px-6"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-bold text-[color:var(--color-navy)]">
                  {it.q}
                </h3>
                <ChevronDownIcon
                  className="flex-none text-gray-400 transition-transform group-open:rotate-180"
                  size={18}
                />
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
    <section className="border-t border-gray-200/70 bg-[color:var(--background)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-[color:var(--color-brand-100)] bg-[color:var(--color-cream-deep)] px-6 py-12 text-center shadow-sm sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.ctaHeading}
          </h2>
          <p className="max-w-lg text-gray-600">{t.landing.ctaLead}</p>
          <Link href="/signup" className="btn btn-primary">
            {t.common.startFree}
            <ArrowRightIcon size={16} />
          </Link>
          <p className="text-sm text-gray-600">
            {format(t.landing.pricingTeaserLine, {
              free: FREE_IMAGE_LIMIT,
              price: priceLabel,
            })}{" "}
            <Link
              href="/pricing"
              className="font-bold text-[color:var(--color-brand-700)] hover:underline"
            >
              {t.landing.pricingTeaserCta}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="border-t border-gray-200/70 bg-[color:var(--background)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row">
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
