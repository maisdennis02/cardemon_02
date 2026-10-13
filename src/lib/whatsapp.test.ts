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

  describe("with the restaurant's country", () => {
    it("adds 55 to a Brazilian number typed with only the DDD", () => {
      expect(normalizeWhatsapp("11 91234-5678", "BR")).toBe("5511912345678");
    });
    it("adds 55 to a Brazilian landline with the DDD", () => {
      expect(normalizeWhatsapp("(11) 3456-7890", "BR")).toBe("551134567890");
    });
    it("adds 55 even when the DDD itself is 55", () => {
      expect(normalizeWhatsapp("55 91234-5678", "BR")).toBe("5555912345678");
    });
    it("leaves a Brazilian number that already has 55 alone", () => {
      expect(normalizeWhatsapp("5511912345678", "BR")).toBe("5511912345678");
      expect(normalizeWhatsapp("55 1191234 5678", "BR")).toBe("5511912345678");
    });
    it("adds 52 to a 10-digit Mexican number", () => {
      expect(normalizeWhatsapp("(55) 1234-5678", "MX")).toBe("525512345678");
    });
    it("adds 1 to a 10-digit US number", () => {
      expect(normalizeWhatsapp("415 555 0100", "US")).toBe("14155550100");
    });
    it("leaves other countries and lengths unchanged", () => {
      expect(normalizeWhatsapp("11 4567-8901", "AR")).toBe("1145678901");
      expect(normalizeWhatsapp("+1 415 555 0100", "US")).toBe("14155550100");
    });
    it("keeps the old behaviour without a country", () => {
      expect(normalizeWhatsapp("11 91234-5678", null)).toBe("11912345678");
      expect(normalizeWhatsapp("11 91234-5678", undefined)).toBe("11912345678");
    });
  });
});
