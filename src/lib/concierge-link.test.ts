import { describe, expect, it } from "vitest";
import { conciergeWhatsappUrl } from "./concierge-link";

describe("conciergeWhatsappUrl", () => {
  it("builds a wa.me link with the message, keeping only the digits of the number", () => {
    expect(conciergeWhatsappUrl("+55 (11) 98765-4321", "Oi! Montem o Bar"))
      .toBe("https://wa.me/5511987654321?text=Oi!%20Montem%20o%20Bar");
  });

  it("is off when the number is not set", () => {
    expect(conciergeWhatsappUrl(undefined, "x")).toBeNull();
    expect(conciergeWhatsappUrl("", "x")).toBeNull();
  });

  it("is off when the number is not a full international one", () => {
    expect(conciergeWhatsappUrl("98765-4321", "x")).toBeNull();
  });
});
