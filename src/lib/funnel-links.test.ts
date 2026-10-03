import { describe, expect, it } from "vitest";
import { isFunnelHref } from "./funnel-links";

describe("isFunnelHref", () => {
  // Exactly what the un-prefixed pages reported before locale URLs existed.
  it.each(["/signup", "/login", "/pricing", "/signup?ref=x", "/pricing#pro", "/login?callbackUrl=%2Fdashboard"])(
    "still matches %s",
    (href) => expect(isFunnelHref(href)).toBe(true),
  );

  it.each(["/pt-BR/pricing", "/es/pricing", "/es/pricing?x=1"])("matches the per-locale %s", (href) =>
    expect(isFunnelHref(href)).toBe(true),
  );

  it.each([
    "/",
    "/pt-BR",
    "/es",
    "/pricing-old",
    "/signupx",
    "/m/pricing",
    "/en/pricing",
    "/fr/pricing",
    "/dashboard",
    "https://menulala.com/pricing",
  ])("does not match %s", (href) => expect(isFunnelHref(href)).toBe(false));
});
