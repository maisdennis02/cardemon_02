import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { buildProEndedEmail, buildProEndingEmail } from "./email";

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
