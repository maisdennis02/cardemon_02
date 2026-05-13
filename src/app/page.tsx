import Link from "next/link";
import { auth } from "@/auth";
import { BrandedQrCode } from "@/app/dashboard/branded-qr";
import { HeroPhonePreview } from "@/app/hero-phone-preview";
import { Logo } from "@/components/logo";
import {
  ArrowRightIcon,
  CheckIcon,
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
      <Hero
        signedIn={!!session?.user}
        t={t}
        heroImages={heroImages}
        heroApps={heroApps}
      />
      <PainSolution t={t} />
      <Features t={t} />
      <Examples t={t} />
      <PricingTeaser t={t} priceLabel={priceLabel} />
      <Faq t={t} />
      <BottomCta signedIn={!!session?.user} t={t} />
      <SiteFooter t={t} />
    </div>
  );
}

function SiteHeader({ signedIn, t }: { signedIn: boolean; t: Dictionary }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/pricing" className="btn btn-ghost btn-sm">
            {t.common.pricing}
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              {t.common.dashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
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
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-6">
          <span className="self-start rounded-full bg-[color:var(--color-brand-50)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[color:var(--color-brand-700)]">
            {t.landing.badge}
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[color:var(--color-navy)] sm:text-5xl md:text-6xl">
            {t.landing.heroTitleLine1}
            <br />
            <span className="text-[color:var(--color-brand)]">{t.landing.heroTitleLine2}</span>
          </h1>
          <p className="max-w-md text-lg text-gray-600">{t.landing.heroLead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-primary">
              {signedIn ? t.landing.goToDashboard : t.common.getStarted}
              <ArrowRightIcon size={16} />
            </Link>
            {!signedIn && (
              <Link href="/login" className="btn btn-secondary">
                {t.landing.iHaveAccount}
              </Link>
            )}
          </div>
          <Link
            href="/m/demo"
            target="_blank"
            rel="noreferrer"
            className="self-start text-sm font-bold text-[color:var(--color-brand)] hover:underline"
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
    <section className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.featuresHeading}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={i} className="card flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand)]">
                <it.icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-[color:var(--color-navy)]">
                {it.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PainSolution({ t }: { t: Dictionary }) {
  const pairs = [
    { pain: t.landing.pain1, solution: t.landing.solution1 },
    { pain: t.landing.pain2, solution: t.landing.solution2 },
    { pain: t.landing.pain3, solution: t.landing.solution3 },
    { pain: t.landing.pain4, solution: t.landing.solution4 },
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[color:var(--color-navy)] sm:text-4xl">
            {t.landing.painHeading}
          </h2>
          <p className="mt-4 text-gray-600">{t.landing.painLead}</p>
        </div>
        <div className="flex flex-col gap-4">
          {pairs.map((p, i) => (
            <div
              key={i}
              className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 md:gap-6"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-red-50 text-red-600">
                  <XIcon size={16} />
                </span>
                <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                  {p.pain}
                </p>
              </div>
              <div className="flex items-start gap-3 md:border-l md:border-gray-100 md:pl-6">
                <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-50 text-green-600">
                  <CheckIcon size={16} />
                </span>
                <p className="text-sm leading-relaxed font-medium text-[color:var(--color-navy)] sm:text-base">
                  {p.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Examples({ t }: { t: Dictionary }) {
  const items = [
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
    {
      restaurant: t.landing.testimonial3Restaurant,
      city: t.landing.testimonial3City,
      slug: t.landing.testimonial3Slug,
      quote: t.landing.testimonial3Quote,
      name: t.landing.testimonial3Name,
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-[color:var(--color-brand-50)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.testimonialsHeading}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <figure key={i} className="card flex flex-col items-center gap-5 text-center">
              <BrandedQrCode
                value={`https://menulala.com/m/${it.slug}`}
                title={format(t.dashboard.qr.menuQrTitle, { name: it.restaurant })}
                scanLabel={t.dashboard.qr.scanLabel}
                scanHint=""
                width={180}
              />
              <div>
                <div className="text-base font-bold text-[color:var(--color-navy)]">
                  {it.restaurant}
                </div>
                <div className="text-xs text-gray-500">{it.city}</div>
              </div>
              <blockquote className="w-full border-t border-gray-100 pt-4 text-sm italic leading-relaxed text-gray-600">
                &ldquo;{it.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto text-xs font-medium text-gray-500">
                — {it.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser({
  t,
  priceLabel,
}: {
  t: Dictionary;
  priceLabel: string;
}) {
  return (
    <section className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="text-sm font-medium text-gray-700 sm:text-base">
          {format(t.landing.pricingTeaserLine, {
            free: FREE_IMAGE_LIMIT,
            price: priceLabel,
          })}
          {" "}
          <Link
            href="/pricing"
            className="font-bold text-[color:var(--color-brand)] hover:underline"
          >
            {t.landing.pricingTeaserCta}
          </Link>
        </p>
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
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--color-navy)] sm:text-4xl">
          {t.landing.faqHeading}
        </h2>
        <div className="flex flex-col gap-4">
          {items.map((it, i) => (
            <div key={i} className="card">
              <h3 className="mb-2 text-base font-bold text-[color:var(--color-navy)]">
                {it.q}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCta({ signedIn, t }: { signedIn: boolean; t: Dictionary }) {
  if (signedIn) return null;
  return (
    <section className="bg-[color:var(--color-navy)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">{t.landing.ctaHeading}</h2>
        <p className="max-w-lg text-gray-300">{t.landing.ctaLead}</p>
        <Link href="/signup" className="btn btn-primary">
          {t.common.getStarted}
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span>·</span>
          <span>{t.landing.footerTagline}</span>
        </div>
        <p>© {new Date().getFullYear()} menulala</p>
      </div>
    </footer>
  );
}
