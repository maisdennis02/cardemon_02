import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { Menu, OptionGroup } from "@/lib/menu";
import { StepItems } from "./step-items";

const g = (id: string): OptionGroup => ({
  id, title: id, min: 0, max: 1, options: [{ id: `${id}o`, name: "A", priceCents: 0 }],
});

function render(menu: Menu): string {
  return renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <StepItems
        restaurantId="r1"
        menu={menu}
        setMenu={() => {}}
        isPro
        country="BR"
        sectionSuggestions={{ "pt-BR": [], es: [], en: [] }}
        groupTitles={{ "pt-BR": { required: "x", extras: "x" }, es: { required: "x", extras: "x" }, en: { required: "x", extras: "x" } }}
        onLeaveToPhotos={() => {}}
      />
    </DictionaryProvider>,
  );
}

describe("StepItems closed row", () => {
  const menu: Menu = {
    v: 1,
    sections: [{
      id: "s1", title: null,
      items: [
        { id: "i1", name: "Pizza", priceCents: 3000, groups: [g("a"), g("b")] },
        { id: "i2", name: "Suco", priceCents: 800, groups: [g("c")] },
        { id: "i3", name: "Agua", priceCents: 400 },
      ],
    }],
  };
  it("tags items by their number of groups", () => {
    const html = render(menu);
    expect(html).toContain("2 grupos");
    expect(html).toContain("1 grupo<");
    expect(html.match(/grupos?</g)).toHaveLength(2);
  });
});
