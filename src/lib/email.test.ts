import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { buildProEndedEmail, buildProEndingEmail, sendFeedbackEmail } from "./email";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));


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


// Courtesy Pro (concierge pilot, no Stripe subscription) gets its own
// reminders: nothing about "subscription" or "Manage subscription", and the
// text-menu limit (20 items), not the photo-page one.

const expiresAt = new Date("2027-01-04T15:00:00Z");

describe("courtesy reminders", () => {
  it("7 days before", () => {
    const e = buildProEndingEmail({ dict: ptBR, locale: "pt-BR", stage: 7, expiresAt, courtesy: true });
    expect(e.subject).toBe("Sua cortesia do Pro no menulala acaba em 4 de janeiro de 2027");
    expect(e.html).toContain("mostra só os 20 primeiros itens");
    expect(e.html).toContain("/pricing");
    expect(e.html).not.toContain("Gerenciar assinatura");
  });

  it("1 day before", () => {
    const e = buildProEndingEmail({ dict: ptBR, locale: "pt-BR", stage: 1, expiresAt, courtesy: true });
    expect(e.subject).toBe("Sua cortesia do Pro no menulala acaba amanhã");
    expect(e.html).toContain("acaba amanhã, 4 de janeiro de 2027");
  });

  it("subscription reminder is unchanged", () => {
    const e = buildProEndingEmail({ dict: ptBR, locale: "pt-BR", stage: 7, expiresAt, courtesy: false });
    expect(e.subject).toBe("Seu plano Pro do menulala termina em 4 de janeiro de 2027");
  });

  it("ended", () => {
    const e = buildProEndedEmail({ dict: ptBR, courtesy: true });
    expect(e.subject).toBe("Sua cortesia do Pro no menulala terminou");
    expect(e.html).toContain("/pricing");
    expect(e.html).toContain("20 primeiros itens");
  });

  it("subscription ended is unchanged", () => {
    expect(buildProEndedEmail({ dict: ptBR, courtesy: false }).subject).toBe("Seu plano Pro do menulala terminou");
  });
});
