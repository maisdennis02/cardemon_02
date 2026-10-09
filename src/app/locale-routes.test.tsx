import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCALES,
  OG_LOCALE,
  PREFIXED_LOCALES,
  format,
  localizedPath,
  type Locale,
} from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import {
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  currencyForLocale,
  pricesFor,
} from "@/lib/pricing";
import { NOINDEX_PATHS, PUBLIC_PAGES } from "@/lib/seo";

// One URL per language for every public page: English un-prefixed (served by
// (main), which negotiates the language), Portuguese and Spanish under
// /pt-BR and /es (served by (localized)/[locale], static). These tests hold
// the contract between the two: canonicals, hreflang, <html lang>, links.

const state = vi.hoisted(() => ({ locale: "en" as string }));
const findMany = vi.hoisted(() => vi.fn());

// Only the request-reading half of @/i18n is replaced; if a per-language
// route ever calls getLocale(), it gets `state.locale` ("en" by default)
// instead of its path locale and the assertions below fail.
vi.mock("@/i18n", async () => {
  const dictionaries = {
    en: (await import("@/i18n/dictionaries/en")).default,
    "pt-BR": (await import("@/i18n/dictionaries/pt-BR")).default,
    es: (await import("@/i18n/dictionaries/es")).default,
  };
  return {
    getLocale: async () => state.locale,
    getDictionary: async (locale: Locale) => dictionaries[locale],
  };
});
vi.mock("@/auth", () => ({ auth: async () => null, signOut: vi.fn(), signIn: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { restaurant: { findMany } } }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font, Playfair_Display: font, Kalam: font };
});
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));

const DICTS = { en, "pt-BR": ptBR, es } as const;
const APP_DIR = fileURLToPath(new URL(".", import.meta.url));
const LOCALIZED_DIR = join(APP_DIR, "(localized)/[locale]");
const BASE = "https://menulala.com";
const PATHS = PUBLIC_PAGES.map((p) => p.path);

beforeEach(() => {
  vi.stubEnv("APP_URL", BASE);
  state.locale = "en";
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

type RouteModule = {
  generateMetadata: (props: { params: Promise<{ locale: string }> }) => Promise<Metadata>;
  default: (props: never) => Promise<ReactElement> | ReactElement;
};

const unprefixedRoutes: Record<string, () => Promise<unknown>> = {
  "/": () => import("./(main)/page"),
  "/pricing": () => import("./(main)/pricing/page"),
  "/privacy": () => import("./(main)/privacy/page"),
  "/terms": () => import("./(main)/terms/page"),
};
const localizedRoutes: Record<string, () => Promise<unknown>> = {
  "/": () => import("./(localized)/[locale]/page"),
  "/pricing": () => import("./(localized)/[locale]/pricing/page"),
  "/privacy": () => import("./(localized)/[locale]/privacy/page"),
  "/terms": () => import("./(localized)/[locale]/terms/page"),
};

const paramsFor = (locale: string) => ({ params: Promise.resolve({ locale }) });

// Metadata of the page that OWNS the URL of `path` in `locale`: the
// un-prefixed route for English, the per-language route otherwise.
async function ownMetadata(path: string, locale: Locale): Promise<Metadata> {
  if (locale === "en") {
    state.locale = "en";
    return ((await unprefixedRoutes[path]()) as RouteModule).generateMetadata(paramsFor("en"));
  }
  // Left at "en" on purpose: the path, not the negotiation, must decide.
  state.locale = "en";
  return ((await localizedRoutes[path]()) as RouteModule).generateMetadata(paramsFor(locale));
}

function expectedCopy(path: string, locale: Locale): { title: unknown; description: string } {
  const t = DICTS[locale];
  const prices = pricesFor(currencyForLocale(locale));
  switch (path) {
    case "/":
      return { title: { absolute: t.metadata.rootTitle }, description: t.metadata.rootDescription };
    case "/pricing":
      return {
        title: t.metadata.pricingTitle,
        description: format(t.metadata.pricingDescription, {
          free: FREE_IMAGE_LIMIT,
          pro: PRO_IMAGE_LIMIT,
          price: `${prices.symbol}${prices.monthly}`,
        }),
      };
    case "/privacy":
      return { title: t.common.privacyPolicy, description: t.metadata.privacyDescription };
    case "/terms":
      return { title: t.common.termsOfService, description: t.metadata.termsDescription };
    default:
      throw new Error(`no expected copy for ${path}`);
  }
}

const hreflangOf = (meta: Metadata) => meta.alternates?.languages as Record<string, string>;

const MATRIX = PATHS.flatMap((path) => LOCALES.map((locale) => [path, locale] as const));

describe("the test covers every public page", () => {
  it("has a route of each kind for every public page", () => {
    expect(Object.keys(unprefixedRoutes).sort()).toEqual([...PATHS].sort());
    expect(Object.keys(localizedRoutes).sort()).toEqual([...PATHS].sort());
  });
});

describe.each(MATRIX)("%s in %s", (path, locale) => {
  const url = localizedPath(locale, path);

  it("is its own canonical", async () => {
    const meta = await ownMetadata(path, locale);
    expect(meta.alternates?.canonical).toBe(url);
    expect(meta.openGraph?.url).toBe(url);
  });

  it("carries the full hreflang set, self-referencing", async () => {
    const languages = hreflangOf(await ownMetadata(path, locale));
    expect(languages).toEqual({
      en: path,
      "pt-BR": localizedPath("pt-BR", path),
      es: localizedPath("es", path),
      "x-default": path,
    });
    expect(languages[locale]).toBe(url);
  });

  it("is named back by every one of its translations", async () => {
    const own = hreflangOf(await ownMetadata(path, locale));
    for (const other of LOCALES) {
      const theirs = hreflangOf(await ownMetadata(path, other));
      expect(theirs[locale], `${other} → ${locale}`).toBe(url);
      expect(theirs).toEqual(own);
    }
  });

  it("has og:locale, title and description of its own language", async () => {
    const meta = await ownMetadata(path, locale);
    const expected = expectedCopy(path, locale);
    expect(meta.openGraph).toMatchObject({ locale: OG_LOCALE[locale] });
    expect(meta.title).toEqual(expected.title);
    expect(meta.description).toBe(expected.description);
    expect(meta.openGraph).toMatchObject({ description: expected.description });
  });

  it("is in the sitemap", async () => {
    const { default: sitemap } = await import("./sitemap");
    const entry = (await sitemap()).find((e) => e.url === `${BASE}${url}`);
    expect(entry, url).toBeDefined();
    expect(Object.keys(entry!.alternates!.languages!).sort()).toEqual([...LOCALES, "x-default"].sort());
  });
});

describe("hreflang URLs are absolute on the canonical host", () => {
  it.each([
    ["(main)", () => import("./(main)/layout"), {}],
    ["(localized)/[locale]", () => import("./(localized)/[locale]/layout"), paramsFor("pt-BR")],
  ] as const)("the %s layout supplies metadataBase and nothing to inherit", async (_name, load, props) => {
    const mod = (await load()) as unknown as { generateMetadata: (p: unknown) => Promise<Metadata> };
    const meta = await mod.generateMetadata(props);
    // Relative canonical/hreflang values are resolved against this by Next.
    expect(String(meta.metadataBase)).toBe(`${BASE}/`);
    expect(meta.alternates).toBeUndefined();
    expect(meta.openGraph?.url).toBeUndefined();
  });

  it.each(MATRIX)("%s in %s resolves to https://menulala.com/…", async (path, locale) => {
    const meta = await ownMetadata(path, locale);
    const values = [meta.alternates!.canonical as string, ...Object.values(hreflangOf(meta))];
    for (const value of values) {
      expect(value.startsWith("/")).toBe(true);
      expect(new URL(value, `${BASE}/`).origin).toBe(BASE);
    }
  });
});

// What a Brazilian visitor (or anyone with a cookie / Accept-Language) gets
// at the un-prefixed URL: the same page as before, whose canonical now names
// the URL that owns that language.
describe.each(PREFIXED_LOCALES)("an un-prefixed URL negotiated into %s", (locale) => {
  it.each(PATHS)("%s canonicalises to its per-language URL", async (path) => {
    state.locale = locale;
    const meta = await ((await unprefixedRoutes[path]()) as RouteModule).generateMetadata(paramsFor(locale));
    expect(meta.alternates?.canonical).toBe(localizedPath(locale, path));
    expect(meta.alternates?.canonical).not.toBe(path);
    expect(meta.openGraph?.url).toBe(localizedPath(locale, path));
    // Same hreflang set and same copy as the page it points at.
    expect(hreflangOf(meta)).toEqual(hreflangOf(await ownMetadata(path, locale)));
    expect(meta.description).toBe(expectedCopy(path, locale).description);
  });
});

// --- Rendered HTML -----------------------------------------------------------

async function renderLocalized(path: string, locale: string): Promise<string> {
  const layout = (await import("./(localized)/[locale]/layout")).default;
  const page = ((await localizedRoutes[path]()) as RouteModule).default;
  const children = await page(paramsFor(locale) as never);
  return renderToStaticMarkup(await layout({ children, ...paramsFor(locale) }));
}

const internalLinks = (html: string) =>
  [...new Set([...html.matchAll(/<a [^>]*href="(\/[^"]*)"/g)].map((m) => m[1]))].sort();

describe.each(PREFIXED_LOCALES)("pages under /%s", (locale) => {
  beforeEach(() => {
    // Whatever would be negotiated must not leak into a per-language page.
    state.locale = locale === "es" ? "pt-BR" : "es";
  });

  it.each(PATHS)("%s renders <html lang> and copy from the path locale", async (path) => {
    const html = await renderLocalized(path, locale);
    expect(html).toContain(`<html lang="${locale}"`);
    expect(html).toContain(DICTS[locale].common.termsOfService);
  });

  it.each(PATHS)("%s keeps its links inside the locale", async (path) => {
    const links = internalLinks(await renderLocalized(path, locale));
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      const insideLocale = href === `/${locale}` || href.startsWith(`/${locale}/`);
      // Pages that exist at one URL only: sign-in screens and public menus.
      const singleUrl = (NOINDEX_PATHS as readonly string[]).includes(href) || href.startsWith("/m/");
      expect(insideLocale || singleUrl, `${href} on /${locale}${path}`).toBe(true);
    }
    // In particular, never a link to the un-prefixed twin of a public page.
    for (const publicPath of PATHS) expect(links).not.toContain(publicPath);
  });

  it("the landing links to the per-language pricing, privacy and terms", async () => {
    const links = internalLinks(await renderLocalized("/", locale));
    expect(links).toEqual(
      expect.arrayContaining([`/${locale}`, `/${locale}/pricing`, `/${locale}/privacy`, `/${locale}/terms`]),
    );
  });

  // Static pages read no session: always the signed-out view, and the
  // pricing page never posts to Stripe from here.
  it("renders the signed-out view, with no checkout form", async () => {
    const landing = await renderLocalized("/", locale);
    expect(internalLinks(landing)).toContain("/signup");
    expect(internalLinks(landing)).not.toContain("/dashboard");
    const pricing = await renderLocalized("/pricing", locale);
    expect(pricing).not.toContain("/api/stripe");
    expect(internalLinks(pricing)).toContain("/signup");
  });
});

describe("the un-prefixed pages keep un-prefixed links", () => {
  it.each(LOCALES)("the landing rendered in %s", async (locale) => {
    const { SiteDocument } = await import("@/components/site-document");
    const { LandingPage } = await import("./(main)/landing-page");
    const html = renderToStaticMarkup(
      <SiteDocument locale={locale} dictionary={DICTS[locale]} pathPrefix="">
        <LandingPage locale={locale} t={DICTS[locale]} signedIn={false} country="BR" pathPrefix="" />
      </SiteDocument>,
    );
    expect(html).toContain(`<html lang="${locale}"`);
    const links = internalLinks(html);
    expect(links).toEqual(expect.arrayContaining(["/", "/pricing", "/privacy", "/terms", "/signup", "/login"]));
    for (const href of links) expect(href).not.toMatch(/^\/(pt-BR|es)(\/|$)/);
  });

  it("the (main) layout passes the negotiated locale and no prefix", async () => {
    state.locale = "pt-BR";
    const layout = (await import("./(main)/layout")).default;
    const html = renderToStaticMarkup(await layout({ children: null }));
    expect(html).toContain('<html lang="pt-BR"');
    expect(internalLinks(html)).toEqual(["/privacy", "/terms"]);
  });
});

// --- Route structure ---------------------------------------------------------

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

describe("which routes have language variants", () => {
  const localizedPages = files(LOCALIZED_DIR)
    .filter((f) => f.endsWith(`${sep}page.tsx`))
    .map((f) => `/${relative(LOCALIZED_DIR, f).split(sep).slice(0, -1).join("/")}`);

  it("exactly the public pages — no sign-in screen, dashboard or menu", () => {
    expect(localizedPages.sort()).toEqual([...PATHS].sort());
    for (const page of localizedPages) {
      expect(page).not.toMatch(/login|signup|password|dashboard|^\/m(\/|$)/);
    }
  });

  it("only the two prefixed locales exist; anything else is a 404", async () => {
    const layout = await import("./(localized)/[locale]/layout");
    expect(layout.dynamicParams).toBe(false);
    expect(layout.generateStaticParams()).toEqual([{ locale: "pt-BR" }, { locale: "es" }]);
    expect(layout.generateStaticParams().map((p) => p.locale)).not.toContain("en");

    const { localeFromParams } = await import("./(localized)/[locale]/locale");
    for (const bad of ["en", "fr", "pt-br", "pt", "dashboard", "login", "m"]) {
      await expect(localeFromParams(Promise.resolve({ locale: bad })), bad).rejects.toThrow();
    }
    await expect(localeFromParams(Promise.resolve({ locale: "pt-BR" }))).resolves.toBe("pt-BR");
  });

  it("the menu route has no locale twin and the proxy knows no locale path", () => {
    const proxy = readFileSync(join(APP_DIR, "../proxy.ts"), "utf8");
    expect(proxy).not.toMatch(/pt-BR|\[locale\]|\/es\b/);
    expect(files(LOCALIZED_DIR).some((f) => f.includes(`${sep}m${sep}`))).toBe(false);
  });
});

// The per-language pages are static: the locale comes from the path. One
// request-time call anywhere in their module graph and Next silently turns
// them dynamic (the build would show ƒ instead of ●).
describe("per-language routes never read the request", () => {
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  const FORBIDDEN =
    /\bcookies\(|\bheaders\(|\bgetLocale\b|\bdetectCountry\b|\bauth\(|next\/headers|from "@\/auth"|@\/lib\/prisma|searchParams/;

  const routeFiles = files(LOCALIZED_DIR).filter((f) => /\.tsx?$/.test(f));
  // Everything those routes render that lives outside their folder.
  const sharedFiles = [
    "(main)/landing-page.tsx",
    "(main)/pricing/pricing-content.tsx",
    "(main)/pricing/plans.tsx",
    "(main)/privacy/content.ts",
    "(main)/terms/content.ts",
    "../components/site-document.tsx",
    "../components/legal-article.tsx",
    "../components/logo.tsx",
    "../lib/seo.ts",
    "../i18n/config.ts",
  ].map((f) => join(APP_DIR, f));

  it("finds the route files", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(6);
  });

  it.each([...routeFiles, ...sharedFiles].map((f) => [relative(APP_DIR, f), f] as const))(
    "%s",
    (_name, file) => {
      expect(code(file)).not.toMatch(FORBIDDEN);
    },
  );

  it("every local import of a per-language route is in the checked list", () => {
    const checked = new Set([...routeFiles, ...sharedFiles].map((f) => f.replace(/\.tsx?$/, "")));
    // Modules that only export data/pure helpers, or that the menu route
    // (also static) already imports.
    const allowed = [
      "@/i18n", // getDictionary only; getLocale is caught by FORBIDDEN
      "@/lib/hero-mockup", // countryForLocale only; detectCountry is caught by FORBIDDEN
      "@/lib/site",
    ];
    for (const file of routeFiles) {
      for (const [, spec] of code(file).matchAll(/from "([^"]+)"/g)) {
        if (!spec.startsWith("@/") && !spec.startsWith(".")) continue;
        if (allowed.includes(spec)) continue;
        const resolved = spec.startsWith("@/")
          ? join(APP_DIR, "..", spec.slice(2))
          : join(file, "..", spec);
        expect(checked.has(resolved), `${relative(APP_DIR, file)} imports ${spec}`).toBe(true);
      }
    }
  });
});
