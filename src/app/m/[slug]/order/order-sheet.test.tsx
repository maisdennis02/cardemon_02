import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { MenuItem } from "@/lib/menu";
import { OrderSheet } from "./order-sheet";

const xb: MenuItem = {
  id: "xb",
  name: "X-Burguer",
  priceCents: 2000,
  groups: [
    {
      id: "g1",
      title: "Tamanho",
      min: 1,
      max: 1,
      options: [
        { id: "s", name: "Simples", priceCents: 0 },
        { id: "d", name: "Duplo", priceCents: 600 },
      ],
    },
  ],
};

const render = () =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <OrderSheet
        slug="x"
        restaurantName="R"
        country="BR"
        whatsappNumber="5511999999999"
        demo={false}
        lines={[
          { key: "xb", item: { ...xb, groups: undefined }, opts: [], qty: 1 },
          { key: "xb|d", item: xb, opts: ["d"], qty: 2 },
        ]}
        totalText="R$ 72,00"
        details={{ name: "", mode: null, address: "", table: "", notes: "" }}
        setDetails={() => {}}
        tried={false}
        setTried={() => {}}
        accent="#c84630"
        onQty={() => {}}
        onClear={() => {}}
        onClose={() => {}}
      />
    </DictionaryProvider>,
  );

describe("OrderSheet lines", () => {
  it("renders one row per line, with the choices under the name and the option price in the line total", () => {
    const html = render();
    expect(html.match(/X-Burguer/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Tamanho: Duplo");
    // (2000 + 600) * 2
    expect(html).toMatch(/R\$\s52,00/);
    expect(html.match(/<li /g)).toHaveLength(2);
  });

  it("names each line's quantity control with its choices, so two lines of one item differ", () => {
    const html = render();
    expect(html).toContain('aria-label="X-Burguer"');
    expect(html).toContain('aria-label="X-Burguer — Tamanho: Duplo"');
  });
});
