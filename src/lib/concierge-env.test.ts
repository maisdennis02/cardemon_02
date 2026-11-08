import { describe, expect, it, vi } from "vitest";
import { previewDatabaseUrl } from "./concierge-env";

// The image script writes and publishes a menu: it must only ever reach the
// local database from .env, even if the shell still has a prod DATABASE_URL.

describe("previewDatabaseUrl", () => {
  it("ignores DATABASE_URL from the shell", () => {
    vi.stubEnv("DATABASE_URL", "postgres://prod");
    expect(previewDatabaseUrl({ DATABASE_URL: "postgres://local" })).toBe("postgres://local");
  });

  it("throws when .env has none", () => {
    vi.stubEnv("DATABASE_URL", "postgres://prod");
    expect(() => previewDatabaseUrl({})).toThrow();
  });
});
