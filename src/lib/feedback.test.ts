import { describe, expect, it } from "vitest";
import {
  FEEDBACK_MAX_LENGTH,
  parseFeedbackMessage,
  buildFeedbackEmail,
  shapeFeedback,
  type FeedbackRow,
} from "@/lib/feedback";

// "Sugestões e dúvidas": a restaurant writes to us from the dashboard. The
// message is stored (so the owner's reviews can list what is pending) and
// e-mailed to contato@ with the restaurant's address as Reply-To.

describe("parseFeedbackMessage", () => {
  it("trims and accepts a normal message", () => {
    expect(parseFeedbackMessage("  Queria poder colocar foto no item.  ")).toEqual({
      ok: true,
      message: "Queria poder colocar foto no item.",
    });
  });

  it("rejects an empty or whitespace-only message as empty", () => {
    expect(parseFeedbackMessage("   \n ")).toEqual({ ok: false, error: "empty" });
    expect(parseFeedbackMessage(null)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects a message over the limit as too_long", () => {
    expect(parseFeedbackMessage("a".repeat(FEEDBACK_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too_long",
    });
    expect(parseFeedbackMessage("a".repeat(FEEDBACK_MAX_LENGTH)).ok).toBe(true);
  });
});

describe("buildFeedbackEmail", () => {
  const base = {
    message: "Dá pra ter <b>foto</b> no item?",
    fromEmail: "dono@lanchonete.com",
    locale: "pt-BR" as const,
    restaurant: { name: "Lanchonete do Zé", slug: "lanchonete-do-ze", menuMode: "built", items: 7, hasWhatsapp: true },
  };

  it("names the restaurant in the subject and carries the message, escaped, in the body", () => {
    const mail = buildFeedbackEmail(base);
    expect(mail.subject).toBe("[menulala] Lanchonete do Zé: sugestão/dúvida");
    expect(mail.html).toContain("Dá pra ter &lt;b&gt;foto&lt;/b&gt; no item?");
    expect(mail.html).not.toContain("<b>foto</b>");
  });

  it("sets the restaurant's address as Reply-To so the owner answers from the inbox", () => {
    expect(buildFeedbackEmail(base).replyTo).toBe("dono@lanchonete.com");
  });

  it("includes the context the owner would otherwise have to ask for", () => {
    const html = buildFeedbackEmail(base).html;
    expect(html).toContain("lanchonete-do-ze");
    expect(html).toContain("built");
    expect(html).toContain("7");
    expect(html).toContain("pt-BR");
    expect(html).toContain("dono@lanchonete.com");
  });

  it("works for an account that has no restaurant yet", () => {
    const mail = buildFeedbackEmail({ ...base, restaurant: null });
    expect(mail.subject).toBe("[menulala] dono@lanchonete.com: sugestão/dúvida");
    expect(mail.html).toContain("sem restaurante");
  });

  it("keeps line breaks of the message readable in HTML", () => {
    const html = buildFeedbackEmail({ ...base, message: "linha 1\nlinha 2" }).html;
    expect(html).toContain("linha 1<br>linha 2");
  });
});

describe("shapeFeedback", () => {
  const row = (patch: Partial<FeedbackRow>): FeedbackRow => ({
    id: "f1",
    createdAt: new Date("2026-11-01T12:00:00Z"),
    answeredAt: null,
    message: "oi",
    locale: "pt-BR",
    email: "dono@lanchonete.com",
    restaurant: { name: "Zé", slug: "ze" },
    ...patch,
  });

  it("separates pending from answered and counts them", () => {
    const out = shapeFeedback(
      [row({ id: "a" }), row({ id: "b", answeredAt: new Date("2026-11-02T12:00:00Z") })],
      new Date("2026-11-03T12:00:00Z"),
    );
    expect(out.totals).toEqual({ pending: 1, answered: 1 });
    expect(out.pending.map((m) => m.id)).toEqual(["a"]);
    expect(out.answered.map((m) => m.id)).toEqual(["b"]);
  });

  it("masks the e-mail and says how many days a pending message has waited", () => {
    const out = shapeFeedback([row({})], new Date("2026-11-04T06:00:00Z"));
    expect(out.pending[0]).toMatchObject({
      email: "don***@lanchonete.com",
      waitingDays: 2,
      restaurant: { name: "Zé", slug: "ze" },
      message: "oi",
    });
    expect(out.pending[0].createdAt).toBe("2026-11-01T12:00:00.000Z");
  });

  it("lists the oldest pending message first", () => {
    const out = shapeFeedback(
      [
        row({ id: "new", createdAt: new Date("2026-11-03T00:00:00Z") }),
        row({ id: "old", createdAt: new Date("2026-11-01T00:00:00Z") }),
      ],
      new Date("2026-11-04T00:00:00Z"),
    );
    expect(out.pending.map((m) => m.id)).toEqual(["old", "new"]);
  });
});
