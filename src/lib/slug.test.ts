import { describe, expect, it } from "vitest";
import { pickSlug } from "@/lib/slug";

const none = async () => false;

describe("pickSlug", () => {
  it("acentos e pontuação do ditado", async () => {
    expect(await pickSlug("  Lanchonete do Zé. ", none)).toBe("lanchonete-do-ze");
  });
  it("colisão vira -2, -3", async () => {
    const taken = new Set(["bar-do-ze", "bar-do-ze-2"]);
    expect(await pickSlug("Bar do Zé", async (s) => taken.has(s))).toBe("bar-do-ze-3");
  });
  it("slug reservado é pulado", async () => {
    expect(await pickSlug("Seu Restaurante", none)).toBe("seu-restaurante-2");
  });
  it.each(["🍔🍟", "", "A"])("nome sem slug útil (%j) vira cardapio", async (n) => {
    expect(await pickSlug(n, none)).toBe("cardapio");
  });
  it("nome longo cabe em 60 com sufixo", async () => {
    const s = await pickSlug("x".repeat(100), async (c) => c === "x".repeat(52));
    expect(s).toBe(`${"x".repeat(52)}-2`);
    expect(s.length).toBeLessThanOrEqual(60);
  });
  it("esgotou -50 → sufixo aleatório", async () => {
    expect(await pickSlug("Pizza", async (s) => s !== "pizza-abc123", () => "abc123")).toBe("pizza-abc123");
  });
});
