import { describe, expect, it } from "vitest";
import { normalizeWhatsapp } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it("strips formatting from a dictated number", () => {
    expect(normalizeWhatsapp("11 91234-5678")).toBe("11912345678");
  });
  it("keeps the country code and drops the plus", () => {
    expect(normalizeWhatsapp("+55 11 9 1234 5678")).toBe("5511912345678");
  });
  it("rejects numbers that are too short", () => {
    expect(normalizeWhatsapp("1234")).toBeNull();
  });
  it("rejects numbers that are too long", () => {
    expect(normalizeWhatsapp("1".repeat(16))).toBeNull();
  });
  it("rejects an empty string", () => {
    expect(normalizeWhatsapp("")).toBeNull();
  });
});
