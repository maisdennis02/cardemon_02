import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";
import { MenuSchema, countItems } from "@/lib/menu";

loadDotenv();

// Publish (or take down) a text menu on one restaurant, without the builder UI.
//
//   DATABASE_URL='<url>' npx tsx scripts/publish-test-menu.ts <slug> scripts/fixtures/test-menu.json
//   DATABASE_URL='<url>' npx tsx scripts/publish-test-menu.ts <slug> --revert
//
// Makes the same write as the dashboard's publishMenu (draft = published, mode
// "built"). It can't revalidate the page: the public menu picks the change up on
// the first visit after its 60 s ISR window, and shows it on the visit after.

async function main() {
  const [slug, arg] = process.argv.slice(2);
  const url = process.env.DATABASE_URL;
  if (!slug || !arg) {
    console.error("uso: publish-test-menu.ts <slug> <menu.json | --revert>");
    process.exit(2);
  }
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  // Never print the password: show only where this is pointing.
  const { host, pathname } = new URL(url);
  console.log(`banco:    ${host}${pathname}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: { id: true } });
    if (!restaurant) {
      console.error(`slug não encontrado: ${slug}`);
      process.exit(1);
    }

    if (arg === "--revert") {
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { menuMode: "photos", menuDraft: Prisma.DbNull, menuPublished: Prisma.DbNull },
      });
      console.log(`${slug}: cardápio em texto removido, de volta ao modo fotos.`);
      return;
    }

    const parsed = MenuSchema.safeParse(JSON.parse(readFileSync(arg, "utf8")));
    if (!parsed.success) {
      console.error(`cardápio inválido em ${arg}:\n${parsed.error.message}`);
      process.exit(1);
    }

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { menuMode: "built", menuDraft: parsed.data, menuPublished: parsed.data },
    });
    console.log(`${slug}: ${countItems(parsed.data)} itens publicados. Aparece em /m/${slug} em até ~60 s.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
