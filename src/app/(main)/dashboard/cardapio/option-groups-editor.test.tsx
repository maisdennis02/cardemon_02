import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { OptionGroup } from "@/lib/menu";
import { MAX_OPTIONS_PER_GROUP } from "@/lib/menu";
import { OptionGroupsEditor } from "./option-groups-editor";

const e = ptBR.dashboard.builder.editor;
const noop = () => {};
const group = (id: string, over: Partial<OptionGroup> = {}): OptionGroup => ({
  id,
  title: `Grupo ${id}`,
  min: 0,
  max: 3,
  options: [{ id: `${id}o1`, name: "Bacon", priceCents: 500 }],
  ...over,
});

function render(
  groups: OptionGroup[] | undefined,
  otherItems: { id: string; name: string; groups: OptionGroup[] }[] = [],
): string {
  return renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <OptionGroupsEditor groups={groups} otherItems={otherItems} onChange={noop} />
    </DictionaryProvider>,
  );
}

describe("OptionGroupsEditor", () => {
  it("offers both shortcuts with nothing yet", () => {
    const html = render(undefined);
    expect(html).toContain(e.addRequired);
    expect(html).toContain(e.addExtras);
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("Até 5 grupos");
  });

  it("disables both shortcuts at 5 groups and says why", () => {
    const html = render(["a", "b", "c", "d", "e"].map((id) => group(id)));
    const buttons = html.match(/<button[^>]*>\s*\+ (Escolha|Extras)[^<]*/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b).toContain("disabled");
    expect(html).toContain("Até 5 grupos por item");
  });

  it("disables + opção at 15 options", () => {
    const options = Array.from({ length: MAX_OPTIONS_PER_GROUP }, (_, i) => ({ id: `o${i}`, name: `O${i}`, priceCents: 0 }));
    const html = render([group("g", { options })]);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>\s*\+ opção/);
    expect(html).toContain("Até 15 opções por grupo");
  });

  it("shows a required group with the checkbox checked and the max", () => {
    const html = render([group("g", { min: 1, max: 2 })]);
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toMatch(/data-max-value="g"[^>]*>2</);
    expect(html).toContain(e.requiredLabel);
  });

  it("leaves the checkbox off for extras", () => {
    expect(render([group("g")])).not.toMatch(/type="checkbox"[^>]*checked/);
  });

  it("shows 'sem custo' as the placeholder of a free option's price", () => {
    const html = render([group("g", { options: [{ id: "o", name: "Simples", priceCents: 0 }] })]);
    expect(html).toContain(`placeholder="${e.optionFree}"`);
    expect(html).toContain('value="Simples"');
  });

  it("shows a paid option's price as text", () => {
    expect(render([group("g")])).toContain('value="5,00"');
  });

  it("copies only from the given other items", () => {
    const html = render(undefined, [{ id: "x", name: "Pizza Grande", groups: [group("z")] }]);
    expect(html).toContain(e.copyFrom);
    expect(html).toContain("Pizza Grande");
  });

  it("hides the copy picker when no other item has groups", () => {
    expect(render(undefined)).not.toContain(e.copyFrom);
  });

  // Final review #4: a −/+ counter, not a number field a phone can't edit.
  describe("max choices counter", () => {
    const btn = (html: string, label: string) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";
    it("shows the value with − disabled at 1", () => {
      const html = render([group("g", { max: 1 })]);
      expect(html).not.toContain('type="number"');
      expect(html).toMatch(/data-max-value="g"[^>]*>1</);
      expect(btn(html, e.maxLess)).toContain('disabled=""');
      expect(btn(html, e.maxMore)).not.toContain('disabled=""');
    });
    it("disables + at 15", () => {
      const html = render([group("g", { max: MAX_OPTIONS_PER_GROUP })]);
      expect(html).toMatch(/data-max-value="g"[^>]*>15</);
      expect(btn(html, e.maxMore)).toContain('disabled=""');
      expect(btn(html, e.maxLess)).not.toContain('disabled=""');
    });
  });
});
