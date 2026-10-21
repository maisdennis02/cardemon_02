import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_MENU_SLUGS } from "@/lib/seo";

// A try-out menu is a real row with real photos: only its slug tells it apart.
const getRestaurant = vi.hoisted(() => vi.fn());
vi.mock("./data", () => ({ getRestaurant }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font, Playfair_Display: font, Kalam: font };
});

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });
const robotsIndex = (meta: Metadata) =>
  typeof meta.robots === "object" && meta.robots !== null ? meta.robots.index : undefined;

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://menulala.com");
  getRestaurant.mockResolvedValue({
    name: "Lanchonete",
    description: null,
    country: "BR",
    whatsappNumber: null,
    instagramUrl: null,
    ifoodUrl: null,
    ubereatsUrl: null,
    doordashUrl: null,
    rappiUrl: null,
    grubhubUrl: null,
    pedidosyaUrl: null,
    didifoodUrl: null,
    images: [{ url: "https://blob.example/p1.jpg" }],
    menuMode: "photos",
    menuTheme: null,
    menuPublished: null,
    owner: null,
    example: false,
  });
});

describe("menu page robots", () => {
  it.each(TEST_MENU_SLUGS)("/m/%s is noindex even with a published menu", async (slug) => {
    const { generateMetadata } = await import("./page");
    expect(robotsIndex((await generateMetadata(props(slug))) as Metadata)).toBe(false);
  });

  it("a real published menu stays indexable", async () => {
    const { generateMetadata } = await import("./page");
    const meta = (await generateMetadata(props("nils-bar-restaurante"))) as Metadata;
    expect(meta.robots).toBeUndefined();
  });
});
