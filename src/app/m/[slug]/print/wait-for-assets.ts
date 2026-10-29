// The sheets are measured once, so they must be measured with the real fonts
// and with the logo and photos in place (they arrive late from the Blob store).
// A broken image counts as done: it will not get any taller. An image that
// never answers is given up on after `timeoutMs`, so the buttons (the PDF
// one included) never stay off; the thumbs and the logo have fixed sizes.
export async function waitForAssets(
  root: HTMLElement,
  fonts: { ready: Promise<unknown> } | null,
  timeoutMs = 5000,
): Promise<void> {
  const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  const all = Promise.all([
    fonts?.ready,
    ...images.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve());
          img.addEventListener("error", () => resolve());
        }),
    ),
  ]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => (timer = setTimeout(resolve, timeoutMs)));
  await Promise.race([all, timeout]);
  clearTimeout(timer);
}
