import { beforeEach, describe, expect, it, vi } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";

const { prisma, sendFeedbackEmail } = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn() }, feedback: { create: vi.fn() } },
  sendFeedbackEmail: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendFeedbackEmail }));
vi.mock("./guards", () => ({
  requireUserId: vi.fn(async () => "u1"),
  requireOwnedRestaurant: vi.fn(),
  dashT: vi.fn(async () => ptBR.dashboard),
}));
vi.mock("@/i18n", () => ({ getLocale: vi.fn(async () => "pt-BR") }));
vi.mock("@vercel/analytics/server", () => ({ track: vi.fn(async () => {}) }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));

import { sendFeedback } from "./actions";

const form = (message: string | null) => {
  const fd = new FormData();
  if (message !== null) fd.set("message", message);
  return fd;
};

describe("sendFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      email: "dono@ze.com",
      restaurants: [
        { id: "r1", name: "Zé", slug: "ze", menuMode: "built", whatsappNumber: "5511999999999",
          menuPublished: { v: 1, sections: [{ id: "s", title: null, items: [{ id: "a", name: "x", priceCents: 1 }, { id: "b", name: "y", priceCents: 1 }] }] } },
      ],
    });
    prisma.feedback.create.mockResolvedValue({ id: "f1" });
    sendFeedbackEmail.mockResolvedValue(true);
  });

  it("rejects an empty message with the localized error and stores nothing", async () => {
    const out = await sendFeedback({}, form("   "));
    expect(out).toEqual({ error: ptBR.dashboard.feedback.errorEmpty });
    expect(prisma.feedback.create).not.toHaveBeenCalled();
    expect(sendFeedbackEmail).not.toHaveBeenCalled();
  });

  it("rejects a message over the limit with the limit in the message", async () => {
    const out = await sendFeedback({}, form("a".repeat(1001)));
    expect(out.error).toContain("1000");
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  it("stores the message with the restaurant and e-mails it with the menu context", async () => {
    const out = await sendFeedback({}, form("  Foto no item, por favor  "));
    expect(out).toEqual({ ok: true });
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: { userId: "u1", restaurantId: "r1", message: "Foto no item, por favor", locale: "pt-BR" },
    });
    expect(sendFeedbackEmail).toHaveBeenCalledWith({
      message: "Foto no item, por favor",
      fromEmail: "dono@ze.com",
      locale: "pt-BR",
      restaurant: { name: "Zé", slug: "ze", menuMode: "built", items: 2, hasWhatsapp: true },
    });
  });

  it("still succeeds for an account without a restaurant", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: "novo@x.com", restaurants: [] });
    const out = await sendFeedback({}, form("Como começo?"));
    expect(out).toEqual({ ok: true });
    expect(prisma.feedback.create.mock.calls[0][0].data.restaurantId).toBeNull();
    expect(sendFeedbackEmail.mock.calls[0][0].restaurant).toBeNull();
  });

  it("keeps the stored message and answers ok even if the e-mail provider fails", async () => {
    sendFeedbackEmail.mockResolvedValue(false);
    const out = await sendFeedback({}, form("oi"));
    expect(out).toEqual({ ok: true });
    expect(prisma.feedback.create).toHaveBeenCalledTimes(1);
  });
});
