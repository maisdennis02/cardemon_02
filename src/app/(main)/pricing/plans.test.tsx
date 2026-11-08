import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { PricingPlans } from "./plans";

// Courtesy Pro (concierge pilot) has no Stripe customer: the Pro card must send
// it to checkout, not to the portal, and say until when the courtesy runs.

const html = (currentPlan: "FREE" | "PRO" | "COURTESY" | null, courtesyUntil?: string) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <PricingPlans currentPlan={currentPlan} currency="BRL" courtesyUntil={courtesyUntil} />
    </DictionaryProvider>,
  );

describe("PricingPlans", () => {
  it("courtesy subscribes through checkout and shows the end date", () => {
    const h = html("COURTESY", "04/01/2027");
    expect(h).toContain('action="/api/stripe/checkout"');
    expect(h).toContain("Cortesia até 04/01/2027");
    // Subscribing now starts billing today and ends the courtesy: say so.
    expect(h).toContain("Se assinar agora, a cobrança começa hoje e substitui a cortesia.");
    expect(h).not.toContain("/api/stripe/portal");
    expect(h).not.toContain(ptBR.pricing.free.cta);
  });

  it("subscribed Pro keeps the portal", () => {
    expect(html("PRO")).toContain('action="/api/stripe/portal"');
  });

  it("free keeps checkout and the disabled current-plan button", () => {
    const h = html("FREE");
    expect(h).toContain('action="/api/stripe/checkout"');
    expect(h).toContain(ptBR.pricing.free.cta);
  });
});
