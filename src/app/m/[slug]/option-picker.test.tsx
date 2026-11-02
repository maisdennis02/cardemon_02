import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { MenuItem, OptionGroup } from "@/lib/menu";
import { OptionPicker } from "./option-picker";

const size: OptionGroup = {
  id: "size", title: "Tamanho", min: 1, max: 1,
  options: [
    { id: "s", name: "Simples", priceCents: 0 },
    { id: "d", name: "Duplo", priceCents: 800 },
  ],
};
const extra: OptionGroup = {
  id: "extra", title: "Extras", min: 0, max: 2,
  options: [
    { id: "b", name: "Bacon", priceCents: 300 },
    { id: "c", name: "Cheddar", priceCents: 250 },
    { id: "e", name: "Ovo", priceCents: 200 },
  ],
};
const item = (groups: OptionGroup[]): MenuItem => ({ id: "i1", name: "Burger", priceCents: 2000, groups });

const render = (it: MenuItem, p: { value?: string[]; missing?: string | null; readOnly?: boolean } = {}) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <OptionPicker item={it} country="BR" accent="#b4532a" value={p.value ?? []} onChange={() => {}} missing={p.missing} readOnly={p.readOnly} />
    </DictionaryProvider>,
  );

describe("OptionPicker", () => {
  it("renders radios for max 1 and checkboxes otherwise", () => {
    const html = render(item([size, extra]));
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).toContain("Obrigatório");
    expect(html).toContain("Opcional");
    expect(html).toMatch(/\+ R\$\s8,00/);
  });

  it("disables unchecked boxes once the group is at its max", () => {
    const html = render(item([extra]), { value: ["b", "c"] });
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html.match(/checked=""/g)).toHaveLength(2);
    expect(render(item([extra]), { value: ["b"] })).not.toContain("disabled");
  });

  it("marks the missing group invalid with the message", () => {
    const html = render(item([size]), { missing: "size" });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Escolha uma opção em “Tamanho”");
    expect(render(item([size]))).not.toContain("aria-invalid");
  });

  it("hints the effective max", () => {
    const one: OptionGroup = { ...extra, max: 3, options: [extra.options[0]] };
    const html = render(item([one]));
    expect(html).toContain("Escolha 1");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("disabled");
  });

  it("read-only lists groups and prices without inputs", () => {
    const html = render(item([size, extra]), { readOnly: true });
    expect(html).toContain("Tamanho");
    expect(html).toContain("Duplo");
    expect(html).not.toContain("<input");
  });
});
