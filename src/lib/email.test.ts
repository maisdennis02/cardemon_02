import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendFeedbackEmail } from "@/lib/email";

describe("sendFeedbackEmail", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ error: null });
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sends to FEEDBACK_EMAIL with the restaurant's address as Reply-To", async () => {
    vi.stubEnv("FEEDBACK_EMAIL", "caixa@menulala.com");
    const ok = await sendFeedbackEmail({
      message: "Sugestão: foto no item",
      fromEmail: "dono@ze.com",
      locale: "pt-BR",
      restaurant: { name: "Zé", slug: "ze", menuMode: "built", items: 3, hasWhatsapp: true },
    });
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const args = send.mock.calls[0][0];
    expect(args).toMatchObject({ to: "caixa@menulala.com", replyTo: "dono@ze.com" });
    expect(args.subject).toBe("[menulala] Zé: sugestão/dúvida");
    expect(args.html).toContain("Sugestão: foto no item");
  });

  it("falls back to contato@menulala.com when FEEDBACK_EMAIL is unset", async () => {
    vi.stubEnv("FEEDBACK_EMAIL", "");
    await sendFeedbackEmail({ message: "oi", fromEmail: "a@b.com", locale: "en", restaurant: null });
    expect(send.mock.calls[0][0].to).toBe("contato@menulala.com");
  });
});
