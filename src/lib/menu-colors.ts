// Colors for the builder's visual step: the dominant colors of an uploaded
// logo, and the preset palettes offered when there is no logo. Pure — the
// builder reads the pixels from the local file (canvas over an object URL) and
// hands them here.

// Every preset is dark enough (≥ 3:1 on white) to be used for titles as-is.
export const MENU_PALETTES: readonly string[] = [
  "#b91c1c", // red
  "#c2410c", // orange
  "#a16207", // mustard
  "#15803d", // green
  "#0f766e", // teal
  "#1d4ed8", // blue
  "#7e22ce", // purple
  "#be185d", // pink
];

const MIN_DISTANCE = 64;

function hsl(r: number, g: number, b: number): { s: number; l: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

// Up to `max` distinct, saturated colors, most present first. White, black,
// greys and transparent pixels are skipped: they are backgrounds and outlines,
// not the brand color.
export function pickLogoColors(rgba: Uint8ClampedArray, max = 3): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; s: number }>();
  for (let p = 0; p + 3 < rgba.length; p += 4) {
    const [r, g, b, a] = [rgba[p], rgba[p + 1], rgba[p + 2], rgba[p + 3]];
    if (a < 128) continue;
    const { s, l } = hsl(r, g, b);
    if (s < 0.25 || l < 0.15 || l > 0.85) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .map((b) => ({ score: b.n * b.s, rgb: [b.r / b.n, b.g / b.n, b.b / b.n] as const }))
    .sort((x, y) => y.score - x.score);

  const picked: (readonly [number, number, number])[] = [];
  for (const { rgb } of ranked) {
    if (picked.length >= max) break;
    const far = picked.every((q) => Math.hypot(q[0] - rgb[0], q[1] - rgb[1], q[2] - rgb[2]) >= MIN_DISTANCE);
    if (far) picked.push(rgb);
  }
  return picked.map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`);
}

// The swatches offered on the visual step. The logo's colors are only known
// right after an upload; without them (no logo, or a later visit) the
// palettes are always shown, so the color can still be changed.
export function swatchesFor(logoColors: string[], expanded: boolean): string[] {
  if (logoColors.length === 0) return [...MENU_PALETTES];
  return expanded ? [...logoColors, ...MENU_PALETTES.filter((c) => !logoColors.includes(c))] : logoColors;
}
