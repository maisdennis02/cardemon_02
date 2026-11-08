import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse as parseDotenv } from "dotenv";
import { chromium } from "playwright-core";
import { ConciergeFileSchema, cartSampleItems } from "@/lib/concierge";
import { previewDatabaseUrl } from "@/lib/concierge-env";
import { DEFAULT_MENU_THEME } from "@/lib/menu";

// Concierge pilot: the two images for the Instagram DM (the menu, and the
// cart with the WhatsApp order button), rendered by the real menu page on a
// LOCAL server. Writes only to the .env database — never the shell's
// DATABASE_URL (see src/lib/concierge-env.ts).
//
//   npx tsx scripts/concierge-preview.ts <arquivo.json> --owner <email-de-teste-local> [--logo <arquivo.jpg>] [--base http://localhost:3100]
//
// Needs `next dev -p 3100` (or next start) running on the same .env.
// Output: branding/concierge/<instagram>/cardapio-topo.png (first screen, for
// the DM), cardapio.png (whole menu) and carrinho.png.
//
// --logo: the restaurant's Instagram profile photo. The menu page only takes
// logos from our Blob store, so the theme points at a made-up Blob URL and
// the browser is served the local file for it: nothing is uploaded.

const SLUG = "concierge-previa";
// Fake number: the cart only appears when the restaurant has one. The image
// never sends anything.
const FAKE_WHATSAPP = "5511999999999";
const FAKE_LOGO_URL = "https://concierge-previa.public.blob.vercel-storage.com/logos/previa/logo";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const owner = flag(args, "--owner");
  const base = flag(args, "--base") ?? "http://localhost:3100";
  const logo = flag(args, "--logo");
  if (!file || file.startsWith("--") || !owner) {
    console.error("uso: concierge-preview.ts <arquivo.json> --owner <email-de-teste> [--base http://localhost:3100]");
    process.exit(2);
  }

  const parsed = ConciergeFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error(`arquivo inválido em ${file}:\n${parsed.error.message}`);
    process.exit(1);
  }
  const { name, instagram, menu, theme, address, hours } = parsed.data;

  const url = previewDatabaseUrl(parseDotenv(readFileSync(".env")));
  const { host, pathname } = new URL(url);
  console.log(`banco local: ${host}${pathname}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const user = await prisma.user.findUnique({ where: { email: owner.toLowerCase() }, select: { id: true } });
    if (!user) {
      console.error(`conta de teste não encontrada no banco local: ${owner}`);
      process.exit(1);
    }
    const existing = await prisma.restaurant.findUnique({ where: { slug: SLUG }, select: { ownerId: true } });
    if (existing && existing.ownerId !== user.id) {
      console.error(`${SLUG} pertence a outra conta; não mexo.`);
      process.exit(1);
    }
    const data = {
      name,
      address: address ?? null,
      hours: hours ?? null,
      whatsappNumber: FAKE_WHATSAPP,
      country: "BR",
      menuMode: "built",
      menuDraft: menu,
      menuPublished: menu,
      menuTheme: { ...(theme ?? DEFAULT_MENU_THEME), ...(logo ? { logoUrl: FAKE_LOGO_URL } : {}) },
    };
    await prisma.restaurant.upsert({ where: { slug: SLUG }, create: { ...data, slug: SLUG, ownerId: user.id }, update: data });
    // The public page cuts free menus at 20 items; the image shows them all.
    await prisma.user.update({
      where: { id: user.id },
      data: { proExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
  } finally {
    await prisma.$disconnect();
  }

  const outDir = join("branding", "concierge", instagram);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR" });
    if (logo) {
      const body = readFileSync(logo);
      await page.route(FAKE_LOGO_URL, (route) => route.fulfill({ body, contentType: "image/jpeg" }));
    }
    await page.goto(`${base}/m/${SLUG}`, { waitUntil: "networkidle", timeout: 600_000 });
    // `next dev` paints its "N" indicator over the page; keep it out of the image.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: join(outDir, "cardapio-topo.png") });
    await page.screenshot({ path: join(outDir, "cardapio.png"), fullPage: true });

    // A real-looking order: up to 3 priced items without option groups (their
    // "+" adds them straight away), one per section first.
    const items = cartSampleItems(menu);
    if (!items.length) {
      console.log("nenhum item com preço e sem opções: pulei a imagem do carrinho.");
    } else {
      for (const item of items) {
        await page.getByRole("button", { name: `Adicionar ${item.name} ao pedido` }).click();
      }
      await page.getByRole("button", { name: /Ver pedido/ }).click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(outDir, "carrinho.png") });
    }
    console.log(`imagens em ${outDir}/`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
