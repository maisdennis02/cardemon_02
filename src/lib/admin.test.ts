import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { isTestEmail } from "@/lib/admin";

describe("isTestEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("counts every admin and each FUNNEL_TEST_EMAILS address, any case", () => {
    vi.stubEnv("ADMIN_EMAIL", "boss@x.com");
    vi.stubEnv("FUNNEL_TEST_EMAILS", " Test1@x.com , test2@y.com");
    expect(["Boss@x.com", "test1@x.com", "TEST2@y.com"].map(isTestEmail)).toEqual([true, true, true]);
    expect(isTestEmail("diner@z.com")).toBe(false);
  });

  it("marks nobody when both are unset", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("FUNNEL_TEST_EMAILS", "");
    expect(isTestEmail("anyone@x.com")).toBe(false);
    expect(isTestEmail(null)).toBe(false);
  });
});
