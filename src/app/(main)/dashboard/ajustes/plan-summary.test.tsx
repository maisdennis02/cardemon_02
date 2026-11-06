import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { PlanSummary } from "./plan-summary";

// The plan card in Ajustes. Courtesy Pro (concierge pilot) has no Stripe
// subscription, so it must not say "renews" nor point at the Stripe portal.

const html = (state: Parameters<typeof PlanSummary>[0]["state"], date: string | null = "04/01/2027") =>
  renderToStaticMarkup(<PlanSummary t={ptBR} state={state} date={date} />);

describe("PlanSummary", () => {
  it("courtesy shows its end date and a subscribe link, no portal", () => {
    const h = html("courtesy");
    expect(h).toContain("Pro de cortesia até 04/01/2027");
    expect(h).toContain('href="/pricing"');
    expect(h).toContain("Assinar o Pro");
    expect(h).not.toContain("/api/stripe/portal");
  });

  it("renewing subscription keeps the portal", () => {
    const h = html("renewing");
    expect(h).toContain("Pro · renova em 04/01/2027");
    expect(h).toContain('action="/api/stripe/portal"');
  });

  it("canceled subscription shows the end date and the portal", () => {
    const h = html("ending");
    expect(h).toContain("Pro até 04/01/2027");
    expect(h).toContain('action="/api/stripe/portal"');
  });

  it("free shows upgrade and no date", () => {
    const h = html("free", null);
    expect(h).toContain(ptBR.dashboard.upgrade);
    expect(h).toContain('href="/pricing"');
    expect(h).not.toContain("04/01/2027");
  });
});
