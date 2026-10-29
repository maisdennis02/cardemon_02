// An item photo, made on the owner's phone: the largest centered square, as a
// small thumb for the menu card and a full size for the item sheet, encoded
// before upload so a 12 MP camera photo never leaves the phone as is.
// Design: docs/superpowers/specs/2026-10-25-fotos-dos-produtos-design.md §2

import { upload } from "@vercel/blob/client";
import { ITEM_PHOTO_MAX_BYTES, type ItemPhoto } from "@/lib/menu";

export const THUMB_PX = 240;
export const FULL_PX = 800;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;
const RETRY_QUALITY = 0.6;

export type PhotoStage = "read" | "encode" | "upload";

export class PhotoError extends Error {
  constructor(readonly stage: PhotoStage, cause?: unknown) {
    super(`item photo failed at ${stage}`, { cause });
  }
}

type PhotoImage = { width: number; height: number };

// The browser pieces, swappable so the rules below run in tests.
export type PhotoDeps = {
  read: (file: File) => Promise<PhotoImage>;
  encode: (img: PhotoImage, size: number, type: string, quality: number) => Promise<Blob>;
  put: (path: string, blob: Blob) => Promise<string>;
};

export function centerSquare(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h);
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), side };
}

function browserDeps(restaurantId: string): PhotoDeps {
  return {
    read: (file) => createImageBitmap(file, { imageOrientation: "from-image" }),
    encode: (img, size, type, quality) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return Promise.reject(new Error("no 2d context"));
      const { sx, sy, side } = centerSquare(img.width, img.height);
      ctx.drawImage(img as ImageBitmap, sx, sy, side, side, 0, 0, size, size);
      return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), type, quality),
      );
    },
    put: async (path, blob) =>
      (
        await upload(path, blob, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ restaurantId }),
          contentType: blob.type,
        })
      ).url,
  };
}

// WebP when the browser writes it (older Safari answers PNG instead), JPEG
// otherwise; one retry at a lower quality before refusing a file the upload
// route would refuse anyway.
async function encodeUnderCap(deps: PhotoDeps, img: PhotoImage, size: number, type: string): Promise<Blob> {
  const blob = await deps.encode(img, size, type, type === "image/webp" ? WEBP_QUALITY : JPEG_QUALITY);
  if (blob.size <= ITEM_PHOTO_MAX_BYTES) return blob;
  const retry = await deps.encode(img, size, type, RETRY_QUALITY);
  if (retry.size <= ITEM_PHOTO_MAX_BYTES) return retry;
  throw new Error(`still ${retry.size} bytes at ${RETRY_QUALITY}`);
}

export async function uploadItemPhoto(
  file: File,
  restaurantId: string,
  itemId: string,
  deps: PhotoDeps = browserDeps(restaurantId),
): Promise<{ photo: ItemPhoto; format: "webp" | "jpeg" }> {
  const img = await deps.read(file).catch((err) => {
    throw new PhotoError("read", err);
  });

  let thumb: Blob;
  let full: Blob;
  let format: "webp" | "jpeg";
  try {
    const probe = await deps.encode(img, THUMB_PX, "image/webp", WEBP_QUALITY);
    format = probe.type === "image/webp" ? "webp" : "jpeg";
    const type = `image/${format}`;
    thumb = format === "webp" && probe.size <= ITEM_PHOTO_MAX_BYTES ? probe : await encodeUnderCap(deps, img, THUMB_PX, type);
    full = await encodeUnderCap(deps, img, FULL_PX, type);
  } catch (err) {
    throw new PhotoError("encode", err);
  }

  const ext = format === "webp" ? "webp" : "jpg";
  const base = `item-photos/${restaurantId}/${itemId}`;
  try {
    const thumbUrl = await deps.put(`${base}-thumb.${ext}`, thumb);
    const fullUrl = await deps.put(`${base}-full.${ext}`, full);
    return { photo: { full: fullUrl, thumb: thumbUrl }, format };
  } catch (err) {
    throw new PhotoError("upload", err);
  }
}
