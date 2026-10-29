import { describe, expect, it } from "vitest";
import { ITEM_PHOTO_MAX_BYTES } from "@/lib/menu";
import { PhotoError, centerSquare, uploadItemPhoto, type PhotoDeps } from "@/lib/item-photo";

const KB = 1024;
const file = new File([new Uint8Array(10)], "prato.jpg", { type: "image/jpeg" });

type Call = { size: number; type: string; quality: number };

// An encoder that answers with `type` (a browser that can't write WebP answers
// PNG) and a size picked per call.
function fakeDeps(opts: {
  outType?: (asked: string) => string;
  bytes?: (call: Call) => number;
  read?: () => Promise<{ width: number; height: number }>;
  put?: (path: string) => Promise<string>;
}) {
  const encodes: Call[] = [];
  const puts: { path: string; type: string; size: number }[] = [];
  const deps: PhotoDeps = {
    read: opts.read ?? (async () => ({ width: 4000, height: 3000 })),
    encode: async (_img, size, type, quality) => {
      const call = { size, type, quality };
      encodes.push(call);
      const n = opts.bytes ? opts.bytes(call) : 20 * KB;
      return new Blob([new Uint8Array(n)], { type: opts.outType ? opts.outType(type) : type });
    },
    put:
      opts.put ??
      (async (path, blob) => {
        puts.push({ path, type: blob.type, size: blob.size });
        return `https://abc.public.blob.vercel-storage.com/${path}`;
      }),
  };
  return { deps, encodes, puts };
}

describe("centerSquare", () => {
  it("takes the largest centered square of a landscape or portrait photo", () => {
    expect(centerSquare(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 });
    expect(centerSquare(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 });
    expect(centerSquare(800, 800)).toEqual({ sx: 0, sy: 0, side: 800 });
  });
});

describe("uploadItemPhoto", () => {
  it("uploads a 240 px thumb and an 800 px full size as WebP at 0.8", async () => {
    const { deps, encodes, puts } = fakeDeps({});
    const res = await uploadItemPhoto(file, "ckr1", "i1", deps);
    expect(encodes).toEqual([
      { size: 240, type: "image/webp", quality: 0.8 },
      { size: 800, type: "image/webp", quality: 0.8 },
    ]);
    expect(puts.map((p) => p.path)).toEqual(["item-photos/ckr1/i1-thumb.webp", "item-photos/ckr1/i1-full.webp"]);
    expect(res.format).toBe("webp");
    expect(res.photo.thumb).toContain("i1-thumb.webp");
    expect(res.photo.full).toContain("i1-full.webp");
  });

  it("falls back to JPEG at 0.82 when the browser can't write WebP", async () => {
    const { deps, encodes, puts } = fakeDeps({ outType: (asked) => (asked === "image/webp" ? "image/png" : asked) });
    const res = await uploadItemPhoto(file, "ckr1", "i1", deps);
    expect(res.format).toBe("jpeg");
    expect(encodes.filter((c) => c.type === "image/jpeg").map((c) => [c.size, c.quality])).toEqual([
      [240, 0.82],
      [800, 0.82],
    ]);
    expect(puts.map((p) => [p.path, p.type])).toEqual([
      ["item-photos/ckr1/i1-thumb.jpg", "image/jpeg"],
      ["item-photos/ckr1/i1-full.jpg", "image/jpeg"],
    ]);
  });

  it("re-encodes once at 0.6 when a size comes out over the upload cap", async () => {
    const { deps, encodes, puts } = fakeDeps({
      bytes: (c) => (c.size === 800 && c.quality === 0.8 ? 600 * KB : 100 * KB),
    });
    await uploadItemPhoto(file, "ckr1", "i1", deps);
    expect(encodes.at(-1)).toEqual({ size: 800, type: "image/webp", quality: 0.6 });
    expect(puts.every((p) => p.size <= ITEM_PHOTO_MAX_BYTES)).toBe(true);
  });

  it("gives up with stage encode, uploading nothing, when 0.6 is still too big", async () => {
    const { deps, puts } = fakeDeps({ bytes: (c) => (c.size === 800 ? 600 * KB : 20 * KB) });
    await expect(uploadItemPhoto(file, "ckr1", "i1", deps)).rejects.toMatchObject({ stage: "encode" });
    expect(puts).toEqual([]);
  });

  it("reports stage read when the file can't be decoded (e.g. HEIC on a browser without it)", async () => {
    const { deps } = fakeDeps({ read: () => Promise.reject(new Error("decode")) });
    const err = await uploadItemPhoto(file, "ckr1", "i1", deps).catch((e) => e);
    expect(err).toBeInstanceOf(PhotoError);
    expect(err.stage).toBe("read");
  });

  it("reports stage upload when the Blob upload fails", async () => {
    const { deps } = fakeDeps({ put: () => Promise.reject(new Error("network")) });
    await expect(uploadItemPhoto(file, "ckr1", "i1", deps)).rejects.toMatchObject({ stage: "upload" });
  });
});
