// The sheets are measured once, so they must be measured with the real fonts
// and with the logo and photos in place (they arrive late from the Blob store).
// A broken image counts as done: it will not get any taller.
export async function waitForAssets(root: HTMLElement, fonts: { ready: Promise<unknown> } | null): Promise<void> {
  const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  await Promise.all([
    fonts?.ready,
    ...images.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve());
          img.addEventListener("error", () => resolve());
        }),
    ),
  ]);
}
