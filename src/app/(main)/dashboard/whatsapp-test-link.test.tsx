import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { WhatsappTestLink } from "./whatsapp-test-link";
import { MenuHomeCard } from "./menu-home-card";

// Nothing can check server-side whether a number exists on WhatsApp, so the
// owner sends a test message to themselves: a wrong number makes WhatsApp
// itself say the number is not on WhatsApp (acaiteria-kero-mais, 26/10/2026).

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      {node}
    </DictionaryProvider>,
  );

describe("WhatsappTestLink", () => {
  it("opens wa.me on the normalized number with a test message, in a new tab", () => {
    const html = render(
      <WhatsappTestLink number="11 91234-5678" country="BR" restaurantName="Lanchonete do Zé" />,
    );
    const href = html.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    expect(href).toBeDefined();
    const url = new URL(href!);
    expect(url.origin + url.pathname).toBe("https://wa.me/5511912345678");
    expect(url.searchParams.get("text")).toBe(
      "Teste do menulala: os pedidos do cardápio Lanchonete do Zé vão chegar neste número. 👍",
    );
    expect(html).toMatch(/<a[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain(ptBR.dashboard.home.whatsappTest);
  });

  it("explains what the test does, when asked to", () => {
    const html = render(
      <WhatsappTestLink number="11 91234-5678" country="BR" restaurantName="Zé" hint />,
    );
    expect(html).toContain(ptBR.dashboard.home.whatsappTestHint);
  });

  it("shows no hint by default", () => {
    const html = render(<WhatsappTestLink number="11 91234-5678" country="BR" restaurantName="Zé" />);
    expect(html).not.toContain(ptBR.dashboard.home.whatsappTestHint);
  });

  it("renders nothing while the number is not a usable WhatsApp number", () => {
    expect(render(<WhatsappTestLink number="1234" country="BR" restaurantName="Zé" />)).toBe("");
    expect(render(<WhatsappTestLink number="" country="BR" restaurantName="Zé" />)).toBe("");
  });
});

describe("MenuHomeCard orders line", () => {
  const card = (whatsappNumber: string | null) =>
    render(
      <MenuHomeCard
        name="Lanchonete do Zé"
        slug="lanchonete-do-ze"
        hasMenu
        mode="built"
        itemCount={3}
        imageCount={0}
        whatsappNumber={whatsappNumber}
        country="BR"
      />,
    );

  it("lets the owner test the number orders go to", () => {
    const html = card("5511912345678");
    expect(html).toContain("https://wa.me/5511912345678?text=");
    expect(html).toContain(ptBR.dashboard.home.whatsappTest);
  });

  it("has no test link without a number", () => {
    expect(card(null)).not.toContain("wa.me");
  });
});

describe("RestaurantSettingsForm", () => {
  it("offers to test the saved WhatsApp number", async () => {
    vi.mock("./actions", () => ({ updateRestaurant: vi.fn(), saveWhatsappNumber: vi.fn() }));
    const { RestaurantSettingsForm } = await import("./restaurant-settings-form");
    const html = render(
      <RestaurantSettingsForm
        restaurant={{
          id: "r1",
          name: "Lanchonete do Zé",
          slug: "lanchonete-do-ze",
          description: null,
          whatsappNumber: "5511912345678",
          instagramUrl: null,
          country: "BR",
          ifoodUrl: null,
          ubereatsUrl: null,
          doordashUrl: null,
          rappiUrl: null,
          grubhubUrl: null,
          pedidosyaUrl: null,
          didifoodUrl: null,
        }}
      />,
    );
    expect(html).toContain("https://wa.me/5511912345678?text=");
    expect(html).toContain(ptBR.dashboard.home.whatsappTestHint);
  });
});
