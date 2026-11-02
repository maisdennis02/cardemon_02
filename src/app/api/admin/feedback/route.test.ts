import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin } = vi.hoisted(() => ({
  prisma: { feedback: { findMany: vi.fn(), update: vi.fn() } },
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/admin", async (orig) => ({ ...(await orig<object>()), requireAdmin }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { GET, POST } from "./route";

const row = {
  id: "f1",
  createdAt: new Date("2026-11-01T12:00:00Z"),
  answeredAt: null,
  message: "Foto no item?",
  locale: "pt-BR",
  user: { email: "dono@ze.com" },
  restaurant: { name: "Zé", slug: "ze" },
};

describe("GET /api/admin/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue(null);
    prisma.feedback.findMany.mockResolvedValue([row]);
  });

  it("is 404 for anyone who is not an admin", async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await GET(new Request("https://menulala.com/api/admin/feedback"));
    expect(res.status).toBe(404);
    expect(prisma.feedback.findMany).not.toHaveBeenCalled();
  });

  it("lists pending messages with restaurant, masked e-mail and waiting days", async () => {
    const res = await GET(new Request("https://menulala.com/api/admin/feedback"));
    const json = await res.json();
    expect(json.totals).toEqual({ pending: 1, answered: 0 });
    expect(json.pending[0]).toMatchObject({
      id: "f1",
      email: "don***@ze.com",
      restaurant: { name: "Zé", slug: "ze" },
      message: "Foto no item?",
    });
    expect(json.pending[0].waitingDays).toBeGreaterThanOrEqual(0);
  });

  it("looks back ?days (default 90) by createdAt", async () => {
    await GET(new Request("https://menulala.com/api/admin/feedback?days=7"));
    const where = prisma.feedback.findMany.mock.calls[0][0].where;
    const since = where.createdAt.gte as Date;
    expect(Date.now() - since.getTime()).toBeLessThan(8 * 24 * 3600 * 1000);
    expect(Date.now() - since.getTime()).toBeGreaterThan(6 * 24 * 3600 * 1000);
  });
});

describe("POST /api/admin/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue(null);
    prisma.feedback.update.mockResolvedValue({ ...row, answeredAt: new Date() });
  });

  it("marks one message as answered", async () => {
    const res = await POST(
      new Request("https://menulala.com/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ id: "f1", answered: true }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const call = prisma.feedback.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "f1" });
    expect(call.data.answeredAt).toBeInstanceOf(Date);
  });

  it("clears answeredAt when answered is false, and rejects a body without id", async () => {
    await POST(
      new Request("https://menulala.com/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ id: "f1", answered: false }),
      }),
    );
    expect(prisma.feedback.update.mock.calls[0][0].data).toEqual({ answeredAt: null });
    const bad = await POST(new Request("https://menulala.com/api/admin/feedback", { method: "POST", body: "{}" }));
    expect(bad.status).toBe(400);
  });

  it("is 404 for a non-admin", async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await POST(new Request("https://menulala.com/api/admin/feedback", { method: "POST", body: '{"id":"f1"}' }));
    expect(res.status).toBe(404);
    expect(prisma.feedback.update).not.toHaveBeenCalled();
  });
});
