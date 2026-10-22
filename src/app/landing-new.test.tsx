import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import type { Locale } from "@/i18n/config";
import { demoOrderMessage } from "@/lib/landing-demo";
import { FREE_ITEM_LIMIT } from "@/lib/pricing";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font, Playfair_Display: font, Kalam: font };
});
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));

const DICTS = { en, "pt-BR": ptBR, es } as const;

async function landingText(locale: Locale): Promise<string> {
  const { LandingPage } = await import("./(main)/landing-page");
  const country = { en: "US", "pt-BR": "BR", es: "MX" }[locale] as "US" | "BR" | "MX";
  const html = renderToStaticMarkup(
    <LandingPage locale={locale} t={DICTS[locale]} signedIn={false} country={country} pathPrefix="" />,
  );
  return html
    .replace(/<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe.each(["pt-BR", "es", "en"] as const)("the new landing (%s)", (locale) => {
  const t = DICTS[locale];

  it("leads with the text menu and WhatsApp orders", async () => {
    const text = await landingText(locale);
    expect(text).toContain(t.landing.heroTitleLine1);
    expect(text).toContain(t.landing.heroTitleLine2);
    for (const heading of [
      t.landing.featuresHeading,
      t.landing.orderHeading,
      t.landing.buildHeading,
      t.landing.lookHeading,
      t.landing.photoHeading,
      t.landing.insightsHeading,
      t.landing.audienceHeading,
      t.landing.faqHeading,
      t.landing.ctaHeading,
    ]) {
      expect(text, heading).toContain(heading);
    }
  });

  it("shows the WhatsApp message the product actually sends", async () => {
    const text = await landingText(locale);
    // Bold markers are drawn as bold, so compare without them.
    for (const line of demoOrderMessage(locale, t).replace(/\*/g, "").split("\n").filter(Boolean)) {
      expect(text, line).toContain(line.replace(/\s+/g, " ").trim());
    }
  });

  it("no longer says it isn't for restaurants that take orders", () => {
    const notForYou = [t.landing.audienceNo1, t.landing.audienceNo2, t.landing.audienceNo3, t.landing.audienceNo4].join(" ");
    expect(notForYou).not.toMatch(/receber e gerenciar pedidos|recibir y gestionar pedidos|receive and manage orders/i);
  });

  it("states the free plan in items", async () => {
    const text = await landingText(locale);
    expect(text).toContain(String(FREE_ITEM_LIMIT));
    expect(t.landing.pricingTeaserLine).toContain("{freeItems}");
    expect(t.landing.faq4A).toContain("{freeItems}");
  });
});

describe("the hero phone", () => {
  it("shows a logo on the band, the way a real text menu does", async () => {
    const { TextMenuPhone } = await import("./(main)/landing-sections");
    const html = renderToStaticMarkup(<TextMenuPhone locale="pt-BR" t={ptBR} />);
    expect(html).toContain('data-demo-logo=""');
  });

  it("lies on the plain grey page, like the example menu it links to", async () => {
    const { TextMenuPhone } = await import("./(main)/landing-sections");
    const html = renderToStaticMarkup(<TextMenuPhone locale="pt-BR" t={ptBR} />);
    expect(html).toContain("background-color:#f5f4f1");
    expect(html).not.toContain("background-image");
  });

  it("draws each item as the public page does: a card reading name, then price, then +", async () => {
    const { TextMenuPhone } = await import("./(main)/landing-sections");
    const { LANDING_DEMO } = await import("@/lib/landing-demo");
    const html = renderToStaticMarkup(<TextMenuPhone locale="pt-BR" t={ptBR} />);
    const { formatPrice } = await import("@/lib/menu");
    const demo = LANDING_DEMO["pt-BR"];
    const first = demo.menu.sections[0]!.items[0]!;
    const price = formatPrice(first.priceCents!, demo.country);
    const card = html.match(/<li\b[\s\S]*?<\/li>/)?.[0] ?? "";
    const at = (s: string) => card.indexOf(s);
    expect(at(first.name), card).toBeGreaterThanOrEqual(0);
    expect(at(first.name)).toBeLessThan(at(price));
    // The round control after the price: "+" or, for the item already in the
    // demo order, its quantity.
    expect(at(price)).toBeLessThan(at("rounded-full"));
    // Section titles read as headings, not as tiny tracked-out caps.
    expect(html).not.toMatch(/uppercase[^>]*>Lanches/);
  });
});
