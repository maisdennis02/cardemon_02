import { describe, expect, it } from "vitest";
import { nextStep, type NextStepState } from "@/lib/next-step";

const base: NextStepState = {
  hasMenu: true,
  mode: "built",
  totalViews: 5,
  hasWhatsapp: true,
  hasDeliveryLink: true,
};

describe("nextStep", () => {
  it("asks for the menu first, even when everything else is empty", () => {
    expect(
      nextStep({ hasMenu: false, mode: "photos", totalViews: 0, hasWhatsapp: false, hasDeliveryLink: false }),
    ).toBe("finish_menu");
  });

  it("asks to share a published menu nobody has seen yet", () => {
    expect(nextStep({ ...base, totalViews: 0 })).toBe("share");
  });

  it("asks for the WhatsApp number on a built menu once it has views", () => {
    expect(nextStep({ ...base, mode: "built", hasWhatsapp: false })).toBe("whatsapp");
  });

  it("skips WhatsApp on a photo menu and goes to delivery apps", () => {
    expect(nextStep({ ...base, mode: "photos", hasWhatsapp: false, hasDeliveryLink: false })).toBe("delivery");
  });

  it("asks for delivery links once WhatsApp is set", () => {
    expect(nextStep({ ...base, mode: "built", hasWhatsapp: true, hasDeliveryLink: false })).toBe("delivery");
  });

  it("returns null when every step is done", () => {
    expect(nextStep(base)).toBeNull();
  });

  it("returns null on a photo menu with delivery set, even without WhatsApp", () => {
    expect(nextStep({ ...base, mode: "photos", hasWhatsapp: false, hasDeliveryLink: true })).toBeNull();
  });
});
