import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  PREFIXED_LOCALES,
  UNPREFIXED_LOCALE,
  isPrefixedLocale,
  localePrefix,
  localizedPath,
  withPrefix,
} from "./config";

describe("locale URLs", () => {
  it("English owns the un-prefixed URLs", () => {
    expect(UNPREFIXED_LOCALE).toBe("en");
    expect(UNPREFIXED_LOCALE).toBe(DEFAULT_LOCALE);
  });

  // PREFIXED_LOCALES is written out by hand (for the literal type); adding a
  // locale to LOCALES without listing it here would leave it without a URL.
  it("every other locale has a prefix, and only those", () => {
    expect([...PREFIXED_LOCALES].sort()).toEqual(
      LOCALES.filter((l) => l !== UNPREFIXED_LOCALE).sort(),
    );
    expect(isPrefixedLocale("pt-BR")).toBe(true);
    expect(isPrefixedLocale("es")).toBe(true);
    expect(isPrefixedLocale("en")).toBe(false);
    expect(isPrefixedLocale("pt-br")).toBe(false);
    expect(isPrefixedLocale("dashboard")).toBe(false);
  });

  it("the prefix is the locale code itself", () => {
    expect(localePrefix("en")).toBe("");
    expect(localePrefix("pt-BR")).toBe("/pt-BR");
    expect(localePrefix("es")).toBe("/es");
  });

  it.each([
    ["en", "/", "/"],
    ["en", "/pricing", "/pricing"],
    ["pt-BR", "/", "/pt-BR"],
    ["pt-BR", "/pricing", "/pt-BR/pricing"],
    ["es", "/", "/es"],
    ["es", "/terms", "/es/terms"],
  ] as const)("localizedPath(%s, %s) = %s", (locale, path, expected) => {
    expect(localizedPath(locale, path)).toBe(expected);
  });

  it("withPrefix never produces a trailing slash or a double slash", () => {
    expect(withPrefix("", "/")).toBe("/");
    expect(withPrefix("", "/pricing")).toBe("/pricing");
    expect(withPrefix("/pt-BR", "/")).toBe("/pt-BR");
    expect(withPrefix("/es", "/privacy")).toBe("/es/privacy");
  });
});
