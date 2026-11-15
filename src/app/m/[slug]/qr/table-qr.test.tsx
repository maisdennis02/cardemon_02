import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ restaurant: null as unknown }));
vi.mock("@/lib/prisma", () => ({
  prisma: { restaurant: { findUnique: async () => db.restaurant } },
}));

const BASE = "https://menulala.com";
const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.stubEnv("APP_URL", BASE);
  db.restaurant = null;
});

async function render(slug: string): Promise<string> {
  const page = (await import("./page")).default;
  return renderToStaticMarkup(await page(props(slug)));
}

const realRestaurant = (patch: Record<string, unknown> = {}) => ({
  name: "Lanchonete do Zé",
  slug: "lanchonete-do-ze",
  description: null,
  address: null,
  hours: null,
  country: "BR",
  whatsappNumber: "5513999990000",
  instagramUrl: null,
  ifoodUrl: null,
  ubereatsUrl: null,
  doordashUrl: null,
  rappiUrl: null,
  grubhubUrl: null,
  pedidosyaUrl: null,
  didifoodUrl: null,
  images: [],
  menuMode: "built",
  menuTheme: { color: "#c84630", headerStyle: "band" },
  menuPublished: null,
  owner: { proExpiresAt: null },
  ...patch,
});

describe("/m/<slug>/qr — table cards", () => {
  it("prints six cards with the menu's address, the name and the order line", async () => {
    db.restaurant = realRestaurant();
    const html = await render("lanchonete-do-ze");
    expect(html.match(/class="qr-card"/g)).toHaveLength(6);
    expect(html.split("Lanchonete do Zé").length - 1).toBeGreaterThanOrEqual(6);
    expect(html.split("Aponte a câmera e veja o cardápio").length - 1).toBe(6);
    expect(html.split("Peça pelo WhatsApp").length - 1).toBe(6);
    expect(html).toContain("Imprimir ou salvar PDF");
    // The name takes the menu's colour.
    expect(html).toContain("color:#c84630");
  });

  it("does not promise WhatsApp orders without a number", async () => {
    db.restaurant = realRestaurant({ whatsappNumber: null });
    const html = await render("lanchonete-do-ze");
    expect(html).not.toContain("Peça pelo WhatsApp");
  });

  it("works for an example menu without the database, and with no order line", async () => {
    const html = await render("seu-restaurante");
    expect(html.match(/class="qr-card"/g)).toHaveLength(6);
    expect(html).toContain("Seu Restaurante");
    expect(html).not.toContain("Peça pelo WhatsApp");
  });

  it("is 404 for an unknown slug", async () => {
    await expect(render("nao-existe")).rejects.toThrow();
  });

  it("stays out of the index", async () => {
    db.restaurant = realRestaurant();
    const { generateMetadata } = await import("./page");
    const meta = (await generateMetadata(props("lanchonete-do-ze"))) as Metadata;
    expect(typeof meta.robots === "object" && meta.robots !== null ? meta.robots.index : undefined).toBe(false);
    expect(meta.title).toBe("QR para as mesas — Lanchonete do Zé");
  });
});
