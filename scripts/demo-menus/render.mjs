#!/usr/bin/env node
// Renders the example menus to the images the site serves.
//
//   node scripts/demo-menus/render.mjs
//
// Each <slug>.html in this folder is one menu: three 720×1418 "pages" stacked
// vertically. Headless Chrome screenshots the whole document once; the
// screenshot is cut into its three pages and written as WebP to
//
//   public/demo-menus/<slug>/01.webp … 03.webp   (served at /m/<slug>)
//
// and the two menus in HERO are also copied to
//
//   public/mockup/usa/           (hero phone on the English landing)
//   public/mockup/latin_america/ (hero phone on the Spanish landing)
//
// public/mockup/brazil/ is a real customer-style menu and is never touched.
//
// Needs: Google Chrome (`google-chrome`, or set CHROME_BIN), network access
// for the Google Fonts the menus link to (they fall back to system fonts
// when offline, which changes the look), and `sharp`, which ships with Next.
//
// The menus listed here must match EXAMPLE_MENUS in src/lib/example-menus.ts;
// src/lib/example-menus.test.ts fails if a source or an image is missing.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, "../../public");
const CHROME = process.env.CHROME_BIN || "google-chrome";

const WIDTH = 720;
const HEIGHT = 1418;
const PAGES = 3;

const MENUS = ["maple-street-diner", "harbor-taproom", "taqueria-la-esquina", "cafe-buen-dia"];
const HERO = { usa: "maple-street-diner", latin_america: "taqueria-la-esquina" };

const tmp = mkdtempSync(join(tmpdir(), "demo-menus-"));
try {
  for (const slug of MENUS) {
    const shot = join(tmp, `${slug}.png`);
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${WIDTH},${HEIGHT * PAGES}`,
        // Lets the web fonts finish loading before the screenshot.
        "--virtual-time-budget=8000",
        `--screenshot=${shot}`,
        pathToFileURL(join(HERE, `${slug}.html`)).href,
      ],
      { stdio: "ignore", timeout: 120_000 },
    );

    const { width, height } = await sharp(shot).metadata();
    if (width !== WIDTH || height !== HEIGHT * PAGES) {
      throw new Error(`${slug}: screenshot is ${width}×${height}, expected ${WIDTH}×${HEIGHT * PAGES}`);
    }

    const outDir = join(PUBLIC, "demo-menus", slug);
    mkdirSync(outDir, { recursive: true });
    for (let page = 0; page < PAGES; page++) {
      const file = join(outDir, `0${page + 1}.webp`);
      await sharp(shot)
        .extract({ left: 0, top: page * HEIGHT, width: WIDTH, height: HEIGHT })
        .webp({ quality: 86 })
        .toFile(file);
      console.log(file.replace(`${PUBLIC}/`, "public/"));
    }
  }

  for (const [region, slug] of Object.entries(HERO)) {
    const outDir = join(PUBLIC, "mockup", region);
    mkdirSync(outDir, { recursive: true });
    for (let page = 1; page <= PAGES; page++) {
      const name = `0${page}.webp`;
      copyFileSync(join(PUBLIC, "demo-menus", slug, name), join(outDir, name));
      console.log(`public/mockup/${region}/${name}  ←  ${slug}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
