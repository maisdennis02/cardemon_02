import { describe, expect, it } from "vitest";
import type { Menu } from "@/lib/menu";
import { countPhotos, menuRev, photoCap, photoSaveError, photosBelongTo, photosToDelete, photoUrls } from "@/lib/menu-photos";

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

describe("photoSaveError (shared by saveMenuDraft and publishMenu)", () => {
  const many = (n: number, rid = "ckr1") => menu(Array.from({ length: n }, (_, i) => ({ id: `i${i}`, photo: photo(rid, `p${i}`) })));

  it("refuses a photo from another restaurant's folder", () => {
    expect(photoSaveError(many(1, "ckr2"), "ckr1", true, [])).toBe("photoInvalid");
  });

  it("refuses the 21st photo on the free plan", () => {
    expect(photoSaveError(many(20), "ckr1", false, [many(19)])).toBeNull();
    expect(photoSaveError(many(21), "ckr1", false, [many(20)])).toBe("photoLimit");
  });

  it("lets a lapsed Pro keep what the draft or the published menu already has", () => {
    expect(photoSaveError(many(50), "ckr1", false, [many(50), null])).toBeNull();
    expect(photoSaveError(many(50), "ckr1", false, [null, many(50)])).toBeNull();
    expect(photoSaveError(many(51), "ckr1", false, [many(50), many(50)])).toBe("photoLimit");
  });

  it("lets Pro go past 20", () => {
    expect(photoSaveError(many(40), "ckr1", true, [many(0)])).toBeNull();
  });
});

// The revision a builder tab last saw of the stored draft. A save from a tab
// whose revision is stale (another tab or device saved since) must not delete
// blobs: the other tab may still be showing them (review of 2026-10-25).
describe("menuRev", () => {
  it("is the same for the same menu whatever the key order (jsonb reorders keys)", () => {
    const m = menu([{ id: "i1", photo: a }]);
    const reordered = JSON.parse(JSON.stringify(m), (_k, v) =>
      v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v,
    );
    expect(menuRev(reordered)).toBe(menuRev(m));
  });

  it("changes when the menu changes, and has a value for no draft", () => {
    expect(menuRev(menu([{ id: "i1", photo: a }]))).not.toBe(menuRev(menu([{ id: "i1", photo: b }])));
    expect(menuRev(null)).toBe("none");
  });
});
