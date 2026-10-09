import { describe, expect, it } from "vitest";
import { parseItemLine, parsePastedList } from "@/lib/menu-parse";

describe("parseItemLine", () => {
  it.each([
    ["X-Burguer 25,90", "X-Burguer", 2590],
    ["X-Burguer 25.90", "X-Burguer", 2590],
    ["X-Burguer R$ 25", "X-Burguer", 2500],
    ["X-Burguer R$25,9", "X-Burguer", 2590],
    ["Suco 8 e 50", "Suco", 850],
    ["Suco 8 reais e 50", "Suco", 850],
    ["Coca 7 reais", "Coca", 700],
    ["Coca sete reais", "Coca sete reais", null],
    ["X-Tudo 2 carnes 32,00", "X-Tudo 2 carnes", 3200],
    ["Água 500ml", "Água 500ml", null],
    ["Coca 2L", "Coca 2L", null],
    ["Pizza 35cm", "Pizza 35cm", null],
    ["Água 500ml 4,00", "Água 500ml", 400],
    ["Pizza 35cm 59,90", "Pizza 35cm", 5990],
    ["Picanha 1.250", "Picanha 1.250", null],
    ["Pastel - 9,00", "Pastel", 900],
    ["25,90", "25,90", null],
    // Dictation: iOS ends a dictated phrase with a period by default.
    ["Coca 7 reais.", "Coca", 700],
    ["X-Burguer 25,90.", "X-Burguer", 2590],
    // "e 5 centavos" is five cents, not fifty; a bare "e 5" is ambiguous.
    ["Suco 8 reais e 5 centavos", "Suco", 805],
    ["Suco 8 e 5", "Suco 8 e 5", null],
  ])("%s", (input, name, priceCents) => {
    expect(parseItemLine(input)).toEqual({ name, priceCents });
  });

  it("returns null for a blank line", () => {
    expect(parseItemLine("   ")).toBeNull();
  });

  it("cuts the name to 80 characters", () => {
    expect(parseItemLine("x".repeat(120))?.name).toHaveLength(80);
  });
});

describe("parsePastedList", () => {
  const counter = () => {
    let n = 0;
    return () => `id${++n}`;
  };

  it("turns an unpriced line followed by priced lines into a section title", () => {
    const sections = parsePastedList("Lanches\nX-Burguer 20\nX-Salada 22\nBebidas\nCoca 7", counter());
    expect(sections.map((s) => [s.title, s.items.length])).toEqual([
      ["Lanches", 2],
      ["Bebidas", 1],
    ]);
    expect(sections[0].items[0]).toEqual({ id: expect.any(String), name: "X-Burguer", priceCents: 2000 });
  });

  it("puts items with no title before them in an untitled section", () => {
    const sections = parsePastedList("X-Burguer 20\nCoca 7", counter());
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    expect(sections[0].items).toHaveLength(2);
  });

  it("keeps unpriced lines as items when no priced line follows", () => {
    const sections = parsePastedList("Lanches\nÁgua 500ml", counter());
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    expect(sections[0].items.map((i) => i.priceCents)).toEqual([null, null]);
  });

  it("ignores blank lines", () => {
    const sections = parsePastedList("\n\nLanches\n\nX-Burguer 20\n\n", counter());
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Lanches");
    expect(sections[0].items).toHaveLength(1);
  });

  it("cuts a title to 60 characters", () => {
    const sections = parsePastedList(`${"T".repeat(90)}\nX-Burguer 20`, counter());
    expect(sections[0].title).toHaveLength(60);
  });

  it("gives every section and item a distinct id", () => {
    const sections = parsePastedList("Lanches\nX-Burguer 20\nBebidas\nCoca 7", counter());
    const ids = sections.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
