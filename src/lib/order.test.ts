import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/lib/menu";
import { buildOrderMessage, orderErrors, whatsappOrderUrl, type OrderDetails, type OrderLabels } from "@/lib/order";

const labels: OrderLabels = {
  title: "Pedido — {name}",
  total: "Total: {total}",
  toArrange: "a combinar",
  plusToArrange: "{total} + itens a combinar",
  name: "Nome",
  delivery: "Entrega",
  pickup: "Retirada",
  pickupTable: "Retirada — mesa {table}",
  notes: "Obs.",
  footer: "Pedido feito pelo cardápio {url}",
  confirm: "Podem confirmar meu pedido? 🙏",
};

const burger: MenuItem = { id: "a", name: "X-Burguer", priceCents: 2590 };
const coke: MenuItem = { id: "b", name: "Coca", priceCents: 790 };
const veg: MenuItem = { id: "c", name: "Vegetariano", priceCents: null };

const details = (patch: Partial<OrderDetails>): OrderDetails => ({
  name: "Ana",
  mode: "delivery",
  address: "Rua das Flores, 123",
  table: "",
  notes: "",
  ...patch,
});

const message = (lines: { item: MenuItem; opts?: string[]; qty: number }[], d: OrderDetails) =>
  buildOrderMessage({ restaurantName: "Lanchonete Teste", slug: "lanchonete-teste", country: "BR", lines, details: d, labels });

// Intl puts a no-break space between "R$" and the amount.
const nb = (s: string) => s.replace(/R\$ /g, "R$ ");

describe("orderErrors", () => {
  it("needs a name and a choice of delivery or pickup", () => {
    expect(orderErrors(details({ name: "  " }))).toEqual({ name: true });
    expect(orderErrors(details({ mode: null }))).toEqual({ mode: true });
  });

  it("needs an address for delivery only", () => {
    expect(orderErrors(details({ address: " " }))).toEqual({ address: true });
    expect(orderErrors(details({ mode: "pickup", address: "", table: "" }))).toEqual({});
  });
});

describe("buildOrderMessage", () => {
  it("writes a delivery order", () => {
    const text = message([{ item: burger, qty: 2 }, { item: coke, qty: 1 }], details({ notes: "sem cebola" }));
    expect(text).toBe(
      nb(
        [
          "🛎️🛎️🛎️ *Pedido — Lanchonete Teste*",
          "",
          "2x X-Burguer — R$ 51,80",
          "1x Coca — R$ 7,90",
          "",
          "*Total: R$ 59,70*",
          "",
          "Nome: Ana",
          "Entrega: Rua das Flores, 123",
          "",
          "Obs.: sem cebola",
          "",
          "Podem confirmar meu pedido? 🙏",
          "",
          "Pedido feito pelo cardápio menulala.com/m/lanchonete-teste",
        ].join("\n"),
      ),
    );
  });

  it("writes pickup with and without a table, and leaves out empty notes", () => {
    const withTable = message([{ item: coke, qty: 1 }], details({ mode: "pickup", table: "7" }));
    expect(withTable).toContain("Retirada — mesa 7");
    expect(withTable).not.toContain("Obs.");
    const noTable = message([{ item: coke, qty: 1 }], details({ mode: "pickup", table: " " }));
    expect(noTable.split("\n")).toContain("Retirada");
  });

  it("marks unpriced items and says so in the total", () => {
    const text = message([{ item: burger, qty: 2 }, { item: veg, qty: 1 }], details({}));
    expect(text).toContain("1x Vegetariano — a combinar");
    expect(text).toContain(nb("*Total: R$ 51,80 + itens a combinar*"));
  });

  it("totals a cart of unpriced items as to be arranged, never R$ 0,00", () => {
    const text = message([{ item: veg, qty: 1 }], details({}));
    expect(text).toContain("*Total: a combinar*");
    expect(text).not.toContain("0,00");
  });
});

describe("whatsappOrderUrl", () => {
  it("encodes the whole message", () => {
    const text = "a & b\n#1 🍔";
    expect(whatsappOrderUrl("5511999999999", text)).toBe(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`);
  });

  it("keeps only the digits of the number", () => {
    expect(whatsappOrderUrl("+55 (11) 99999-9999", "x")).toBe("https://wa.me/5511999999999?text=x");
  });
});

describe("buildOrderMessage with options", () => {
  const xb: MenuItem = {
    id: "xb",
    name: "X-Burguer",
    priceCents: 2000,
    groups: [
      { id: "g1", title: "Tamanho", min: 1, max: 1, options: [{ id: "s", name: "Simples", priceCents: 0 }, { id: "d", name: "Duplo", priceCents: 800 }] },
      { id: "g2", title: "Extras", min: 0, max: 3, options: [{ id: "b", name: "Bacon", priceCents: 300 }, { id: "c", name: "Cheddar", priceCents: 250 }] },
      { id: "g3", title: "Molho", min: 0, max: 1, options: [{ id: "m", name: "Maionese", priceCents: 0 }] },
    ],
  };
  const cola: MenuItem = { id: "b", name: "Coca-Cola lata", priceCents: 790 };

  it("lists the chosen options under the line and adds them to the price", () => {
    const text = nb(message([{ item: xb, opts: ["d", "b"], qty: 2 }, { item: cola, qty: 1 }], details({})));
    const lines = text.split("\n");
    const i = lines.indexOf(nb("2x X-Burguer — R$ 62,00"));
    expect(i).toBeGreaterThan(-1);
    expect(lines.slice(i, i + 4)).toEqual([
      nb("2x X-Burguer — R$ 62,00"),
      "   Tamanho: Duplo",
      "   Extras: Bacon",
      nb("1x Coca-Cola lata — R$ 7,90"),
    ]);
    expect(text).toContain(nb("*Total: R$ 69,90*"));
    expect(text).not.toContain("Molho");
  });

  it("joins several options of a group with commas", () => {
    const text = message([{ item: xb, opts: ["d", "b", "c"], qty: 1 }], details({}));
    expect(text).toContain("   Extras: Bacon, Cheddar");
  });

  it("keeps an unpriced item to arrange", () => {
    const text = message([{ item: { ...xb, priceCents: null }, opts: ["s"], qty: 1 }], details({}));
    expect(text).toContain("1x X-Burguer — a combinar");
    expect(text).toContain("   Tamanho: Simples");
  });
});
