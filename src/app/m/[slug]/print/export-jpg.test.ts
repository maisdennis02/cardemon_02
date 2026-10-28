import { describe, expect, it, vi } from "vitest";
import { deliverJpgs, exportJpgs, jpgFileName } from "./export-jpg";

// One JPG per printable sheet (spec 2026-10-28 §3): shared in one go on a
// phone, downloaded one by one elsewhere.

const sheets = [{}, {}] as HTMLElement[];
const render = vi.fn(async () => new Blob(["x"], { type: "image/jpeg" }));

describe("jpgFileName", () => {
  it("names a single sheet after the menu and numbers several", () => {
    expect(jpgFileName("ze", 0, 1)).toBe("ze-cardapio.jpg");
    expect(jpgFileName("ze", 1, 3)).toBe("ze-cardapio-pagina-2.jpg");
  });
});

describe("exportJpgs", () => {
  it("shares every sheet at once when the device can share files", async () => {
    const share = vi.fn(async () => {});
    const download = vi.fn();
    const { result } = await exportJpgs({ sheets, slug: "ze", render, nav: { canShare: () => true, share }, download });
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const files = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(files.map((f) => f.name)).toEqual(["ze-cardapio-pagina-1.jpg", "ze-cardapio-pagina-2.jpg"]);
    expect(files[0].type).toBe("image/jpeg");
    expect(download).not.toHaveBeenCalled();
  });

  it("treats a cancelled share sheet as no error", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    expect((await exportJpgs({ sheets, slug: "ze", render, nav: { canShare: () => true, share } })).result).toBe("cancelled");
  });

  it("downloads each sheet in order where files can't be shared", async () => {
    const download = vi.fn();
    const { result } = await exportJpgs({ sheets, slug: "ze", render, nav: {} as Navigator, download });
    expect(result).toBe("downloaded");
    expect(download.mock.calls.map(([f]) => (f as File).name)).toEqual(["ze-cardapio-pagina-1.jpg", "ze-cardapio-pagina-2.jpg"]);
  });

  it("fails when a sheet can't be drawn, so the page can point to the PDF", async () => {
    const broken = vi.fn(async () => {
      throw new Error("tainted canvas");
    });
    await expect(exportJpgs({ sheets, slug: "ze", render: broken, nav: {} as Navigator, download: vi.fn() })).rejects.toThrow(
      "tainted canvas",
    );
  });

  it("reports progress sheet by sheet", async () => {
    const onProgress = vi.fn();
    await exportJpgs({ sheets, slug: "ze", render, nav: {} as Navigator, download: vi.fn(), onProgress });
    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("deliverJpgs", () => {
  it("asks for one more tap when Safari's tap window ran out while drawing", async () => {
    const files = [new File(["x"], "ze-cardapio.jpg", { type: "image/jpeg" })];
    const share = vi.fn(async () => {
      throw new DOMException("no activation", "NotAllowedError");
    });
    await expect(deliverJpgs(files, { canShare: () => true, share }, vi.fn())).resolves.toBe("needs-tap");
  });
});
