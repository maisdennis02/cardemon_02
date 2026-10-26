import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { MenuItem } from "@/lib/menu";
import { ItemEditor } from "./item-editor";

// The photo slot of the item editor (spec 2026-10-25 §2–3): add, change and
// remove; the Pro notice for free owners with a photo; the free cap.

const e = ptBR.dashboard.builder.editor;
const blob = "https://abc.public.blob.vercel-storage.com/item-photos/ckr1";
const photo = { full: `${blob}/i1-full.webp`, thumb: `${blob}/i1-thumb.webp` };
const noop = () => {};

function render(item: MenuItem, opts: { isPro?: boolean; photoCount?: number } = {}): string {
  return renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <ItemEditor
        item={item}
        sectionId="s1"
        sections={[{ id: "s1", title: null, items: [item] }]}
        first
        last
        onChange={noop}
        onMove={noop}
        onMoveTo={noop}
        onRemove={noop}
        onDone={noop}
        lang="pt-BR"
        restaurantId="ckr1"
        isPro={opts.isPro ?? false}
        photoCount={opts.photoCount ?? (item.photo ? 1 : 0)}
      />
    </DictionaryProvider>,
  );
}

const plain: MenuItem = { id: "i1", name: "X-Burguer", priceCents: 2800 };
const withPhoto: MenuItem = { ...plain, photo };

describe("ItemEditor photo slot", () => {
  it("offers to add a photo when the item has none", () => {
    const html = render(plain);
    expect(html).toContain(e.photoAdd);
    expect(html).not.toContain("<img");
  });

  it("shows the thumb with change and remove once there is a photo", () => {
    const html = render(withPhoto, { isPro: true });
    expect(html).toContain(`src="${photo.thumb}"`);
    expect(html).toContain(e.photoChange);
    expect(html).toContain(e.photoRemove);
  });

  it("tells a free owner the photo shows to diners on Pro, with a link to the plans", () => {
    const html = render(withPhoto);
    expect(html).toContain(e.photoProNotice);
    expect(html).toContain('href="/pricing"');
  });

  it("shows no notice to a Pro owner", () => {
    expect(render(withPhoto, { isPro: true })).not.toContain(e.photoProNotice);
  });

  it("swaps the add button for the free cap message at 20 photos", () => {
    const html = render(plain, { photoCount: 20 });
    expect(html).toContain(e.photoLimit);
    expect(html).not.toContain(e.photoAdd);
  });

  it("blocks a lapsed Pro with 50 photos from adding a 51st", () => {
    expect(render(plain, { photoCount: 50 })).toContain(e.photoLimit);
  });

  it("lets a Pro owner add past 20", () => {
    expect(render(plain, { isPro: true, photoCount: 40 })).toContain(e.photoAdd);
  });

  it("lets a free owner at the cap still change an existing photo", () => {
    const html = render(withPhoto, { photoCount: 20 });
    expect(html).toContain(e.photoChange);
    expect(html).not.toContain(e.photoLimit);
  });
});
