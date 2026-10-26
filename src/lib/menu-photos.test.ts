import { describe, expect, it } from "vitest";
import type { Menu } from "@/lib/menu";
import { countPhotos, photoCap, photosBelongTo, photosToDelete, photoUrls } from "@/lib/menu-photos";

const blob = "https://abc.public.blob.vercel-storage.com";
const photo = (rid: string, key: string) => ({
  full: `${blob}/item-photos/${rid}/${key}-full.webp`,
  thumb: `${blob}/item-photos/${rid}/${key}-thumb.webp`,
});

function menu(items: { id: string; photo?: ReturnType<typeof photo> }[]): Menu {
  return { v: 1, sections: [{ id: "s1", title: null, items: items.map((i) => ({ name: i.id, priceCents: 100, ...i })) }] };
}

const a = photo("ckr1", "a");
const b = photo("ckr1", "b");

describe("photoUrls and countPhotos", () => {
  it("lists both sizes of every photo and counts items with one", () => {
    const m = menu([{ id: "i1", photo: a }, { id: "i2" }, { id: "i3", photo: b }]);
    expect(photoUrls(m)).toEqual([a.full, a.thumb, b.full, b.thumb]);
    expect(countPhotos(m)).toBe(2);
    expect(photoUrls(null)).toEqual([]);
    expect(countPhotos(null)).toBe(0);
  });
});

describe("photosToDelete", () => {
  it("frees both files of a replaced photo", () => {
    expect(photosToDelete([menu([{ id: "i1", photo: a }])], [menu([{ id: "i1", photo: b }])])).toEqual([a.full, a.thumb]);
  });

  it("frees the photo of a removed item", () => {
    expect(photosToDelete([menu([{ id: "i1", photo: a }, { id: "i2" }])], [menu([{ id: "i2" }])])).toEqual([
      a.full,
      a.thumb,
    ]);
  });

  it("keeps a photo the published menu still shows", () => {
    const published = menu([{ id: "i1", photo: a }]);
    expect(photosToDelete([menu([{ id: "i1", photo: a }]), published], [menu([{ id: "i1" }]), published])).toEqual([]);
  });

  it("frees nothing when nothing changed, and ignores missing menus", () => {
    const m = menu([{ id: "i1", photo: a }]);
    expect(photosToDelete([m, null], [m, null])).toEqual([]);
  });

  it("lists a URL once even when both before-menus hold it", () => {
    const m = menu([{ id: "i1", photo: a }]);
    expect(photosToDelete([m, m], [null])).toEqual([a.full, a.thumb]);
  });
});

describe("photosBelongTo", () => {
  it("accepts photos in the restaurant's own folder only", () => {
    expect(photosBelongTo(menu([{ id: "i1", photo: a }]), "ckr1")).toBe(true);
    expect(photosBelongTo(menu([{ id: "i1", photo: a }, { id: "i2", photo: photo("ckr2", "x") }]), "ckr1")).toBe(false);
    expect(photosBelongTo(menu([{ id: "i1", photo: { ...a, thumb: photo("ckr2", "x").thumb } }]), "ckr1")).toBe(false);
    expect(photosBelongTo(menu([{ id: "i1" }]), "ckr1")).toBe(true);
  });
});

describe("photoCap", () => {
  it("is 20 on the free plan, what is already there for a lapsed Pro, and the item limit on Pro", () => {
    expect(photoCap(false, 0)).toBe(20);
    expect(photoCap(false, 50)).toBe(50);
    expect(photoCap(true, 0)).toBe(300);
  });
});
