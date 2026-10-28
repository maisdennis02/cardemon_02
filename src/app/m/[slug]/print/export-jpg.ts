import { SHEET } from "./print-layout";

// One JPG per printable sheet (spec 2026-10-28 §3). On a phone the files go
// to the system share sheet in one go (save to the gallery, send on
// WhatsApp); where files can't be shared they download one by one.

// 2.5 × 794 px ≈ 1985 px wide: about 240 dpi on an A4 sheet.
const JPG_SCALE = 2.5;
const JPG_QUALITY = 0.92;

export function jpgFileName(slug: string, index: number, total: number): string {
  return total === 1 ? `${slug}-cardapio.jpg` : `${slug}-cardapio-pagina-${index + 1}.jpg`;
}

async function renderJpg(el: HTMLElement): Promise<Blob> {
  // Loaded on the click only: most visits never need it.
  const { domToBlob } = await import("modern-screenshot");
  // The size is given, not read: on a phone the sheet is on screen scaled
  // down, and the measured box would crop the image to its top-left corner.
  return domToBlob(el, {
    type: "image/jpeg",
    quality: JPG_QUALITY,
    scale: JPG_SCALE,
    width: SHEET.width,
    height: SHEET.height,
  });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type JpgResult = "shared" | "downloaded" | "cancelled" | "needs-tap";

export async function renderJpgs(opts: {
  sheets: HTMLElement[];
  slug: string;
  render?: (el: HTMLElement) => Promise<Blob>;
  onProgress?: (n: number, total: number) => void;
}): Promise<File[]> {
  const { sheets, slug, render = renderJpg, onProgress } = opts;
  const files: File[] = [];
  for (let i = 0; i < sheets.length; i++) {
    onProgress?.(i + 1, sheets.length);
    const blob = await render(sheets[i]);
    files.push(new File([blob], jpgFileName(slug, i, sheets.length), { type: "image/jpeg" }));
  }
  return files;
}

// Safari opens the share sheet only right after a tap; drawing the sheets can
// outlast that, and then share() rejects with NotAllowedError. "needs-tap"
// asks the page for one more tap that calls this again with the same files.
export async function deliverJpgs(
  files: File[],
  nav: Partial<Pick<Navigator, "canShare" | "share">> = navigator,
  download: (file: File) => void = downloadFile,
): Promise<JpgResult> {
  if (nav.share && nav.canShare?.({ files })) {
    try {
      await nav.share({ files });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      if (e instanceof DOMException && e.name === "NotAllowedError") return "needs-tap";
      throw e;
    }
  }
  files.forEach((f) => download(f));
  return "downloaded";
}

export async function exportJpgs(opts: {
  sheets: HTMLElement[];
  slug: string;
  render?: (el: HTMLElement) => Promise<Blob>;
  onProgress?: (n: number, total: number) => void;
  nav?: Partial<Pick<Navigator, "canShare" | "share">>;
  download?: (file: File) => void;
}): Promise<{ result: JpgResult; files: File[] }> {
  const files = await renderJpgs(opts);
  return { result: await deliverJpgs(files, opts.nav, opts.download), files };
}
