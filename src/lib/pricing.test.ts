import { describe, expect, it } from "vitest";
import { formatPlanDate, planState } from "./pricing";

// Courtesy Pro (2026-11-05 concierge pilot) is Pro with no subscription behind
// it; the dashboard, /pricing and the reminder e-mails all branch on this.

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);
type U = { proExpiresAt: Date | null; billingSubscriptionId: string | null; billingCancelAtPeriodEnd: boolean };
const u = (o: Partial<U>): U => ({ proExpiresAt: null, billingSubscriptionId: null, billingCancelAtPeriodEnd: false, ...o });

describe("planState", () => {
  it("free without proExpiresAt", () => expect(planState(u({}))).toBe("free"));
  it("free when null user", () => expect(planState(null)).toBe("free"));
  it("courtesy = Pro without subscription", () => expect(planState(u({ proExpiresAt: future }))).toBe("courtesy"));
  it("expired courtesy is free", () => expect(planState(u({ proExpiresAt: past }))).toBe("free"));
  it("renewing subscription", () =>
    expect(planState(u({ proExpiresAt: future, billingSubscriptionId: "sub_1" }))).toBe("renewing"));
  it("canceled subscription still in period", () =>
    expect(
      planState(u({ proExpiresAt: future, billingSubscriptionId: "sub_1", billingCancelAtPeriodEnd: true })),
    ).toBe("ending"));
});

describe("formatPlanDate", () => {
  // Courtesy granted at ~22:00 BRT ends at ~01:00 UTC 60 days later: Ajustes
  // and /pricing must show the Brazilian day, the same as the DM and e-mails.
  it("pt-BR uses São Paulo time", () => expect(formatPlanDate(new Date("2027-01-05T01:30:00Z"), "pt-BR")).toBe("04/01/2027"));
  it("other locales use UTC", () => expect(formatPlanDate(new Date("2027-01-05T01:30:00Z"), "en")).toBe("1/5/2027"));
});
