import { describe, expect, it } from "vitest";
import { ADDRESS_MAX, HOURS_MAX, cleanInfoText, mapsUrl } from "./restaurant-info";

// Address and opening hours (2026-11-06): free text the owner types in
// Ajustes, shown under the name on the menu.

describe("cleanInfoText", () => {
  it("trims and folds runs of spaces and line breaks into one space", () => {
    expect(cleanInfoText("  Rua A,  123 \n Centro  ", ADDRESS_MAX)).toBe("Rua A, 123 Centro");
  });

  it("stores an empty or blank field as null, so erasing it clears it", () => {
    expect(cleanInfoText("", HOURS_MAX)).toBeNull();
    expect(cleanInfoText("   ", HOURS_MAX)).toBeNull();
    expect(cleanInfoText(null, HOURS_MAX)).toBeNull();
  });

  it("cuts at the limit", () => {
    expect(cleanInfoText("x".repeat(HOURS_MAX + 10), HOURS_MAX)).toHaveLength(HOURS_MAX);
  });
});

describe("mapsUrl", () => {
  it("searches the address on Google Maps", () => {
    expect(mapsUrl("Rua Maria Scomparim, 261 - Boituva")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua%20Maria%20Scomparim%2C%20261%20-%20Boituva",
    );
  });
});
