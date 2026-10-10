import type { CSSProperties } from "react";
import { headerColors, type MenuBackground } from "@/lib/menu";

// The menu page's background, like a chat wallpaper. Each pattern is a tiny
// SVG drawn in the menu's own color at a low opacity, so prices stay easy to
// read and nothing extra is downloaded. Free of React runtime imports: the
// public page, the builder and the landing all call it.

const WHITE = "#ffffff";

const svg = (body: string, size: number, attrs = "") =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' ${attrs}>${body}</svg>`;

// Each pattern: page color, the SVG tile (given the accent) and its size.
const PATTERNS: Record<Exclude<MenuBackground, "plain">, { color: string; size: number; tile: (a: string) => string }> = {
  paper: {
    color: "#fbf6ee",
    size: 120,
    tile: () =>
      svg(
        "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/>" +
          "<feColorMatrix values='0 0 0 0 .45 0 0 0 0 .35 0 0 0 0 .2 0 0 0 .09 0'/></filter>" +
          "<rect width='120' height='120' filter='url(#n)'/>",
        120,
      ),
  },
  linen: {
    color: "#f8f5f0",
    size: 6,
    tile: (a) =>
      svg(
        `<path d='M0 .5h6M0 3.5h6' stroke='${a}' stroke-opacity='.07'/>` +
          `<path d='M.5 0v6M3.5 0v6' stroke='${a}' stroke-opacity='.05'/>`,
        6,
      ),
  },
  gingham: {
    color: WHITE,
    size: 28,
    tile: (a) =>
      svg(
        `<rect width='14' height='28' fill='${a}' fill-opacity='.07'/>` +
          `<rect width='28' height='14' fill='${a}' fill-opacity='.07'/>`,
        28,
      ),
  },
  dots: {
    color: WHITE,
    size: 18,
    tile: (a) => svg(`<circle cx='9' cy='9' r='1.4' fill='${a}' fill-opacity='.2'/>`, 18),
  },
  doodles: {
    color: "#fffaf5",
    size: 160,
    tile: (a) =>
      svg(
        // Food doodles: cloche, cutlery, a cone, a plate, a bowl, a star, a cupcake.
        "<path d='M14 40a16 16 0 0 1 32 0z M12 40h36 M30 22v-2'/>" +
          "<path d='M100 14v26 M94 14v8a6 6 0 0 0 12 0v-8 M124 14c6 0 6 12 0 14v12'/>" +
          "<path d='M20 100l14 30 14-30z M22 104h24'/>" +
          "<circle cx='112' cy='112' r='14'/><path d='M104 106l16 12 M118 104l-10 16'/>" +
          "<path d='M70 70c4-6 12-6 16 0 M66 78h24'/>" +
          "<path d='M140 70l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z'/>" +
          "<path d='M64 140c0-8 16-8 16 0v6h-16z'/>",
        160,
        `fill='none' stroke='${a}' stroke-opacity='.14' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'`,
      ),
  },
};

export function menuBackgroundStyle(background: MenuBackground | undefined, color: string): CSSProperties {
  if (!background || background === "plain") return { backgroundColor: WHITE };
  const pattern = PATTERNS[background];
  const { accent } = headerColors(color);
  return {
    backgroundColor: pattern.color,
    // encodeURIComponent leaves ' alone; encoding it too keeps the HTML free of &#x27;.
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(pattern.tile(accent)).replace(/'/g, "%27")}")`,
    backgroundSize: `${pattern.size}px`,
  };
}
