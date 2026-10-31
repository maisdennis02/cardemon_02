import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: the contact details behind a restaurant slug, for writing to a
// lead by hand (the admin endpoint masks e-mails on purpose).
//
//   DATABASE_URL='<neon menulala-prod>' npx tsx scripts/lead-contact.ts f-t-festas-e-eventos

const slug = process.argv[2];
if (!slug) {
  console.error("usage: npx tsx scripts/lead-contact.ts <slug>");
  process.exit(1);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set");
    process.exit(1);
  }
  console.log("db host:", url.replace(/^.*@/, "").replace(/\/.*$/, ""));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const r = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        country: true,
        whatsappNumber: true,
        menuMode: true,
        createdAt: true,
        owner: { select: { email: true, name: true, createdAt: true } },
      },
    });
    if (!r) {
      console.error(`✗ no restaurant with slug ${slug}`);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
