import { Anton, Kalam, Playfair_Display } from "next/font/google";

// Optional fonts for text menus (MenuTheme.font), shared by the public menu
// layout and the dashboard, where the builder previews them. Not preloaded:
// the browser fetches a file only when a menu actually uses that font.
const elegant = Playfair_Display({
  variable: "--font-menu-elegant",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

const casual = Kalam({
  variable: "--font-menu-casual",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

// The band's texture (the restaurant's name, repeated) and the poster style's
// titles: a condensed display face, like the posters these places print.
const poster = Anton({
  variable: "--font-menu-poster",
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

export const menuFontVariables = `${elegant.variable} ${casual.variable} ${poster.variable}`;
